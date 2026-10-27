import type {
  BrowserStatus,
  CommerceOrderStatus,
  CommerceProductType,
  DeviceStatus,
  JobStatus,
  PaymentChannelType,
  PaymentIntentStatusType,
  ProxyStatus,
  SubscriptionStatus,
  SystemPluginStatus,
  TenantPlan,
  TenantStatus,
  WalletTxType,
  WorkflowStatus,
} from '@operon/constants';

import type { EnumItemMeta } from './enum-helper';

import {
  BROWSER_STATUS,
  COMMERCE_ORDER_STATUS,
  COMMERCE_PRODUCT_TYPE,
  DEVICE_STATUS,
  JOB_STATUS,
  PAYMENT_CHANNEL,
  PAYMENT_INTENT_STATUS,
  PROXY_STATUS,
  SUBSCRIPTION_STATUS,
  SYSTEM_PLUGIN_STATUS,
  TENANT_PLAN,
  TENANT_STATUS,
  WALLET_TX_TYPE,
  WORKFLOW_STATUS,
} from '@operon/constants';

import { STATUS_TONE } from './enum-helper';

export const TENANT_STATUS_META: Record<TenantStatus, EnumItemMeta> = {
  [TENANT_STATUS.ACTIVE]: {
    fallbackLabel: 'Active',
    labelKey: 'page.workspace.action_active',
    tone: STATUS_TONE.SUCCESS,
  },
  [TENANT_STATUS.SUSPENDED]: {
    fallbackLabel: 'Suspended',
    labelKey: 'common.suspended',
    tone: STATUS_TONE.WARNING,
  },
  [TENANT_STATUS.ARCHIVED]: {
    fallbackLabel: 'Archived',
    labelKey: 'page.workflows_view.status_archived',
    tone: STATUS_TONE.NEUTRAL,
  },
};

export const TENANT_PLAN_META: Record<TenantPlan, EnumItemMeta> = {
  [TENANT_PLAN.FREE]: {
    fallbackLabel: 'Free',
    labelKey: 'page.analytics.plan_free',
    tone: STATUS_TONE.NEUTRAL,
  },
  [TENANT_PLAN.PRO]: {
    fallbackLabel: 'Pro',
    labelKey: 'page.analytics.plan_pro',
    tone: STATUS_TONE.PRIMARY,
  },
  [TENANT_PLAN.ENTERPRISE]: {
    fallbackLabel: 'Enterprise',
    labelKey: 'page.analytics.plan_enterprise',
    tone: STATUS_TONE.INFO,
  },
};

export const WORKFLOW_STATUS_META: Record<WorkflowStatus, EnumItemMeta> = {
  [WORKFLOW_STATUS.PUBLISHED]: {
    fallbackLabel: 'Published',
    labelKey: 'page.workflows_view.status_published',
    tone: STATUS_TONE.SUCCESS,
  },
  [WORKFLOW_STATUS.DRAFT]: {
    fallbackLabel: 'Draft',
    labelKey: 'page.workflows_view.status_draft',
    tone: STATUS_TONE.WARNING,
  },
  [WORKFLOW_STATUS.ARCHIVED]: {
    fallbackLabel: 'Archived',
    labelKey: 'page.workflows_view.status_archived',
    tone: STATUS_TONE.NEUTRAL,
  },
};

export const JOB_STATUS_META: Record<JobStatus, EnumItemMeta> = {
  [JOB_STATUS.RUNNING]: {
    fallbackLabel: 'Running',
    labelKey: 'page.jobs_view.status_running',
    tone: STATUS_TONE.INFO,
  },
  [JOB_STATUS.COMPLETED]: {
    fallbackLabel: 'Completed',
    labelKey: 'page.jobs_view.status_completed',
    tone: STATUS_TONE.SUCCESS,
  },
  [JOB_STATUS.FAILED]: {
    fallbackLabel: 'Failed',
    labelKey: 'page.jobs_view.status_failed',
    tone: STATUS_TONE.DANGER,
  },
  [JOB_STATUS.PENDING]: {
    fallbackLabel: 'Pending',
    labelKey: 'page.jobs_view.status_pending',
    tone: STATUS_TONE.WARNING,
  },
  [JOB_STATUS.QUEUED]: {
    fallbackLabel: 'Pending',
    labelKey: 'page.jobs_view.status_pending',
    tone: STATUS_TONE.WARNING,
  },
  [JOB_STATUS.PAUSED]: {
    fallbackLabel: 'Paused',
    labelKey: 'page.system_view.status_paused',
    tone: STATUS_TONE.WARNING,
  },
  [JOB_STATUS.CANCELLED]: {
    fallbackLabel: 'Cancelled',
    labelKey: 'page.jobs_view.status_cancelled',
    tone: STATUS_TONE.NEUTRAL,
  },
};

