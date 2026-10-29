<script lang="ts" setup>
import type {
  CommerceOrder,
  CommerceOrderDelivery,
  CommerceOrderStatus,
  Tenant,
} from '#/api';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@operon-core/shadcn-ui';

import { Building2, Copy, Eye, RefreshCw, ShoppingBag } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  filterCommerceOrders,
  getActiveTenantId,
  listOrderDeliveries,
  listTenantOrders,
  listTenants,
  setActiveTenantId,
} from '#/api';
import { useClipboard } from '#/composables';
import {
  buildEnumFilterOptions,
  COMMERCE_ORDER_STATUS,
  COMMERCE_ORDER_STATUS_META,
  FILTER_ALL,
  PAYMENT_CHANNEL,
  PAYMENT_CHANNEL_META,
} from '#/constants';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';
import { paginateArray } from '#/utils/pagination';

import OrderDeliveriesModal from '../components/order-deliveries-modal.vue';

defineOptions({ name: 'CommerceOrders' });

const router = useRouter();
const { copyText } = useClipboard();
const { isMobile } = usePreferences();

const tenants = ref<Tenant[]>([]);
const selectedTenantId = ref<string>(getActiveTenantId());
const allOrders = ref<CommerceOrder[]>([]);

// Deliverables Inspector Dialog
const deliveryOpen = ref(false);
const loadingDeliveries = ref(false);
const selectedOrder = ref<CommerceOrder | null>(null);
const orderDeliveries = ref<CommerceOrderDelivery[]>([]);

const orderStatusMap = computed<
  Record<
    CommerceOrderStatus,
    {
      label: string;
      variant: 'default' | 'destructive' | 'outline' | 'secondary';
    }
  >
>(() => ({
  [COMMERCE_ORDER_STATUS.CANCELLED]: {
    label: $t('common.cancelled'),
    variant: 'outline',
  },
  [COMMERCE_ORDER_STATUS.COMPLETED]: {
    label: $t('page.commerce_view.order_status_completed'),
    variant: 'default',
  },
  [COMMERCE_ORDER_STATUS.FAILED]: {
    label: $t('common.failed'),
    variant: 'destructive',
  },
  [COMMERCE_ORDER_STATUS.FULFILLING]: {
    label: $t('page.commerce_view.order_status_fulfilling'),
    variant: 'secondary',
  },
  [COMMERCE_ORDER_STATUS.MANUAL_REVIEW]: {
    label: $t('page.commerce_view.order_status_manual_review'),
    variant: 'secondary',
  },
  [COMMERCE_ORDER_STATUS.PAID]: {
    label: $t('page.commerce_view.order_status_paid'),
    variant: 'default',
  },
  [COMMERCE_ORDER_STATUS.PENDING_PAYMENT]: {
    label: $t('page.commerce_view.order_status_pending_payment'),
    variant: 'outline',
  },
  [COMMERCE_ORDER_STATUS.REFUNDED]: {
    label: $t('page.commerce_view.order_status_refunded'),
    variant: 'outline',
  },
}));

const paymentMethodLabels = computed<Record<string, string>>(() => ({
  [PAYMENT_CHANNEL.BANK_TRANSFER]: $t(
    'page.commerce_view.method_bank_transfer',
  ),
  [PAYMENT_CHANNEL.CARD_INTL]: $t('page.commerce_view.method_card_intl'),
  [PAYMENT_CHANNEL.CRYPTO]: $t('page.commerce_view.method_crypto'),
  [PAYMENT_CHANNEL.E_WALLET]: $t('page.commerce_view.method_e_wallet'),
  [PAYMENT_CHANNEL.INTERNAL_WALLET]: $t(
    'page.commerce_view.method_internal_wallet',
  ),
}));

function getOrderStatusBadge(status: CommerceOrderStatus) {
  return (
    orderStatusMap.value[status] || {
      label: status,
      variant: 'outline' as const,
    }
  );
}

function getPaymentMethodLabel(method: null | string) {
  if (!method) return $t('page.commerce_view.method_not_selected');
  return paymentMethodLabels.value[method] || method;
}

