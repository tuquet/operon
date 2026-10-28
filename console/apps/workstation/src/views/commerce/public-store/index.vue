<script lang="ts" setup>
import type {
  CommerceCategory,
  CommerceOrder,
  CommerceOrderDelivery,
  CommerceProduct,
  CommerceProductType,
  CommerceProductVariant,
  PaymentChannelType,
  PaymentGateway,
  PaymentIntent,
  SavedGuestOrderItem,
} from '#/api';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Badge,
  Button,
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
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
  ToggleGroup,
  ToggleGroupItem,
} from '@operon-core/shadcn-ui';

import {
  ArrowRight,
  Copy,
  Download,
  ExternalLink,
  History,
  KeyRound,
  Lock,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Zap,
} from '@lucide/vue';

import {
  createCheckoutOrder,
  downloadTextFile,
  filterCommerceProducts,
  formatSerialDeliveriesText,
  getGuestOrderDeliveries,
  getSavedGuestOrders,
  isVariantInStock,
  listActivePaymentGateways,
  listCommerceCategories,
  listCommerceProducts,
  saveGuestOrderLocal,
} from '#/api';
import { useClipboard, useDateFormat } from '#/composables';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';

import GuestCheckoutModal from './components/guest-checkout-modal.vue';

defineOptions({ name: 'PublicStorefront' });

const route = useRoute();
const router = useRouter();
const { formatDate } = useDateFormat();
const { copyText } = useClipboard();

type StorefrontMode = 'catalog' | 'lookup';
const activeMode = ref<StorefrontMode>('catalog');

const loadingCatalog = ref(false);
const categories = ref<CommerceCategory[]>([]);
const products = ref<CommerceProduct[]>([]);
const gateways = ref<PaymentGateway[]>([]);

const selectedCategoryId = ref<string>('all');
const selectedProductType = ref<string>('all');
const searchKeyword = ref<string>('');
const selectedVariantByProduct = ref<Record<string, string>>({});

// Guest Checkout Modal State
const checkoutOpen = ref(false);
const activeProduct = ref<CommerceProduct | null>(null);
const activeVariant = ref<CommerceProductVariant | null>(null);
const checkoutQty = ref<number>(1);
const buyerEmail = ref<string>('');
const selectedGatewayId = ref<string>('');
const submittingOrder = ref(false);

// Active Guest Order & Payment Intent
const createdOrder = ref<CommerceOrder | null>(null);
const createdClaimToken = ref<string>('');
const createdIntent = ref<null | PaymentIntent>(null);
const checkingPayment = ref(false);
let pollTimer: null | ReturnType<typeof setInterval> = null;

// Order Lookup & Claim State
const savedOrders = ref<SavedGuestOrderItem[]>([]);
const lookupOrderCode = ref<string>('');
const lookupClaimToken = ref<string>('');
const lookingUp = ref(false);
const lookedUpOrder = ref<CommerceOrder | null>(null);
const lookedUpDeliveries = ref<CommerceOrderDelivery[]>([]);

const publicGateways = computed(() =>
  gateways.value.filter((g) => g.is_active && g.channel !== 'internal_wallet'),
);

const currentGateway = computed<null | PaymentGateway>(
  () =>
    publicGateways.value.find((g) => g.id === selectedGatewayId.value) ||
    publicGateways.value[0] ||
    null,
);

const publicProducts = computed(() => {
  const onlyPublic = products.value.filter((p) => p.visibility === 'public');
  return filterCommerceProducts(onlyPublic, {
    category_id: selectedCategoryId.value,
    product_type: selectedProductType.value,
    search: searchKeyword.value,
  });
});

const totalCheckoutCredits = computed(() => {
  if (!activeVariant.value) return 0;
  return activeVariant.value.price_credits * Math.max(1, checkoutQty.value);
});

const estimatedFiatAmount = computed(() => {
  if (!currentGateway.value) return 0;
  return totalCheckoutCredits.value * currentGateway.value.rate_per_credit;
});

function getProductTypeLabel(type: CommerceProductType): string {
  if (type === 'serial_stock') {
    return $t('page.commerce_view.type_serial_stock');
  }
  if (type === 'digital_file') {
    return $t('page.commerce_view.type_digital_file');
  }
  if (type === 'resource') {
    return $t('page.commerce_view.type_resource_workspace');
  }
  return $t('page.commerce_view.type_wallet_credit_workspace');
}

