import { ELEMENT_ID_LAYOUT_SCROLL } from '../constants/globals';

export interface VisibleDomRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

/**
 * Get element visibility information
 * @param element
 */
export function getElementVisibleRect(
  element?: HTMLElement | null | undefined,
): VisibleDomRect {
  if (!element) {
    return {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
    };
  }
  const rect = element.getBoundingClientRect();
  const viewHeight = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight,
  );

  const top = Math.max(rect.top, 0);
  const bottom = Math.min(rect.bottom, viewHeight);

  const viewWidth = Math.max(
    document.documentElement.clientWidth,
    window.innerWidth,
  );

  const left = Math.max(rect.left, 0);
  const right = Math.min(rect.right, viewWidth);

  // If element is completely hidden, return empty DOMRect
  if (top >= viewHeight || bottom <= 0 || left >= viewWidth || right <= 0) {
    return {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
    };
  }

  return {
    bottom,
    height: Math.max(0, bottom - top),
    left,
    right,
    top,
    width: Math.max(0, right - left),
  };
}

export function getScrollbarWidth() {
  const scrollDiv = document.createElement('div');

  scrollDiv.style.visibility = 'hidden';
  scrollDiv.style.overflow = 'scroll';
  scrollDiv.style.position = 'absolute';
  scrollDiv.style.top = '-9999px';

  document.body.append(scrollDiv);

  const innerDiv = document.createElement('div');
  scrollDiv.append(innerDiv);

  const scrollbarWidth = scrollDiv.offsetWidth - innerDiv.offsetWidth;

  scrollDiv.remove();
  return scrollbarWidth;
}

export function getLayoutScrollElement() {
  return document.querySelector<HTMLElement>(`#${ELEMENT_ID_LAYOUT_SCROLL}`);
}

function elementNeedsScrollbar(element: HTMLElement) {
  const overflowY = window.getComputedStyle(element).overflowY;
  if (overflowY === 'hidden' || overflowY === 'clip') {
    return false;
  }

  return element.scrollHeight > element.clientHeight;
}

export function needsScrollbar(target?: HTMLElement | null) {
  if (target) {
    return elementNeedsScrollbar(target);
  }

  const doc = document.documentElement;
  const body = document.body;

  // Check body overflow-y style
  const overflowY = window.getComputedStyle(body).overflowY;

  // If scrollbar style is explicitly configured
  if (overflowY === 'scroll' || overflowY === 'auto') {
    return doc.scrollHeight > window.innerHeight;
  }

  // Otherwise, compare scrollHeight and innerHeight
  return doc.scrollHeight > window.innerHeight;
}

export function triggerWindowResize(): void {
  // Create new resize event
  const resizeEvent = new Event('resize');

  // Dispatch window resize event
  window.dispatchEvent(resizeEvent);
}
