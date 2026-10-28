<script lang="ts" setup>
import type {
  BankReceivingAccount,
  CommerceOrder,
  CommerceOrderStatus,
  CommerceProduct,
  CommerceProductType,
  CommerceProductVariant,
  CommerceProductVisibility,
  CommerceStock,
  CommerceStockMode,
  PaymentGateway,
  PaymentIntent,
} from '#/api';

import { computed, ref, watch } from 'vue';

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
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@operon-core/shadcn-ui';

import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Landmark,
  Layers,
  PackageCheck,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
} from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  approveManualPaymentIntent,
  claimOrderWarranty,
  filterCommerceOrders,
  filterCommerceProducts,
  fulfillOrder,
  importStockBatch,
  inspectStockItem,
  listBankReceivingAccounts,
  listCommerceProducts,
  listManualReviewIntents,
  listOrders,
  listPaymentGateways,
  listStockItems,
  toggleBankReceivingAccount,
  upsertBankReceivingAccount,
  upsertCommerceProduct,
  upsertPaymentGateway,
  upsertProductVariant,
} from '#/api';
import { useDateFormat } from '#/composables';
import {
  COMMERCE_PRODUCT_TYPE,
  COMMERCE_PRODUCT_VISIBILITY,
  COMMERCE_STOCK_MODE,
  FILTER_ALL,
} from '#/constants';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';

defineOptions({ name: 'CommerceAdmin' });

const { formatDate } = useDateFormat();
const { isMobile } = usePreferences();

type AdminTabMode =
  | 'bank_pool'
  | 'gateways'
  | 'manual_review'
  | 'orders'
  | 'products'
  | 'stock_items';
const activeTab = ref<AdminTabMode>('products');

const allProducts = ref<CommerceProduct[]>([]);
const allOrders = ref<CommerceOrder[]>([]);
const allStockItems = ref<CommerceStock[]>([]);
const manualReviewIntents = ref<PaymentIntent[]>([]);
const allGateways = ref<PaymentGateway[]>([]);
const allBankAccounts = ref<BankReceivingAccount[]>([]);

// Warranty Claim Modal State
const warrantyModalOpen = ref(false);
const claimingWarranty = ref(false);
const selectedOrderForWarranty = ref<CommerceOrder | null>(null);
const warrantyClaimReason = ref('Item defective/dead upon delivery');

// Product + Variant Upsert Modal State
const productModalOpen = ref(false);
const savingProduct = ref(false);
const productForm = ref<{
  description: string;
  is_active: boolean;
  name: string;
  price_credits: number;
  product_type: CommerceProductType;
  short_description: string;
  sku: string;
  slug: string;
  stock_mode: CommerceStockMode;
  variant_name: string;
  visibility: CommerceProductVisibility;
}>({
  description: '',
  is_active: true,
  name: '',
  price_credits: 50,
  product_type: COMMERCE_PRODUCT_TYPE.SERIAL_STOCK,
  short_description: '',
  sku: '',
  slug: '',
  stock_mode: COMMERCE_STOCK_MODE.SERIALIZED,
  variant_name: $t('page.commerce_view.default_variant_name'),
  visibility: COMMERCE_PRODUCT_VISIBILITY.PUBLIC,
});

// Bulk Stock Import Modal State
const stockModalOpen = ref(false);
const importingStock = ref(false);
const selectedStockVariantId = ref<string>('');
const stockBatchCode = ref<string>('');
const stockLinesRaw = ref<string>('');

const serializedVariants = computed(() => {
  const list: Array<{
    productName: string;
    variant: CommerceProductVariant;
  }> = [];
  for (const p of allProducts.value) {
    for (const v of p.variants || []) {
      if (v.stock_mode === COMMERCE_STOCK_MODE.SERIALIZED) {
        list.push({ productName: p.name, variant: v });
      }
    }
  }
  return list;
});

function getProductColumns() {
  return [
    {
      field: 'name',
      title: $t('page.commerce_view.col_product'),
      slots: { default: 'name-cell' },
    },
    {
      field: 'product_type',
      title: $t('page.commerce_view.col_category'),
      slots: { default: 'type-cell' },
    },
    {
      field: 'visibility',
      title: $t('page.commerce_view.visibility_label'),
      slots: { default: 'vis-cell' },
    },
    {
      field: 'variants',
      title: $t('page.commerce_view.col_sku_and_price'),
      slots: { default: 'sku-cell' },
    },
    {
      field: 'actions',
      title: $t('common.actions'),
      align: 'right' as const,
      slots: { default: 'action-cell' },
    },
  ];
}

