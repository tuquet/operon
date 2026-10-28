<script lang="ts" setup>
import type {
  CommerceCategory,
  CommerceOrderDelivery,
  CommerceProduct,
  CommerceProductType,
  CommerceProductVariant,
  PaymentChannelType,
  PaymentGateway,
  PaymentIntent,
  Tenant,
  TenantWallet,
} from '#/api';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

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
  EmptyMedia,
  EmptyTitle,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  ToggleGroup,
  ToggleGroupItem,
} from '@operon-core/shadcn-ui';

import {
  Building2,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Wallet,
} from '@lucide/vue';

import {
  createCheckoutOrder,
  filterCommerceProducts,
  getActiveTenantId,
  getPaymentIntentStatus,
  getTenantWallet,
  listActivePaymentGateways,
  listCommerceCategories,
  listCommerceProducts,
  listOrderDeliveries,
  listTenants,
  setActiveTenantId,
} from '#/api';
import { useClipboard } from '#/composables';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';

import OrderDeliveriesModal from '../components/order-deliveries-modal.vue';
import ProductCatalogCard from '../components/product-catalog-card.vue';

defineOptions({ name: 'CommerceStore' });

const router = useRouter();
const { copyText } = useClipboard();

const loading = ref(false);
const tenants = ref<Tenant[]>([]);
const selectedTenantId = ref<string>(getActiveTenantId());
const wallet = ref<null | TenantWallet>(null);
const categories = ref<CommerceCategory[]>([]);
const products = ref<CommerceProduct[]>([]);
const gateways = ref<PaymentGateway[]>([]);

const selectedCategoryId = ref<string>('all');
const selectedProductType = ref<string>('all');
const searchKeyword = ref<string>('');

// Map product_id -> selected variant_id
const selectedVariantByProduct = ref<Record<string, string>>({});

// Checkout Dialog state
const checkoutOpen = ref(false);
const activeProduct = ref<CommerceProduct | null>(null);
const activeVariant = ref<CommerceProductVariant | null>(null);
const checkoutQty = ref<number>(1);
const selectedGatewayId = ref<string>('internal_wallet');
const submittingOrder = ref(false);

// Active external payment intent waiting for payment
const pendingIntent = ref<null | PaymentIntent>(null);
const pendingOrderId = ref<null | string>(null);
const pendingOrderCode = ref<string>('');
const checkingStatus = ref(false);
let pollTimer: null | ReturnType<typeof setInterval> = null;

// Instant Deliverables Dialog state
const deliveryOpen = ref(false);
const deliveredOrderCode = ref<string>('');
const deliveredItems = ref<CommerceOrderDelivery[]>([]);

const productTypeMap = computed<
  Record<
    CommerceProductType,
    {
      label: string;
      variant: 'default' | 'destructive' | 'outline' | 'secondary';
    }
  >
>(() => ({
  digital_file: {
    label: $t('page.commerce_view.type_digital_file'),
    variant: 'outline',
  },
  serial_stock: {
    label: $t('page.commerce_view.type_serial_stock'),
    variant: 'default',
  },
  resource: {
    label: $t('page.commerce_view.type_resource'),
    variant: 'secondary',
  },
  wallet_credit: {
    label: $t('page.commerce_view.type_wallet_credit'),
    variant: 'outline',
  },
}));

const filteredProducts = computed(() => {
  return filterCommerceProducts(products.value, {
    category_id: selectedCategoryId.value,
    product_type: selectedProductType.value,
    search: searchKeyword.value,
  });
});

const externalGateways = computed(() =>
  gateways.value.filter((g) => g.is_active && g.channel !== 'internal_wallet'),
);

const currentGateway = computed<null | PaymentGateway>(() => {
  if (selectedGatewayId.value === 'internal_wallet') {
    return null;
  }
  return (
    externalGateways.value.find((g) => g.id === selectedGatewayId.value) || null
  );
});

const totalCheckoutCredits = computed(() => {
  if (!activeVariant.value) return 0;
  return activeVariant.value.price_credits * Math.max(1, checkoutQty.value);
});

const walletBalance = computed(() => wallet.value?.balance_credits ?? 0);

const hasEnoughWalletCredits = computed(
  () => walletBalance.value >= totalCheckoutCredits.value,
);

const estimatedFiatAmount = computed(() => {
  if (!currentGateway.value) return 0;
  return totalCheckoutCredits.value * currentGateway.value.rate_per_credit;
});

function getSelectedVariant(
  product: CommerceProduct,
): CommerceProductVariant | null {
  const variants = product.variants || [];
  if (variants.length === 0) return null;
  const chosenId = selectedVariantByProduct.value[product.id];
  return variants.find((v) => v.id === chosenId) || variants[0] || null;
}

