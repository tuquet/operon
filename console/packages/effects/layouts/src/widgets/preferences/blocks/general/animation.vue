<script setup lang="ts">
import { $t } from '@operon/locales';

import { ToggleGroup, ToggleGroupItem } from '@operon-core/shadcn-ui';

import SwitchItem from '../switch-item.vue';

defineOptions({
  name: 'PreferenceAnimation',
});

const transitionProgress = defineModel<boolean>('transitionProgress', {
  // Default value
  default: false,
});
const transitionName = defineModel<string | undefined>('transitionName', {
  default: undefined,
});
const transitionEnable = defineModel<boolean>('transitionEnable');
const transitionLoading = defineModel<boolean>('transitionLoading');

const transitionPreset = ['fade', 'fade-slide', 'fade-up', 'fade-down'];
</script>

<template>
  <SwitchItem v-model="transitionProgress">
    {{ $t('preferences.animation.progress') }}
  </SwitchItem>
  <SwitchItem v-model="transitionLoading">
    {{ $t('preferences.animation.loading') }}
  </SwitchItem>
  <SwitchItem v-model="transitionEnable">
    {{ $t('preferences.animation.transition') }}
  </SwitchItem>
  <ToggleGroup
    v-if="transitionEnable"
    :model-value="transitionName"
    type="single"
    variant="outline"
    class="mt-3 flex-wrap gap-3"
    @update:model-value="
      (value) => {
        if (typeof value === 'string' && value) transitionName = value;
      }
    "
  >
    <ToggleGroupItem
      v-for="item in transitionPreset"
      :key="item"
      :value="item"
      :aria-label="item"
      :title="item"
      class="h-auto p-3"
    >
      <div
        :class="`${item}-slow`"
        class="h-10 w-12 rounded-md bg-primary"
      ></div>
    </ToggleGroupItem>
  </ToggleGroup>
</template>