// 1. Products Grid
const [ProductsGrid, productsGridApi] = useVbenVxeGrid<CommerceProduct>({
  separator: false,
  detailSheetOptions: {
    resource: 'commerce.products',
    subtitleField: 'slug',
    titleField: 'name',
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
        fieldName: 'product_type',
        label: () => $t('page.commerce_view.product_type_label'),
        defaultValue: FILTER_ALL,
        componentProps: () => ({
          options: [
            {
              label: $t('page.commerce_view.all_types'),
              value: FILTER_ALL,
            },
            {
              label: $t('page.commerce_view.type_serial_stock_code'),
              value: COMMERCE_PRODUCT_TYPE.SERIAL_STOCK,
            },
            {
              label: $t('page.commerce_view.type_resource_code'),
              value: COMMERCE_PRODUCT_TYPE.SPECTER_RESOURCE,
            },
            {
              label: $t('page.commerce_view.type_digital_file_code'),
              value: COMMERCE_PRODUCT_TYPE.DIGITAL_FILE,
            },
            {
              label: $t('page.commerce_view.type_wallet_credit_code'),
              value: COMMERCE_PRODUCT_TYPE.WALLET_CREDIT,
            },
          ],
        }),
      },
      {
        component: 'Select',
        fieldName: 'visibility',
        label: () => $t('page.commerce_view.visibility_label'),
        defaultValue: FILTER_ALL,
        componentProps: () => ({
          options: [
            {
              label: $t('page.commerce_view.all_modes'),
              value: FILTER_ALL,
            },
            {
              label: $t('page.commerce_view.vis_public'),
              value: COMMERCE_PRODUCT_VISIBILITY.PUBLIC,
            },
            {
              label: $t('page.commerce_view.vis_tenant_only'),
              value: COMMERCE_PRODUCT_VISIBILITY.TENANT_ONLY,
            },
            {
              label: $t('page.commerce_view.vis_hidden'),
              value: COMMERCE_PRODUCT_VISIBILITY.HIDDEN,
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
          placeholder: $t(
            'page.commerce_view.search_admin_product_placeholder',
          ),
          clearable: true,
        }),
      },
    ],
    layout: 'vertical',
    showCollapseButton: false,
    submitOnChange: true,
    submitOnEnter: true,
    submitButtonOptions: { content: () => $t('common.filter') },
    resetButtonOptions: { content: () => $t('common.reset') },
    actionWrapperClass:
      'hidden sm:flex sm:col-span-1 lg:col-span-1 items-end justify-end gap-2',
    wrapperClass: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3',
  },
  gridOptions: {
    border: false,
    round: true,
    showOverflow: true,
    cellConfig: { height: 56 },
    rowConfig: { isHover: true, keyField: 'id' },
    pagerConfig: { pageSize: 15, pageSizes: [10, 15, 30, 50] },
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async (
          { page }: { page?: { currentPage?: number; pageSize?: number } },
          formValues: Record<string, any>,
        ) => {
          const data = await listCommerceProducts({ includeInactive: true });
          allProducts.value = data;
          const filtered = filterCommerceProducts(data, {
            product_type: formValues?.product_type,
            search: formValues?.search,
            visibility: formValues?.visibility,
          });
          const currentPage = page?.currentPage || 1;
          const pageSize = page?.pageSize || 15;
          const start = (currentPage - 1) * pageSize;
          return {
            items: filtered.slice(start, start + pageSize),
            total: filtered.length,
          };
        },
      },
    },
    columns: getProductColumns(),
  },
});

function getOrderColumns() {
  return [
    {
      field: 'order_code',
      title: $t('page.commerce_view.col_order_code'),
      slots: { default: 'code-cell' },
    },
    {
      field: 'buyer_email',
      title: $t('page.commerce_view.col_buyer_tenant'),
      slots: { default: 'buyer-cell' },
    },
    {
      field: 'payment_method',
      title: $t('page.commerce_view.col_payment_channel_short'),
    },
    {
      field: 'total_credits',
      title: $t('page.commerce_view.col_value'),
      slots: { default: 'total-cell' },
    },
    {
      field: 'status',
      title: $t('common.status'),
      slots: { default: 'status-cell' },
    },
    {
      field: 'created_at',
      title: $t('common.createdAt'),
      slots: { default: 'date-cell' },
    },
    {
      field: 'actions',
      title: $t('page.commerce_view.col_dispatch'),
      align: 'right' as const,
      slots: { default: 'action-cell' },
    },
  ];
}

// 2. All Orders Grid
const [OrdersGrid, ordersGridApi] = useVbenVxeGrid<CommerceOrder>({
  separator: false,
  detailSheetOptions: {
    resource: 'commerce.orders',
    subtitleField: 'buyer_email',
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
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.status'),
        defaultValue: 'all',
        componentProps: () => ({
          options: [
            { label: $t('common.all'), value: 'all' },
            { label: 'completed', value: 'completed' },
            { label: 'pending_payment', value: 'pending_payment' },
            { label: 'manual_review', value: 'manual_review' },
            { label: 'failed', value: 'failed' },
          ],
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.search'),
        componentProps: () => ({
          placeholder: $t('page.commerce_view.search_admin_order_placeholder'),
          clearable: true,
        }),
      },
    ],
    layout: 'vertical',
    showCollapseButton: false,
    submitOnChange: true,
    submitOnEnter: true,
    submitButtonOptions: { content: () => $t('common.filter') },
    resetButtonOptions: { content: () => $t('common.reset') },
    actionWrapperClass:
      'hidden sm:flex sm:col-span-2 lg:col-span-2 items-end justify-end gap-2',
    wrapperClass: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3',
  },
  gridOptions: {
    border: false,
    round: true,
    showOverflow: true,
    cellConfig: { height: 54 },
    rowConfig: { isHover: true, keyField: 'id' },
    pagerConfig: { pageSize: 15, pageSizes: [10, 15, 30, 50] },
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async (
          { page }: { page?: { currentPage?: number; pageSize?: number } },
          formValues: Record<string, any>,
        ) => {
          const data = await listOrders();
          allOrders.value = data;
          const filtered = filterCommerceOrders(data, {
            search: formValues?.search,
            status: formValues?.status,
          });
          const currentPage = page?.currentPage || 1;
          const pageSize = page?.pageSize || 15;
          const start = (currentPage - 1) * pageSize;
          return {
            items: filtered.slice(start, start + pageSize),
            total: filtered.length,
          };
        },
      },
    },
    columns: getOrderColumns(),
  },
});

function getManualReviewColumns() {
  return [
    {
      field: 'transfer_code',
      title: $t('page.commerce_view.col_transfer_code'),
      slots: { default: 'code-cell' },
    },
    {
      field: 'gateway_id',
      title: $t('page.commerce_view.payment_gateway_label'),
    },
    {
      field: 'target_type',
      title: $t('page.commerce_view.col_target_type'),
    },
    {
      field: 'amount_credits',
      title: $t('page.commerce_view.col_requested_xu'),
      slots: { default: 'credits-cell' },
    },
    {
      field: 'pay_amount',
      title: $t('page.commerce_view.col_converted_amount'),
      slots: { default: 'pay-cell' },
    },
    {
      field: 'created_at',
      title: $t('page.commerce_view.col_created_time'),
      slots: { default: 'date-cell' },
    },
    {
      field: 'actions',
      title: $t('page.commerce_view.col_approval'),
      align: 'right' as const,
      slots: { default: 'action-cell' },
    },
  ];
}

