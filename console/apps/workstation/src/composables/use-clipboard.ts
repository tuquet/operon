import { ref } from 'vue';

import { $t } from '@operon/locales';

import { toast } from '@operon-core/shadcn-ui';

export function useClipboard() {
  const copiedField = ref<null | string>(null);

  async function copyToClipboard(
    text: string,
    label: string = $t('common.content'),
  ): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      copiedField.value = label;
      toast.success($t('common.copiedLabel', { label }));
      setTimeout(() => {
        if (copiedField.value === label) {
          copiedField.value = null;
        }
      }, 2000);
      return true;
    } catch {
      toast.error($t('common.copyFailedLabel', { label }));
      return false;
    }
  }

  function isCopied(label: string): boolean {
    return copiedField.value === label;
  }

  async function copyText(
    text: string,
    label = $t('common.content'),
  ): Promise<boolean> {
    return copyToClipboard(
      text,
      $t('page.commerce_view.copied_label', { label }),
    );
  }

  return {
    copiedField,
    copyText,
    copyToClipboard,
    isCopied,
  };
}
