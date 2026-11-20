<script setup lang="ts">
import type { ThemeModeType } from '@operon/types';

import { useId } from 'vue';

import { $t } from '@operon/locales';
import { usePreferences } from '@operon/preferences';

import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@operon-core/shadcn-ui';

import SwitchItem from '../switch-item.vue';

defineOptions({
  name: 'PreferenceTheme',
});

const modelValue = defineModel<string>({ default: 'auto' });
const themeSemiDarkSidebar = defineModel<boolean>('themeSemiDarkSidebar');
const themeSemiDarkHeader = defineModel<boolean>('themeSemiDarkHeader');

const { layout } = usePreferences();

const themeId = useId();
const THEME_PRESET: ThemeModeType[] = ['light', 'dark', 'auto'];

function nameView(name: string) {
  switch (name) {
    case 'auto': {
      return $t('preferences.followSystem');
    }
    case 'dark': {
      return $t('preferences.theme.dark');
    }
    case 'light': {
      return $t('preferences.theme.light');
    }
  }
}
</script>

<template>
  <div class="flex w-full flex-col">
    <div class="my-1 flex items-center justify-between gap-4 px-2 py-1">
      <Label :for="themeId">{{ $t('preferences.theme.title') }}</Label>
      <Select v-model="modelValue">
        <SelectTrigger :id="themeId" class="h-8 w-41.25 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem
              v-for="theme in THEME_PRESET"
              :key="theme"
              :value="theme"
            >
              {{ nameView(theme) }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <SwitchItem
      v-model="themeSemiDarkSidebar"
      :disabled="
        modelValue === 'dark' ||
        layout === 'header-nav' ||
        layout === 'full-content'
      "
      :tip="$t('preferences.theme.darkSidebarTip')"
    >
      {{ $t('preferences.theme.darkSidebar') }}
    </SwitchItem>
    <SwitchItem v-model="themeSemiDarkHeader" :disabled="modelValue === 'dark'">
      {{ $t('preferences.theme.darkHeader') }}
    </SwitchItem>
  </div>
</template>
