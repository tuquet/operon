<script lang="ts" setup>
import { computed } from 'vue';

import { Settings } from '@operon/icons';
import { $t, loadLocaleMessages } from '@operon/locales';
import { preferences, updatePreferences } from '@operon/preferences';
import { capitalizeFirstLetter } from '@operon/utils';

import { useVbenDrawer } from '@operon-core/popup-ui';
import { VbenButton } from '@operon-core/shadcn-ui';

import PreferencesDrawer from './preferences-drawer.vue';

interface Props {
  /** Whether to show button */
  showButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showButton: true,
});

const emit = defineEmits<{ clearPreferencesAndLogout: [] }>();

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: PreferencesDrawer,
});

// Expose method to open preferences drawer
defineExpose({
  open: () => drawerApi.open(),
});

/**
 * Transform preferences to Vue props
 * preferences.widget.fullscreen=>widgetFullscreen
 */
const attrs = computed(() => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(preferences)) {
    for (const [subKey, subValue] of Object.entries(value)) {
      result[`${key}${capitalizeFirstLetter(subKey)}`] = subValue;
    }
  }
  return result;
});

/**
 * Transform preferences to Vue listeners
 * preferences.widget.fullscreen=>@update:widgetFullscreen
 */
const listen = computed(() => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(preferences)) {
    if (typeof value === 'object') {
      for (const subKey of Object.keys(value)) {
        result[`update:${key}${capitalizeFirstLetter(subKey)}`] = async (
          val: any,
        ) => {
          const currentVal = (preferences as Record<string, any>)[key]?.[
            subKey
          ];
          if (!Array.isArray(val) && currentVal === val) {
            return;
          }
          updatePreferences({ [key]: { [subKey]: val } });
          if (key === 'app' && subKey === 'locale') {
            await loadLocaleMessages(val);
          }
        };
      }
    } else {
      result[key] = value;
    }
  }
  return result;
});
</script>
<template>
  <div>
    <Drawer
      v-bind="{ ...$attrs, ...attrs }"
      v-on="listen"
      @clear-preferences-and-logout="emit('clearPreferencesAndLogout')"
    />

    <!-- Button to trigger opening drawer (can be overridden) -->
    <slot>
      <VbenButton
        v-if="props.showButton"
        :title="$t('preferences.title')"
        class="flex-col-center size-10 cursor-pointer rounded-l-lg rounded-r-none border-none bg-primary"
        @click="() => drawerApi.open()"
      >
        <Settings class="size-5" />
      </VbenButton>
    </slot>
  </div>
</template>
