<script lang="ts" setup>
import type { ExtendedModalApi, ModalProps } from './modal';

import {
  computed,
  nextTick,
  onDeactivated,
  provide,
  ref,
  unref,
  useId,
  watch,
} from 'vue';

import { usePriorityValues, useSimpleLocale } from '@operon-core/composables';
import { Expand, Shrink } from '@operon-core/icons';
import { usePreferences } from '@operon-core/preferences';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  VbenButton,
  VbenHelpTooltip,
  VbenIconButton,
  VbenLoading,
  VisuallyHidden,
} from '@operon-core/shadcn-ui';
import { ELEMENT_ID_MAIN_CONTENT } from '@operon-core/shared/constants';
import { globalShareState } from '@operon-core/shared/global-state';
import { cn } from '@operon-core/shared/utils';

import { useModalDraggable } from './use-modal-draggable';

interface Props extends ModalProps {
  modalApi?: ExtendedModalApi;
}

const props = withDefaults(defineProps<Props>(), {
  appendToMain: false,
  destroyOnClose: false,
  modalApi: undefined,
});

const components = globalShareState.getComponents();

const contentRef = ref();
const wrapperRef = ref<HTMLElement>();
const dialogRef = ref<HTMLElement>();
const headerRef = ref();
// @ts-expect-error unused
const footerRef = ref();

const { $t } = useSimpleLocale();
const { globalEscapeShortcutKey } = usePreferences();
const state = props.modalApi?.useStore?.();

const id = useId();
// Overlay is marked by this id; closing is only allowed when click occurs on current Modal overlay
provide('DISMISSABLE_MODAL_ID', id);

const {
  appendToMain,
  bordered,
  cancelText,
  centered,
  class: modalClass,
  closable,
  closeOnClickModal,
  closeOnPressEscape,
  confirmDisabled,
  confirmLoading,
  confirmText,
  contentClass,
  description,
  destroyOnClose,
  draggable,
  overflow,
  footer: showFooter,
  footerClass,
  fullscreen,
  fullscreenButton,
  header,
  headerClass,
  loading: showLoading,
  modal,
  openAutoFocus,
  overlayBlur,
  showCancelButton,
  showConfirmButton,
  submitting,
  title,
  titleTooltip,
  animationType,
  zIndex,
} = usePriorityValues(props, state);

const shouldFullscreen = computed(() => fullscreen.value);

const shouldDraggable = computed(
  () => draggable.value && !shouldFullscreen.value && header.value,
);

const shouldCentered = computed(
  () => centered.value && !shouldFullscreen.value,
);

const getAppendTo = computed(() => {
  return appendToMain.value ? `#${ELEMENT_ID_MAIN_CONTENT}` : undefined;
});

const { dragging, transform } = useModalDraggable(
  dialogRef,
  headerRef,
  shouldDraggable,
  getAppendTo,
  shouldCentered,
  overflow,
);

const firstOpened = ref(false);
const isClosed = ref(true);

