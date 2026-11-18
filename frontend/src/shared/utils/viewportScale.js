/**
 * Global Viewport Scaling Engine
 * Đồng bộ logic co giãn giao diện Desktop & Mobile từ trang /la-so-tu-vi cho toàn bộ website:
 * - Mobile (<= 580px): Giữ nguyên bố cục Mobile tự nhiên (scale = 1, class .viewport-mobile).
 * - Desktop (> 580px): Giữ nguyên bố cục Desktop chuẩn 1280px (class .viewport-desktop) và
 *   tự động scale đồng nhất theo tỷ lệ cửa sổ khi thu nhỏ (< 1280px) để không vỡ dòng hay đổi bố cục.
 */

export const VIEWPORT_MOBILE_MAX_WIDTH = 580;
export const VIEWPORT_DESKTOP_BASE_WIDTH = 1280;
export const VIEWPORT_MIN_SCALE = 0.3;

export function isSafariBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isAppleWebKit = /AppleWebKit/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/i.test(ua);
  const isIOSWebKit = /iP(ad|hone|od)/i.test(ua);
  return isAppleWebKit || isIOSWebKit;
}

export function getViewportWidth() {
  if (typeof window === 'undefined') return VIEWPORT_DESKTOP_BASE_WIDTH;
  return document.documentElement?.clientWidth || window.innerWidth || VIEWPORT_DESKTOP_BASE_WIDTH;
}

export function isMobileViewport(width = getViewportWidth()) {
  return width <= VIEWPORT_MOBILE_MAX_WIDTH;
}

export function computeDesktopScale(width = getViewportWidth()) {
  if (width <= VIEWPORT_MOBILE_MAX_WIDTH) return 1;
  const rawScale = width / VIEWPORT_DESKTOP_BASE_WIDTH;
  return Number(Math.min(1.0, Math.max(VIEWPORT_MIN_SCALE, rawScale)).toFixed(6));
}

export function applyGlobalViewportScale() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const htmlEl = document.documentElement;
  const bodyEl = document.body;
  if (!htmlEl || !bodyEl) return;

  const width = getViewportWidth();
  const mobile = isMobileViewport(width);
  const safari = isSafariBrowser();

  htmlEl.classList.toggle('is-safari', safari);
  bodyEl.classList.toggle('is-safari', safari);

  if (mobile) {
    htmlEl.classList.remove('viewport-desktop');
    htmlEl.classList.add('viewport-mobile');
    bodyEl.classList.remove('viewport-desktop');
    bodyEl.classList.add('viewport-mobile');

    htmlEl.style.zoom = '';
    htmlEl.style.setProperty('--viewport-scale', '1');
    bodyEl.style.minWidth = '';
    return;
  }

  const scale = computeDesktopScale(width);

  htmlEl.classList.remove('viewport-mobile');
  htmlEl.classList.add('viewport-desktop');
  bodyEl.classList.remove('viewport-mobile');
  bodyEl.classList.add('viewport-desktop');

  // Trên Apple Safari (macOS/iPadOS/iOS WebKit), CSS zoom trên :root làm sai lệch vh/vw, position: fixed và iframe
  if (safari) {
    htmlEl.style.zoom = '';
    htmlEl.style.setProperty('--viewport-scale', '1');
    bodyEl.style.minWidth = '';
    return;
  }

  if (scale < 1) {
    htmlEl.style.zoom = String(scale);
    htmlEl.style.setProperty('--viewport-scale', String(scale));
    bodyEl.style.minWidth = `${VIEWPORT_DESKTOP_BASE_WIDTH}px`;
  } else {
    htmlEl.style.zoom = '';
    htmlEl.style.setProperty('--viewport-scale', '1');
    bodyEl.style.minWidth = '';
  }
}

export function initGlobalViewportScale() {
  if (typeof window === 'undefined') return () => {};

  applyGlobalViewportScale();

  let rafId = null;
  const scheduleUpdate = () => {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      applyGlobalViewportScale();
    });
  };

  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });

  return () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('resize', scheduleUpdate);
    window.removeEventListener('orientationchange', scheduleUpdate);
  };
}
