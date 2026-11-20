<script setup lang="ts">
import type { StyleValue } from 'vue';

import type { PageProps } from './types';

import { computed, ref, watch } from 'vue';

import { VbenLoading } from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

defineOptions({
  name: 'Page',
});

const {
  autoContentHeight = true,
  heightOffset = 0,
  footerFixed = false,
  loading = false,
  loadingText = '',
  minLoadingTime = 50,
} = defineProps<PageProps>();

const hasUsedSpinner = ref(Boolean(loading));

watch(
  () => loading,
  (isLoading) => {
    if (isLoading) {
      hasUsedSpinner.value = true;
    }
  },
);

const contentStyle = computed<StyleValue>(() => {
  if (!autoContentHeight) {
    return {};
  }

  return {
    '--page-content-height-offset': `${heightOffset}px`,
    marginBlockEnd: 'var(--page-content-height-offset)',
  };
});
</script>

<template>
  <div
    :class="
      cn(
        'relative flex h-full min-h-0 flex-col',
        autoContentHeight && 'overflow-hidden',
      )
    "
  >
    <div
      v-if="
        description ||
        $slots.description ||
        title ||
        $slots.title ||
        $slots.extra
      "
      :class="
        cn(
          'relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6',
          headerClass,
        )
      "
    >
      <div class="min-w-0 flex-auto">
        <slot name="title">
          <div
            v-if="title"
            class="flex text-lg font-semibold tracking-tight text-foreground"
            :class="{ 'mb-2': description || $slots.description }"
          >
            {{ title }}
          </div>
        </slot>

        <slot name="description">
          <p v-if="description" class="text-sm text-muted-foreground">
            {{ description }}
          </p>
        </slot>
      </div>

      <div
        v-if="$slots.extra"
        class="flex shrink-0 flex-wrap items-center gap-2"
      >
        <slot name="extra"></slot>
      </div>
    </div>

    <div
      data-layout-region="page-content"
      :class="
        cn(
          autoContentHeight
            ? 'min-h-0 flex-1 flex flex-col overflow-y-auto'
            : 'flex-1',
          'relative p-4',
          contentClass,
        )
      "
      :style="contentStyle"
    >
      <Transition
        v-if="$slots.loading"
        name="page-loading-fade"
        mode="out-in"
      >
        <div
          v-if="loading"
          key="page-loading"
          data-layout-region="page-loading"
          class="flex min-h-0 flex-1 flex-col"
          style="gap: inherit"
        >
          <slot name="loading"></slot>
        </div>
        <div
          v-else
          key="page-ready"
          class="flex min-h-0 flex-1 flex-col"
          style="gap: inherit"
        >
          <slot></slot>
        </div>
      </Transition>
      <template v-else>
        <slot></slot>
        <VbenLoading
          v-if="hasUsedSpinner"
          :min-loading-time="minLoadingTime"
          :spinning="loading"
          :text="loadingText"
        />
      </template>
    </div>
    <div
      v-if="$slots.footer"
      :class="
        cn(
          'align-center flex bg-card px-6 py-4',
          footerFixed ? 'mt-auto shrink-0' : 'shrink-0',
          footerClass,
        )
      "
    >
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped>
.page-loading-fade-enter-active,
.page-loading-fade-leave-active {
  transition: opacity 150ms ease;
}

.page-loading-fade-enter-from,
.page-loading-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-loading-fade-enter-active,
  .page-loading-fade-leave-active {
    transition-duration: 0ms;
  }
}
</style>
