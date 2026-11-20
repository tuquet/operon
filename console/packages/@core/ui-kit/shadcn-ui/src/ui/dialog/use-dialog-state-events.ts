import type { Ref } from 'vue';

import { onScopeDispose, watch } from 'vue';

/**
 * Popup `closed`/`opened` events are confirmed by content element exit animation (`animationend`).
 * When animations are skipped or canceled (reduced motion, interrupted animations, class changes during close),
 * events will never fire -- popup remains visible, `hidden` class is not applied,
 * and destroy-on-close remount and `onClosed` listeners hang indefinitely. Aligns with reka-ui
 * Presence behavior (`animationcancel` considered finished), and adds fallback trigger after animation window
 * ensuring the close pipeline completes exactly once.
 */

/** Repository modal exit animation duration is 150ms; 300ms safely covers it. */
const CLOSED_EVENT_FALLBACK_MS = 300;

export function useDialogStateEvents(options: {
  contentRef: Ref<null | { $el: Element | null }>;
  isOpen: () => boolean;
  onClosed: () => void;
  onOpened: () => void;
}) {
  const { contentRef, isOpen, onClosed, onOpened } = options;

  let closeFallbackTimer: null | ReturnType<typeof setTimeout> = null;
  let closeAcknowledged = false;

  function emitOpenStateChange() {
    if (closeFallbackTimer !== null) {
      clearTimeout(closeFallbackTimer);
      closeFallbackTimer = null;
    }
    if (isOpen()) {
      onOpened();
      return;
    }
    // Close confirmed by animation event or fallback -- `closed` fires once per close cycle.
    if (closeAcknowledged) {
      return;
    }
    closeAcknowledged = true;
    onClosed();
  }

  /**
   * Listen to both `animationend` and `animationcancel` on content element -- canceled animation
   * is also treated as ended (as in reka-ui Presence); close pipeline will not wait indefinitely.
   */
  function handleAnimationEvent(event: AnimationEvent) {
    if (event.target === contentRef.value?.$el) {
      emitOpenStateChange();
    }
  }

  watch(isOpen, (open) => {
    if (open) {
      closeAcknowledged = false;
      if (closeFallbackTimer !== null) {
        clearTimeout(closeFallbackTimer);
        closeFallbackTimer = null;
      }
      return;
    }
    // Start fallback timer: if no animation event confirms close (exit animation skipped/canceled),
    // trigger `closed` after animation window ends.
    if (closeFallbackTimer === null) {
      closeFallbackTimer = setTimeout(() => {
        closeFallbackTimer = null;
        if (!isOpen()) {
          emitOpenStateChange();
        }
      }, CLOSED_EVENT_FALLBACK_MS);
    }
  });

  onScopeDispose(() => {
    if (closeFallbackTimer !== null) {
      clearTimeout(closeFallbackTimer);
      closeFallbackTimer = null;
    }
  });

  return { handleAnimationEvent };
}
