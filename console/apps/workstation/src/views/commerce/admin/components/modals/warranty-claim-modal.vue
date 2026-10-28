<script lang="ts" setup>
import type { CommerceOrder } from '#/api/core/commerce';

import { ref, watch } from 'vue';

import { $t } from '@operon/locales';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@operon-core/shadcn-ui';

interface Props {
  claiming?: boolean;
  open: boolean;
  order: CommerceOrder | null;
}

const props = withDefaults(defineProps<Props>(), {
  claiming: false,
});

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'submit', reason: string): void;
}>();

const claimReason = ref('');

watch(
  () => props.open,
  (val) => {
    if (val) {
      claimReason.value = $t('page.commerce_view.warranty_default_reason');
    }
  },
);

function handleCancel() {
  emit('update:open', false);
}

function handleSubmit() {
  emit('submit', claimReason.value);
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="text-base font-semibold">
          {{ $t('page.commerce_view.warranty_claim_title') }}
        </DialogTitle>
        <DialogDescription class="text-muted-foreground">
          {{ $t('page.commerce_view.warranty_claim_desc') }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3 py-2">
        <div class="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <div class="flex justify-between py-0.5">
            <span class="text-muted-foreground"
              >{{ $t('common.orderCode') }}:</span
            >
            <span class="font-semibold text-foreground">{{
              props.order?.order_code
            }}</span>
          </div>
          <div class="flex justify-between py-0.5">
            <span class="text-muted-foreground"
              >{{ $t('common.totalAmount') }}:</span
            >
            <span class="font-bold text-foreground"
              >{{ props.order?.total_credits }} {{ $t('term.xu') }}</span
            >
          </div>
        </div>

        <div class="space-y-1">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.warranty_reason_label') }}
          </Label>
          <Input v-model="claimReason" type="text" class="h-8" />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" @click="handleCancel">
          {{ $t('common.cancel') }}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          :disabled="props.claiming"
          @click="handleSubmit"
        >
          {{ $t('page.commerce_view.submit_warranty_claim') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