export const DEVICE_STATUS_META: Record<DeviceStatus, EnumItemMeta> = {
  [DEVICE_STATUS.IDLE]: {
    fallbackLabel: 'Idle',
    labelKey: 'page.automation_view.device_status_idle',
    tone: STATUS_TONE.SUCCESS,
  },
  [DEVICE_STATUS.BUSY]: {
    fallbackLabel: 'Busy',
    labelKey: 'page.automation_view.device_status_busy',
    tone: STATUS_TONE.INFO,
  },
  [DEVICE_STATUS.OFFLINE]: {
    fallbackLabel: 'Offline',
    labelKey: 'common.offline',
    tone: STATUS_TONE.NEUTRAL,
  },
  [DEVICE_STATUS.MAINTENANCE]: {
    fallbackLabel: 'Maintenance',
    labelKey: 'page.automation_view.device_status_maintenance',
    tone: STATUS_TONE.WARNING,
  },
  [DEVICE_STATUS.DISABLED]: {
    fallbackLabel: 'Disabled',
    labelKey: 'common.disabled',
    tone: STATUS_TONE.DANGER,
  },
};

export const BROWSER_STATUS_META: Record<BrowserStatus, EnumItemMeta> = {
  [BROWSER_STATUS.IDLE]: {
    fallbackLabel: 'Idle',
    labelKey: 'page.automation_view.device_status_idle',
    tone: STATUS_TONE.SUCCESS,
  },
  [BROWSER_STATUS.RUNNING]: {
    fallbackLabel: 'Running',
    labelKey: 'common.running',
    tone: STATUS_TONE.INFO,
  },
  [BROWSER_STATUS.SYNCING]: {
    fallbackLabel: 'Syncing',
    labelKey: 'page.automation_view.browser_status_syncing',
    tone: STATUS_TONE.WARNING,
  },
  [BROWSER_STATUS.ERROR]: {
    fallbackLabel: 'Error',
    labelKey: 'common.error',
    tone: STATUS_TONE.DANGER,
  },
};

export const PROXY_STATUS_META: Record<ProxyStatus, EnumItemMeta> = {
  [PROXY_STATUS.ACTIVE]: {
    fallbackLabel: 'Active',
    labelKey: 'common.active',
    tone: STATUS_TONE.SUCCESS,
  },
  [PROXY_STATUS.FAILING]: {
    fallbackLabel: 'Connection error',
    labelKey: 'page.automation_view.proxy_status_failing',
    tone: STATUS_TONE.DANGER,
  },
  [PROXY_STATUS.TESTING]: {
    fallbackLabel: 'Testing',
    labelKey: 'page.automation_view.proxy_status_testing',
    tone: STATUS_TONE.WARNING,
  },
  [PROXY_STATUS.DISABLED]: {
    fallbackLabel: 'Disabled',
    labelKey: 'common.disabled',
    tone: STATUS_TONE.NEUTRAL,
  },
};

export const COMMERCE_PRODUCT_TYPE_META: Record<
  CommerceProductType,
  EnumItemMeta
> = {
  [COMMERCE_PRODUCT_TYPE.SERIAL_STOCK]: {
    fallbackLabel: 'Account / license key',
    labelKey: 'page.commerce_view.type_serial_stock',
    tone: STATUS_TONE.PRIMARY,
  },
  [COMMERCE_PRODUCT_TYPE.SPECTER_RESOURCE]: {
    fallbackLabel: 'resource',
    labelKey: 'page.commerce_view.type_resource',
    tone: STATUS_TONE.INFO,
  },
  [COMMERCE_PRODUCT_TYPE.DIGITAL_FILE]: {
    fallbackLabel: 'Digital file',
    labelKey: 'page.commerce_view.type_digital_file',
    tone: STATUS_TONE.SUCCESS,
  },
  [COMMERCE_PRODUCT_TYPE.WALLET_CREDIT]: {
    fallbackLabel: 'Xu top-up pack',
    labelKey: 'page.commerce_view.type_wallet_credit',
    tone: STATUS_TONE.WARNING,
  },
};

