import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { preferences } from '@operon/preferences';

/**
 * Content transition loading spinner:
 * - Delayed display: does not render spinner if navigation finishes within showDelay,
 *   preventing jarring flash of overlay on fast navigations (issue #8289);
 * - Minimum duration: once shown, spinner persists for at least minShowTime.
 */
function useContentSpinner() {
  const spinning = ref(false);
  const startTime = ref(0);
  const router = useRouter();
  const showDelay = 200; // Delay before showing spinner: fast navigations skip loading
  const minShowTime = 500; // Minimum display duration
  const enableLoading = computed(() => preferences.transition.loading);

  let hideTimer: null | ReturnType<typeof setTimeout> = null;
  let navSeq = 0;
  const routeSeq = new WeakMap<object, number>();
  let showTimer: null | {
    id: ReturnType<typeof setTimeout>;
    seq: number;
  } = null;

  const clearTimers = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (showTimer) {
      clearTimeout(showTimer.id);
      showTimer = null;
    }
  };

  // End loading animation
  const onEnd = (seq: number | undefined) => {
    if (!enableLoading.value || seq !== navSeq) {
      return;
    }
    if (showTimer?.seq === seq) {
      clearTimeout(showTimer.id);
      showTimer = null;
    }
    // Spinner never shown (fast navigation): exit immediately without flashing
    if (!spinning.value) {
      return;
    }
    const processTime = performance.now() - startTime.value;
    if (processTime < minShowTime) {
      hideTimer = setTimeout(() => {
        hideTimer = null;
        spinning.value = false;
      }, minShowTime - processTime);
    } else {
      spinning.value = false;
    }
  };

  // Router beforeEach guard
  router.beforeEach((to) => {
    if (to.meta.loaded || !enableLoading.value || to.meta.iframeSrc) {
      return true;
    }
    clearTimers();
    navSeq += 1;
    const seq = navSeq;
    routeSeq.set(to, seq);
    const id = setTimeout(() => {
      if (showTimer?.seq === seq) {
        showTimer = null;
      }
      // Only display if current navigation is active, preventing stale timer flash
      if (seq === navSeq && !spinning.value) {
        startTime.value = performance.now();
        spinning.value = true;
      }
    }, showDelay);
    showTimer = { id, seq };
    return true;
  });

  // Router afterEach guard
  router.afterEach((to) => {
    if (to.meta.loaded || !enableLoading.value || to.meta.iframeSrc) {
      return true;
    }
    onEnd(routeSeq.get(to));
    return true;
  });

  return { spinning };
}

export { useContentSpinner };
