<script setup lang="ts">
import type { AlertDialogContentEmits, AlertDialogContentProps } from 'reka-ui';

import type { ClassType } from '@operon-core/typings';

import { ref } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { reactiveOmit } from '@vueuse/core';
import {
  AlertDialogContent,
  AlertDialogPortal,
  useForwardPropsEmits,
} from 'reka-ui';

import { useDialogStateEvents } from '../dialog/use-dialog-state-events';
import AlertDialogOverlay from './AlertDialogOverlay.vue';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<
    AlertDialogContentProps & {
      centered?: boolean;
      class?: ClassType;
      modal?: boolean;
      open?: boolean;
      overlayBlur?: number;
      zIndex?: number;
    }
  >(),
  { modal: true },
);
const emits = defineEmits<
  AlertDialogContentEmits & { close: []; closed: []; opened: [] }
>();

// reka-ui AlertDialog sets pointer-events:none on body when modal=true,
// which prevents popups (e.g. Select dropdowns) from being clicked. Passing :modal="false"
// avoids this while AlertDialogOverlay renders overlay and locks scroll.
// AlertDialogOverlay uses v-if to control mounting; internal useScrollLock
// unlocks scroll automatically upon component unmount.

const delegatedProps = reactiveOmit(props, 'class');

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const contentRef = ref<InstanceType<typeof AlertDialogContent> | null>(null);

const { handleAnimationEvent } = useDialogStateEvents({
  contentRef,
  isOpen: () => props.open,
  onClosed: () => emits('closed'),
  onOpened: () => emits('opened'),
});

defineExpose({
  getContentRef: () => contentRef.value,
});
</script>

<template>
  <AlertDialogPortal>
    <Transition name="fade" appear>
      <AlertDialogOverlay
        v-if="open && modal"
        :overlay-blur="overlayBlur"
        position="fixed"
        :z-index="zIndex"
        @click="() => emits('close')"
      />
    </Transition>
    <AlertDialogContent
      data-slot="alert-dialog-content"
      ref="contentRef"
      :style="{ ...(zIndex ? { zIndex } : {}), position: 'fixed' }"
      @animationend="handleAnimationEvent"
      @animationcancel="handleAnimationEvent"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'z-popup bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-1/2 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          {
            'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]':
              !centered,
            'data-[state=closed]:slide-out-to-top-[148%] data-[state=open]:slide-in-from-top-[98%]':
              centered,
            'top-[10vh]': !centered,
            'top-1/2 -translate-y-1/2': centered,
          },
          props.class,
        )
      "
    >
      <slot></slot>
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
