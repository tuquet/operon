<script setup lang="ts">
import { Copy, LogOut, RotateCw } from '@operon/icons';
import { $t } from '@operon/locales';

import { Button } from '@operon-core/shadcn-ui';

defineProps<{ canReset: boolean; showCopy?: boolean }>();
defineEmits<{ reset: []; copy: []; clear: [] }>();
</script>

<template>
  <div class="flex w-full flex-wrap items-center justify-between gap-2">
    <div class="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        :disabled="!canReset"
        @click="$emit('reset')"
      >
        <RotateCw data-icon="inline-start" />
        {{ $t('preferences.resetConfiguration') }}
      </Button>
      <Button
        v-if="showCopy"
        type="button"
        size="sm"
        variant="ghost"
        :disabled="!canReset"
        @click="$emit('copy')"
      >
        <Copy data-icon="inline-start" />
        {{ $t('preferences.copyPreferences') }}
      </Button>
    </div>
    <Button
      type="button"
      size="sm"
      variant="ghost"
      class="text-destructive hover:bg-destructive/10 hover:text-destructive"
      @click="$emit('clear')"
    >
      <LogOut data-icon="inline-start" />
      {{ $t('preferences.clearAndLogout') }}
    </Button>
  </div>
</template>