function selectVariant(productId: string, variantId: string) {
  selectedVariantByProduct.value = {
    ...selectedVariantByProduct.value,
    [productId]: variantId,
  };
}

async function loadStoreData() {
  loading.value = true;
  try {
    const [tenantRows, categoryRows, productRows, gatewayRows] =
      await Promise.all([
        listTenants().catch(() => [] as Tenant[]),
        listCommerceCategories().catch(() => [] as CommerceCategory[]),
        listCommerceProducts().catch(() => [] as CommerceProduct[]),
        listActivePaymentGateways().catch(() => [] as PaymentGateway[]),
      ]);

    tenants.value = tenantRows;
    categories.value = categoryRows;
    products.value = productRows;
    gateways.value = gatewayRows;

    const initialMap: Record<string, string> = {};
    for (const p of productRows) {
      if (p.variants && p.variants.length > 0 && p.variants[0]) {
        initialMap[p.id] = p.variants[0].id;
      }
    }
    selectedVariantByProduct.value = initialMap;

    if (
      (!selectedTenantId.value ||
        !tenantRows.some((t) => t.id === selectedTenantId.value)) &&
      tenantRows.length > 0 &&
      tenantRows[0]
    ) {
      selectedTenantId.value = tenantRows[0].id;
      setActiveTenantId(selectedTenantId.value);
    }

    if (selectedTenantId.value) {
      wallet.value = await getTenantWallet(selectedTenantId.value).catch(
        () => null,
      );
    }
  } finally {
    loading.value = false;
  }
}

async function handleTenantChange(value: unknown) {
  const nextId = String(value || '');
  if (!nextId) return;
  selectedTenantId.value = nextId;
  setActiveTenantId(nextId);
  wallet.value = await getTenantWallet(nextId).catch(() => null);
}

