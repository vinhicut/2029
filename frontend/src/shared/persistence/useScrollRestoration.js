/**
 * React Router v7 Scroll Restoration Hooks
 * - `useScrollRestoration`: Global window (X, Y) restoration per route (pathname + search)
 * - `useContainerScrollPersistence`: Independent scrollable containers (sidebar, modal, data table)
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { purgeExpiredEntries } from './storageManager';
import {
  disableBrowserScrollRestoration,
  getRouteKey,
  getSavedContainerScroll,
  getSavedWindowScroll,
  isPageReload,
  restoreScrollAsync,
  saveContainerScroll,
  saveWindowScroll,
  throttleDebounce,
} from './scrollRestoration';

function scrollToHashTarget(hash) {
  if (!hash || typeof document === 'undefined') return false;
  const id = hash.replace(/^#/, '');
  if (!id) return false;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'auto', block: 'start' });
    return true;
  }
  return false;
}

/**
 * Global route-aware scroll restoration hook.
 * Place once at the root App component inside <BrowserRouter>.
 */
export function useScrollRestoration({
  isReady = true,
  maxWaitMs = 3500,
  throttleMs = 180,
  excludePaths = [],
} = {}) {
  const { pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();
  const routeKey = getRouteKey(pathname, search);

  const isInitialMountRef = useRef(true);
  const activeRouteKeyRef = useRef(routeKey);
  const isRestoringRef = useRef(false);

  const isExcluded = excludePaths.some((prefix) => pathname.startsWith(prefix));

  // Disable native browser scroll restoration & clean expired records once
  useEffect(() => {
    disableBrowserScrollRestoration();
    purgeExpiredEntries('session');
  }, []);

  // Track window scroll with throttle/debounce and flush on pagehide / visibilitychange
  useEffect(() => {
    if (isExcluded || typeof window === 'undefined') return undefined;

    activeRouteKeyRef.current = routeKey;

    const persistCurrent = () => {
      if (isRestoringRef.current) return;
      saveWindowScroll(activeRouteKeyRef.current);
    };

    const throttledSave = throttleDebounce(persistCurrent, throttleMs);

    const handlePageHide = () => {
      throttledSave.cancel();
      saveWindowScroll(activeRouteKeyRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handlePageHide();
      }
    };

    window.addEventListener('scroll', throttledSave, { passive: true });
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      throttledSave.cancel();
      window.removeEventListener('scroll', throttledSave);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [routeKey, throttleMs, isExcluded]);

  // Restore or reset scroll position when route changes or on initial reload
  useLayoutEffect(() => {
    if (isExcluded || !isReady || typeof window === 'undefined') return undefined;

    const isInitial = isInitialMountRef.current;
    isInitialMountRef.current = false;

    const shouldRestore =
      (isInitial && isPageReload()) ||
      (!isInitial && navigationType === 'POP');

    if (shouldRestore) {
      const saved = getSavedWindowScroll(routeKey);
      if (saved && (saved.x > 0 || saved.y > 0)) {
        isRestoringRef.current = true;
        const cancelRestore = restoreScrollAsync({
          target: window,
          x: saved.x,
          y: saved.y,
          maxWaitMs,
          onComplete: () => {
            isRestoringRef.current = false;
          },
        });
        return () => {
          isRestoringRef.current = false;
          cancelRestore();
        };
      }
    }

    // New navigation (PUSH / REPLACE) or fresh initial load
    if (hash) {
      const raf = requestAnimationFrame(() => {
        if (!scrollToHashTarget(hash)) {
          window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
        }
      });
      return () => cancelAnimationFrame(raf);
    }

    window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
    return undefined;
  }, [routeKey, hash, navigationType, isReady, maxWaitMs, isExcluded]);
}

/**
 * Scroll persistence hook for independent scrollable containers
 * (e.g., sidebars, modal bodies, data tables, AI reading panels).
 */
export function useContainerScrollPersistence(
  containerRef,
  containerId,
  {
    isReady = true,
    throttleMs = 180,
    maxWaitMs = 3000,
    alwaysRestore = false,
  } = {}
) {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const routeKey = getRouteKey(pathname, search);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el || !containerId) return undefined;

    const throttledSave = throttleDebounce(() => {
      saveContainerScroll(routeKey, containerId, el);
    }, throttleMs);

    const flushSave = () => {
      throttledSave.cancel();
      saveContainerScroll(routeKey, containerId, el);
    };

    el.addEventListener('scroll', throttledSave, { passive: true });
    window.addEventListener('pagehide', flushSave);

    return () => {
      throttledSave.cancel();
      saveContainerScroll(routeKey, containerId, el);
      el.removeEventListener('scroll', throttledSave);
      window.removeEventListener('pagehide', flushSave);
    };
  }, [containerRef, containerId, routeKey, throttleMs]);

  useLayoutEffect(() => {
    const el = containerRef?.current;
    if (!el || !containerId || !isReady) return undefined;

    const isInitial = isInitialMountRef.current;
    isInitialMountRef.current = false;

    const shouldRestore =
      alwaysRestore ||
      (isInitial && isPageReload()) ||
      (!isInitial && navigationType === 'POP');

    if (!shouldRestore) return undefined;

    const saved = getSavedContainerScroll(routeKey, containerId);
    if (!saved || (saved.x === 0 && saved.y === 0)) return undefined;

    return restoreScrollAsync({
      target: el,
      x: saved.x,
      y: saved.y,
      maxWaitMs,
    });
  }, [containerRef, containerId, routeKey, navigationType, isReady, maxWaitMs, alwaysRestore]);
}
