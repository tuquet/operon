<script lang="ts" setup>
import type { BrowserProfileRecord } from '../../api/browsers';

import { computed, ref, watch } from 'vue';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Checkbox,
} from '@operon-core/shadcn-ui';

import { $t } from '../../locales';

defineOptions({ name: 'BrowserDeleteDialog' });

const props = defineProps<{
  loading?: boolean;
  targets: BrowserProfileRecord[];
}>();

const emit = defineEmits<{
  confirm: [force: boolean];
}>();

const open = defineModel<boolean>('open', { default: false });

const forceStop = ref(false);

const hasRunning = computed(() => props.targets.some((t) => t.isOnline));
const isBatch = computed(() => props.targets.length > 1);

watch(open, (isOpen) => {
  if (isOpen) {
    forceStop.value = false;
  }
});
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{
            isBatch
              ? $t('automation.browsers.delete_batch_title', {
                  count: targets.length,
                })
              : $t('automation.browsers.delete_title')
          }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('automation.browsers.delete_desc') }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div
        v-if="hasRunning"
        class="flex flex-col gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500"
      >
        <p>{{ $t('automation.browsers.delete_running_warn') }}</p>
        <label class="flex cursor-pointer items-center gap-2 font-medium">
          <Checkbox
            :model-value="forceStop"
            @update:model-value="(v) => (forceStop = Boolean(v))"
          />
          <span>{{ $t('automation.browsers.delete_force_label') }}</span>
        </label>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel @click="open = false">
          {{ $t('common.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          :disabled="loading || (hasRunning && !forceStop)"
          @click.prevent="emit('confirm', forceStop)"
        >
          {{ $t('common.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