export const COMMERCE_ORDER_STATUS_META: Record<
  CommerceOrderStatus,
  EnumItemMeta
> = {
  [COMMERCE_ORDER_STATUS.COMPLETED]: {
    fallbackLabel: 'Completed',
    labelKey: 'page.commerce_view.order_status_completed',
    tone: STATUS_TONE.SUCCESS,
  },
  [COMMERCE_ORDER_STATUS.FULFILLING]: {
    fallbackLabel: 'Fulfilling',
    labelKey: 'page.commerce_view.order_status_fulfilling',
    tone: STATUS_TONE.INFO,
  },
  [COMMERCE_ORDER_STATUS.PAID]: {
    fallbackLabel: 'Paid',
    labelKey: 'page.commerce_view.order_status_paid',
    tone: STATUS_TONE.INFO,
  },
  [COMMERCE_ORDER_STATUS.PENDING_PAYMENT]: {
    fallbackLabel: 'Pending payment',
    labelKey: 'page.commerce_view.order_status_pending_payment',
    tone: STATUS_TONE.WARNING,
  },
  [COMMERCE_ORDER_STATUS.MANUAL_REVIEW]: {
    fallbackLabel: 'Manual review',
    labelKey: 'page.commerce_view.order_status_manual_review',
    tone: STATUS_TONE.WARNING,
  },
  [COMMERCE_ORDER_STATUS.REFUNDED]: {
    fallbackLabel: 'Refunded',
    labelKey: 'page.commerce_view.order_status_refunded',
    tone: STATUS_TONE.NEUTRAL,
  },
  [COMMERCE_ORDER_STATUS.FAILED]: {
    fallbackLabel: 'Failed',
    labelKey: 'page.jobs_view.status_failed',
    tone: STATUS_TONE.DANGER,
  },
  [COMMERCE_ORDER_STATUS.CANCELLED]: {
    fallbackLabel: 'Cancelled',
    labelKey: 'page.jobs_view.status_cancelled',
    tone: STATUS_TONE.NEUTRAL,
  },
};

export const PAYMENT_CHANNEL_META: Record<PaymentChannelType, EnumItemMeta> = {
  [PAYMENT_CHANNEL.INTERNAL_WALLET]: {
    fallbackLabel: 'Prepaid Xu wallet',
    labelKey: 'page.commerce_view.method_internal_wallet',
    tone: STATUS_TONE.PRIMARY,
  },
  [PAYMENT_CHANNEL.BANK_TRANSFER]: {
    fallbackLabel: 'VietQR bank transfer',
    labelKey: 'page.commerce_view.method_bank_transfer',
    tone: STATUS_TONE.SUCCESS,
  },
  [PAYMENT_CHANNEL.E_WALLET]: {
    fallbackLabel: 'MoMo e-wallet',
    labelKey: 'page.commerce_view.method_e_wallet',
    tone: STATUS_TONE.INFO,
  },
  [PAYMENT_CHANNEL.CARD_INTL]: {
    fallbackLabel: 'International card (Stripe)',
    labelKey: 'page.commerce_view.method_card_intl',
    tone: STATUS_TONE.PRIMARY,
  },
  [PAYMENT_CHANNEL.CRYPTO]: {
    fallbackLabel: 'Crypto USDT',
    labelKey: 'page.commerce_view.method_crypto',
    tone: STATUS_TONE.WARNING,
  },
};

export const PAYMENT_INTENT_STATUS_META: Record<
  PaymentIntentStatusType,
  EnumItemMeta
