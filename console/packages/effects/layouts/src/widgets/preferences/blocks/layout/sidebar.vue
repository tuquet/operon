<script setup lang="ts">
import type { LayoutType } from '@operon/types';

import { computed } from 'vue';

import { $t } from '@operon/locales';

import NumberFieldItem from '../number-field-item.vue';
import SwitchItem from '../switch-item.vue';

const props = defineProps<{ currentLayout?: LayoutType; disabled: boolean }>();

const isSidebarNavMode = computed(() => {
  return props.currentLayout === 'sidebar-nav';
});

const isSidebarEnableDisabled = computed(() => {
  return props.disabled || isSidebarNavMode.value;
});

const sidebarEnable = defineModel<boolean>('sidebarEnable');
const widgetSidebarToggle = defineModel<boolean>('widgetSidebarToggle');
const sidebarWidth = defineModel<number | undefined>('sidebarWidth', {
  default: undefined,
});
const sidebarCollapsedShowTitle = defineModel<boolean>(
  'sidebarCollapsedShowTitle',
);
const sidebarAutoActivateChild = defineModel<boolean>(
  'sidebarAutoActivateChild',
);
const sidebarDraggable = defineModel<boolean>('sidebarDraggable');
const sidebarCollapsed = defineModel<boolean>('sidebarCollapsed');
const sidebarExpandOnHover = defineModel<boolean>('sidebarExpandOnHover');
</script>

<template>
  <SwitchItem
    v-model="sidebarEnable"
    :disabled="isSidebarEnableDisabled"
    :tip="isSidebarNavMode ? $t('preferences.sidebar.visibleDisabledTip') : ''"
  >
    {{ $t('preferences.sidebar.visible') }}
  </SwitchItem>
  <SwitchItem v-model="sidebarDraggable" :disabled="!sidebarEnable || disabled">
    {{ $t('preferences.sidebar.draggable') }}
  </SwitchItem>
  <SwitchItem v-model="sidebarCollapsed" :disabled="!sidebarEnable || disabled">
    {{ $t('preferences.sidebar.collapsed') }}
  </SwitchItem>
  <SwitchItem
    v-model="sidebarExpandOnHover"
    :disabled="!sidebarEnable || disabled || !sidebarCollapsed"
    :tip="$t('preferences.sidebar.expandOnHoverTip')"
  >
    {{ $t('preferences.sidebar.expandOnHover') }}
  </SwitchItem>
  <SwitchItem
    v-model="sidebarCollapsedShowTitle"
    :disabled="!sidebarEnable || disabled || !sidebarCollapsed"
  >
    {{ $t('preferences.sidebar.collapsedShowTitle') }}
  </SwitchItem>
  <SwitchItem
    v-model="sidebarAutoActivateChild"
    :disabled="!sidebarEnable || currentLayout !== 'mixed-nav' || disabled"
    :tip="$t('preferences.sidebar.autoActivateChildTip')"
  >
    {{ $t('preferences.sidebar.autoActivateChild') }}
  </SwitchItem>
  <SwitchItem v-model="widgetSidebarToggle" :disabled="disabled">
    {{ $t('preferences.widget.sidebarToggle') }}
  </SwitchItem>
  <NumberFieldItem
    v-model="sidebarWidth"
    :disabled="!sidebarEnable || disabled"
    :max="320"
    :min="160"
    :step="10"
  >
    {{ $t('preferences.sidebar.width') }}
  </NumberFieldItem>
</template>
