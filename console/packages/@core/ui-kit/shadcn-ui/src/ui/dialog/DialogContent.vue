<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui';

import type { HTMLAttributes } from 'vue';

import type { ClassType } from '@operon-core/typings';

import { computed, ref } from 'vue';

import { cn } from '@operon-core/shared/utils';

import { X } from '@lucide/vue';
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui';

import DialogOverlay from './DialogOverlay.vue';
import { useDialogStateEvents } from './use-dialog-state-events';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<
    DialogContentProps & {
      animationType?: 'scale' | 'slide';
      appendTo?: HTMLElement | string;
      centered?: boolean;
      class?: HTMLAttributes['class'];
      closeClass?: ClassType;
      closeDisabled?: boolean;
      modal?: boolean;
      open?: boolean;
      overlayBlur?: number;
      showCloseButton?: boolean;
      zIndex?: number;
    }
  >(),
  {
    appendTo: 'body',
    animationType: 'slide',
    centered: true,
    closeDisabled: false,
    showCloseButton: true,
  },
);
const emits = defineEmits<
  DialogContentEmits & { close: []; closed: []; opened: [] }
>();

const delegatedProps = computed(() => {
  const {
    class: _,
    modal: _modal,
    open: _open,
    showCloseButton: __,
    animationType: ___,
    centered: ____,
    ...delegated
  } = props;

  return delegated;
});

function isAppendToBody() {
  return (
    props.appendTo === 'body' ||
    props.appendTo === document.body ||
    !props.appendTo
  );
}

const position = computed(() => {
  return isAppendToBody() ? 'fixed' : 'absolute';
});

// reka-ui Dialog does not render overlay when modal=false; DialogOverlay renders overlay and locks scroll.
// DialogOverlay controls mounting via v-if; internal useScrollLock unlocks scroll on unmount,
// avoiding issues where body pointer-events:none in modal=true prevents popups (e.g. Select dropdowns) from being clicked.

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const contentRef = ref<InstanceType<typeof DialogContent> | null>(null);

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
  <DialogPortal :to="appendTo">
    <Transition name="fade">
      <DialogOverlay
        v-if="open && modal"
        :overlay-blur="overlayBlur"
        :position="position"
        :z-index="zIndex"
        @click="() => emits('close')"
      />
    </Transition>
    <DialogContent
      ref="contentRef"
      :style="{
        ...(zIndex ? { zIndex } : { zIndex: 1050 }),
        position: 'fixed',
      }"
      data-slot="dialog-content"
      @animationend="handleAnimationEvent"
      @animationcancel="handleAnimationEvent"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'z-popup bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-1/2 -translate-x-1/2 grid gap-4 max-h-[90vh] overflow-y-auto w-full max-w-[calc(100%-2rem)] sm:max-w-lg border border-border p-6 shadow-xl outline-hidden sm:rounded-xl',
          {
            'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]':
              animationType === 'slide' && !centered,
            'data-[state=closed]:slide-out-to-top-[148%] data-[state=open]:slide-in-from-top-[98%]':
              animationType === 'slide' && centered,
            'top-[10vh]': !centered,
            'top-1/2 -translate-y-1/2': centered,
          },
          props.class,
        )
      "
    >
      <slot></slot>

      <DialogClose
        v-if="showCloseButton"
        :disabled="closeDisabled"
        data-slot="dialog-close"
        :class="
          cn(
            'flex-center text-foreground/80 hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-3 right-3 h-6 w-6 rounded-full px-1 text-lg opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden disabled:pointer-events-none',
            props.closeClass,
          )
        "
        @click="() => emits('close')"
      >
        <X class="size-4" />
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
