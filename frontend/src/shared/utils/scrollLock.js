import { useEffect } from 'react';

let lockCount = 0;
let savedStyles = null;
let lastTouchY = null;

function findScrollableAncestor(target) {
  let node = target instanceof Element ? target : target?.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node.hasAttribute('data-scroll-lock-allow') || node.classList.contains('billing-modal-body') || node.classList.contains('auth-modal')) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Spacebar',
]);

function handleWheel(e) {
  e.stopPropagation();
  const scrollable = findScrollableAncestor(e.target);
  if (!scrollable) {
    if (e.cancelable) e.preventDefault();
    return;
  }

  const { scrollTop, scrollHeight, clientHeight } = scrollable;
  const atTop = scrollTop <= 0 && e.deltaY < 0;
  const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
  if ((atTop || atBottom) && e.cancelable) {
    e.preventDefault();
  }
}

function handleTouchStart(e) {
  if (e.touches && e.touches.length === 1) {
    lastTouchY = e.touches[0].clientY;
  }
}

function handleTouchMove(e) {
  e.stopPropagation();
  const scrollable = findScrollableAncestor(e.target);
  if (!scrollable) {
    if (e.cancelable) e.preventDefault();
    return;
  }

  if (e.touches && e.touches.length === 1 && lastTouchY !== null) {
    const currentY = e.touches[0].clientY;
    const deltaY = lastTouchY - currentY;
    lastTouchY = currentY;
    const { scrollTop, scrollHeight, clientHeight } = scrollable;
    const atTop = scrollTop <= 0 && deltaY < 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && deltaY > 0;
    if ((atTop || atBottom) && e.cancelable) {
      e.preventDefault();
    }
  }
}

function handleTouchEnd() {
  lastTouchY = null;
}

function handleKeyDown(e) {
  if (!SCROLL_KEYS.has(e.key)) return;
  const target = e.target;
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
    return;
  }
  e.stopPropagation();
  const scrollable = findScrollableAncestor(target);
  if (!scrollable && e.cancelable) {
    e.preventDefault();
  }
}

export function isScrollLocked() {
  return lockCount > 0;
}

export function acquireScrollLock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  if (lockCount === 0) {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const scrollbarWidth = window.innerWidth - htmlEl.clientWidth;

    savedStyles = {
      htmlOverflow: htmlEl.style.getPropertyValue('overflow'),
      htmlOverflowPriority: htmlEl.style.getPropertyPriority('overflow'),
      htmlOverscroll: htmlEl.style.overscrollBehavior,
      bodyOverflow: bodyEl.style.getPropertyValue('overflow'),
      bodyOverflowPriority: bodyEl.style.getPropertyPriority('overflow'),
      bodyOverscroll: bodyEl.style.overscrollBehavior,
      bodyPaddingRight: bodyEl.style.paddingRight,
    };

    htmlEl.style.setProperty('overflow', 'hidden', 'important');
    htmlEl.style.overscrollBehavior = 'none';
    bodyEl.style.setProperty('overflow', 'hidden', 'important');
    bodyEl.style.overscrollBehavior = 'none';
    if (scrollbarWidth > 0) {
      bodyEl.style.paddingRight = `${scrollbarWidth}px`;
    }

    window.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    window.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    window.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
  }

  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);

    if (lockCount === 0 && savedStyles) {
      const htmlEl = document.documentElement;
      const bodyEl = document.body;

      if (savedStyles.htmlOverflow) {
        htmlEl.style.setProperty('overflow', savedStyles.htmlOverflow, savedStyles.htmlOverflowPriority);
      } else {
        htmlEl.style.removeProperty('overflow');
      }
      htmlEl.style.overscrollBehavior = savedStyles.htmlOverscroll;

      if (savedStyles.bodyOverflow) {
        bodyEl.style.setProperty('overflow', savedStyles.bodyOverflow, savedStyles.bodyOverflowPriority);
      } else {
        bodyEl.style.removeProperty('overflow');
      }
      bodyEl.style.overscrollBehavior = savedStyles.bodyOverscroll;
      bodyEl.style.paddingRight = savedStyles.bodyPaddingRight;
      savedStyles = null;

      window.removeEventListener('wheel', handleWheel, { capture: true });
      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('touchend', handleTouchEnd, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }
  };
}

/**
 * Khóa cuộn trang toàn cục khi modal/overlay đang hiển thị.
 */
export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return undefined;
    return acquireScrollLock();
  }, [isLocked]);
}
