<script setup lang="ts">
import type { LanguageOption } from '@operon/constants';
import type { SupportedLanguagesType } from '@operon/locales';

import { onUnmounted, ref } from 'vue';

import { onSupportLanguagesChange } from '@operon/constants';
import { Languages } from '@operon/icons';
import { loadLocaleMessages } from '@operon/locales';
import { preferences, updatePreferences } from '@operon/preferences';

import { VbenDropdownRadioMenu, VbenIconButton } from '@operon-core/shadcn-ui';

defineOptions({
  name: 'LanguageToggle',
});

const languageList = ref<LanguageOption[]>([]);
const unsubscribe = onSupportLanguagesChange((langs) => {
  languageList.value = [...langs];
});
onUnmounted(unsubscribe);

async function handleUpdate(value: string | undefined) {
  if (!value) return;
  const locale = value as SupportedLanguagesType;
  updatePreferences({
    app: {
      locale,
    },
  });
  await loadLocaleMessages(locale);
}
</script>

<template>
  <div>
    <VbenDropdownRadioMenu
      :menus="languageList"
      :model-value="preferences.app.locale"
      @update:model-value="handleUpdate"
    >
      <VbenIconButton class="hover:animate-[shrink_0.3s_ease-in-out]">
        <Languages class="size-4 text-foreground" />
      </VbenIconButton>
    </VbenDropdownRadioMenu>
  </div>
</template>
