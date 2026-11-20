<script setup lang="ts">
import type { SelectOption } from '@operon/types';

import { computed } from 'vue';

import { $t } from '@operon/locales';

import SelectItem from '../select-item.vue';

defineOptions({
  name: 'PreferenceLayoutContent',
});

const modelValue = defineModel<string>({ default: 'wide' });

const contentItems = computed((): SelectOption[] => [
  {
    label: $t('preferences.wide'),
    value: 'wide',
  },
  {
    label: $t('preferences.compact'),
    value: 'compact',
  },
]);
</script>

<template>
  <SelectItem v-model="modelValue" :items="contentItems">
    {{ $t('preferences.content') }}
  </SelectItem>
</template>