function hasFocusableWrapperContent() {
  return Boolean(
    wrapperRef.value?.querySelector(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function focusConfirmButton() {
  dialogRef.value
    ?.querySelector<HTMLElement>('[data-slot="modal-confirm"]')
    ?.focus();
}

function handleDocumentKeyDown(e: KeyboardEvent) {
  if (
    e.key !== 'Enter' ||
    e.defaultPrevented ||
    e.isComposing ||
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    e.shiftKey ||
    e.repeat ||
    !state?.value?.isOpen ||
    !openAutoFocus.value ||
    !showFooter.value ||
    !showConfirmButton.value ||
    confirmDisabled.value ||
    confirmLoading.value ||
    submitting.value
  ) {
    return;
  }

  const target = e.target;
  if (target instanceof Element) {
    if (target.closest('[role="menuitem"]')) {
      return;
    }
    if (
      dialogRef.value?.contains(target) &&
      target.closest(
        'input, textarea, select, [contenteditable="true"], a[href], button:not([data-slot="modal-confirm"])',
      )
    ) {
      return;
    }
  }

  e.preventDefault();
  props.modalApi?.onConfirm();
}

watch(
  () => Boolean(state?.value?.isOpen && openAutoFocus.value),
  (enabled, _, onCleanup) => {
    if (!enabled || typeof document === 'undefined') return;
    document.addEventListener('keydown', handleDocumentKeyDown);
    onCleanup(() => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
    });
  },
  { immediate: true },
);

watch(
  () => state?.value?.isOpen,
  async (v) => {
    if (v) {
      isClosed.value = false;
      if (!firstOpened.value) firstOpened.value = true;
      await nextTick();
      if (!contentRef.value) return;
      const innerContentRef = contentRef.value.getContentRef();
      dialogRef.value = innerContentRef?.$el ?? innerContentRef;
      // reopen modal reassign value
      const { offsetX, offsetY } = transform;
      if (dialogRef.value?.style) {
        dialogRef.value.style.transform =
          offsetX !== 0 || offsetY !== 0
            ? `translate(${offsetX}px, ${offsetY}px)`
            : '';
      }
      if (
        openAutoFocus.value &&
        !hasFocusableWrapperContent() &&
        showConfirmButton.value &&
        !confirmDisabled.value &&
        !submitting.value
      ) {
        focusConfirmButton();
      }
    }
  },
  { immediate: true },
);

// watch(
//   () => [showLoading.value, submitting.value],
//   ([l, s]) => {
//     if ((s || l) && wrapperRef.value) {
//       wrapperRef.value.scrollTo({
//         // behavior: 'smooth',
//         top: 0,
//       });
//     }
//   },
// );

/**
 * When keepAlive is enabled, navigating back via browser buttons/gestures will not close modal
 */
onDeactivated(() => {
  // If modal is not mounted to content area, close modal
  if (!appendToMain.value) {
    props.modalApi?.close();
  }
});

function handleFullscreen() {
  props.modalApi?.setState((prev) => {
    // if (prev.fullscreen) {
    //   resetPosition();
    // }
    return { ...prev, fullscreen: !fullscreen.value };
  });
}
function interactOutside(e: Event) {
  if (!closeOnClickModal.value || submitting.value) {
    e.preventDefault();
    e.stopPropagation();
  }
}
function escapeKeyDown(e: KeyboardEvent) {
  if (
    !closeOnPressEscape.value ||
    !globalEscapeShortcutKey.value ||
    submitting.value
  ) {
    e.preventDefault();
  }
}

function handleOpenAutoFocus(e: Event) {
  if (!openAutoFocus.value) {
    e?.preventDefault();
    return;
  }
  if (
    !hasFocusableWrapperContent() &&
    showConfirmButton.value &&
    !confirmDisabled.value &&
    !submitting.value
  ) {
    e?.preventDefault();
    focusConfirmButton();
  }
}

// pointer-down-outside
function pointerDownOutside(e: Event) {
  const target = e.target as HTMLElement;
  const isDismissableModal = target?.dataset.dismissableModal;
  if (
    !closeOnClickModal.value ||
    isDismissableModal !== id ||
    submitting.value
  ) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function handleFocusOutside(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

function handleCloseAutoFocus(_e: Event) {
  // allow reka-ui to return focus to the trigger element on close
}

const getForceMount = computed(() => {
  return !unref(destroyOnClose) && unref(firstOpened);
});

const handleOpened = () => {
  requestAnimationFrame(() => {
    props.modalApi?.onOpened();
  });
};

function handleClosed() {
  isClosed.value = true;
  props.modalApi?.onClosed();
}
</script>
<template>
  <Dialog
    :modal="false"
    :open="state?.isOpen"
    :unmount-on-hide="Boolean(state?.isOpen || !getForceMount)"
    @update:open="() => (!submitting ? modalApi?.close() : undefined)"
  >
    <DialogContent
      ref="contentRef"
      :append-to="getAppendTo"
      :centered="shouldCentered"
      :class="
        cn(
          'flex w-full max-w-[calc(100vw-2rem)] sm:w-130 flex-col gap-0 p-0',
          shouldFullscreen ? 'rounded-none' : 'rounded-(--radius)',
          {
            'border border-border': bordered,
            'shadow-3xl': !bordered,
            'max-h-[min(80%,calc(100dvh-20px))]': !shouldFullscreen,
            'top-0! left-0! size-full! max-h-full! max-w-full! translate-none! transform-none!':
              shouldFullscreen,
            'duration-300': !dragging,
            hidden: isClosed,
          },
          modalClass,
        )
      "
      :modal="modal"
      :open="state?.isOpen"
      :show-close-button="closable"
      :animation-type="animationType"
      :z-index="zIndex"
      :overlay-blur="overlayBlur"
      close-class="top-3"
      @close-auto-focus="handleCloseAutoFocus"
      @closed="handleClosed"
      :close-disabled="submitting"
      @escape-key-down="escapeKeyDown"
      @focus-outside="handleFocusOutside"
      @interact-outside="interactOutside"
      @open-auto-focus="handleOpenAutoFocus"
      @opened="handleOpened"
      @pointer-down-outside="pointerDownOutside"
    >
      <DialogHeader
        ref="headerRef"
        :class="
          cn(
            'px-5 py-4',
            {
              'border-b': bordered,
              hidden: !header,
              'cursor-move select-none': shouldDraggable,
            },
            headerClass,
          )
        "
      >
        <DialogTitle v-if="title" class="text-left">
          <slot name="title">
            {{ title }}

            <slot v-if="titleTooltip" name="titleTooltip">
              <VbenHelpTooltip trigger-class="pb-1">
                {{ titleTooltip }}
              </VbenHelpTooltip>
            </slot>
          </slot>
        </DialogTitle>
        <DialogDescription v-if="description">
          <slot name="description">
            {{ description }}
          </slot>
        </DialogDescription>
        <VisuallyHidden v-if="!title || !description">
          <DialogTitle v-if="!title" />
          <DialogDescription v-if="!description" />
        </VisuallyHidden>
      </DialogHeader>
      <div
        ref="wrapperRef"
        :class="
          cn('relative min-h-40 flex-1 overflow-y-auto p-3', contentClass, {
            'pointer-events-none': showLoading || submitting,
          })
        "
      >
        <slot></slot>
      </div>
      <VbenLoading v-if="showLoading || submitting" spinning />
      <div
        v-if="fullscreenButton || $slots.extra"
        class="absolute top-3 right-10 flex items-center gap-1"
      >
        <slot name="extra"></slot>
        <VbenIconButton
          v-if="fullscreenButton"
          class="flex-center size-6 rounded-full px-1 text-lg text-foreground/80 opacity-70 transition-opacity hover:bg-accent hover:text-accent-foreground hover:opacity-100 focus:outline-hidden disabled:pointer-events-none"
          @click="handleFullscreen"
        >
          <Shrink v-if="fullscreen" class="size-3.5" />
          <Expand v-else class="size-3.5" />
        </VbenIconButton>
      </div>

      <DialogFooter
        ref="footerRef"
        v-if="showFooter"
        :class="
          cn(
            'flex-row items-center justify-end p-2',
            {
              'border-t': bordered,
            },
            footerClass,
          )
        "
      >
        <slot name="prepend-footer"></slot>
        <slot name="footer">
          <component
            :is="components.DefaultButton || VbenButton"
            v-if="showCancelButton"
            variant="outline"
            :disabled="submitting"
            @click="() => modalApi?.onCancel()"
          >
            <slot name="cancelText">
              {{ cancelText || $t('cancel') }}
            </slot>
          </component>
          <slot name="center-footer"></slot>
          <component
            :is="components.PrimaryButton || VbenButton"
            v-if="showConfirmButton"
            data-slot="modal-confirm"
            :disabled="confirmDisabled"
            :loading="confirmLoading || submitting"
            @click="() => modalApi?.onConfirm()"
          >
            <slot name="confirmText">
              {{ confirmText || $t('confirm') }}
            </slot>
          </component>
        </slot>
        <slot name="append-footer"></slot>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
