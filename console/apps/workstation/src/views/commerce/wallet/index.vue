<script lang="ts" setup>
import type {
  PaymentGateway,
  PaymentIntent,
  Tenant,
  TenantWallet,
  WalletTransaction,
  WalletTxType,
} from '#/api';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@operon-core/shadcn-ui';

import {
  Building2,
  Coins,
  Copy,
  CreditCard,
  Plus,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createPaymentIntent,
  filterWalletTransactions,
  getActiveTenantId,
  getPaymentIntentStatus,
  getTenantWallet,
  listActivePaymentGateways,
  listTenants,
  listWalletTransactions,
  setActiveTenantId,
} from '#/api';
import { useClipboard, useDateFormat } from '#/composables';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';
import { paginateArray } from '#/utils/pagination';

defineOptions({ name: 'CommerceWallet' });

const router = useRouter();
const { formatDate } = useDateFormat();
const { copyText, copyToClipboard } = useClipboard();
const { isMobile } = usePreferences();

const tenants = ref<Tenant[]>([]);
const selectedTenantId = ref<string>(getActiveTenantId());
const wallet = ref<null | TenantWallet>(null);
const gateways = ref<PaymentGateway[]>([]);
const allTransactions = ref<WalletTransaction[]>([]);

// Top-up Dialog State
const topupOpen = ref(false);
const topupCredits = ref<number>(100);
const selectedGatewayId = ref<string>('');
const creatingIntent = ref(false);
const activeIntent = ref<null | PaymentIntent>(null);
const checkingIntent = ref(false);
let pollTimer: null | ReturnType<typeof setInterval> = null;

const QUICK_TOPUP_PRESETS = [50, 100, 200, 500, 1000, 5000];

const txTypeMap = computed<
  Record<
    WalletTxType,
    {
      label: string;
      variant: 'default' | 'destructive' | 'outline' | 'secondary';
    }
  >
>(() => ({
  admin_adjustment: {
    label: $t('page.commerce_view.tx_admin_adjustment'),
    variant: 'secondary',
  },
  bonus: { label: $t('page.commerce_view.tx_bonus'), variant: 'default' },
  purchase: {
    label: $t('page.commerce_view.tx_purchase'),
    variant: 'outline',
  },
  refund: {
    label: $t('page.commerce_view.tx_refund'),
    variant: 'secondary',
  },
  topup: { label: $t('page.commerce_view.tx_topup'), variant: 'default' },
}));

function getTxTypeBadge(type: WalletTxType) {
  return txTypeMap.value[type] || { label: type, variant: 'outline' as const };
}

const topupGateways = computed(() =>
  gateways.value.filter((g) => g.is_active && g.channel !== 'internal_wallet'),
);

const selectedGateway = computed<null | PaymentGateway>(
  () =>
    topupGateways.value.find((g) => g.id === selectedGatewayId.value) ||
    topupGateways.value[0] ||
    null,
);

const estimatedPayAmount = computed(() => {
  if (!selectedGateway.value) return 0;
  return (
    Math.max(1, topupCredits.value) * selectedGateway.value.rate_per_credit
  );
});

