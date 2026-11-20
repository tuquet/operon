<script setup lang="ts">
import { computed } from 'vue';

import { VbenAvatar } from '../avatar';
import SpecterLogo from './specter-logo.vue';

interface Props {
  /**
   * Whether text is collapsed; layout state, hides text when sidebar collapses.
   */
  collapsed?: boolean;
  /**
   * Logo image fit mode
   */
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /**
   * Logo height, effective only when logoMode=full
   */
  fullLogoHeight?: number | string;
  /**
   * Logo target URL
   */
  href?: string;
  /**
   * Logo display mode: icon mode or full mode filling logo area
   */
  logoMode?: 'full' | 'icon';
  /**
   * Logo image size
   */
  logoSize?: number;
  /**
   * Whether logo displays text
   */
  showText?: boolean;
  /**
   * Logo icon
   */
  src?: string;
  /**
   * Dark theme Logo icon (optional, defaults to src if omitted)
   */
  srcDark?: string;

  /**
   * Logo text
   */
  text: string;

  /**
   * Logo theme
   */
  theme?: string;
}

defineOptions({
  name: 'VbenLogo',
});

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  href: 'javascript:void 0',
  logoMode: 'icon',
  logoSize: 32,
  fullLogoHeight: 42,
  src: '',
  srcDark: '',
  theme: 'light',
  fit: 'cover',
  showText: true,
});

/**
 * Choose appropriate logo icon based on theme
 */
const logoSrc = computed(() => {
  // If dark theme and srcDark is provided, use dark theme logo
  if (props.theme === 'dark' && props.srcDark) {
    return props.srcDark;
  }
  // Otherwise use default src
  return props.src;
});

/**
 * Whether to render the inline theme-reactive SVG logo
 */
const isBuiltinSpecterLogo = computed(() => {
  const s = logoSrc.value.trim();
  return (
    !s ||
    s === '/logo.svg' ||
    s === '/logo-app.svg' ||
    s.endsWith('/logo.svg') ||
    s.endsWith('/logo-app.svg')
  );
});

/**
 * Whether to fill container to display logo
 */
const shouldUseFullLogo = computed(() => {
  return props.logoMode === 'full' && !props.collapsed;
});

/**
 * Display logo text according to configuration
 */
const shouldShowText = computed(() => {
  return (
    props.showText &&
    !props.collapsed &&
    !shouldUseFullLogo.value &&
    !!props.text
  );
});

/**
 * Logo styles under full mode
 */
const fullLogoStyle = computed(() => ({
  height:
    typeof props.fullLogoHeight === 'number'
      ? `${props.fullLogoHeight}px`
      : props.fullLogoHeight,
  objectFit: props.fit,
}));
</script>

<template>
  <div :class="theme" class="flex h-full items-center text-lg">
    <a
      :class="[
        $attrs.class,
        shouldShowText
          ? 'gap-2 px-3 justify-start'
          : 'w-full p-0 justify-center',
      ]"
      :href="href"
      class="flex h-full items-center overflow-hidden text-lg leading-normal transition-all duration-500"
    >
      <SpecterLogo
        v-if="isBuiltinSpecterLogo"
        :aria-label="text"
        :size="logoSize"
        :theme="theme"
        class="shrink-0 text-foreground transition-transform duration-300"
      />

      <img
        v-else-if="logoSrc && shouldUseFullLogo"
        :alt="text"
        :src="logoSrc"
        :style="fullLogoStyle"
        class="w-full"
      />

      <VbenAvatar
        v-else-if="logoSrc"
        :alt="text"
        :src="logoSrc"
        :size="logoSize"
        :fit="fit"
        class="relative rounded-none bg-transparent"
      />
      <template v-if="shouldShowText">
        <slot name="text">
          <span
            class="text-foreground hidden truncate font-semibold text-nowrap leading-normal sm:block"
          >
            {{ text }}
          </span>
        </slot>
      </template>
    </a>
  </div>
</template>
