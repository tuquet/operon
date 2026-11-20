<script lang="ts" setup>
import type { ThemeModeType } from '@operon/types';

import { MoonStar, Sun, SunMoon } from '@operon/icons';
import { $t } from '@operon/locales';
import {
  preferences,
  updatePreferences,
  usePreferences,
} from '@operon/preferences';

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from '@operon-core/shadcn-ui';

import ThemeButton from './theme-button.vue';

defineOptions({
  name: 'ThemeToggle',
});

withDefaults(defineProps<{ shouldOnHover?: boolean }>(), {
  shouldOnHover: false,
});

function handleChange(isDark: boolean | undefined) {
  updatePreferences({
    theme: { mode: isDark ? 'dark' : 'light' },
  });
}

const { isDark } = usePreferences();

const PRESETS = [
  {
    icon: Sun,
    name: 'light',
    title: $t('preferences.theme.light'),
  },
  {
    icon: MoonStar,
    name: 'dark',
    title: $t('preferences.theme.dark'),
  },
  {
    icon: SunMoon,
    name: 'auto',
    title: $t('preferences.followSystem'),
  },
];
</script>
<template>
  <div class="inline-flex empty:hidden">
    <ThemeButton
      v-if="!shouldOnHover"
      :model-value="isDark"
      type="icon"
      @update:model-value="handleChange"
    />
    <Popover v-else>
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          :aria-label="$t('preferences.theme.title')"
        >
          <SunMoon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" class="w-auto">
        <ToggleGroup
          :model-value="preferences.theme.mode"
          type="single"
          variant="outline"
          @update:model-value="
            (val) =>
              val &&
              updatePreferences({ theme: { mode: val as ThemeModeType } })
          "
        >
          <ToggleGroupItem
            v-for="item in PRESETS"
            :key="item.name"
            :value="item.name"
            :aria-label="item.title"
            :title="item.title"
          >
            <component :is="item.icon" />
          </ToggleGroupItem>
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  </div>
</template>
