<script lang="ts" setup>
import { Settings } from '@operon/icons';
import { $t } from '@operon/locales';

import { Button } from '@operon-core/shadcn-ui';

function handleOpenPreferences() {
  window.dispatchEvent(new CustomEvent('open-preferences'));
}
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    :title="$t('preferences.settingsTitle')"
    :aria-label="$t('preferences.settingsTitle')"
    @click="handleOpenPreferences"
  >
    <Settings />
  </Button>
</template>
