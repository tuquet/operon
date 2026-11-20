<script setup lang="ts">
import type { LanguageOption } from '@operon/constants';
import type { SupportedLanguagesType } from '@operon/locales';

import { onUnmounted, ref } from 'vue';

import { onSupportLanguagesChange } from '@operon/constants';
import { Languages } from '@operon/icons';
import { $t, loadLocaleMessages } from '@operon/locales';
import { preferences, updatePreferences } from '@operon/preferences';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@operon-core/shadcn-ui';

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
  <div class="inline-flex empty:hidden">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          :aria-label="$t('preferences.widget.languageToggle')"
          :title="$t('preferences.widget.languageToggle')"
        >
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          :model-value="preferences.app.locale"
          @update:model-value="
            (value) => typeof value === 'string' && handleUpdate(value)
          "
        >
          <DropdownMenuRadioItem
            v-for="item in languageList"
            :key="item.value"
            :value="String(item.value)"
          >
            {{ item.label }}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