// 3. Manual Review Intents Grid
const [ManualReviewGrid, manualReviewGridApi] = useVbenVxeGrid<PaymentIntent>({
  separator: false,
  detailSheetOptions: {
    resource: 'billing.payment_intents',
    subtitleField: 'gateway_id',
    titleField: 'transfer_code',
  },
  gridOptions: {
    border: false,
    round: true,
    showOverflow: true,
    cellConfig: { height: 56 },
    rowConfig: { isHover: true, keyField: 'id' },
    pagerConfig: { pageSize: 15, pageSizes: [10, 15, 30, 50] },
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async ({
          page,
        }: {
          page?: { currentPage?: number; pageSize?: number };
        }) => {
          const data = await listManualReviewIntents();
          manualReviewIntents.value = data;
          const currentPage = page?.currentPage || 1;
          const pageSize = page?.pageSize || 15;
          const start = (currentPage - 1) * pageSize;
          return {
            items: data.slice(start, start + pageSize),
            total: data.length,
          };
        },
      },
    },
    columns: getManualReviewColumns(),
  },
});

function getGatewayColumns() {
  return [
    {
      field: 'name',
      title: $t('page.commerce_view.col_gateway_name'),
      slots: { default: 'name-cell' },
    },
    {
      field: 'channel',
      title: $t('page.commerce_view.col_channel'),
    },
    {
      field: 'driver',
      title: $t('page.commerce_view.col_adapter_driver'),
    },
    {
      field: 'rate_per_credit',
      title: $t('page.commerce_view.col_rate_per_xu'),
      slots: { default: 'rate-cell' },
    },
    {
      field: 'is_active',
      title: $t('common.status'),
      slots: { default: 'status-cell' },
    },
  ];
}

// 4. Payment Gateways Grid
const [GatewaysGrid, gatewaysGridApi] = useVbenVxeGrid<PaymentGateway>({
  separator: false,
  detailSheetOptions: {
    resource: 'billing.payment_gateways',
    subtitleField: 'channel',
    titleField: 'name',
    onCreate: async ({ insertPayload }) => {
      return await upsertPaymentGateway(insertPayload as any);
    },
    onSave: async ({ dirtyPayload, row }) => {
      await upsertPaymentGateway({
        ...row,
        ...dirtyPayload,
      } as any);
    },
  },
  gridOptions: {
    border: false,
    round: true,
    showOverflow: true,
    cellConfig: { height: 56 },
    rowConfig: { isHover: true, keyField: 'id' },
    pagerConfig: { enabled: false },
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async () => {
          const data = await listPaymentGateways();
          allGateways.value = data;
          return { items: data, total: data.length };
        },
      },
    },
    columns: getGatewayColumns(),
  },
});

function getBankPoolColumns() {
  return [
    {
      field: 'bank_name',
      title: $t('page.commerce_view.col_bank_info'),
      slots: { default: 'bank-cell' },
    },
    {
      field: 'account_no',
      title: $t('page.commerce_view.col_account_no'),
      slots: { default: 'account-cell' },
    },
    {
      field: 'daily_limit_vnd',
      title: $t('page.commerce_view.col_daily_quota'),
      slots: { default: 'quota-cell' },
    },
    {
      field: 'priority',
      title: $t('page.commerce_view.col_priority'),
    },
    {
      field: 'status',
      title: $t('common.status'),
      slots: { default: 'status-cell' },
    },
    {
      field: 'actions',
      title: $t('common.actions'),
      align: 'right' as const,
      slots: { default: 'actions-cell' },
    },
  ];
}

// 5. Dynamic Bank Accounts Pool Grid
const [BankPoolGrid, bankPoolGridApi] = useVbenVxeGrid<BankReceivingAccount>({
  separator: false,
  detailSheetOptions: {
    resource: 'billing.bank_receiving_accounts',
    subtitleField: 'account_no',
    titleField: 'bank_name',
    onCreate: async ({ insertPayload }) => {
      return await upsertBankReceivingAccount(insertPayload as any);
    },
    onSave: async ({ dirtyPayload, row }) => {
      await upsertBankReceivingAccount({
        ...row,
        ...dirtyPayload,
      } as any);
    },
  },
  gridOptions: {
    border: false,
    round: true,
    showOverflow: true,
    cellConfig: { height: 56 },
    rowConfig: { isHover: true, keyField: 'id' },
    pagerConfig: { enabled: false },
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async () => {
          const data = await listBankReceivingAccounts();
          allBankAccounts.value = data;
          return { items: data, total: data.length };
        },
      },
    },
    columns: getBankPoolColumns(),
  },
});

function getStockItemsColumns() {
  return [
    {
      field: 'batch_code',
      title: $t('page.commerce_view.col_batch_code'),
    },
    {
      field: 'secret_payload',
      title: $t('page.commerce_view.col_secret_payload'),
      slots: { default: 'payload-cell' },
    },
    {
      field: 'status',
      title: $t('page.commerce_view.col_stock_status'),
      slots: { default: 'status-cell' },
    },
    {
      field: 'health_status',
      title: $t('page.commerce_view.col_health_status'),
      slots: { default: 'health-cell' },
    },
    {
      field: 'created_at',
      title: $t('common.createdAt'),
      slots: { default: 'date-cell' },
    },
    {
      field: 'actions',
      title: $t('common.actions'),
      align: 'right' as const,
      slots: { default: 'action-cell' },
    },
  ];
}

// 6. Serialized Stock Items Inspector Grid
const [StockItemsGrid, stockItemsGridApi] = useVbenVxeGrid<CommerceStock>({
  separator: false,
  gridOptions: {
    border: false,
    round: true,
    showOverflow: true,
    cellConfig: { height: 56 },
    rowConfig: { isHover: true, keyField: 'id' },
    pagerConfig: { pageSize: 20, pageSizes: [15, 20, 50, 100] },
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async ({
          page,
        }: {
          page?: { currentPage?: number; pageSize?: number };
        }) => {
          const data = await listStockItems({ limit: 200 });
          allStockItems.value = data;
          const currentPage = page?.currentPage || 1;
          const pageSize = page?.pageSize || 20;
          const start = (currentPage - 1) * pageSize;
          return {
            items: data.slice(start, start + pageSize),
            total: data.length,
          };
        },
      },
    },
    columns: getStockItemsColumns(),
  },
});

