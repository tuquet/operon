<script setup lang="ts">
import type { SelectOption } from '@operon/types';

import { $t } from '@operon/locales';

import SwitchItem from '../switch-item.vue';
import ToggleItem from '../toggle-item.vue';

defineOptions({
  name: 'PreferenceBreadcrumbConfig',
});

defineProps<{ disabled?: boolean }>();

const breadcrumbShowIcon = defineModel<boolean>('breadcrumbShowIcon');
const breadcrumbStyleType = defineModel<string | undefined>(
  'breadcrumbStyleType',
  {
    default: undefined,
  },
);
const breadcrumbShowHome = defineModel<boolean>('breadcrumbShowHome');
const breadcrumbHideOnlyOne = defineModel<boolean>('breadcrumbHideOnlyOne');

const typeItems: SelectOption[] = [
  { label: $t('preferences.normal'), value: 'normal' },
  { label: $t('preferences.breadcrumb.background'), value: 'background' },
];
</script>

<template>
  <SwitchItem v-model="breadcrumbHideOnlyOne" :disabled="disabled">
    {{ $t('preferences.breadcrumb.hideOnlyOne') }}
  </SwitchItem>
  <SwitchItem v-model="breadcrumbShowIcon" :disabled="disabled">
    {{ $t('preferences.breadcrumb.icon') }}
  </SwitchItem>
  <SwitchItem
    v-model="breadcrumbShowHome"
    :disabled="disabled || !breadcrumbShowIcon"
  >
    {{ $t('preferences.breadcrumb.home') }}
  </SwitchItem>
  <ToggleItem
    v-model="breadcrumbStyleType"
    :disabled="disabled"
    :items="typeItems"
  >
    {{ $t('preferences.breadcrumb.style') }}
  </ToggleItem>
</template>
