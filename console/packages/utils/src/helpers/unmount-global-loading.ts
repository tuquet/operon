/**
 * Remove and destroy loading element
 * Placed here instead of inside index.html #app to avoid harsh flash when rendering quickly
 * Improves experience by adding CSS fade-out animation first, then removing loading node once animation finishes
 * Trade-off: slightly adds code complexity
 * Custom loading docs
 */
export function unmountGlobalLoading() {
  // Find global loading element
  const loadingElement = document.querySelector('#__app-loading__');

  if (loadingElement) {
    // Add hidden class to trigger transition animation
    loadingElement.classList.add('hidden');

    // Find all injected loading elements to remove
    const injectLoadingElements = document.querySelectorAll(
      '[data-app-loading^="inject"]',
    );

    // When transition animation ends, remove loading element and all injected loading elements
    loadingElement.addEventListener(
      'transitionend',
      () => {
        loadingElement.remove(); // Remove loading element
        injectLoadingElements.forEach((el) => el.remove()); // Remove all injected loading elements
      },
      { once: true },
    ); // Ensure event fires only once
  }
}