function getColumns() {
  return [
    {
      field: 'tx_type',
      title: $t('page.commerce_view.tx_type_label'),
      slots: { default: 'type-cell' },
    },
    {
      field: 'description',
      title: $t('common.description'),
      slots: { default: 'desc-cell' },
    },
    {
      field: 'amount_credits',
      title: $t('page.commerce_view.col_amount_change'),
      slots: { default: 'amount-cell' },
    },
    {
      field: 'balance_after_credits',
      title: $t('page.commerce_view.col_balance_after'),
      slots: { default: 'balance-cell' },
    },
    {
      field: 'reference_id',
      title: $t('page.commerce_view.col_reference_id'),
      slots: { default: 'ref-cell' },
    },
    {
      field: 'created_at',
      title: $t('page.commerce_view.col_created_time'),
      slots: { default: 'date-cell' },
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid<WalletTransaction>({
  separator: false,
  detailSheetOptions: {
    resource: 'billing.wallet_transactions',
    subtitleField: 'tx_type',
    titleField: 'description',
    actions: [
      {
        label: $t('common.copy'),
        onClick: (row) =>
          copyToClipboard(row.reference_id || row.id, 'Reference ID'),
        variant: 'outline',
      },
    ],
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
        fieldName: 'tx_type',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('page.commerce_view.tx_type_label'),
        defaultValue: 'all',
        componentProps: () => ({
          placeholder: $t('page.commerce_view.all_transactions'),
          options: [
            { label: $t('page.commerce_view.all_transactions'), value: 'all' },
            { label: $t('page.commerce_view.tx_topup'), value: 'topup' },
            { label: $t('page.commerce_view.tx_purchase'), value: 'purchase' },
            { label: $t('page.commerce_view.tx_bonus'), value: 'bonus' },
            { label: $t('page.commerce_view.tx_refund'), value: 'refund' },
            {
              label: $t('page.commerce_view.tx_admin_adjustment'),
              value: 'admin_adjustment',
            },
          ],
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.search'),
        componentProps: () => ({
          placeholder: $t('page.commerce_view.search_tx_placeholder'),
          clearable: true,
        }),
      },
    ],
    actionWrapperClass:
      'hidden sm:flex sm:col-span-2 lg:col-span-2 items-center justify-end gap-2 pt-1 sm:pt-6',
  },
  gridOptions: {
    cellConfig: {
      height: 54,
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
          const [walletData, txRows] = await Promise.all([
            getTenantWallet(selectedTenantId.value),
            listWalletTransactions(selectedTenantId.value, { limit: 100 }),
          ]);
          wallet.value = walletData;
          allTransactions.value = txRows;

          const filtered = filterWalletTransactions(txRows, {
            search: formValues?.search,
            tx_type: formValues?.tx_type,
          });

          return paginateArray(filtered, page);
        },
      },
    },
    columns: getColumns,
  },
});

async function initData() {
  const [tenantRows, gatewayRows] = await Promise.all([
    listTenants().catch(() => [] as Tenant[]),
    listActivePaymentGateways().catch(() => [] as PaymentGateway[]),
  ]);
  tenants.value = tenantRows;
  gateways.value = gatewayRows;

  const firstExternal = gatewayRows.find(
    (g) => g.is_active && g.channel !== 'internal_wallet',
  );
  if (firstExternal) {
    selectedGatewayId.value = firstExternal.id;
  }

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

function openTopupModal() {
  stopPolling();
  activeIntent.value = null;
  topupCredits.value = 100;
  if (!selectedGatewayId.value && topupGateways.value[0]) {
    selectedGatewayId.value = topupGateways.value[0].id;
  }
  topupOpen.value = true;
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling(intentId: string) {
  stopPolling();
  pollTimer = setInterval(async () => {
    await checkTopupStatus(intentId, true);
  }, 3000);
}

async function checkTopupStatus(intentId: string, silent = false) {
  if (checkingIntent.value) return;
  checkingIntent.value = true;
  try {
    const updated = await getPaymentIntentStatus(intentId);
    if (!updated) return;
    activeIntent.value = updated;
    if (updated.status === 'succeeded') {
      stopPolling();
      toast.success(
        $t('page.commerce_view.topup_success_toast', {
          amount: updated.amount_credits.toLocaleString('en-US'),
        }),
      );
      topupOpen.value = false;
      await gridApi.reload();
    } else if (updated.status === 'manual_review' && !silent) {
      toast.info($t('page.commerce_view.payment_manual_review_pending'));
    } else if (!silent) {
      toast.info($t('page.commerce_view.payment_waiting_gateway'));
    }
  } finally {
    checkingIntent.value = false;
  }
}

async function handleCreateTopupIntent() {
  if (!selectedTenantId.value) {
    toast.error($t('page.commerce_view.select_workspace_before_topup'));
    return;
  }
  const gw = selectedGateway.value;
  if (!gw) {
    toast.error($t('page.commerce_view.select_payment_gateway'));
    return;
  }
  if (!topupCredits.value || topupCredits.value <= 0) {
    toast.error($t('page.commerce_view.topup_amount_must_be_positive'));
    return;
  }

  creatingIntent.value = true;
  try {
    const intent = await createPaymentIntent({
      amount_credits: Math.trunc(topupCredits.value),
      gateway_id: gw.id,
      target_id: selectedTenantId.value,
      target_type: 'wallet_topup',
      tenant_id: selectedTenantId.value,
    });
    activeIntent.value = intent;
    startPolling(intent.id);
    toast.success(
      $t('page.commerce_view.topup_intent_created', {
        code: intent.transfer_code,
      }),
    );
  } catch (error: any) {
    captureError(error, {
      action: 'handleCreateTopup',
      view: 'CommerceWallet',
    });
    toast.error(error?.message || $t('page.commerce_view.topup_create_failed'));
  } finally {
    creatingIntent.value = false;
  }
}

watch(topupOpen, (open) => {
  if (!open) {
    stopPolling();
  }
});

onMounted(() => {
  initData();
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>

<template>
  <Page
    :title="$t('page.commerce.wallet')"
    :description="$t('page.commerce.wallet_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.commerce.wallet') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ allTransactions.length }}
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
              class="h-8 max-w-[130px] gap-1.5 bg-card px-2.5 sm:max-w-[190px]"
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
          size="sm"
          class="h-8 gap-1.5 px-2.5 sm:px-3"
          @click="openTopupModal"
        >
          <Plus class="size-3.5" />
          <span>{{ $t('page.commerce_view.topup_more_xu') }}</span>
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

    <!-- Compact Wallet Balance Strip -->
    <div
      class="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5 sm:px-4 sm:py-3"
    >
      <div class="flex items-center gap-2.5">
        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Wallet class="size-4" />
        </div>
        <div>
          <span class="text-muted-foreground">
            {{ $t('page.commerce_view.available_balance_kpi') }}
          </span>
          <p class="text-base sm:text-lg font-bold text-foreground">
            {{ (wallet?.balance_credits ?? 0).toLocaleString('en-US') }} Xu
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        class="h-7 gap-1.5 px-2.5"
        @click="router.push('/commerce/store')"
      >
        <ShoppingBag class="size-3.5 text-muted-foreground" />
        <span>{{ $t('page.commerce.store') }}</span>
      </Button>
    </div>

    <!-- Ledger VXE Grid -->

    <Grid>
      <template #type-cell="{ row }">
        <Badge :variant="getTxTypeBadge(row.tx_type).variant">
          {{ getTxTypeBadge(row.tx_type).label }}
        </Badge>
      </template>

      <template #desc-cell="{ row }">
        <span class="text-foreground">
          {{
            row.description || $t('page.commerce_view.default_wallet_tx_desc')
          }}
        </span>
      </template>

      <template #amount-cell="{ row }">
        <span
          class="font-bold"
          :class="row.amount_credits >= 0 ? 'text-success' : 'text-destructive'"
        >
          {{ row.amount_credits >= 0 ? '+' : ''
          }}{{ row.amount_credits.toLocaleString('en-US') }} Xu
        </span>
      </template>

      <template #balance-cell="{ row }">
        <span class="font-semibold text-foreground">
          {{ row.balance_after_credits.toLocaleString('en-US') }} Xu
        </span>
      </template>

      <template #ref-cell="{ row }">
        <span class="text-muted-foreground">
          {{ row.reference_id ? row.reference_id.slice(0, 12) : '—' }}
        </span>
      </template>

      <template #date-cell="{ row }">
        <span class="text-muted-foreground">
          {{ formatDate(row.created_at) }}
        </span>
      </template>
    </Grid>

    <!-- Top-up Xu Multi-Channel Dialog -->
    <Dialog v-model:open="topupOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base font-semibold">
            <Coins class="size-4 text-primary" />
            {{
              activeIntent
                ? $t('page.commerce_view.topup_transfer_title', {
                    code: activeIntent.transfer_code,
                  })
                : $t('page.commerce_view.wallet_topup_title')
            }}
          </DialogTitle>
          <DialogDescription class="text-muted-foreground">
            {{
              activeIntent
                ? $t('page.commerce_view.topup_transfer_desc')
                : $t('page.commerce_view.wallet_topup_desc')
            }}
          </DialogDescription>
        </DialogHeader>

        <!-- Step 1: Select Amount & Gateway -->
        <div v-if="!activeIntent" class="space-y-4 py-2">
          <div class="space-y-2">
            <Label
              class="font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {{ $t('page.commerce_view.quick_select_xu_pack') }}
            </Label>
            <div class="grid grid-cols-3 gap-2">
              <Button
                v-for="preset in QUICK_TOPUP_PRESETS"
                :key="preset"
                type="button"
                :variant="topupCredits === preset ? 'default' : 'outline'"
                class="h-auto py-2 font-semibold"
                @click="topupCredits = preset"
              >
                +{{ preset.toLocaleString('en-US') }} Xu
              </Button>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.custom_xu_amount_label') }}
            </Label>
            <Input
              v-model.number="topupCredits"
              type="number"
              min="10"
              step="10"
              class="h-8 w-32 text-right"
            />
          </div>

          <div class="space-y-2">
            <Label
              class="font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {{ $t('page.commerce_view.payment_gateway_label') }}
            </Label>
            <Button
              v-for="gw in topupGateways"
              :key="gw.id"
              type="button"
              variant="outline"
              class="flex h-auto w-full items-center justify-between rounded-lg border p-3 text-left transition-colors"
              :class="
                selectedGateway?.id === gw.id
                  ? 'border-primary bg-primary/10 hover:bg-primary/15'
                  : 'border-border/60 bg-card hover:border-primary/40'
              "
              @click="selectedGatewayId = gw.id"
            >
              <div class="flex items-center gap-2.5">
                <CreditCard class="size-4 text-primary" />
                <div>
                  <p class="font-semibold text-foreground">
                    {{ gw.name }}
                  </p>
                  <p class="text-muted-foreground">
                    1 Xu = {{ gw.rate_per_credit.toLocaleString('en-US') }}
                    {{ gw.currency }}
                  </p>
                </div>
              </div>
              <Badge variant="outline" class="text-2xs">
                {{ gw.currency }}
              </Badge>
            </Button>
          </div>

          <div
            class="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3"
          >
            <span class="text-muted-foreground">
              {{ $t('page.commerce_view.estimated_pay_amount') }}
            </span>
            <div class="text-right">
              <p class="text-lg font-bold text-foreground">
                {{ estimatedPayAmount.toLocaleString('en-US') }}
                {{ selectedGateway?.currency || 'VND' }}
              </p>
              <p class="text-primary">
                {{
                  $t('page.commerce_view.receive_immediately_xu', {
                    amount: topupCredits.toLocaleString('en-US'),
                  })
                }}
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" @click="topupOpen = false">
              {{ $t('common.cancel') }}
            </Button>
            <Button
              size="sm"
              :disabled="creatingIntent || topupGateways.length === 0"
              class="gap-1.5"
              @click="handleCreateTopupIntent"
            >
              <Plus class="size-3.5" />
              {{ $t('page.commerce_view.create_topup_code_btn') }}
            </Button>
          </div>
        </div>

        <!-- Step 2: Display QR & Transfer Code -->
        <div v-else class="space-y-4 py-2">
          <div
            v-if="activeIntent.checkout_payload?.qr_image_url"
            class="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-white p-4"
          >
            <img
              :src="activeIntent.checkout_payload.qr_image_url"
              :alt="$t('page.commerce_view.payment_qr_alt')"
              class="h-52 w-52 object-contain"
            />
            <span class="mt-2 text-muted-foreground">
              {{ $t('page.commerce_view.scan_qr_bank_wallet_hint') }}
            </span>
          </div>

          <div
            class="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3.5"
          >
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">
                {{ $t('page.commerce_view.xu_to_receive_label') }}
              </span>
              <span class="font-bold text-primary">
                +{{ activeIntent.amount_credits.toLocaleString('en-US') }} Xu
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">
                {{ $t('page.commerce_view.transfer_amount_label') }}
              </span>
              <span class="font-bold text-foreground">
                {{ activeIntent.pay_amount.toLocaleString('en-US') }}
                {{ activeIntent.pay_currency }}
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">
                {{ $t('page.commerce_view.transfer_memo_label') }}
              </span>
              <div class="flex items-center gap-1.5">
                <Badge variant="secondary">
                  {{ activeIntent.transfer_code }}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-6 px-2"
                  @click="
                    copyText(
                      activeIntent.transfer_code,
                      $t('page.commerce_view.transfer_code_label'),
                    )
                  "
                >
                  <Copy class="size-3" />
                </Button>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">
                {{ $t('page.commerce_view.intent_status_label') }}
              </span>
              <Badge variant="secondary" class="text-2xs">
                {{ activeIntent.status }}
              </Badge>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              @click="
                () => {
                  stopPolling();
                  topupOpen = false;
                }
              "
            >
              {{ $t('common.close') }}
            </Button>
            <Button
              size="sm"
              class="gap-1.5"
              :disabled="checkingIntent"
              @click="() => activeIntent && checkTopupStatus(activeIntent.id)"
            >
              <RefreshCw
                class="size-3.5"
                :class="{ 'animate-spin': checkingIntent }"
              />
              {{ $t('page.commerce_view.check_xu_received_btn') }}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </Page>
</template>