> = {
  [PAYMENT_INTENT_STATUS.SUCCEEDED]: {
    fallbackLabel: 'Succeeded',
    labelKey: 'common.success',
    tone: STATUS_TONE.SUCCESS,
  },
  [PAYMENT_INTENT_STATUS.MANUAL_REVIEW]: {
    fallbackLabel: 'Manual review',
    labelKey: 'page.commerce_view.order_status_manual_review',
    tone: STATUS_TONE.WARNING,
  },
  [PAYMENT_INTENT_STATUS.PENDING]: {
    fallbackLabel: 'Pending payment',
    labelKey: 'page.commerce_view.order_status_pending_payment',
    tone: STATUS_TONE.INFO,
  },
  [PAYMENT_INTENT_STATUS.PROCESSING]: {
    fallbackLabel: 'Processing',
    labelKey: 'common.running',
    tone: STATUS_TONE.INFO,
  },
  [PAYMENT_INTENT_STATUS.EXPIRED]: {
    fallbackLabel: 'Expired',
    labelKey: 'common.expired',
    tone: STATUS_TONE.NEUTRAL,
  },
  [PAYMENT_INTENT_STATUS.REFUNDED]: {
    fallbackLabel: 'Refunded',
    labelKey: 'page.commerce_view.order_status_refunded',
    tone: STATUS_TONE.NEUTRAL,
  },
  [PAYMENT_INTENT_STATUS.FAILED]: {
    fallbackLabel: 'Failed',
    labelKey: 'page.jobs_view.status_failed',
    tone: STATUS_TONE.DANGER,
  },
};

export const WALLET_TX_TYPE_META: Record<WalletTxType, EnumItemMeta> = {
  [WALLET_TX_TYPE.TOPUP]: {
    fallbackLabel: 'Xu top-up',
    labelKey: 'page.commerce_view.tx_topup',
    tone: STATUS_TONE.SUCCESS,
  },
  [WALLET_TX_TYPE.PURCHASE]: {
    fallbackLabel: 'Order payment',
    labelKey: 'page.commerce_view.tx_purchase',
    tone: STATUS_TONE.PRIMARY,
  },
  [WALLET_TX_TYPE.REFUND]: {
    fallbackLabel: 'Order refund',
    labelKey: 'page.commerce_view.tx_refund',
    tone: STATUS_TONE.INFO,
  },
  [WALLET_TX_TYPE.BONUS]: {
    fallbackLabel: 'Promotional bonus',
    labelKey: 'page.commerce_view.tx_bonus',
    tone: STATUS_TONE.WARNING,
  },
  [WALLET_TX_TYPE.ADMIN_ADJUSTMENT]: {
    fallbackLabel: 'System adjustment',
    labelKey: 'page.commerce_view.tx_admin_adjustment',
    tone: STATUS_TONE.NEUTRAL,
  },
};

export const SUBSCRIPTION_STATUS_META: Record<
  SubscriptionStatus,
  EnumItemMeta
> = {
  [SUBSCRIPTION_STATUS.ACTIVE]: {
    fallbackLabel: 'Active',
    labelKey: 'page.analytics.active',
    tone: STATUS_TONE.SUCCESS,
  },
  [SUBSCRIPTION_STATUS.TRIALING]: {
    fallbackLabel: 'Trialing',
    labelKey: 'page.system_view.subs_status_trialing',
    tone: STATUS_TONE.INFO,
  },
  [SUBSCRIPTION_STATUS.FREE_TIER]: {
    fallbackLabel: 'Free tier',
    labelKey: 'page.analytics.plan_free',
    tone: STATUS_TONE.NEUTRAL,
  },
  [SUBSCRIPTION_STATUS.PAST_DUE]: {
    fallbackLabel: 'Past due',
    labelKey: 'page.system_view.subs_status_past_due',
    tone: STATUS_TONE.WARNING,
  },
  [SUBSCRIPTION_STATUS.CANCELED]: {
    fallbackLabel: 'Cancelled',
    labelKey: 'page.jobs_view.status_cancelled',
    tone: STATUS_TONE.NEUTRAL,
  },
  [SUBSCRIPTION_STATUS.UNPAID]: {
    fallbackLabel: 'Unpaid',
    labelKey: 'page.commerce_view.order_status_pending_payment',
    tone: STATUS_TONE.DANGER,
  },
};

export const SYSTEM_PLUGIN_STATUS_META: Record<
  SystemPluginStatus,
  EnumItemMeta
> = {
  [SYSTEM_PLUGIN_STATUS.INSTALLED]: {
    fallbackLabel: 'Installed',
    labelKey: 'page.system_view.plugins_status_installed',
    tone: STATUS_TONE.SUCCESS,
  },
  [SYSTEM_PLUGIN_STATUS.DISABLED]: {
    fallbackLabel: 'Disabled',
    labelKey: 'common.disabled',
    tone: STATUS_TONE.NEUTRAL,
  },
  [SYSTEM_PLUGIN_STATUS.PENDING]: {
    fallbackLabel: 'Pending',
    labelKey: 'page.jobs_view.status_pending',
    tone: STATUS_TONE.WARNING,
  },
};
