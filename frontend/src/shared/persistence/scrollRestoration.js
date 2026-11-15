/**
 * Core Scroll Restoration Engine
 * - Disables native browser scroll restoration (`history.scrollRestoration = 'manual'`)
 * - Tracks window (X, Y) and independent scrollable containers per route (`pathname + search`)
 * - Handles asynchronous content via ResizeObserver + MutationObserver + rAF
 * - Clamps coordinates safely when page dimensions shrink after reload
 * - Cancels immediately on user interaction to avoid fighting manual scrolling
 */

import {
  readPersistedItem,
  writePersistedItem,
  removePersistedItem,
} from './storageManager';

const SCROLL_KEY_PREFIX = 'scroll:';
const CONTAINER_KEY_PREFIX = 'scroll_box:';
const DEFAULT_SCROLL_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function disableBrowserScrollRestoration() {
  if (typeof window === 'undefined' || !('history' in window)) return;
  try {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  } catch {
    /* ignore restricted environments */
  }
}

export function isPageReload() {
  if (typeof window === 'undefined' || !window.performance) return false;
  try {
    const navEntries = window.performance.getEntriesByType?.('navigation');
    if (Array.isArray(navEntries) && navEntries.length > 0) {
      return navEntries[0].type === 'reload';
    }
    if (window.performance.navigation) {
      return window.performance.navigation.type === 1;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function getRouteKey(pathname = '/', search = '') {
  const cleanPath = pathname || '/';
  const cleanSearch = search || '';
  return `${cleanPath}${cleanSearch}`;
}

export function throttleDebounce(fn, waitMs = 180) {
  let lastRun = 0;
  let timer = null;

  const throttled = (...args) => {
    const now = Date.now();
    const remaining = waitMs - (now - lastRun);

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastRun = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastRun = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };

  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  throttled.flush = (...args) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastRun = Date.now();
    fn(...args);
  };

  return throttled;
}

export function saveWindowScroll(routeKey) {
  if (typeof window === 'undefined' || !routeKey) return;
  const x = Math.max(0, Math.round(window.scrollX ?? window.pageXOffset ?? 0));
  const y = Math.max(0, Math.round(window.scrollY ?? window.pageYOffset ?? 0));

  writePersistedItem(
    `${SCROLL_KEY_PREFIX}${routeKey}`,
    { x, y, updatedAt: Date.now() },
    { storage: 'session', ttlMs: DEFAULT_SCROLL_TTL_MS, sanitize: false }
  );
}

export function getSavedWindowScroll(routeKey) {
  if (!routeKey) return null;
  const saved = readPersistedItem(`${SCROLL_KEY_PREFIX}${routeKey}`, {
    storage: 'session',
    fallback: null,
  });
  if (!saved || typeof saved.x !== 'number' || typeof saved.y !== 'number') {
    return null;
  }
  if (!Number.isFinite(saved.x) || !Number.isFinite(saved.y)) {
    return null;
  }
  return { x: Math.max(0, saved.x), y: Math.max(0, saved.y) };
}

export function clearSavedWindowScroll(routeKey) {
  if (!routeKey) return;
  removePersistedItem(`${SCROLL_KEY_PREFIX}${routeKey}`, { storage: 'session' });
}

export function saveContainerScroll(routeKey, containerId, element) {
  if (!routeKey || !containerId || !element) return;
  const x = Math.max(0, Math.round(element.scrollLeft || 0));
  const y = Math.max(0, Math.round(element.scrollTop || 0));

  writePersistedItem(
    `${CONTAINER_KEY_PREFIX}${routeKey}::${containerId}`,
    { x, y, updatedAt: Date.now() },
    { storage: 'session', ttlMs: DEFAULT_SCROLL_TTL_MS, sanitize: false }
  );
}

export function getSavedContainerScroll(routeKey, containerId) {
  if (!routeKey || !containerId) return null;
  const saved = readPersistedItem(`${CONTAINER_KEY_PREFIX}${routeKey}::${containerId}`, {
    storage: 'session',
    fallback: null,
  });
  if (!saved || typeof saved.x !== 'number' || typeof saved.y !== 'number') {
    return null;
  }
  if (!Number.isFinite(saved.x) || !Number.isFinite(saved.y)) {
    return null;
  }
  return { x: Math.max(0, saved.x), y: Math.max(0, saved.y) };
}

function getMaxScrollBounds(target) {
  if (typeof window === 'undefined') return { maxX: 0, maxY: 0 };
  if (target === window) {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(docEl?.scrollWidth || 0, body?.scrollWidth || 0);
    const scrollH = Math.max(docEl?.scrollHeight || 0, body?.scrollHeight || 0);
    const viewW = window.innerWidth || docEl?.clientWidth || 0;
    const viewH = window.innerHeight || docEl?.clientHeight || 0;
    return {
      maxX: Math.max(0, scrollW - viewW),
      maxY: Math.max(0, scrollH - viewH),
    };
  }
  return {
    maxX: Math.max(0, (target.scrollWidth || 0) - (target.clientWidth || 0)),
    maxY: Math.max(0, (target.scrollHeight || 0) - (target.clientHeight || 0)),
  };
}

function applyScrollInstant(target, x, y) {
  const { maxX, maxY } = getMaxScrollBounds(target);
  const clampedX = Math.max(0, Math.min(x, maxX));
  const clampedY = Math.max(0, Math.min(y, maxY));

  if (target === window) {
    window.scrollTo({ left: clampedX, top: clampedY, behavior: 'auto' });
  } else if (target && typeof target.scrollTo === 'function') {
    target.scrollTo({ left: clampedX, top: clampedY, behavior: 'auto' });
  } else if (target) {
    target.scrollLeft = clampedX;
    target.scrollTop = clampedY;
  }

  return { clampedX, clampedY, maxX, maxY };
}

/**
 * Restores scroll position smoothly without layout-shift flicker, waiting for async content
 * using ResizeObserver & MutationObserver until target coordinates are reachable or layout stabilizes.
 *
 * Returns a cancel() function for cleanup.
 */
export function restoreScrollAsync({
  target = typeof window !== 'undefined' ? window : null,
  x = 0,
  y = 0,
  maxWaitMs = 3500,
  stabilityWindowMs = 180,
  onComplete,
} = {}) {
  if (typeof window === 'undefined' || !target) return () => {};
  if (x === 0 && y === 0) {
    applyScrollInstant(target, 0, 0);
    onComplete?.({ x: 0, y: 0, exact: true });
    return () => {};
  }

  let cancelled = false;
  let rafId = null;
  let maxTimer = null;
  let stabilityTimer = null;
  let resizeObserver = null;
  let mutationObserver = null;

  const observeTarget = target === window ? document.documentElement : target;

  const cleanup = () => {
    cancelled = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (maxTimer !== null) clearTimeout(maxTimer);
    if (stabilityTimer !== null) clearTimeout(stabilityTimer);
    if (resizeObserver) resizeObserver.disconnect();
    if (mutationObserver) mutationObserver.disconnect();
    window.removeEventListener('wheel', handleUserInteract);
    window.removeEventListener('touchstart', handleUserInteract);
    window.removeEventListener('pointerdown', handleUserInteract);
    window.removeEventListener('keydown', handleKeyInteract);
  };

  const handleUserInteract = () => cleanup();
  const handleKeyInteract = (e) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
      cleanup();
    }
  };

  window.addEventListener('wheel', handleUserInteract, { passive: true, once: true });
  window.addEventListener('touchstart', handleUserInteract, { passive: true, once: true });
  window.addEventListener('pointerdown', handleUserInteract, { passive: true, once: true });
  window.addEventListener('keydown', handleKeyInteract, { passive: true });

  const attemptRestore = (isFinal = false) => {
    if (cancelled) return;

    const { maxX, maxY } = getMaxScrollBounds(target);
    const canReachY = maxY >= y;
    const canReachX = maxX >= x;

    if ((canReachY && canReachX) || isFinal) {
      const result = applyScrollInstant(target, x, y);
      cleanup();
      onComplete?.({
        x: result.clampedX,
        y: result.clampedY,
        exact: canReachY && canReachX,
      });
    }
  };

  const scheduleAttempt = () => {
    if (cancelled) return;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => attemptRestore(false));

    if (stabilityTimer !== null) clearTimeout(stabilityTimer);
    stabilityTimer = setTimeout(() => attemptRestore(true), stabilityWindowMs);
  };

  // Immediate check on first frame
  const initialBounds = getMaxScrollBounds(target);
  if (initialBounds.maxY >= y && initialBounds.maxX >= x) {
    rafId = requestAnimationFrame(() => attemptRestore(true));
    return cleanup;
  }

  // Wait for async data/DOM expansion
  if (typeof ResizeObserver !== 'undefined' && observeTarget) {
    resizeObserver = new ResizeObserver(scheduleAttempt);
    resizeObserver.observe(observeTarget);
  }

  if (typeof MutationObserver !== 'undefined' && observeTarget) {
    mutationObserver = new MutationObserver(scheduleAttempt);
    mutationObserver.observe(observeTarget, {
      childList: true,
      subtree: true,
    });
  }

  stabilityTimer = setTimeout(() => attemptRestore(true), stabilityWindowMs);
  maxTimer = setTimeout(() => attemptRestore(true), maxWaitMs);

  return cleanup;
}
