<script setup lang="ts">
import type { LanguageOption } from '@operon/constants';
import type { SupportedLanguagesType } from '@operon/locales';

import { onMounted, onUnmounted, ref, watch } from 'vue';

import { onSupportLanguagesChange } from '@operon/constants';
import { $t, loadLocaleMessages } from '@operon/locales';
import { preferences, updatePreferences } from '@operon/preferences';
import { useTimezoneStore } from '@operon/stores';

import InputItem from '../input-item.vue';
import SelectItem from '../select-item.vue';
import SwitchItem from '../switch-item.vue';

defineOptions({
  name: 'PreferenceGeneralConfig',
});

const appLocale = defineModel<string | undefined>('appLocale', {
  default: undefined,
});
const appTimezone = defineModel<string | undefined>('appTimezone', {
  default: undefined,
});
const appDynamicTitle = defineModel<boolean>('appDynamicTitle');
const appWatermark = defineModel<boolean>('appWatermark');
const appWatermarkContent = defineModel<string | undefined>(
  'appWatermarkContent',
  {
    default: undefined,
  },
);
const appEnableCheckUpdates = defineModel<boolean>('appEnableCheckUpdates');
const appEnableCopyPreferences = defineModel<boolean>(
  'appEnableCopyPreferences',
);
const timezoneStore = useTimezoneStore();

const languageList = ref<LanguageOption[]>([]);
const unsubscribe = onSupportLanguagesChange((langs) => {
  languageList.value = [...langs];
});
onUnmounted(unsubscribe);

const timezoneOptionsRef = ref<
  {
    label: string;
    value: string;
  }[]
>([]);

// Sync initial and reactive changes from preferences.app.locale to appLocale
watch(
  () => preferences.app.locale,
  (locale) => {
    if (locale && appLocale.value !== locale) {
      appLocale.value = locale;
    }
  },
  { immediate: true },
);

watch(
  () => preferences.app.timezone,
  (timezone) => {
    if (timezone && appTimezone.value !== timezone) {
      appTimezone.value = timezone;
    }
  },
  { immediate: true },
);

async function handleLocaleChange(val: string | undefined) {
  if (!val) return;
  const locale = val as SupportedLanguagesType;
  appLocale.value = locale;
  updatePreferences({
    app: {
      locale,
    },
  });
  await loadLocaleMessages(locale);
}

async function handleTimezoneChange(val: string | undefined) {
  if (!val) return;
  appTimezone.value = val;
  timezoneStore.setTimezone(val);
  updatePreferences({
    app: {
      timezone: val,
    },
  });
}

onMounted(async () => {
  timezoneOptionsRef.value = await timezoneStore.getTimezoneOptions();
});
</script>

<template>
  <SelectItem
    :model-value="appLocale || preferences.app.locale"
    :items="languageList"
    @update:model-value="handleLocaleChange"
  >
    {{ $t('preferences.language') }}
  </SelectItem>
  <SelectItem
    :model-value="appTimezone || preferences.app.timezone"
    :items="timezoneOptionsRef"
    @update:model-value="handleTimezoneChange"
  >
    {{ $t('preferences.timezone') }}
  </SelectItem>
  <SwitchItem v-model="appDynamicTitle">
    {{ $t('preferences.dynamicTitle') }}
  </SwitchItem>
  <SwitchItem
    v-model="appWatermark"
    @update:model-value="
      (val) => {
        if (!val) appWatermarkContent = '';
      }
    "
  >
    {{ $t('preferences.watermark') }}
  </SwitchItem>
  <InputItem
    v-if="appWatermark"
    v-model="appWatermarkContent"
    :placeholder="$t('preferences.watermarkContent')"
  >
    {{ $t('preferences.watermarkContent') }}
  </InputItem>
  <SwitchItem v-model="appEnableCheckUpdates">
    {{ $t('preferences.checkUpdates') }}
  </SwitchItem>
  <SwitchItem v-model="appEnableCopyPreferences">
    {{ $t('preferences.enableCopyPreferences') }}
  </SwitchItem>
</template>
