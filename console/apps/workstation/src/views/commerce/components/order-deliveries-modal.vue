<script lang="ts" setup>
import type { CommerceOrderDelivery } from '#/api';

import { computed } from 'vue';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  Spinner,
  Textarea,
} from '@operon-core/shadcn-ui';

import {
  Copy,
  Download,
  ExternalLink,
  KeyRound,
  PackageCheck,
} from '@lucide/vue';

import { downloadTextFile, formatSerialDeliveriesText } from '#/api';
import { useClipboard } from '#/composables';
import { $t } from '#/locales';

interface Props {
  deliveries?: CommerceOrderDelivery[];
  loading?: boolean;
  open: boolean;
  orderCode?: string;
  orderStatus?: string;
}

const props = withDefaults(defineProps<Props>(), {
  deliveries: () => [],
  loading: false,
  orderCode: '',
  orderStatus: '',
});

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const { copyText } = useClipboard();

const serialDeliveries = computed(() =>
  props.deliveries.filter((d) => d.delivery_type === 'serial_stock'),
);

const nonSerialDeliveries = computed(() =>
  props.deliveries.filter((d) => d.delivery_type !== 'serial_stock'),
);

const serialLinesText = computed(() => {
  return formatSerialDeliveriesText(props.deliveries);
});

function downloadSerialTxt() {
  const fileName = `order-${props.orderCode || 'deliveries'}.txt`;
  downloadTextFile(fileName, serialLinesText.value);
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg sm:max-w-xl">
      <DialogHeader>
        <div class="flex items-center gap-2">
          <div
            class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <PackageCheck class="size-5" />
          </div>
          <div>
            <DialogTitle class="text-base font-semibold">
              {{ $t('page.commerce_view.delivered_goods') }}
            </DialogTitle>
            <DialogDescription>
              {{ $t('page.commerce_view.order_label') }}:
              <span class="text-foreground">
                {{ orderCode }}
              </span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <Spinner class="size-6 text-primary" />
      </div>

      <div v-else-if="deliveries.length === 0" class="py-6">
        <Empty>
          <EmptyHeader>
            <EmptyDescription>
              {{ $t('page.commerce_view.no_deliveries_yet') }}
              <span v-if="orderStatus">
                ({{ $t('page.commerce_view.current_status_label') }}:
                <span class="font-semibold text-foreground">{{
                  orderStatus
                }}</span
                >)
              </span>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>

      <div v-else class="space-y-4 py-2">
        <div v-if="serialLinesText" class="space-y-2">
          <div class="flex items-center justify-between">
            <span
              class="flex items-center gap-1.5 font-semibold text-foreground"
            >
              <KeyRound class="size-3.5 text-primary" />
              {{
                $t('page.commerce_view.serial_data_lines', {
                  count: serialDeliveries.length,
                })
              }}
            </span>
            <div class="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                class="h-7 gap-1"
                @click="
                  copyText(
                    serialLinesText,
                    $t('page.commerce_view.account_list_label'),
                  )
                "
              >
                <Copy class="size-3" />
                {{ $t('page.commerce_view.copy_all') }}
              </Button>
              <Button
                size="sm"
                variant="default"
                class="h-7 gap-1"
                @click="downloadSerialTxt"
              >
                <Download class="size-3" />
                {{ $t('page.commerce_view.download_txt') }}
              </Button>
            </div>
          </div>
          <Textarea
            readonly
            :model-value="serialLinesText"
            :rows="6"
            class="w-full rounded-lg border border-border bg-muted/40 p-3 text-foreground focus:outline-none"
          />
        </div>

        <div
          v-for="item in nonSerialDeliveries"
          :key="item.id"
          class="rounded-lg border border-border/60 bg-muted/20 p-3.5"
        >
          <div class="flex items-center justify-between">
            <span class="font-semibold text-foreground">
              {{
                $t('page.commerce_view.delivery_type_prefix', {
                  type: item.delivery_type,
                })
              }}
            </span>
            <Badge variant="default" class="text-2xs">
              {{ $t('page.commerce_view.provisioned_badge') }}
            </Badge>
          </div>
          <pre
            v-if="item.delivered_payload"
            class="mt-2 overflow-x-auto rounded bg-background p-2 text-muted-foreground"
            >{{ JSON.stringify(item.delivered_payload, null, 2) }}</pre>
          <div
            v-if="item.delivered_payload?.download_url"
            class="mt-2 flex justify-end"
          >
            <a
              :href="item.delivered_payload.download_url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <ExternalLink class="size-3" />
              {{ $t('page.commerce_view.download_file') }}
            </a>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
