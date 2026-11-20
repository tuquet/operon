<script setup lang="ts">
import type { BuiltinThemeType } from '@operon/types';

import { useId } from 'vue';

import { Palette } from '@operon/icons';
import { $t } from '@operon/locales';
import {
  COLOR_PRESETS,
  preferences,
  updatePreferences,
} from '@operon/preferences';

import {
  Button,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
} from '@operon-core/shadcn-ui';

defineOptions({
  name: 'AuthenticationColorToggle',
});

const id = useId();

function handleUpdate(colorPrimary: string, type: BuiltinThemeType) {
  updatePreferences({
    theme: {
      colorPrimary,
      builtinType: type,
    },
  });
}
</script>

<template>
  <div class="inline-flex empty:hidden">
    <Popover>
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          :aria-label="$t('preferences.theme.builtin.title')"
        >
          <Palette />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" class="w-72">
        <RadioGroup
          :model-value="preferences.theme.builtinType"
          class="grid grid-cols-4 gap-3"
          @update:model-value="
            (value) => {
              const preset = COLOR_PRESETS.find((p) => p.type === value);
              if (preset) handleUpdate(preset.color, preset.type);
            }
          "
        >
          <div
            v-for="preset in COLOR_PRESETS"
            :key="preset.type"
            class="relative"
          >
            <RadioGroupItem
              :id="`${id}-${preset.type}`"
              :value="preset.type"
              class="peer sr-only"
            />
            <Label
              :for="`${id}-${preset.type}`"
              :title="preset.type"
              class="flex h-10 cursor-pointer items-center justify-center rounded-md border border-input peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-ring"
            >
              <span
                :style="{ backgroundColor: preset.color }"
                class="size-5 rounded-full"
              ></span>
              <span class="sr-only">{{ preset.type }}</span>
            </Label>
          </div>
        </RadioGroup>
      </PopoverContent>
    </Popover>
  </div>
</template>
