<script setup lang="ts">
import type { AuthenticationProps } from './types';

import { computed, watch } from 'vue';

import { $t } from '@operon/locales';

import { useVbenModal } from '@operon-core/popup-ui';
import { Button, Slot, VbenAvatar } from '@operon-core/shadcn-ui';

interface Props extends AuthenticationProps {
  avatar?: string;
  subTitle?: string;
  title?: string;
  zIndex?: number;
}

defineOptions({
  name: 'LoginExpiredModal',
});

const props = withDefaults(defineProps<Props>(), {
  avatar: '',
  subTitle: '',
  title: '',
  zIndex: 0,
});

const open = defineModel<boolean>('open');

function closeModal() {
  open.value = false;
  modalApi.close();
}

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    closeModal();
  },
  onClosed() {
    closeModal();
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      open.value = false;
    }
  },
});

watch(
  () => open.value,
  (val) => {
    modalApi.setState({ isOpen: val });
  },
);

const getZIndex = computed(() => {
  return props.zIndex || calcZIndex();
});

/**
 * Exclude z-index for ant-message and loading: 9999
 */
const zIndexExcludeClass = ['ant-message', 'loading'];
function isZIndexExcludeClass(element: Element) {
  return zIndexExcludeClass.some((className) =>
    element.classList.contains(className),
  );
}

/**
 * Get maximum z-index value
 */
function calcZIndex() {
  let maxZ = 0;
  const elements = document.querySelectorAll('*');
  [...elements].forEach((element) => {
    const style = window.getComputedStyle(element);
    const zIndex = style.getPropertyValue('z-index');
    if (
      zIndex &&
      !Number.isNaN(Number.parseInt(zIndex)) &&
      !isZIndexExcludeClass(element)
    ) {
      maxZ = Math.max(maxZ, Number.parseInt(zIndex));
    }
  });
  return maxZ + 1;
}
</script>

<template>
  <div>
    <Modal
      :closable="true"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      :footer="false"
      :fullscreen-button="false"
      :header="false"
      :z-index="getZIndex"
      class="relative border-none px-10 py-6 text-center shadow-xl sm:w-150 sm:rounded-2xl md:h-[unset]"
    >
      <VbenAvatar :src="avatar" class="mx-auto mb-6 size-20" />
      <Slot
        :show-forget-password="false"
        :show-register="false"
        :show-remember-me="false"
        :sub-title="props.subTitle || $t('authentication.loginAgainSubTitle')"
        :title="props.title || $t('authentication.loginAgainTitle')"
      >
        <slot> </slot>
      </Slot>

      <!-- Bottom Dismiss / Cancel action for local operator flexibility -->
      <div class="mt-4 text-center">
        <Button
          type="button"
          variant="link"
          size="sm"
          class="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          @click="closeModal"
        >
          {{ $t('common.cancel') || 'Dismiss / Continue as Local Operator' }}
        </Button>
      </div>
    </Modal>
  </div>
</template>