watch([() => $t('common.actions'), isMobile], () => {
  productsGridApi.setGridOptions({ columns: getProductColumns() });
  ordersGridApi.setGridOptions({ columns: getOrderColumns() });
  manualReviewGridApi.setGridOptions({ columns: getManualReviewColumns() });
  gatewaysGridApi.setGridOptions({ columns: getGatewayColumns() });
  bankPoolGridApi.setGridOptions({ columns: getBankPoolColumns() });
  stockItemsGridApi.setGridOptions({ columns: getStockItemsColumns() });
  const commonConfig = {
    componentProps: { class: 'w-full' },
    hideLabel: isMobile.value,
  };
  productsGridApi.formApi?.setState({ commonConfig });
  ordersGridApi.formApi?.setState({ commonConfig });
});

function reloadCurrentTab() {
  if (activeTab.value === 'products') productsGridApi.reload();
  else if (activeTab.value === 'orders') ordersGridApi.reload();
  else if (activeTab.value === 'manual_review') manualReviewGridApi.reload();
  else if (activeTab.value === 'gateways') gatewaysGridApi.reload();
  else if (activeTab.value === 'stock_items') stockItemsGridApi.reload();
  else bankPoolGridApi.reload();
}

async function handleToggleAccountStatus(
  row: BankReceivingAccount,
  newStatus: BankReceivingAccount['status'],
) {
  try {
    await toggleBankReceivingAccount(row.id, newStatus, newStatus === 'active');
    toast.success($t('common.successful'));
    await bankPoolGridApi.reload();
  } catch (error: any) {
    captureError(error, {
      action: 'handleToggleAccountStatus',
      view: 'CommerceAdmin',
    });
    toast.error(error?.message || $t('common.failed'));
  }
}

function openCreateProductModal(existing?: CommerceProduct) {
  if (existing) {
    const firstVar = existing.variants?.[0];
    productForm.value = {
      description: existing.description || '',
      is_active: existing.is_active,
      name: existing.name,
      price_credits: firstVar?.price_credits ?? 50,
      product_type: existing.product_type,
      short_description: existing.short_description || '',
      sku: firstVar?.sku || `${existing.slug.toUpperCase()}-STD`,
      slug: existing.slug,
      stock_mode: firstVar?.stock_mode || 'serialized',
      variant_name:
        firstVar?.name || $t('page.commerce_view.default_variant_name'),
      visibility: existing.visibility,
    };
  } else {
    productForm.value = {
      description: '',
      is_active: true,
      name: '',
      price_credits: 50,
      product_type: 'serial_stock',
      short_description: '',
      sku: '',
      slug: '',
      stock_mode: 'serialized',
      variant_name: $t('page.commerce_view.default_variant_name'),
      visibility: 'public',
    };
  }
  productModalOpen.value = true;
}

async function handleSaveProductAndVariant() {
  const f = productForm.value;
  if (!f.name.trim() || !f.slug.trim() || !f.sku.trim()) {
    toast.error($t('page.commerce_view.product_form_required'));
    return;
  }
  savingProduct.value = true;
  try {
    const savedProduct = await upsertCommerceProduct({
      description: f.description.trim() || null,
      is_active: f.is_active,
      name: f.name.trim(),
      product_type: f.product_type,
      short_description: f.short_description.trim() || null,
      slug: f.slug.trim(),
      visibility: f.visibility,
    });

    await upsertProductVariant({
      is_active: true,
      name:
        f.variant_name.trim() || $t('page.commerce_view.default_variant_name'),
      price_credits: Math.max(0, Math.trunc(f.price_credits)),
      product_id: savedProduct.id,
      sku: f.sku.trim(),
      stock_mode: f.stock_mode,
    });

    toast.success(
      $t('page.commerce_view.product_saved_toast', {
        name: savedProduct.name,
        sku: f.sku,
      }),
    );
    productModalOpen.value = false;
    await productsGridApi.reload();
  } catch (error: any) {
    captureError(error, {
      action: 'handleSaveProduct',
      view: 'CommerceAdmin',
    });
    toast.error(error?.message || $t('page.commerce_view.product_save_failed'));
  } finally {
    savingProduct.value = false;
  }
}

function openBulkStockModal(variantId?: string) {
  if (variantId) {
    selectedStockVariantId.value = variantId;
  } else if (
    !selectedStockVariantId.value &&
    serializedVariants.value.length > 0 &&
    serializedVariants.value[0]
  ) {
    selectedStockVariantId.value = serializedVariants.value[0].variant.id;
  }
  stockBatchCode.value = `BATCH-${new Date().toISOString().slice(0, 10)}`;
  stockLinesRaw.value = '';
  stockModalOpen.value = true;
}

async function handleBulkImportStock() {
  if (!selectedStockVariantId.value) {
    toast.error($t('page.commerce_view.select_sku_for_stock'));
    return;
  }
  const lines = stockLinesRaw.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    toast.error($t('page.commerce_view.paste_at_least_one_stock_line'));
    return;
  }

  importingStock.value = true;
  try {
    const res = await importStockBatch({
      batch_code: stockBatchCode.value.trim() || null,
      lines,
      variant_id: selectedStockVariantId.value,
    });
    toast.success(
      $t('page.commerce_view.stock_imported_toast', {
        imported: res.imported_count,
        skipped: res.skipped_duplicates,
        available: res.available_stock,
      }),
    );
    stockModalOpen.value = false;
    await productsGridApi.reload();
  } catch (error: any) {
    captureError(error, {
      action: 'handleBulkImportStock',
      view: 'CommerceAdmin',
    });
    toast.error(error?.message || $t('page.commerce_view.stock_import_failed'));
  } finally {
    importingStock.value = false;
  }
}

async function handleManualFulfillOrder(order: CommerceOrder) {
  try {
    const res = await fulfillOrder(order.id);
    if (res.fulfilled) {
      toast.success(
        $t('page.commerce_view.order_fulfilled_toast', {
          code: order.order_code,
        }),
      );
    } else {
      toast.info(
        $t('page.commerce_view.order_not_eligible_or_out_of_stock', {
          code: order.order_code,
        }),
      );
    }
    await ordersGridApi.reload();
  } catch (error: any) {
    captureError(error, {
      action: 'handleManualFulfillOrder',
      orderId: order.id,
      view: 'CommerceAdmin',
    });
    toast.error(
      error?.message || $t('page.commerce_view.order_fulfill_failed'),
    );
  }
}

