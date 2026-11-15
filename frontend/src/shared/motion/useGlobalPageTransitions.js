import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigateWithTransition, prefersReducedMotion } from './pageTransition';

/**
 * Intercepts internal React Router <Link> clicks in capture phase to wrap
 * route updates in document.startViewTransition() with semantic directionality.
 * Also tracks browser popstate (back/forward & mobile edge-swipe) cleanly.
 */
export function useGlobalPageTransitions() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleDocumentClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download') || anchor.dataset.noTransition === 'true') return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }

      let targetUrl;
      try {
        targetUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (targetUrl.origin !== window.location.origin) return;

      const targetPathAndQuery = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      const currentPathAndQuery = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (targetPathAndQuery === currentPathAndQuery) return;

      // Only intercept when View Transitions API is available & motion is enabled;
      // otherwise let React Router handle navigation + CSS fallback enter animation.
      if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
        return;
      }

      event.preventDefault();
      navigateWithTransition(navigate, targetPathAndQuery, {
        fromPath: pathnameRef.current,
      });
    };

    const handlePopState = () => {
      const root = document.documentElement;
      root.dataset.navTransition = 'pop';
      window.setTimeout(() => {
        if (root.dataset.navTransition === 'pop') {
          delete root.dataset.navTransition;
        }
      }, 280);
    };

    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState, { passive: true });
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const supportsViewTransition =
    typeof document !== 'undefined' && typeof document.startViewTransition === 'function';

  return {
    fallbackStageKey: supportsViewTransition ? 'vt-native' : location.pathname,
    fallbackStageClass: supportsViewTransition ? '' : 'page-transition-fallback-enter',
  };
}
