<script setup lang="ts">
import type { BuiltinThemePreset } from '@operon/preferences';
import type { BuiltinThemeType } from '@operon/types';

import { computed, useId } from 'vue';

import { UserRoundPen } from '@operon/icons';
import { $t } from '@operon/locales';
import { BUILT_IN_THEME_PRESETS } from '@operon/preferences';
import { convertToHsl, TinyColor } from '@operon/utils';

import { Label, RadioGroup, RadioGroupItem } from '@operon-core/shadcn-ui';

import { useThrottleFn } from '@vueuse/core';

defineOptions({
  name: 'PreferenceBuiltinTheme',
});

const props = defineProps<{ isDark: boolean }>();

const id = useId();
const modelValue = defineModel<BuiltinThemeType>({ default: 'neutral' });
const themeColorPrimary = defineModel<string | undefined>('themeColorPrimary', {
  default: undefined,
});

const updateThemeColorPrimary = useThrottleFn(
  (value: string) => {
    themeColorPrimary.value = value;
  },
  300,
  true,
  true,
);

const inputValue = computed(() => {
  return new TinyColor(themeColorPrimary.value || '').toHexString();
});

const builtinThemePresets = computed(() => {
  return [...BUILT_IN_THEME_PRESETS];
});

function typeView(name: BuiltinThemeType) {
  switch (name) {
    case 'custom': {
      return $t('preferences.theme.builtin.custom');
    }
    case 'deep-blue': {
      return $t('preferences.theme.builtin.deepBlue');
    }
    case 'deep-green': {
      return $t('preferences.theme.builtin.deepGreen');
    }
    case 'default': {
      return $t('preferences.theme.builtin.default');
    }
    case 'gray': {
      return $t('preferences.theme.builtin.gray');
    }
    case 'green': {
      return $t('preferences.theme.builtin.green');
    }
    case 'neutral': {
      return $t('preferences.theme.builtin.neutral');
    }
    case 'orange': {
      return $t('preferences.theme.builtin.orange');
    }
    case 'pink': {
      return $t('preferences.theme.builtin.pink');
    }
    case 'rose': {
      return $t('preferences.theme.builtin.rose');
    }
    case 'sky-blue': {
      return $t('preferences.theme.builtin.skyBlue');
    }
    case 'slate': {
      return $t('preferences.theme.builtin.slate');
    }
    case 'violet': {
      return $t('preferences.theme.builtin.violet');
    }
    case 'yellow': {
      return $t('preferences.theme.builtin.yellow');
    }
    case 'zinc': {
      return $t('preferences.theme.builtin.zinc');
    }
  }
}

function handleSelect(theme: BuiltinThemePreset) {
  modelValue.value = theme.type;
  if (theme.type !== 'custom') {
    const primaryColor = props.isDark
      ? theme.darkPrimaryColor || theme.primaryColor
      : theme.primaryColor;
    const nextColor = primaryColor || theme.color;
    if (nextColor && themeColorPrimary.value !== nextColor) {
      themeColorPrimary.value = nextColor;
    }
  }
}

function handleInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  modelValue.value = 'custom';
  updateThemeColorPrimary(convertToHsl(target.value));
}
</script>

<template>
  <RadioGroup
    :model-value="modelValue"
    class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5"
    @update:model-value="
      (value) => {
        const theme = builtinThemePresets.find((item) => item.type === value);
        if (theme) handleSelect(theme);
      }
    "
  >
    <div
      v-for="theme in builtinThemePresets"
      :key="theme.type"
      class="flex min-w-0 flex-col gap-1.5"
    >
      <RadioGroupItem
        :id="`${id}-${theme.type}`"
        :value="theme.type"
        class="peer sr-only"
      />
      <Label
        :for="`${id}-${theme.type}`"
        class="flex h-10 cursor-pointer items-center justify-center rounded-md border border-input peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-ring"
      >
        <span
          v-if="theme.type !== 'custom'"
          :style="{ backgroundColor: theme.color }"
          class="size-5 rounded-md"
        ></span>
        <UserRoundPen v-else class="size-5" />
        <span class="sr-only">{{ typeView(theme.type) }}</span>
      </Label>
      <span class="truncate text-center text-sm text-muted-foreground">
        {{ typeView(theme.type) }}
      </span>
    </div>
  </RadioGroup>
  <div
    v-if="modelValue === 'custom'"
    class="mt-3 flex items-center justify-between gap-2"
  >
    <Label :for="`${id}-custom-color`">{{
      $t('preferences.theme.builtin.custom')
    }}</Label>
    <input
      :id="`${id}-custom-color`"
      :value="inputValue"
      type="color"
      class="h-8 w-16 cursor-pointer rounded-md border border-input"
      @input="handleInputChange"
    />
  </div>
</template>
