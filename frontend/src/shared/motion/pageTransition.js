import { flushSync } from 'react-dom';

const PEER_ROUTE_ORDER = [
  '/',
  '/la-so-tu-vi',
  '/boi-kieu',
  '/lich-van-su',
  '/la-kinh-phong-thuy',
  '/ky-mon-don-giap',
  '/phat-phap',
  '/chuyen-muc',
  '/dien-dan',
  '/khoa-hoc',
  '/quan-ly',
];

function normalizePath(path) {
  if (!path || path === '/home') return '/';
  if (path === '/phong-thuy') return '/la-kinh-phong-thuy';
  if (path === '/ky-mon') return '/ky-mon-don-giap';
  return path.replace(/\/+$/, '') || '/';
}

function getPeerIndex(pathname) {
  const norm = normalizePath(pathname);
  const exact = PEER_ROUTE_ORDER.indexOf(norm);
  if (exact !== -1) return exact;
  return PEER_ROUTE_ORDER.findIndex((prefix) => prefix !== '/' && norm.startsWith(`${prefix}/`));
}

function getRouteDepth(pathname) {
  const norm = normalizePath(pathname);
  if (norm === '/') return 0;
  return norm.split('/').filter(Boolean).length;
}

/**
 * Determine semantic transition type between two routes:
 * - peer-next / peer-prev: horizontal slide between top-level sections
 * - drill-down / drill-up: depth push/pop between list and detail (or AI view)
 * - fade: fallback cross-fade
 */
export function resolveTransitionType(fromPath, toPath) {
  const fromNorm = normalizePath(fromPath);
  const toNorm = normalizePath(toPath);

  if (fromNorm === toNorm) return 'none';

  // Special full-screen AI interpretation flow
  if (toNorm.startsWith('/luan-giai-ai')) return 'drill-down';
  if (fromNorm.startsWith('/luan-giai-ai')) return 'drill-up';

  const fromDepth = getRouteDepth(fromNorm);
  const toDepth = getRouteDepth(toNorm);

  if (toNorm.startsWith(`${fromNorm}/`) || (toDepth > fromDepth && fromDepth >= 1)) {
    return 'drill-down';
  }
  if (fromNorm.startsWith(`${toNorm}/`) || (fromDepth > toDepth && toDepth >= 1)) {
    return 'drill-up';
  }

  const fromPeer = getPeerIndex(fromNorm);
  const toPeer = getPeerIndex(toNorm);
  if (fromPeer !== -1 && toPeer !== -1 && fromPeer !== toPeer) {
    return toPeer > fromPeer ? 'peer-next' : 'peer-prev';
  }

  return 'fade';
}

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Execute a React Router navigation wrapped in document.startViewTransition
 * when supported, setting data-nav-transition on <html> for directional CSS.
 */
export function navigateWithTransition(navigate, to, { fromPath, typeOverride } = {}) {
  const currentPath = fromPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const targetUrl = new URL(to, window.location.origin);
  const transitionType = typeOverride || resolveTransitionType(currentPath, targetUrl.pathname);

  if (transitionType === 'none') {
    navigate(to);
    return;
  }

  const root = document.documentElement;
  root.dataset.navTransition = transitionType;

  const canUseViewTransition =
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function';

  if (!canUseViewTransition) {
    navigate(to);
    return;
  }

  const transition = document.startViewTransition(() => {
    flushSync(() => {
      navigate(to);
    });
  });

  transition.finished
    .catch(() => {})
    .finally(() => {
      if (root.dataset.navTransition === transitionType) {
        delete root.dataset.navTransition;
      }
    });
}