function getColumns() {
  return [
    {
      field: 'order_code',
      title: $t('page.commerce_view.col_order_code'),
      slots: { default: 'code-cell' },
    },
    {
      field: 'payment_method',
      title: $t('page.commerce_view.col_payment_method'),
      slots: { default: 'method-cell' },
    },
    {
      field: 'total_credits',
      title: $t('page.commerce_view.total_payment'),
      slots: { default: 'total-cell' },
    },
    {
      field: 'status',
      title: $t('common.status'),
      slots: { default: 'status-cell' },
    },
    {
      field: 'created_at',
      title: $t('page.commerce_view.col_created_time'),
      cellRender: { name: 'CellDate' },
    },
    {
      field: 'actions',
      title: $t('page.commerce_view.col_delivery'),
      align: 'right' as const,
      slots: { default: 'action-cell' },
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid<CommerceOrder>({
  separator: false,
  detailSheetOptions: {
    resource: 'commerce.orders',
    subtitleField: 'payment_method',
    titleField: 'order_code',
  },
  formOptions: {
    commonConfig: {
      componentProps: {
        class: 'w-full',
      },
      hideLabel: isMobile.value,
    },
    schema: [
      {
        component: 'Select',
        fieldName: 'status',
        label: () => $t('page.commerce_view.order_status_label'),
        defaultValue: FILTER_ALL,
        componentProps: () => ({
          placeholder: $t('common.all'),
          options: buildEnumFilterOptions(COMMERCE_ORDER_STATUS_META, $t, {
            allLabelText: $t('common.all'),
            order: [
              COMMERCE_ORDER_STATUS.COMPLETED,
              COMMERCE_ORDER_STATUS.PENDING_PAYMENT,
              COMMERCE_ORDER_STATUS.MANUAL_REVIEW,
              COMMERCE_ORDER_STATUS.FAILED,
            ],
          }),
        }),
      },
      {
        component: 'Select',
        fieldName: 'payment_method',
        label: () => $t('page.commerce_view.payment_channel_label'),
        defaultValue: FILTER_ALL,
        componentProps: () => ({
          placeholder: $t('page.commerce_view.all_channels'),
          options: buildEnumFilterOptions(PAYMENT_CHANNEL_META, $t, {
            allLabelText: $t('page.commerce_view.all_channels'),
            order: [
              PAYMENT_CHANNEL.INTERNAL_WALLET,
              PAYMENT_CHANNEL.BANK_TRANSFER,
              PAYMENT_CHANNEL.E_WALLET,
              PAYMENT_CHANNEL.CARD_INTL,
              PAYMENT_CHANNEL.CRYPTO,
            ],
          }),
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.search'),
        componentProps: () => ({
          placeholder: $t('page.commerce_view.search_order_placeholder'),
          clearable: true,
        }),
      },
    ],
  },
  gridOptions: {
    cellConfig: {
      height: 56,
    },
    rowConfig: {
      isHover: true,
      keyField: 'id',
    },
    proxyConfig: {
      autoLoad: false,
      ajax: {
        query: async (
          { page }: { page?: { currentPage?: number; pageSize?: number } },
          formValues: Record<string, any>,
        ) => {
          if (!selectedTenantId.value) {
            return { items: [], total: 0 };
          }
          const data = await listTenantOrders(selectedTenantId.value);
          allOrders.value = data;

          const filtered = filterCommerceOrders(data, {
            payment_method: formValues?.payment_method,
            search: formValues?.search,
            status: formValues?.status,
          });

          return paginateArray(filtered, page);
        },
      },
    },
    columns: getColumns,
  },
});

async function initTenantsAndLoad() {
  const tenantRows = await listTenants().catch(() => [] as Tenant[]);
  tenants.value = tenantRows;
  if (
    (!selectedTenantId.value ||
      !tenantRows.some((t) => t.id === selectedTenantId.value)) &&
    tenantRows.length > 0 &&
    tenantRows[0]
  ) {
    selectedTenantId.value = tenantRows[0].id;
    setActiveTenantId(selectedTenantId.value);
  }
  await gridApi.reload();
}

async function handleTenantChange(value: unknown) {
  const nextId = String(value || '');
  if (!nextId) return;
  selectedTenantId.value = nextId;
  setActiveTenantId(nextId);
  await gridApi.reload();
}

async function openDeliveriesModal(order: CommerceOrder) {
  selectedOrder.value = order;
  orderDeliveries.value = [];
  deliveryOpen.value = true;
  loadingDeliveries.value = true;
  try {
    orderDeliveries.value = await listOrderDeliveries(order.id);
  } catch (error: any) {
    captureError(error, {
      action: 'listOrderDeliveries',
      orderId: order.id,
      view: 'CommerceOrders',
    });
    toast.error(
      error?.message || $t('page.commerce_view.load_deliveries_failed'),
    );
  } finally {
    loadingDeliveries.value = false;
  }
}

onMounted(() => {
  initTenantsAndLoad();
});
</script>

<template>
  <Page
    :title="$t('page.commerce.orders')"
    :description="$t('page.commerce.orders_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.commerce.orders') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ allOrders.length }}
        </Badge>
      </div>
    </template>

    <template #extra>
      <div class="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
        <div class="flex items-center gap-1.5">
          <Select
            :model-value="selectedTenantId"
            @update:model-value="handleTenantChange"
          >
            <SelectTrigger
              class="h-8 max-w-[140px] gap-1.5 bg-card px-2.5 sm:max-w-[190px]"
            >
              <Building2 class="size-3.5 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="tenant in tenants"
                :key="tenant.id"
                :value="tenant.id"
              >
                {{ tenant.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="default"
          size="sm"
          class="h-8 gap-1.5 px-2.5 sm:px-3"
          @click="router.push('/commerce/store')"
        >
          <ShoppingBag class="size-3.5" />
          <span class="hidden sm:inline">{{
            $t('page.commerce_view.buy_more_resources')
          }}</span>
        </Button>

        <Button
          variant="outline"
          size="icon"
          class="size-8 shrink-0"
          :title="$t('common.refresh')"
          @click="() => gridApi.reload()"
        >
          <RefreshCw class="size-3.5 shrink-0" />
        </Button>
      </div>
    </template>

    <!-- VXE Grid Container -->
    <div
      class="overflow-hidden rounded-xl border border-border/60 bg-card p-3 sm:p-5 shadow-xs"
    >
      <Grid>
        <template #code-cell="{ row }">
          <div class="flex items-center gap-2 py-1">
            <span class="font-semibold text-foreground">
              {{ row.order_code }}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-5 text-muted-foreground hover:text-foreground"
              @click="
                copyText(
                  row.order_code,
                  $t('page.commerce_view.order_code_label'),
                )
              "
            >
              <Copy class="size-3" />
            </Button>
          </div>
        </template>

        <template #method-cell="{ row }">
          <span class="text-foreground">
            {{ getPaymentMethodLabel(row.payment_method) }}
          </span>
        </template>

        <template #total-cell="{ row }">
          <span class="font-semibold text-foreground">
            {{ row.total_credits.toLocaleString('en-US') }} Xu
          </span>
        </template>

        <template #status-cell="{ row }">
          <Badge :variant="getOrderStatusBadge(row.status).variant">
            {{ getOrderStatusBadge(row.status).label }}
          </Badge>
        </template>

        <template #action-cell="{ row }">
          <Button
            size="sm"
            variant="outline"
            class="h-7 gap-1 px-2.5"
            @click="openDeliveriesModal(row)"
          >
            <Eye class="size-3.5" />
            {{ $t('page.commerce_view.claim_delivery_btn') }}
          </Button>
        </template>
      </Grid>
    </div>

    <!-- Deliverables Inspector Dialog -->
    <OrderDeliveriesModal
      v-model:open="deliveryOpen"
      :deliveries="orderDeliveries"
      :loading="loadingDeliveries"
      :order-code="selectedOrder?.order_code || ''"
      :order-status="selectedOrder?.status || ''"
    />
  </Page>
</template>
