import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Micro-App Local Store.
 * Enforces namespaced store ID `automation:sample` to avoid collisions in the Shell Pinia tree.
 */
export const useSampleStore = defineStore('automation:sample', () => {
  const counter = ref(0);
  const statusMessage = ref('Ready');

  function increment() {
    counter.value += 1;
    statusMessage.value = `Updated at ${new Date().toLocaleTimeString()}`;
  }

  function reset() {
    counter.value = 0;
    statusMessage.value = 'Reset';
  }

  return {
    counter,
    statusMessage,
    increment,
    reset,
  };
});
