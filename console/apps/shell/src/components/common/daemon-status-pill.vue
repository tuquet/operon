<script lang="ts" setup>
import { Button } from '@operon-core/shadcn-ui';

import { Settings } from '@lucide/vue';

import { $t } from '#/locales';

defineOptions({ name: 'DaemonStatusPill' });

const props = withDefaults(defineProps<{ collapsed?: boolean }>(), {
  collapsed: false,
});

function openSettings() {
  window.dispatchEvent(new CustomEvent('open-preferences'));
}
</script>

<template>
  <div>
    <Button
      type="button"
      variant="ghost"
      :size="props.collapsed ? 'icon' : 'sm'"
      :title="$t('preferences.settingsTitle')"
      class="w-full gap-2.5 text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      :class="props.collapsed ? 'justify-center px-0' : 'justify-start px-2'"
      @click="openSettings"
    >
      <Settings class="size-4 shrink-0" />
      <span v-if="!props.collapsed" class="truncate font-medium">
        {{ $t('preferences.settingsTitle') }}
      </span>
    </Button>
  </div>
</template>
