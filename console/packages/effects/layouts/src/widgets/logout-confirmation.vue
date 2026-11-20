<script setup lang="ts">
import { $t } from '@operon/locales';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@operon-core/shadcn-ui';
defineEmits<{ confirm: [] }>();
const open = defineModel<boolean>('open', { default: false });
</script>
<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent :open="open" centered>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('common.prompt') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('ui.widgets.logoutTip') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="$emit('confirm')">
          {{ $t('common.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
