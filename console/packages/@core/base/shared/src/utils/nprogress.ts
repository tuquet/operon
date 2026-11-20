import type NProgress from 'nprogress';

// NProgress instance variable (null initially)
let nProgressInstance: null | typeof NProgress = null;

/**
 * Dynamically load NProgress library and configure it.
 * Reuses instance if already loaded; otherwise dynamically imports and configures it.
 
 *
 * @returns Promise resolving to NProgress instance.
 */
async function loadNprogress() {
  if (nProgressInstance) {
    return nProgressInstance;
  }
  nProgressInstance = await import('nprogress');
  nProgressInstance.configure({
    showSpinner: true,
    speed: 300,
  });
  return nProgressInstance;
}

/**
 * Start progress bar.
 * Loads NProgress and calls start().
 */
async function startProgress() {
  const nprogress = await loadNprogress();
  nprogress?.start();
}

/**
 * Stop and hide progress bar.
 * Loads NProgress and calls done().
 */
async function stopProgress() {
  const nprogress = await loadNprogress();
  nprogress?.done();
}

export { startProgress, stopProgress };