function isGuestPurchasableProduct(product: CommerceProduct): boolean {
  return (
    product.product_type === 'serial_stock' ||
    product.product_type === 'digital_file'
  );
}

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

async function loadPublicCatalog() {
  loadingCatalog.value = true;
  try {
    const [catRows, prodRows, gwRows] = await Promise.all([
      listCommerceCategories({ skipAuth: true }).catch(
        () => [] as CommerceCategory[],
      ),
      listCommerceProducts({ skipAuth: true }).catch(
        () => [] as CommerceProduct[],
      ),
      listActivePaymentGateways({ skipAuth: true }).catch(
        () => [] as PaymentGateway[],
      ),
    ]);

    categories.value = catRows;
    products.value = prodRows;
    gateways.value = gwRows;

    const initialMap: Record<string, string> = {};
    for (const p of prodRows) {
      if (p.variants && p.variants.length > 0 && p.variants[0]) {
        initialMap[p.id] = p.variants[0].id;
      }
    }
    selectedVariantByProduct.value = initialMap;

    const firstGw = gwRows.find(
      (g) => g.is_active && g.channel !== 'internal_wallet',
    );
    if (firstGw && !selectedGatewayId.value) {
      selectedGatewayId.value = firstGw.id;
    }
  } finally {
    loadingCatalog.value = false;
  }
}

