<script setup lang="ts">
import type { SegmentedItem } from './types';

import { computed } from 'vue';

import { TabsTrigger } from 'reka-ui';

import { Tabs, TabsContent, TabsList } from '../../ui';
import { VbenIcon } from '../icon';
import { VbenTooltip } from '../tooltip';
import TabsIndicator from './tabs-indicator.vue';

interface Props {
  defaultValue?: string;
  tabs?: SegmentedItem[];
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: '',
  tabs: () => [],
});

const activeTab = defineModel<string>();

const getDefaultValue = computed(() => {
  return props.defaultValue || props.tabs[0]?.value;
});

const tabsStyle = computed(() => {
  return {
    'grid-template-columns': `repeat(${props.tabs.length}, minmax(0, 1fr))`,
  };
});

const tabsIndicatorStyle = computed(() => {
  return {
    width: `${(100 / props.tabs.length).toFixed(0)}%`,
  };
});

function activeClass(tab: string): string[] {
  return tab === activeTab.value ? ['font-bold!', 'text-primary'] : [];
}
</script>

<template>
  <Tabs v-model="activeTab" :default-value="getDefaultValue">
    <TabsList
      :style="tabsStyle"
      class="bg-accent outline-heavy! relative grid w-full outline-2!"
    >
      <TabsIndicator :style="tabsIndicatorStyle" />
      <template v-for="tab in tabs" :key="tab.value">
        <TabsTrigger
          :value="tab.value"
          :class="activeClass(tab.value)"
          class="hover:text-primary z-20 size-full inline-flex items-center justify-center rounded-md whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 py-1.5"
        >
          <VbenTooltip :delay-duration="150" side="bottom">
            <template #trigger>
              <div class="inline-flex items-center justify-center size-full">
                <template v-if="tab.icon">
                  <component
                    :is="tab.icon"
                    v-if="typeof tab.icon !== 'string'"
                    class="size-4 shrink-0"
                  />
                  <VbenIcon v-else :icon="tab.icon" class="size-4 shrink-0" />
                </template>
                <span
                  v-else
                  class="whitespace-nowrap overflow-hidden text-ellipsis px-1"
                >
                  {{ tab.label }}
                </span>
              </div>
            </template>
            {{ tab.label }}
          </VbenTooltip>
        </TabsTrigger>
      </template>
    </TabsList>
    <template v-for="tab in tabs" :key="tab.value">
      <TabsContent :value="tab.value">
        <slot :name="tab.value"></slot>
      </TabsContent>
    </template>
  </Tabs>
</template>