async function handleForceApproveIntent(intent: PaymentIntent) {
  try {
    const res = await approveManualPaymentIntent(
      intent.id,
      `Force approved by Superadmin for transfer ${intent.transfer_code}`,
    );
    if (res.settled) {
      toast.success(
        $t('page.commerce_view.intent_approved_toast', {
          code: intent.transfer_code,
          amount: intent.amount_credits,
        }),
      );
      await manualReviewGridApi.reload();
    } else {
      toast.error(res.reason || $t('page.commerce_view.intent_approve_failed'));
    }
  } catch (error: any) {
    captureError(error, {
      action: 'handleForceApproveIntent',
      intentId: intent.id,
      view: 'CommerceAdmin',
    });
    toast.error(
      error?.message || $t('page.commerce_view.intent_approve_error'),
    );
  }
}

function getOrderStatusVariant(status: CommerceOrderStatus) {
  if (status === 'completed' || status === 'paid') return 'default';
  if (status === 'failed') return 'destructive';
  if (status === 'manual_review') return 'secondary';
  return 'outline';
}

async function handleInspectStockItem(
  stock: CommerceStock,
  isHealthy: boolean,
) {
  try {
    const res = await inspectStockItem({
      is_healthy: isHealthy,
      notes: isHealthy
        ? 'Manually restored by admin'
        : 'Marked defective by admin',
      stock_id: stock.id,
    });
    if (res.success) {
      toast.success(
        isHealthy
          ? $t('page.commerce_view.stock_inspect_healthy')
          : $t('page.commerce_view.stock_inspect_defective'),
      );
      await stockItemsGridApi.reload();
      await productsGridApi.reload();
    }
  } catch (error: any) {
    captureError(error, {
      action: 'handleInspectStockItem',
      stockId: stock.id,
      view: 'CommerceAdmin',
    });
    toast.error(error?.message || 'Inspection failed');
  }
}

function openWarrantyClaimModal(order: CommerceOrder) {
  selectedOrderForWarranty.value = order;
  warrantyClaimReason.value = 'Item defective/dead upon delivery';
  warrantyModalOpen.value = true;
}

async function submitWarrantyClaim() {
  if (!selectedOrderForWarranty.value) return;
  claimingWarranty.value = true;
  try {
    const targetDeliveryId =
      selectedOrderForWarranty.value.deliveries?.[0]?.id ||
      selectedOrderForWarranty.value.id;

    const res = await claimOrderWarranty({
      delivery_id: targetDeliveryId,
      order_id: selectedOrderForWarranty.value.id,
      reason: warrantyClaimReason.value,
    });

    if (res.success) {
      toast.success(
        $t('page.commerce_view.warranty_claimed_success', {
          amount: res.refund_amount_credits,
        }),
      );
      warrantyModalOpen.value = false;
      await ordersGridApi.reload();
      await stockItemsGridApi.reload();
      await productsGridApi.reload();
    }
  } catch (error: any) {
    captureError(error, {
      action: 'submitWarrantyClaim',
      orderId: selectedOrderForWarranty.value.id,
      view: 'CommerceAdmin',
    });
    toast.error(error?.message || 'Warranty claim failed');
  } finally {
    claimingWarranty.value = false;
  }
}
</script>

