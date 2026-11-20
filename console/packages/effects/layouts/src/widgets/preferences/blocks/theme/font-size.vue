<script setup lang="ts">
import { useId, watch } from 'vue';

import { $t } from '@operon/locales';

import {
  Label,
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@operon-core/shadcn-ui';

defineOptions({
  name: 'PreferenceFontSize',
});

const modelValue = defineModel<number>({
  default: 16,
});

const fontSizeId = useId();
const min = 15;
const max = 22;
const step = 1;

// Clamp input value between min and max
watch(
  modelValue,
  (newValue) => {
    if (newValue < min) {
      modelValue.value = min;
    } else if (newValue > max) {
      modelValue.value = max;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="my-1 flex items-center justify-between gap-4 rounded-md px-2 py-1"
  >
    <Label :for="fontSizeId">{{ $t('preferences.theme.fontSize') }}</Label>
    <div class="flex shrink-0 items-center gap-2">
      <NumberField
        v-model="modelValue"
        :max="max"
        :min="min"
        :step="step"
        class="w-36"
      >
        <NumberFieldContent>
          <NumberFieldDecrement />
          <NumberFieldInput
            :id="fontSizeId"
            :aria-describedby="`${fontSizeId}-description`"
          />
          <NumberFieldIncrement />
        </NumberFieldContent>
      </NumberField>
      <span class="text-sm text-muted-foreground">px</span>
    </div>
    <p :id="`${fontSizeId}-description`" class="sr-only">
      {{ $t('preferences.theme.fontSizeTip') }}
    </p>
  </div>
</template>
