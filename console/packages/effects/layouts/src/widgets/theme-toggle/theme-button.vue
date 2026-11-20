<script lang="ts" setup>
import { nextTick } from 'vue';

import { MoonStar, Sun } from '@operon/icons';
import { $t } from '@operon/locales';

import { Button } from '@operon-core/shadcn-ui';

interface Props {
  /**
   * Type
   */
  type?: 'icon' | 'normal';
}

defineOptions({
  name: 'ThemeToggleButton',
});

const props = withDefaults(defineProps<Props>(), {
  type: 'normal',
});

const isDark = defineModel<boolean>();

function toggleTheme(event: MouseEvent) {
  const isAppearanceTransition =
    // @ts-expect-error - startViewTransition is not available in the current DOM lib target
    document.startViewTransition &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isAppearanceTransition || !event) {
    isDark.value = !isDark.value;
    return;
  }
  const x = event.clientX;
  const y = event.clientY;
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  );
  const root = document.documentElement;
  root.classList.add('theme-transitioning');

  const transition = document.startViewTransition(async () => {
    isDark.value = !isDark.value;
    await nextTick();
  });

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];
    root.animate(
      {
        clipPath,
      },
      {
        duration: 1000,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  });

  transition.finished.finally(() => {
    root.classList.remove('theme-transitioning');
  });
}
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    :size="props.type === 'icon' ? 'icon' : 'default'"
    :aria-label="
      isDark ? $t('preferences.theme.light') : $t('preferences.theme.dark')
    "
    @click.stop="toggleTheme"
  >
    <Sun v-if="isDark" />
    <MoonStar v-else />
  </Button>
</template>

<style>
::view-transition-old(root),
::view-transition-new(root) {
  mix-blend-mode: normal;
  animation: none;
}

::view-transition-old(root) {
  z-index: 1;
}

::view-transition-new(root) {
  z-index: 9999;
}

html.theme-transitioning *,
html.theme-transitioning *::before,
html.theme-transitioning *::after {
  transition: none !important;
}
</style>