<template>
  <div class="space-y-3 p-3 sm:space-y-5 sm:p-5">
    <!-- Top Header -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h1
          class="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl"
        >
          {{ $t('page.commerce.admin') }}
        </h1>
        <p class="hidden text-muted-foreground sm:block">
          {{ $t('page.commerce.admin_desc') }}
        </p>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
        <Button
          size="sm"
          variant="outline"
          class="gap-1.5"
          @click="() => openBulkStockModal()"
        >
          <Upload class="size-3.5 text-primary" />
          <span class="hidden sm:inline">{{
            $t('page.commerce_view.bulk_import_stock_btn')
          }}</span>
        </Button>

        <Button
          v-if="activeTab === 'gateways'"
          size="sm"
          class="gap-1.5"
          @click="() => gatewaysGridApi.openCreateSheet()"
        >
          <Plus class="size-3.5" />
          <span>{{ $t('common.createRecord') }}</span>
        </Button>

        <Button
          v-else-if="activeTab === 'bank_pool'"
          size="sm"
          class="gap-1.5"
          @click="() => bankPoolGridApi.openCreateSheet()"
        >
          <Plus class="size-3.5" />
          <span>{{ $t('page.commerce_view.add_bank_account_btn') }}</span>
        </Button>

        <Button
          v-else
          size="sm"
          class="gap-1.5"
          @click="() => openCreateProductModal()"
        >
          <Plus class="size-3.5" />
          <span class="hidden sm:inline">{{
            $t('page.commerce_view.add_product_sku_btn')
          }}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="gap-1.5"
          :title="$t('common.refresh')"
          @click="reloadCurrentTab"
        >
          <RefreshCw class="size-3.5 text-muted-foreground" />
          <span class="hidden sm:inline">{{ $t('common.refresh') }}</span>
        </Button>
      </div>
    </div>

    <!-- Mode Selector Tabs -->
    <div class="border-b border-border/60 pb-2">
      <Tabs v-model="activeTab" class="w-full">
        <TabsList
          class="h-8 w-full justify-start overflow-x-auto no-scrollbar sm:w-fit"
        >
          <TabsTrigger
            value="products"
            class="h-7 shrink-0 gap-1.5 px-3 whitespace-nowrap"
          >
            <Layers class="size-3.5" />
            {{
              $t('page.commerce_view.tab_products_stock', {
                count: allProducts.length,
              })
            }}
          </TabsTrigger>

          <TabsTrigger
            value="orders"
            class="h-7 shrink-0 gap-1.5 px-3 whitespace-nowrap"
          >
            <PackageCheck class="size-3.5" />
            {{
              $t('page.commerce_view.tab_all_orders', {
                count: allOrders.length,
              })
            }}
          </TabsTrigger>

          <TabsTrigger
            value="manual_review"
            class="h-7 shrink-0 gap-1.5 px-3 whitespace-nowrap"
          >
            <AlertTriangle class="size-3.5" />
            {{
              $t('page.commerce_view.tab_manual_review', {
                count: manualReviewIntents.length,
              })
            }}
          </TabsTrigger>

          <TabsTrigger
            value="gateways"
            class="h-7 shrink-0 gap-1.5 px-3 whitespace-nowrap"
          >
            <SlidersHorizontal class="size-3.5" />
            {{
              $t('page.commerce_view.tab_gateways', {
                count: allGateways.length,
              })
            }}
          </TabsTrigger>

          <TabsTrigger
            value="bank_pool"
            class="h-7 shrink-0 gap-1.5 px-3 whitespace-nowrap"
          >
            <Landmark class="size-3.5" />
            {{
              $t('page.commerce_view.tab_bank_pool', {
                count: allBankAccounts.length,
              })
            }}
          </TabsTrigger>

          <TabsTrigger
            value="stock_items"
            class="h-7 shrink-0 gap-1.5 px-3 whitespace-nowrap"
          >
            <Boxes class="size-3.5" />
            {{
              $t('page.commerce_view.tab_stock_items', {
                count: allStockItems.length,
              })
            }}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>

    <!-- Tab 1: Products & Stock VXE Grid -->
    <div
      v-show="activeTab === 'products'"
      class="overflow-hidden rounded-none border-0 border-border/60 bg-card p-0 shadow-none sm:rounded-xl sm:border sm:p-5 sm:shadow-xs"
    >
      <ProductsGrid>
        <template #name-cell="{ row }">
          <div class="flex flex-col py-1 text-left">
            <span class="text-foreground">{{ row.name }}</span>
            <span class="text-muted-foreground"> /{{ row.slug }} </span>
          </div>
        </template>

        <template #type-cell="{ row }">
          <Badge variant="outline" class="text-2xs">
            {{ row.product_type }}
          </Badge>
        </template>

        <template #vis-cell="{ row }">
          <Badge
            :variant="row.visibility === 'public' ? 'default' : 'secondary'"
            class="text-2xs"
          >
            {{ row.visibility }}
          </Badge>
        </template>

        <template #sku-cell="{ row }">
          <div class="flex flex-wrap items-center gap-1.5 py-1">
            <Badge
              v-for="v in row.variants || []"
              :key="v.id"
              variant="outline"
              class="text-2xs"
            >
              {{ v.sku }}: {{ v.price_credits }} Xu ({{
                v.stock_mode === 'unlimited'
                  ? '∞'
                  : $t('page.commerce_view.stock_short', {
                      count: v.available_stock,
                    })
              }})
            </Badge>
          </div>
        </template>

        <template #action-cell="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <Button
              v-if="
                row.variants?.some(
                  (v: CommerceProductVariant) => v.stock_mode === 'serialized',
                )
              "
              size="sm"
              variant="outline"
              class="h-7 px-2"
              @click="openBulkStockModal(row.variants?.[0]?.id)"
            >
              {{ $t('page.commerce_view.import_stock_btn') }}
            </Button>
            <Button
              size="sm"
              variant="outline"
              class="h-7 px-2"
              @click="openCreateProductModal(row)"
            >
              {{ $t('common.edit') }}
            </Button>
          </div>
        </template>
      </ProductsGrid>
    </div>

    <!-- Tab 2: All Orders VXE Grid -->
    <div
      v-show="activeTab === 'orders'"
      class="overflow-hidden rounded-none border-0 border-border/60 bg-card p-0 shadow-none sm:rounded-xl sm:border sm:p-5 sm:shadow-xs"
    >
      <OrdersGrid>
        <template #code-cell="{ row }">
          <span class="font-semibold text-foreground">
            {{ row.order_code }}
          </span>
        </template>

        <template #buyer-cell="{ row }">
          <div class="flex flex-col py-1 text-left">
            <span class="text-foreground">
              {{ row.buyer_email || $t('page.commerce_view.tenant_member') }}
            </span>
            <span class="text-muted-foreground">
              {{
                row.buyer_tenant_id
                  ? `Tenant: ${row.buyer_tenant_id.slice(0, 8)}`
                  : $t('page.commerce_view.guest_checkout')
              }}
            </span>
          </div>
        </template>

        <template #total-cell="{ row }">
          <span class="font-bold text-foreground">
            {{ row.total_credits.toLocaleString('en-US') }} Xu
          </span>
        </template>

        <template #status-cell="{ row }">
          <Badge :variant="getOrderStatusVariant(row.status)" class="text-2xs">
            {{ row.status }}
          </Badge>
        </template>

        <template #date-cell="{ row }">
          <span class="text-muted-foreground">
            {{ formatDate(row.created_at) }}
          </span>
        </template>

        <template #action-cell="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <Button
              v-if="row.status === 'completed'"
              size="sm"
              variant="outline"
              class="h-7 gap-1 px-2 text-warning hover:bg-warning/10"
              @click="openWarrantyClaimModal(row)"
            >
              <ShieldCheck class="size-3" />
              {{ $t('page.commerce_view.warranty_claim_btn') }}
            </Button>
            <Button
              size="sm"
              variant="outline"
              class="h-7 gap-1 px-2"
              @click="handleManualFulfillOrder(row)"
            >
              <Play class="size-3" />
              {{ $t('page.commerce_view.redeliver_btn') }}
            </Button>
          </div>
        </template>
      </OrdersGrid>
    </div>

    <!-- Tab 3: Manual Review Queue VXE Grid -->
    <div
      v-show="activeTab === 'manual_review'"
      class="overflow-hidden rounded-none border-0 border-border/60 bg-card p-0 shadow-none sm:rounded-xl sm:border sm:p-5 sm:shadow-xs"
    >
      <ManualReviewGrid>
        <template #code-cell="{ row }">
          <Badge variant="secondary">
            {{ row.transfer_code }}
          </Badge>
        </template>

        <template #credits-cell="{ row }">
          <span class="font-bold text-foreground">
            {{ row.amount_credits.toLocaleString('en-US') }} Xu
          </span>
        </template>

        <template #pay-cell="{ row }">
          <span class="text-foreground">
            {{ row.pay_amount.toLocaleString('en-US') }} {{ row.pay_currency }}
          </span>
        </template>

        <template #date-cell="{ row }">
          <span class="text-muted-foreground">
            {{ formatDate(row.created_at) }}
          </span>
        </template>

        <template #action-cell="{ row }">
          <Button
            size="sm"
            variant="default"
            class="h-7 gap-1 px-2.5"
            @click="handleForceApproveIntent(row)"
          >
            <CheckCircle2 class="size-3.5" />
            {{ $t('page.commerce_view.approve_intent_btn') }}
          </Button>
        </template>
      </ManualReviewGrid>
    </div>

    <!-- Tab 4: Payment Gateways VXE Grid -->
    <div
      v-show="activeTab === 'gateways'"
      class="overflow-hidden rounded-none border-0 border-border/60 bg-card p-0 shadow-none sm:rounded-xl sm:border sm:p-5 sm:shadow-xs"
    >
      <GatewaysGrid>
        <template #name-cell="{ row }">
          <div class="flex flex-col py-1 text-left">
            <span class="text-foreground">{{ row.name }}</span>
            <span class="text-muted-foreground"> ID: {{ row.id }} </span>
          </div>
        </template>

        <template #rate-cell="{ row }">
          <span class="font-semibold text-foreground">
            1 Xu = {{ row.rate_per_credit.toLocaleString('en-US') }}
            {{ row.currency }}
          </span>
        </template>

        <template #status-cell="{ row }">
          <Badge :variant="row.is_active ? 'default' : 'outline'">
            {{
              row.is_active
                ? $t('page.commerce_view.gateway_enabled')
                : $t('page.commerce_view.gateway_disabled')
            }}
          </Badge>
        </template>
      </GatewaysGrid>
    </div>

    <!-- Tab 5: Dynamic Bank Receiving Accounts Pool Grid -->
    <div
      v-show="activeTab === 'bank_pool'"
      class="overflow-hidden rounded-none border-0 border-border/60 bg-card p-0 shadow-none sm:rounded-xl sm:border sm:p-5 sm:shadow-xs"
    >
      <BankPoolGrid>
        <template #bank-cell="{ row }">
          <div class="flex flex-col py-1 text-left">
            <span class="text-foreground">{{ row.bank_name }}</span>
            <span class="text-muted-foreground">
              BIN: {{ row.bank_bin }} · {{ row.account_name }}
            </span>
          </div>
        </template>

        <template #account-cell="{ row }">
          <span class="font-semibold text-foreground">
            {{ row.account_no }}
          </span>
        </template>

        <template #quota-cell="{ row }">
          <div class="flex flex-col gap-1 py-1">
            <div class="flex items-center justify-between">
              <span class="text-foreground">
                {{ row.current_daily_total.toLocaleString('en-US') }}
                {{ $t('term.currencyVnd') }}
              </span>
              <span class="text-muted-foreground">
                / {{ row.daily_limit_vnd.toLocaleString('en-US') }}
                {{ $t('term.currencyVnd') }}
              </span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full transition-all"
                :class="
                  row.current_daily_total >= row.daily_limit_vnd
                    ? 'bg-destructive'
                    : row.current_daily_total >= row.daily_limit_vnd * 0.8
                      ? 'bg-warning'
                      : 'bg-primary'
                "
                :style="{
                  width: `${Math.min(100, Math.round((row.current_daily_total / (row.daily_limit_vnd || 1)) * 100))}%`,
                }"
              ></div>
            </div>
          </div>
        </template>

        <template #status-cell="{ row }">
          <Badge
            :variant="
              row.status === 'active'
                ? 'default'
                : row.status === 'cooling'
                  ? 'secondary'
                  : 'destructive'
            "
            class="text-2xs"
          >
            {{ row.status }}
          </Badge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1.5">
            <Button
              v-if="row.status === 'active'"
              size="sm"
              variant="outline"
              class="h-7 px-2 text-warning hover:bg-warning/10"
              @click="handleToggleAccountStatus(row, 'cooling')"
            >
              {{ $t('page.commerce_view.pool_action_cool') }}
            </Button>
            <Button
              v-else
              size="sm"
              variant="outline"
              class="h-7 px-2 text-primary hover:bg-primary/10"
              @click="handleToggleAccountStatus(row, 'active')"
            >
              {{ $t('page.commerce_view.pool_action_activate') }}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              class="h-7 px-2"
              @click="() => bankPoolGridApi.openDetailSheet(row)"
            >
              {{ $t('common.edit') }}
            </Button>
          </div>
        </template>
      </BankPoolGrid>
    </div>

    <!-- Tab 6: Serialized Stock Items Inspector Grid -->
    <div
      v-show="activeTab === 'stock_items'"
      class="overflow-hidden rounded-none border-0 border-border/60 bg-card p-0 shadow-none sm:rounded-xl sm:border sm:p-5 sm:shadow-xs"
    >
      <StockItemsGrid>
        <template #payload-cell="{ row }">
          <span class="text-foreground">
            {{ row.secret_payload }}
          </span>
        </template>

        <template #status-cell="{ row }">
          <Badge
            :variant="
              row.status === 'available'
                ? 'default'
                : row.status === 'sold'
                  ? 'secondary'
                  : 'destructive'
            "
            class="text-2xs"
          >
            {{ row.status }}
          </Badge>
        </template>

        <template #health-cell="{ row }">
          <Badge
            :variant="
              row.metadata?.health_status === 'defective'
                ? 'destructive'
                : 'outline'
            "
            class="text-2xs"
          >
            {{ row.metadata?.health_status || 'healthy' }}
          </Badge>
        </template>

        <template #date-cell="{ row }">
          <span class="text-muted-foreground">
            {{ formatDate(row.created_at) }}
          </span>
        </template>

        <template #action-cell="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <Button
              v-if="
                row.status === 'defective' ||
                row.metadata?.health_status === 'defective'
              "
              size="sm"
              variant="outline"
              class="h-7 px-2 text-primary hover:bg-primary/10"
              @click="handleInspectStockItem(row, true)"
            >
              {{ $t('page.commerce_view.action_mark_healthy') }}
            </Button>
            <Button
              v-else
              size="sm"
              variant="outline"
              class="h-7 px-2 text-destructive hover:bg-destructive/10"
              @click="handleInspectStockItem(row, false)"
            >
              {{ $t('page.commerce_view.action_mark_defective') }}
            </Button>
          </div>
        </template>
      </StockItemsGrid>
    </div>

    <!-- Modal 1: Upsert Product & SKU Variant -->
    <Dialog v-model:open="productModalOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold">
            {{ $t('page.commerce_view.upsert_product_modal_title') }}
          </DialogTitle>
          <DialogDescription class="text-muted-foreground">
            {{ $t('page.commerce_view.upsert_product_modal_desc') }}
          </DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
          <div class="space-y-1 sm:col-span-2">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.product_name_label') }}
            </Label>
            <Input
              v-model="productForm.name"
              type="text"
              :placeholder="$t('page.commerce_view.product_name_placeholder')"
              class="h-8"
            />
          </div>

          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.product_slug_label') }}
            </Label>
            <Input
              v-model="productForm.slug"
              type="text"
              placeholder="via-co-2fa"
              class="h-8"
            />
          </div>

          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.product_type_label') }}
            </Label>
            <Select v-model="productForm.product_type">
              <SelectTrigger class="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="serial_stock">
                  {{ $t('page.commerce_view.opt_serial_stock') }}
                </SelectItem>
                <SelectItem value="resource">
                  {{ $t('page.commerce_view.opt_resource') }}
                </SelectItem>
                <SelectItem value="digital_file">
                  {{ $t('page.commerce_view.opt_digital_file') }}
                </SelectItem>
                <SelectItem value="wallet_credit">
                  {{ $t('page.commerce_view.opt_wallet_credit') }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.visibility_mode_label') }}
            </Label>
            <Select v-model="productForm.visibility">
              <SelectTrigger class="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  {{ $t('page.commerce_view.opt_vis_public') }}
                </SelectItem>
                <SelectItem value="tenant_only">
                  {{ $t('page.commerce_view.opt_vis_tenant_only') }}
                </SelectItem>
                <SelectItem value="hidden">
                  {{ $t('page.commerce_view.opt_vis_hidden') }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.stock_mode_label') }}
            </Label>
            <Select v-model="productForm.stock_mode">
              <SelectTrigger class="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="serialized">
                  {{ $t('page.commerce_view.opt_stock_serialized') }}
                </SelectItem>
                <SelectItem value="unlimited">
                  {{ $t('page.commerce_view.opt_stock_unlimited') }}
                </SelectItem>
                <SelectItem value="finite_counter">
                  {{ $t('page.commerce_view.opt_stock_finite') }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.sku_code_label') }}
            </Label>
            <Input
              v-model="productForm.sku"
              type="text"
              placeholder="VIA-2FA-01"
              class="h-8"
            />
          </div>

          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.unit_price_xu_label') }}
            </Label>
            <Input
              v-model.number="productForm.price_credits"
              type="number"
              min="0"
              class="h-8"
            />
          </div>

          <div class="space-y-1 sm:col-span-2">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.short_desc_label') }}
            </Label>
            <Input
              v-model="productForm.short_description"
              type="text"
              :placeholder="$t('page.commerce_view.short_desc_placeholder')"
              class="h-8"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" @click="productModalOpen = false">
            {{ $t('common.cancel') }}
          </Button>
          <Button
            size="sm"
            :disabled="savingProduct"
            @click="handleSaveProductAndVariant"
          >
            {{ $t('common.save') }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Modal 2: Bulk Stock Import -->
    <Dialog v-model:open="stockModalOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="text-base font-semibold">
            {{ $t('page.commerce_view.bulk_stock_modal_title') }}
          </DialogTitle>
          <DialogDescription class="text-muted-foreground">
            {{ $t('page.commerce_view.bulk_stock_modal_desc') }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-3 py-2">
          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.select_serialized_sku_label') }}
            </Label>
            <Select v-model="selectedStockVariantId">
              <SelectTrigger class="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in serializedVariants"
                  :key="item.variant.id"
                  :value="item.variant.id"
                >
                  {{ item.productName }} — {{ item.variant.sku }} ({{
                    $t('page.commerce_view.stock_short', {
                      count: item.variant.available_stock,
                    })
                  }})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.batch_code_label') }}
            </Label>
            <Input v-model="stockBatchCode" type="text" class="h-8" />
          </div>

          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.stock_lines_label') }}
            </Label>
            <Textarea
              v-model="stockLinesRaw"
              :rows="7"
              placeholder="1000881122|matkhau123|JBSWY3DPEHPK3PXP&#10;1000881123|matkhau456|KRSXG5CTMVRXEZLU"
              class="w-full rounded-lg border border-border bg-background p-3 text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" @click="stockModalOpen = false">
            {{ $t('common.cancel') }}
          </Button>
          <Button
            size="sm"
            :disabled="importingStock"
            @click="handleBulkImportStock"
          >
            {{ $t('page.commerce_view.submit_import_stock_btn') }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Modal 3: Warranty Claim & Refund Dialog -->
    <Dialog v-model:open="warrantyModalOpen">
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
                selectedOrderForWarranty?.order_code
              }}</span>
            </div>
            <div class="flex justify-between py-0.5">
              <span class="text-muted-foreground"
                >{{ $t('common.totalAmount') }}:</span
              >
              <span class="font-bold text-foreground"
                >{{ selectedOrderForWarranty?.total_credits }}
                {{ $t('term.xu') }}</span
              >
            </div>
          </div>

          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.warranty_reason_label') }}
            </Label>
            <Input v-model="warrantyClaimReason" type="text" class="h-8" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            @click="warrantyModalOpen = false"
          >
            {{ $t('common.cancel') }}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            :disabled="claimingWarranty"
            @click="submitWarrantyClaim"
          >
            {{ $t('page.commerce_view.submit_warranty_claim') }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