function openCheckoutModal(product: CommerceProduct) {
  const variant = getSelectedVariant(product);
  if (!variant) {
    toast.error($t('page.commerce_view.no_sku_available'));
    return;
  }
  stopPolling();
  activeProduct.value = product;
  activeVariant.value = variant;
  checkoutQty.value = Math.max(1, variant.min_qty || 1);
  selectedGatewayId.value = 'internal_wallet';
  pendingIntent.value = null;
  pendingOrderId.value = null;
  pendingOrderCode.value = '';
  checkoutOpen.value = true;
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPollingIntent(intentId: string, orderId: string) {
  stopPolling();
  pollTimer = setInterval(async () => {
    await checkPendingPaymentStatus(intentId, orderId, true);
  }, 3000);
}

async function checkPendingPaymentStatus(
  intentId: string,
  orderId: string,
  silent = false,
) {
  if (checkingStatus.value) return;
  checkingStatus.value = true;
  try {
    const updated = await getPaymentIntentStatus(intentId);
    if (!updated) return;
    pendingIntent.value = updated;

    if (updated.status === 'succeeded') {
      stopPolling();
      toast.success($t('page.commerce_view.payment_success_opening'));
      const deliveries = await listOrderDeliveries(orderId).catch(() => []);
      deliveredOrderCode.value = pendingOrderCode.value;
      deliveredItems.value = deliveries;
      checkoutOpen.value = false;
      deliveryOpen.value = true;
      await loadStoreData();
    } else if (updated.status === 'manual_review' && !silent) {
      toast.info($t('page.commerce_view.payment_manual_review_pending'));
    } else if (!silent) {
      toast.info($t('page.commerce_view.payment_waiting_gateway'));
    }
  } finally {
    checkingStatus.value = false;
  }
}

async function handleCreateOrder() {
  if (!activeProduct.value || !activeVariant.value) return;
  if (!selectedTenantId.value) {
    toast.error($t('page.commerce_view.select_workspace_before_buy'));
    return;
  }

  const isInternalWallet = selectedGatewayId.value === 'internal_wallet';
  if (isInternalWallet && !hasEnoughWalletCredits.value) {
    toast.error($t('page.commerce_view.insufficient_wallet_balance'));
    return;
  }

  const chosenGw = currentGateway.value;
  const paymentMethod: PaymentChannelType = isInternalWallet
    ? 'internal_wallet'
    : chosenGw?.channel || 'bank_transfer';

  submittingOrder.value = true;
  try {
    const res = await createCheckoutOrder({
      buyer_tenant_id: selectedTenantId.value,
      gateway_code: isInternalWallet ? 'internal_wallet' : chosenGw?.id || null,
      items: [
        {
          quantity: checkoutQty.value,
          variant_id: activeVariant.value.id,
        },
      ],
      payment_method: paymentMethod,
    });

    if (res.order.status === 'completed' || isInternalWallet) {
      toast.success(
        $t('page.commerce_view.order_paid_and_delivered', {
          code: res.order.order_code,
        }),
      );
      deliveredOrderCode.value = res.order.order_code;
      deliveredItems.value = res.fulfillment?.deliveries || [];
      checkoutOpen.value = false;
      deliveryOpen.value = true;
      await loadStoreData();
    } else {
      pendingOrderId.value = res.order.id;
      pendingOrderCode.value = res.order.order_code;
      pendingIntent.value = res.payment_intent;
      startPollingIntent(res.payment_intent.id, res.order.id);
      toast.success(
        $t('page.commerce_view.payment_intent_created', {
          code: res.payment_intent.transfer_code,
        }),
      );
    }
  } catch (error: any) {
    captureError(error, {
      action: 'handleCreateOrder',
      view: 'CommerceStore',
    });
    toast.error(error?.message || $t('page.commerce_view.order_create_failed'));
  } finally {
    submittingOrder.value = false;
  }
}

watch(checkoutOpen, (open) => {
  if (!open) {
    stopPolling();
  }
});

onMounted(() => {
  loadStoreData();
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>

<template>
  <div class="space-y-3 p-3 sm:space-y-4 sm:p-5">
    <!-- Top Header & Workspace Wallet Banner -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h1
            class="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl"
          >
            {{ $t('page.commerce.store') }}
          </h1>
          <Badge variant="secondary" class="shrink-0">
            {{ filteredProducts.length }}
          </Badge>
        </div>
        <p class="hidden text-muted-foreground sm:block">
          {{ $t('page.commerce.store_desc') }}
        </p>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
        <!-- Workspace Selector -->
        <div
          class="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1"
        >
          <Building2 class="size-3.5 shrink-0 text-muted-foreground" />
          <Select
            :model-value="selectedTenantId"
            @update:model-value="handleTenantChange"
          >
            <SelectTrigger
              class="h-6 max-w-[150px] border-0 bg-transparent px-1 py-0 text-foreground shadow-none focus:ring-0"
            >
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

        <!-- Xu Wallet Pill -->
        <div
          class="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1"
        >
          <Coins class="size-3.5 text-primary" />
          <span class="hidden sm:inline text-muted-foreground">
            {{ $t('page.commerce_view.balance_label') }}:
          </span>
          <span class="sm: font-bold text-foreground">
            {{ walletBalance.toLocaleString('en-US') }} Xu
          </span>
          <Button
            size="sm"
            variant="default"
            class="h-6 px-2"
            @click="router.push('/commerce/wallet')"
          >
            + {{ $t('page.commerce_view.topup_xu') }}
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          class="hidden md:inline-flex h-8 gap-1.5"
          @click="router.push('/commerce/orders')"
        >
          <PackageCheck class="size-3.5 text-muted-foreground" />
          {{ $t('page.commerce_view.purchased_orders') }}
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="hidden lg:inline-flex h-8 gap-1.5"
          @click="router.push('/store')"
        >
          <ExternalLink class="size-3.5 text-muted-foreground" />
          {{ $t('page.commerce_view.public_storefront') }}
        </Button>

        <Button
          variant="outline"
          size="icon"
          class="size-8 shrink-0"
          :title="$t('common.refresh')"
          @click="loadStoreData"
        >
          <RefreshCw
            class="size-3.5 shrink-0"
            :class="{ 'animate-spin': loading }"
          />
        </Button>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div
      class="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
    >
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        :model-value="selectedCategoryId"
        class="justify-start gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap"
        @update:model-value="
          (val) => {
            if (val) selectedCategoryId = String(val);
          }
        "
      >
        <ToggleGroupItem
          value="all"
          class="h-8 shrink-0 rounded-md border border-border/60 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {{ $t('page.commerce_view.all_categories') }}
        </ToggleGroupItem>
        <ToggleGroupItem
          v-for="cat in categories"
          :key="cat.id"
          :value="cat.id"
          class="h-8 shrink-0 rounded-md border border-border/60 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {{ cat.name }}
        </ToggleGroupItem>
      </ToggleGroup>

      <div class="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Select v-model="selectedProductType">
          <SelectTrigger class="h-8 w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {{ $t('page.commerce_view.all_resource_types') }}
            </SelectItem>
            <SelectItem value="serial_stock">
              {{ $t('page.commerce_view.type_serial_stock') }}
            </SelectItem>
            <SelectItem value="resource">
              {{ $t('page.commerce_view.type_resource') }}
            </SelectItem>
            <SelectItem value="digital_file">
              {{ $t('page.commerce_view.type_digital_file') }}
            </SelectItem>
            <SelectItem value="wallet_credit">
              {{ $t('page.commerce_view.type_wallet_credit') }}
            </SelectItem>
          </SelectContent>
        </Select>

        <InputGroup class="h-8 w-full sm:w-64">
          <InputGroupAddon>
            <Search class="size-3.5 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            v-model="searchKeyword"
            type="text"
            :placeholder="
              $t('page.commerce_view.search_product_sku_placeholder')
            "
          />
        </InputGroup>
      </div>
    </div>

    <!-- Empty State -->
    <Empty
      v-if="!loading && filteredProducts.length === 0"
      class="bg-card/50 py-14"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShoppingBag class="size-5 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle class="text-base font-semibold">
          {{ $t('page.commerce_view.empty_products_title') }}
        </EmptyTitle>
        <EmptyDescription>
          {{ $t('page.commerce_view.empty_products_desc') }}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>

    <!-- Product Grid -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ProductCatalogCard
        v-for="product in filteredProducts"
        :key="product.id"
        :product="product"
        :product-type-map="productTypeMap"
        :selected-variant-id="selectedVariantByProduct[product.id]"
        @buy="openCheckoutModal"
        @select-variant="selectVariant"
      />
    </div>

    <!-- Multi-Channel Checkout Dialog -->
    <Dialog v-model:open="checkoutOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base font-semibold">
            <ShoppingBag class="size-4 text-primary" />
            {{
              pendingIntent
                ? $t('page.commerce_view.pay_order_title', {
                    code: pendingOrderCode,
                  })
                : $t('page.commerce_view.confirm_buy_title', {
                    name: activeProduct?.name || '',
                  })
            }}
          </DialogTitle>
          <DialogDescription class="text-muted-foreground">
            {{
              pendingIntent
                ? $t('page.commerce_view.pay_order_desc')
                : $t('page.commerce_view.confirm_buy_desc')
            }}
          </DialogDescription>
        </DialogHeader>

        <!-- Step 1: Configure Quantity & Payment Gateway -->
        <div v-if="!pendingIntent && activeVariant" class="space-y-4 py-2">
          <div
            class="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3"
          >
            <div>
              <p class="font-semibold text-foreground">
                {{ activeVariant.name }}
              </p>
              <p class="text-muted-foreground">SKU: {{ activeVariant.sku }}</p>
            </div>
            <div class="text-right">
              <p class="text-base font-bold text-primary">
                {{ activeVariant.price_credits.toLocaleString('en-US') }} Xu
              </p>
              <p class="text-muted-foreground">
                {{ $t('page.commerce_view.unit_price_label') }}
              </p>
            </div>
          </div>

          <!-- Quantity Input -->
          <div class="flex items-center justify-between">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.quantity_to_buy') }}
            </Label>
            <Input
              v-model.number="checkoutQty"
              type="number"
              :min="activeVariant.min_qty || 1"
              :max="activeVariant.max_qty || 100"
              class="h-8 w-24 px-2.5 text-right"
            />
          </div>

          <!-- Payment Method Selection -->
          <div class="space-y-2">
            <Label
              class="font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {{ $t('page.commerce_view.payment_method_label') }}
            </Label>

            <!-- Option 1: Instant Xu Wallet -->
            <Button
              type="button"
              variant="outline"
              class="flex h-auto w-full items-center justify-between rounded-lg p-3 text-left transition-colors"
              :class="
                selectedGatewayId === 'internal_wallet'
                  ? 'border-primary bg-primary/10'
                  : 'border-border/60 bg-card hover:border-primary/40'
              "
              @click="selectedGatewayId = 'internal_wallet'"
            >
              <div class="flex items-center gap-2.5">
                <Wallet class="size-4 text-primary" />
                <div>
                  <p class="font-semibold text-foreground">
                    {{ $t('page.commerce_view.prepaid_wallet_instant') }}
                  </p>
                  <p class="text-muted-foreground">
                    {{ $t('page.commerce_view.current_balance_label') }}:
                    <span class="font-semibold text-foreground">
                      {{ walletBalance.toLocaleString('en-US') }} Xu
                    </span>
                  </p>
                </div>
              </div>
              <Badge
                :variant="hasEnoughWalletCredits ? 'default' : 'destructive'"
                class="text-2xs"
              >
                {{
                  hasEnoughWalletCredits
                    ? $t('page.commerce_view.enough_xu')
                    : $t('page.commerce_view.insufficient_xu')
                }}
              </Badge>
            </Button>

            <!-- External Payment Gateways -->
            <Button
              v-for="gw in externalGateways"
              :key="gw.id"
              type="button"
              variant="outline"
              class="flex h-auto w-full items-center justify-between rounded-lg p-3 text-left transition-colors"
              :class="
                selectedGatewayId === gw.id
                  ? 'border-primary bg-primary/10'
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
                    {{ $t('page.commerce_view.exchange_rate_label') }}: 1 Xu =
                    {{ gw.rate_per_credit.toLocaleString('en-US') }}
                    {{ gw.currency }}
                  </p>
                </div>
              </div>
              <Badge variant="outline" class="text-2xs">
                {{ gw.currency }}
              </Badge>
            </Button>
          </div>

          <!-- Total Summary -->
          <div
            class="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3"
          >
            <span class="text-muted-foreground">
              {{ $t('page.commerce_view.total_payment') }}
            </span>
            <div class="text-right">
              <p class="text-lg font-bold text-foreground">
                {{ totalCheckoutCredits.toLocaleString('en-US') }} Xu
              </p>
              <p v-if="currentGateway" class="text-muted-foreground">
                ≈ {{ estimatedFiatAmount.toLocaleString('en-US') }}
                {{ currentGateway.currency }}
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" @click="checkoutOpen = false">
              {{ $t('common.cancel') }}
            </Button>
            <Button
              size="sm"
              :disabled="
                submittingOrder ||
                (selectedGatewayId === 'internal_wallet' &&
                  !hasEnoughWalletCredits)
              "
              class="gap-1.5"
              @click="handleCreateOrder"
            >
              <Sparkles class="size-3.5" />
              {{
                selectedGatewayId === 'internal_wallet'
                  ? $t('page.commerce_view.pay_with_xu_instant')
                  : $t('page.commerce_view.create_payment_code')
              }}
            </Button>
          </div>
        </div>

        <!-- Step 2: External Gateway QR & Transfer Code Instructions -->
        <div v-else-if="pendingIntent" class="space-y-4 py-2">
          <div
            v-if="pendingIntent.checkout_payload?.qr_image_url"
            class="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-white p-4"
          >
            <img
              :src="pendingIntent.checkout_payload.qr_image_url"
              :alt="$t('page.commerce_view.payment_qr_alt')"
              class="h-52 w-52 object-contain"
            />
            <span class="mt-2 text-muted-foreground">
              {{ $t('page.commerce_view.scan_vietqr_hint') }}
            </span>
          </div>

          <div
            class="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3.5"
          >
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">
                {{ $t('page.commerce_view.transfer_amount_label') }}:
              </span>
              <span class="font-bold text-foreground">
                {{ pendingIntent.pay_amount.toLocaleString('en-US') }}
                {{ pendingIntent.pay_currency }}
              </span>
            </div>

            <div
              v-if="pendingIntent.checkout_payload?.bank_name"
              class="flex items-center justify-between"
            >
              <span class="text-muted-foreground">
                {{ $t('page.commerce_view.bank_or_wallet_label') }}:
              </span>
              <span class="text-foreground">
                {{ pendingIntent.checkout_payload.bank_name }} —
                {{ pendingIntent.checkout_payload.account_no }}
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">
                {{ $t('page.commerce_view.transfer_memo_label') }}:
              </span>
              <div class="flex items-center gap-1.5">
                <Badge variant="secondary">
                  {{ pendingIntent.transfer_code }}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-6 px-2"
                  @click="
                    copyText(
                      pendingIntent.transfer_code,
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
                {{ $t('common.status') }}:
              </span>
              <Badge variant="secondary" class="text-2xs">
                {{ pendingIntent.status }} ({{
                  $t('page.commerce_view.auto_check_3s')
                }})
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
                  checkoutOpen = false;
                }
              "
            >
              {{ $t('common.close') }}
            </Button>
            <Button
              size="sm"
              class="gap-1.5"
              :disabled="checkingStatus"
              @click="
                () =>
                  pendingIntent &&
                  pendingOrderId &&
                  checkPendingPaymentStatus(
                    pendingIntent.id,
                    pendingOrderId,
                    false,
                  )
              "
            >
              <RefreshCw
                class="size-3.5"
                :class="{ 'animate-spin': checkingStatus }"
              />
              {{ $t('page.commerce_view.check_payment_btn') }}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Instant Fulfillment Deliverables Dialog -->
    <OrderDeliveriesModal
      v-model:open="deliveryOpen"
      :deliveries="deliveredItems"
      :order-code="deliveredOrderCode"
    />
  </div>
</template>
