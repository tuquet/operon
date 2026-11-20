<script setup lang="ts">
import type { LayoutType, SelectOption } from '@operon/types';

import { computed } from 'vue';

import { $t } from '@operon/locales';

import SelectItem from '../select-item.vue';

defineOptions({
  name: 'PreferenceLayout',
});

const modelValue = defineModel<LayoutType>({ default: 'sidebar-nav' });

const layoutItems = computed((): SelectOption[] => [
  {
    label: $t('preferences.vertical'),
    value: 'sidebar-nav',
  },
  {
    label: $t('preferences.horizontal'),
    value: 'header-nav',
  },
  {
    label: $t('preferences.headerSidebarNav'),
    value: 'header-sidebar-nav',
  },
  {
    label: $t('preferences.mixedMenu'),
    value: 'mixed-nav',
  },
  {
    label: $t('preferences.fullContent'),
    value: 'full-content',
  },
]);
</script>

<template>
  <SelectItem v-model="modelValue" :items="layoutItems">
    {{ $t('preferences.layout') }}
  </SelectItem>
</template>