function openGuestCheckout(product: CommerceProduct) {
  if (!isGuestPurchasableProduct(product)) {
    router.push('/commerce/store');
    return;
  }
  const variant = getSelectedVariant(product);
  if (!variant) {
    toast.error($t('page.commerce_view.no_sku_available'));
    return;
  }
  stopPolling();
  activeProduct.value = product;
  activeVariant.value = variant;
  checkoutQty.value = Math.max(1, variant.min_qty || 1);
  createdOrder.value = null;
  createdClaimToken.value = '';
  createdIntent.value = null;
  if (!selectedGatewayId.value && publicGateways.value[0]) {
    selectedGatewayId.value = publicGateways.value[0].id;
  }
  checkoutOpen.value = true;
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPollingGuestOrder(orderCode: string, claimToken: string) {
  stopPolling();
  pollTimer = setInterval(async () => {
    await checkGuestOrderStatus(orderCode, claimToken, true);
  }, 3000);
}

async function checkGuestOrderStatus(
  orderCode: string,
  claimToken: string,
  silent = false,
) {
  if (checkingPayment.value) return;
  checkingPayment.value = true;
  try {
    const res = await getGuestOrderDeliveries(orderCode, claimToken);
    createdOrder.value = res.order;

    if (res.order.status === 'completed') {
      stopPolling();
      toast.success(
        $t('page.commerce_view.guest_order_paid_opening', { code: orderCode }),
      );
      lookedUpOrder.value = res.order;
      lookedUpDeliveries.value = res.deliveries;
      lookupOrderCode.value = orderCode;
      lookupClaimToken.value = claimToken;
      checkoutOpen.value = false;
      activeMode.value = 'lookup';
      await loadPublicCatalog();
    } else if (res.order.status === 'manual_review' && !silent) {
      toast.info($t('page.commerce_view.guest_order_manual_review'));
    } else if (!silent) {
      toast.info($t('page.commerce_view.guest_order_waiting_bank'));
    }
  } catch (error: any) {
    if (!silent) {
      captureError(error, {
        action: 'checkGuestOrderDeliveries',
        view: 'PublicStorefront',
      });
      toast.error(
        error?.message || $t('page.commerce_view.check_order_status_failed'),
      );
    }
  } finally {
    checkingPayment.value = false;
  }
}

async function handleCreateGuestOrder() {
  if (!activeProduct.value || !activeVariant.value) return;
  const gw = currentGateway.value;
  if (!gw) {
    toast.error($t('page.commerce_view.no_external_gateway_available'));
    return;
  }

  submittingOrder.value = true;
  try {
    const res = await createCheckoutOrder(
      {
        buyer_email: buyerEmail.value.trim() || null,
        buyer_tenant_id: null,
        gateway_code: gw.id,
        items: [
          {
            quantity: checkoutQty.value,
            variant_id: activeVariant.value.id,
          },
        ],
        payment_method: gw.channel as PaymentChannelType,
      },
      { skipAuth: true },
    );

    createdOrder.value = res.order;
    createdClaimToken.value = res.claim_token || '';
    createdIntent.value = res.payment_intent;

    if (res.claim_token) {
      savedOrders.value = saveGuestOrderLocal({
        buyer_email: buyerEmail.value.trim() || null,
        claim_token: res.claim_token,
        created_at: res.order.created_at || new Date().toISOString(),
        order_code: res.order.order_code,
        total_credits: res.order.total_credits,
      });
      startPollingGuestOrder(res.order.order_code, res.claim_token);
    }

    toast.success(
      $t('page.commerce_view.guest_order_created_toast', {
        code: res.order.order_code,
      }),
    );
  } catch (error: any) {
    captureError(error, {
      action: 'handleCreateGuestOrder',
      view: 'PublicStorefront',
    });
    toast.error(error?.message || $t('page.commerce_view.order_create_failed'));
  } finally {
    submittingOrder.value = false;
  }
}

async function handleLookupGuestOrder(
  customCode?: string,
  customToken?: string,
) {
  const code = (customCode ?? lookupOrderCode.value).trim();
  const token = (customToken ?? lookupClaimToken.value).trim();

  if (!code || !token) {
    toast.error($t('page.commerce_view.enter_order_code_and_claim_token'));
    return;
  }

  lookupOrderCode.value = code;
  lookupClaimToken.value = token;
  lookingUp.value = true;
  try {
    const res = await getGuestOrderDeliveries(code, token);
    lookedUpOrder.value = res.order;
    lookedUpDeliveries.value = res.deliveries;
    toast.success(
      $t('page.commerce_view.loaded_order_info_toast', {
        code: res.order.order_code,
      }),
    );
  } catch (error: any) {
    captureError(error, {
      action: 'handleLookupGuestOrder',
      orderCode: code,
      view: 'PublicStorefront',
    });
    toast.error(
      error?.message ||
        $t('page.commerce_view.order_not_found_or_invalid_token'),
    );
  } finally {
    lookingUp.value = false;
  }
}

const serialLinesText = computed(() =>
  formatSerialDeliveriesText(lookedUpDeliveries.value),
);

function downloadSerialTxt() {
  if (!serialLinesText.value) return;
  downloadTextFile(
    `${lookedUpOrder.value?.order_code || 'guest-order'}.txt`,
    serialLinesText.value,
  );
}

watch(checkoutOpen, (open) => {
  if (!open) {
    stopPolling();
  }
});

onMounted(async () => {
  savedOrders.value = getSavedGuestOrders();
  await loadPublicCatalog();

  const queryOrder = (route.query.order as string) || '';
  const queryToken = (route.query.token as string) || '';
  if (queryOrder && queryToken) {
    activeMode.value = 'lookup';
    await handleLookupGuestOrder(queryOrder, queryToken);
  }
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <!-- Top Storefront Navbar -->
    <header
      class="sticky top-0 z-30 border-b border-border/60 bg-card/90 backdrop-blur-md"
    >
      <div
        class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Store class="size-5" />
          </div>
          <div>
            <span class="text-base font-bold tracking-tight text-foreground">
              {{ $t('page.commerce_view.public_store_brand') }}
            </span>
            <p class="text-muted-foreground">
              {{ $t('page.commerce_view.public_store_tagline') }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Tabs v-model="activeMode">
            <TabsList class="h-8">
              <TabsTrigger value="catalog" class="h-7 gap-1.5 px-3">
                <ShoppingBag class="size-3.5" />
                {{ $t('page.commerce_view.product_catalog_tab') }}
              </TabsTrigger>
              <TabsTrigger value="lookup" class="h-7 gap-1.5 px-3">
                <PackageSearch class="size-3.5" />
                {{ $t('page.commerce_view.order_lookup_tab') }}
                <Badge
                  v-if="savedOrders.length > 0"
                  variant="secondary"
                  class="ml-0.5"
                >
                  {{ savedOrders.length }}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            size="sm"
            variant="outline"
            class="gap-1.5"
            @click="router.push('/commerce/store')"
          >
            {{ $t('page.commerce_view.workspace_portal_btn') }}
            <ArrowRight class="size-3.5" />
          </Button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <!-- Hero Trust Banner -->
      <div
        class="flex flex-col justify-between gap-4 rounded-2xl border border-primary/25 bg-card p-5 sm:flex-row sm:items-center sm:p-6"
      >
        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <Badge variant="default" class="text-2xs">
              {{ $t('page.commerce_view.instant_auto_fulfillment_badge') }}
            </Badge>
            <span class="text-muted-foreground">
              {{ $t('page.commerce_view.no_account_needed_hint') }}
            </span>
          </div>
          <h1
            class="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            {{ $t('page.commerce_view.public_store_hero_title') }}
          </h1>
          <p class="max-w-2xl text-muted-foreground">
            {{ $t('page.commerce_view.public_store_hero_desc') }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2.5">
          <div
            class="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2"
          >
            <Zap class="size-4 text-primary" />
            <span>
              {{ $t('page.commerce_view.auto_delivery_3s') }}
            </span>
          </div>
          <div
            class="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2"
          >
            <ShieldCheck class="size-4 text-success" />
            <span>
              {{ $t('page.commerce_view.claim_token_security') }}
            </span>
          </div>
        </div>
      </div>

      <!-- MODE 1: PUBLIC CATALOG -->
      <div v-if="activeMode === 'catalog'" class="space-y-5">
        <!-- Filter Bar -->
        <div
          class="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            :model-value="selectedCategoryId"
            class="flex-wrap justify-start gap-1.5"
            @update:model-value="
              (val) => {
                if (val) selectedCategoryId = String(val);
              }
            "
          >
            <ToggleGroupItem
              value="all"
              class="h-8 rounded-md border border-border/60 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {{ $t('page.commerce_view.all_categories') }}
            </ToggleGroupItem>
            <ToggleGroupItem
              v-for="cat in categories"
              :key="cat.id"
              :value="cat.id"
              class="h-8 rounded-md border border-border/60 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {{ cat.name }}
            </ToggleGroupItem>
          </ToggleGroup>

          <div class="flex flex-wrap items-center gap-2">
            <Select v-model="selectedProductType">
              <SelectTrigger class="h-8 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {{ $t('page.commerce_view.all_product_types') }}
                </SelectItem>
                <SelectItem value="serial_stock">
                  {{ $t('page.commerce_view.type_serial_stock') }}
                </SelectItem>
                <SelectItem value="digital_file">
                  {{ $t('page.commerce_view.type_digital_file') }}
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

            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1.5"
              @click="loadPublicCatalog"
            >
              <RefreshCw
                class="size-3.5"
                :class="{ 'animate-spin': loadingCatalog }"
              />
              {{ $t('common.refresh') }}
            </Button>
          </div>
        </div>

        <!-- Product Cards Grid -->
        <Empty
          v-if="!loadingCatalog && publicProducts.length === 0"
          class="bg-card/50 py-14"
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingBag class="size-5 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle class="text-base font-semibold">
              {{ $t('page.commerce_view.empty_public_products_title') }}
            </EmptyTitle>
            <EmptyDescription>
              {{ $t('page.commerce_view.empty_public_products_desc') }}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="product in publicProducts"
            :key="product.id"
            class="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <Badge variant="secondary" class="text-2xs">
                  {{ getProductTypeLabel(product.product_type) }}
                </Badge>
                <span
                  v-if="getSelectedVariant(product)"
                  class="text-muted-foreground"
                >
                  {{ getSelectedVariant(product)?.sku }}
                </span>
              </div>

              <div>
                <h3 class="text-base font-semibold text-foreground">
                  {{ product.name }}
                </h3>
                <p class="mt-1 line-clamp-2 text-muted-foreground">
                  {{
                    product.short_description ||
                    product.description ||
                    $t('page.commerce_view.default_public_product_desc')
                  }}
                </p>
              </div>

              <!-- SKU Pills -->
              <div
                v-if="product.variants && product.variants.length > 0"
                class="space-y-1.5 pt-1"
              >
                <span
                  class="font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  {{ $t('page.commerce_view.sku_category_label') }}
                </span>
                <div class="flex flex-wrap gap-1.5">
                  <Button
                    v-for="variant in product.variants"
                    :key="variant.id"
                    type="button"
                    :variant="
                      getSelectedVariant(product)?.id === variant.id
                        ? 'default'
                        : 'outline'
                    "
                    size="sm"
                    class="h-auto px-2.5 py-1"
                    @click="selectVariant(product.id, variant.id)"
                  >
                    {{ variant.name }}
                  </Button>
                </div>
              </div>
            </div>

            <div
              class="mt-5 flex items-end justify-between border-t border-border/50 pt-4"
            >
              <div class="space-y-0.5">
                <p class="text-xl font-bold text-foreground">
                  {{
                    (
                      getSelectedVariant(product)?.price_credits ?? 0
                    ).toLocaleString('en-US')
                  }}
                  Xu
                </p>
                <p>
                  <span
                    v-if="
                      getSelectedVariant(product)?.stock_mode === 'unlimited'
                    "
                    class="text-success"
                  >
                    ● {{ $t('page.commerce_view.in_stock_unlimited') }}
                  </span>
                  <span
                    v-else-if="
                      (getSelectedVariant(product)?.available_stock ?? 0) > 0
                    "
                    class="text-success"
                  >
                    ●
                    {{
                      $t('page.commerce_view.stock_count', {
                        count: getSelectedVariant(product)?.available_stock,
                      })
                    }}
                  </span>
                  <span v-else class="text-destructive">
                    ● {{ $t('page.commerce_view.out_of_stock') }}
                  </span>
                </p>
              </div>

              <Button
                v-if="isGuestPurchasableProduct(product)"
                size="sm"
                :disabled="!isVariantInStock(getSelectedVariant(product))"
                class="gap-1.5"
                @click="openGuestCheckout(product)"
              >
                <ShoppingBag class="size-3.5" />
                {{ $t('page.commerce_view.buy_now') }}
              </Button>
              <Button
                v-else
                size="sm"
                variant="outline"
                class="gap-1.5"
                @click="router.push('/commerce/store')"
              >
                {{ $t('page.commerce_view.open_in_workspace') }}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODE 2: GUEST ORDER LOOKUP & DELIVERABLES -->
      <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <!-- Lookup Form & Saved Browser Orders -->
        <div class="space-y-4 lg:col-span-1">
          <div class="rounded-xl border border-border/60 bg-card p-5 space-y-4">
            <div>
              <h2 class="text-base font-semibold text-foreground">
                {{ $t('page.commerce_view.guest_lookup_title') }}
              </h2>
              <p class="mt-0.5 text-muted-foreground">
                {{ $t('page.commerce_view.guest_lookup_desc') }}
              </p>
            </div>

            <div class="space-y-3">
              <div class="space-y-1">
                <Label class="text-foreground">
                  {{ $t('page.commerce_view.order_code_field_label') }}
                </Label>
                <Input
                  v-model="lookupOrderCode"
                  type="text"
                  placeholder="ORD-261014-XXXXXX"
                  class="h-9 w-full px-3"
                />
              </div>

              <div class="space-y-1">
                <Label class="text-foreground">
                  {{ $t('page.commerce_view.claim_token_field_label') }}
                </Label>
                <Input
                  v-model="lookupClaimToken"
                  type="text"
                  placeholder="CLM_..."
                  class="h-9 w-full px-3"
                />
              </div>

              <Button
                class="w-full gap-1.5"
                size="sm"
                :disabled="lookingUp"
                @click="() => handleLookupGuestOrder()"
              >
                <PackageSearch class="size-4" />
                {{ $t('page.commerce_view.lookup_and_claim_btn') }}
              </Button>
            </div>
          </div>

          <!-- Saved Orders in LocalStorage -->
          <div
            v-if="savedOrders.length > 0"
            class="rounded-xl border border-border/60 bg-card p-5 space-y-3"
          >
            <div class="flex items-center gap-2">
              <History class="size-4 text-primary" />
              <h3 class="font-semibold text-foreground">
                {{ $t('page.commerce_view.recent_browser_orders') }}
              </h3>
            </div>

            <div class="space-y-2">
              <Button
                v-for="saved in savedOrders"
                :key="saved.order_code"
                type="button"
                variant="outline"
                class="flex h-auto w-full items-center justify-between rounded-lg border-border/60 bg-background p-3 text-left transition-colors hover:border-primary/50"
                @click="
                  handleLookupGuestOrder(saved.order_code, saved.claim_token)
                "
              >
                <div>
                  <p class="font-bold text-foreground">
                    {{ saved.order_code }}
                  </p>
                  <p class="text-muted-foreground">
                    {{ formatDate(saved.created_at) }}
                  </p>
                </div>
                <Badge variant="outline" class="text-2xs">
                  {{ saved.total_credits }} Xu
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        <!-- Deliverables Output Panel -->
        <div class="lg:col-span-2">
          <Empty v-if="!lookedUpOrder" class="h-full min-h-64 bg-card/50 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Lock class="size-5 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle class="font-semibold">
                {{ $t('page.commerce_view.no_order_selected_title') }}
              </EmptyTitle>
              <EmptyDescription>
                {{ $t('page.commerce_view.no_order_selected_desc') }}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>

          <div
            v-else
            class="rounded-xl border border-border/60 bg-card p-5 space-y-4"
          >
            <div
              class="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4"
            >
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-bold text-foreground">
                    {{ lookedUpOrder.order_code }}
                  </h3>
                  <Badge
                    :variant="
                      lookedUpOrder.status === 'completed'
                        ? 'default'
                        : 'secondary'
                    "
                  >
                    {{ lookedUpOrder.status }}
                  </Badge>
                </div>
                <p class="mt-1 text-muted-foreground">
                  {{ $t('page.commerce_view.total_value_label') }}
                  <span class="font-semibold text-foreground">
                    {{ lookedUpOrder.total_credits.toLocaleString('en-US') }} Xu
                  </span>
                  • {{ $t('common.createdAt') }}:
                  {{ formatDate(lookedUpOrder.created_at) }}
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                class="gap-1.5"
                @click="
                  () =>
                    handleLookupGuestOrder(
                      lookedUpOrder?.order_code,
                      lookupClaimToken,
                    )
                "
              >
                <RefreshCw class="size-3.5" />
                {{ $t('page.commerce_view.refresh_status_btn') }}
              </Button>
            </div>

            <Empty v-if="lookedUpDeliveries.length === 0" class="py-10">
              <EmptyHeader>
                <EmptyDescription>
                  {{
                    $t('page.commerce_view.order_status_no_deliveries_prefix')
                  }}
                  <span class="font-semibold text-foreground">{{
                    lookedUpOrder.status
                  }}</span>
                  {{
                    $t('page.commerce_view.order_status_no_deliveries_suffix')
                  }}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>

            <div v-else class="space-y-4">
              <div v-if="serialLinesText" class="space-y-2">
                <div class="flex items-center justify-between">
                  <span
                    class="flex items-center gap-1.5 font-semibold text-foreground"
                  >
                    <KeyRound class="size-3.5 text-primary" />
                    {{
                      $t('page.commerce_view.serial_data_lines', {
                        count: lookedUpDeliveries.filter(
                          (d) => d.delivery_type === 'serial_stock',
                        ).length,
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
                  :rows="8"
                  class="w-full rounded-lg bg-muted/40 p-3"
                />
              </div>

              <div
                v-for="item in lookedUpDeliveries.filter(
                  (d) => d.delivery_type !== 'serial_stock',
                )"
                :key="item.id"
                class="rounded-lg border border-border/60 bg-muted/20 p-3.5"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-foreground">
                    {{
                      $t('page.commerce_view.delivered_resource_type', {
                        type: item.delivery_type,
                      })
                    }}
                  </span>
                  <Badge variant="default" class="text-2xs">
                    {{ $t('page.commerce_view.order_status_completed') }}
                  </Badge>
                </div>
                <pre
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
          </div>
        </div>
      </div>
    </main>

    <!-- Guest Multi-Channel Checkout Dialog -->
    <GuestCheckoutModal
      v-model:open="checkoutOpen"
      v-model:checkout-qty="checkoutQty"
      v-model:buyer-email="buyerEmail"
      v-model:selected-gateway-id="selectedGatewayId"
      :active-product="activeProduct"
      :active-variant="activeVariant"
      :public-gateways="publicGateways"
      :current-gateway="currentGateway"
      :estimated-fiat-amount="estimatedFiatAmount"
      :total-checkout-credits="totalCheckoutCredits"
      :submitting-order="submittingOrder"
      :created-intent="createdIntent"
      :created-order="createdOrder"
      :created-claim-token="createdClaimToken"
      :checking-payment="checkingPayment"
      :copy-text="copyText"
      :stop-polling="stopPolling"
      :check-status="checkGuestOrderStatus"
      @create-order="handleCreateGuestOrder"
    />
  </div>
</template>
