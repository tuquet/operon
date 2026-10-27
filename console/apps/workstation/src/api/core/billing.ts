import type {
  PaymentChannelType,
  PaymentIntentStatusType,
  PaymentTargetType,
  WalletTxType,
} from '@operon/constants';

import {
  FILTER_ALL,
  PAYMENT_CHANNEL,
  PAYMENT_INTENT_STATUS,
  PAYMENT_TARGET_TYPE,
  SUPABASE_SCHEMA,
  WALLET_TX_TYPE,
} from '@operon/constants';

import { supabaseRequest } from './supabase-client';

export {
  PAYMENT_CHANNEL,
  PAYMENT_INTENT_STATUS,
  PAYMENT_TARGET_TYPE,
  WALLET_TX_TYPE,
};
export type {
  PaymentChannelType,
  PaymentIntentStatusType,
  PaymentTargetType,
  WalletTxType,
};

export interface PaymentGateway {
  channel: PaymentChannelType;
  currency: 'CREDITS' | 'USD' | 'USDT' | 'VND' | string;
  driver: string;
  id: string;
  is_active: boolean;
  name: string;
  public_config: Record<string, any>;
  rate_per_credit: number;
  sort_order: number;
}

export type BankAccountStatus =
  | 'active'
  | 'cooling'
  | 'maintenance'
  | 'suspended';

export interface BankReceivingAccount {
  account_name: string;
  account_no: string;
  bank_bin: string;
  bank_name: string;
  created_at: string;
  current_daily_total: number;
  daily_limit_vnd: number;
  id: string;
  is_active: boolean;
  metadata: Record<string, any>;
  priority: number;
  qr_template: string;
  status: BankAccountStatus;
  updated_at: string;
}

export interface TenantWallet {
  balance_credits: number;
  id: string;
  tenant_id: string;
  total_spent_credits: number;
  total_topped_up_credits: number;
  updated_at: string;
}

export interface WalletTransaction {
  amount_credits: number;
  balance_after_credits: number;
  created_at: string;
  created_by?: null | string;
  description: null | string;
  id: string;
  reference_id: null | string;
  reference_type: null | string;
  tenant_id: string;
  tx_type: WalletTxType;
  wallet_id: string;
}

export interface PaymentIntent {
  amount_credits: number;
  buyer_email: null | string;
  checkout_payload: Record<string, any>;
  created_at: string;
  expires_at: string;
  gateway_id: string;
  id: string;
  paid_at: null | string;
  pay_amount: number;
  pay_currency: string;
  provider_tx_id: null | string;
  status: PaymentIntentStatusType;
  target_id: string;
  target_type: PaymentTargetType;
  tenant_id: null | string;
  transfer_code: string;
}

export interface ListActivePaymentGatewaysParams {
  skipAuth?: boolean;
}

export interface ListWalletTransactionsParams {
  limit?: number;
}

export interface CreatePaymentIntentParams {
  amount_credits: number;
  buyer_email?: null | string;
  gateway_id: string;
  target_id: string;
  target_type: PaymentTargetType;
  tenant_id?: null | string;
}

export interface SettlePaymentIntentResult {
  amount_credits?: number;
  idempotent?: boolean;
  intent_id?: string;
  reason?: string;
  settled: boolean;
  target_id?: string;
  target_type?: PaymentTargetType;
}

export function mapRawBankReceivingAccount(raw: any): BankReceivingAccount {
  return {
    account_name: String(raw?.account_name || ''),
    account_no: String(raw?.account_no || ''),
    bank_bin: String(raw?.bank_bin || ''),
    bank_name: String(raw?.bank_name || ''),
    created_at: String(raw?.created_at || new Date().toISOString()),
    current_daily_total: Number(raw?.current_daily_total ?? 0),
    daily_limit_vnd: Number(raw?.daily_limit_vnd ?? 300_000_000),
    id: String(raw?.id || ''),
    is_active: raw?.is_active !== false,
    metadata:
      raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
    priority: Number(raw?.priority ?? 10),
    qr_template: String(raw?.qr_template || 'compact2'),
    status: (raw?.status || 'active') as BankAccountStatus,
    updated_at: String(raw?.updated_at || new Date().toISOString()),
  };
}

export function mapRawPaymentGateway(raw: any): PaymentGateway {
  return {
    channel: (raw?.channel ||
      PAYMENT_CHANNEL.BANK_TRANSFER) as PaymentChannelType,
    currency: String(raw?.currency || 'VND'),
    driver: String(raw?.driver || 'manual'),
    id: String(raw?.id || ''),
    is_active: raw?.is_active !== false,
    name: String(raw?.name || raw?.id || ''),
    public_config:
      raw?.public_config && typeof raw.public_config === 'object'
        ? raw.public_config
        : {},
    rate_per_credit: Number(raw?.rate_per_credit ?? 1000),
    sort_order: Number(raw?.sort_order ?? 0),
  };
}

export function mapRawTenantWallet(raw: any): TenantWallet {
  return {
    balance_credits: Math.trunc(Number(raw?.balance_credits ?? 0)),
    id: String(raw?.id || ''),
    tenant_id: String(raw?.tenant_id || ''),
    total_spent_credits: Math.trunc(Number(raw?.total_spent_credits ?? 0)),
    total_topped_up_credits: Math.trunc(
      Number(raw?.total_topped_up_credits ?? 0),
    ),
    updated_at: String(raw?.updated_at || new Date().toISOString()),
  };
}

export function mapRawWalletTransaction(raw: any): WalletTransaction {
  return {
    amount_credits: Math.trunc(Number(raw?.amount_credits ?? 0)),
    balance_after_credits: Math.trunc(Number(raw?.balance_after_credits ?? 0)),
    created_at: String(raw?.created_at || new Date().toISOString()),
    created_by: raw?.created_by ?? null,
    description: raw?.description ?? null,
    id: String(raw?.id || ''),
    reference_id: raw?.reference_id ?? null,
    reference_type: raw?.reference_type ?? null,
    tenant_id: String(raw?.tenant_id || ''),
    tx_type: (raw?.tx_type || WALLET_TX_TYPE.TOPUP) as WalletTxType,
    wallet_id: String(raw?.wallet_id || ''),
  };
}

export function mapRawPaymentIntent(raw: any): PaymentIntent {
  return {
    amount_credits: Math.trunc(Number(raw?.amount_credits ?? 0)),
    buyer_email: raw?.buyer_email ?? null,
    checkout_payload:
      raw?.checkout_payload && typeof raw.checkout_payload === 'object'
        ? raw.checkout_payload
        : {},
    created_at: String(raw?.created_at || new Date().toISOString()),
    expires_at: String(raw?.expires_at || new Date().toISOString()),
    gateway_id: String(raw?.gateway_id || ''),
    id: String(raw?.id || ''),
    paid_at: raw?.paid_at ?? null,
    pay_amount: Number(raw?.pay_amount ?? 0),
    pay_currency: String(raw?.pay_currency || 'VND'),
    provider_tx_id: raw?.provider_tx_id ?? null,
    status: (raw?.status ||
      PAYMENT_INTENT_STATUS.PENDING) as PaymentIntentStatusType,
    target_id: String(raw?.target_id || ''),
    target_type: (raw?.target_type ||
      PAYMENT_TARGET_TYPE.WALLET_TOPUP) as PaymentTargetType,
    tenant_id: raw?.tenant_id ?? null,
    transfer_code: String(raw?.transfer_code || ''),
  };
}

/**
 * Fetch active public payment gateways (safe for both Authenticated Tenants & Public Storefront)
 */
export async function listActivePaymentGateways(
  params?: ListActivePaymentGatewaysParams,
): Promise<PaymentGateway[]> {
  const rows = await supabaseRequest<any[]>(
    '/rest/v1/rpc/get_active_gateways',
    {
      body: JSON.stringify({}),
      method: 'POST',
      schema: SUPABASE_SCHEMA.BILLING,
      skipAuth: params?.skipAuth,
    },
  );
  return Array.isArray(rows)
    ? rows.map((row) => mapRawPaymentGateway(row))
    : [];
}

/**
 * Fetch all payment gateways (including inactive ones) for Platform Admin
 */
export async function listPaymentGateways(): Promise<PaymentGateway[]> {
  const rows = await supabaseRequest<any[]>(
    '/rest/v1/payment_gateways?select=*&order=sort_order.asc,id.asc',
    { schema: SUPABASE_SCHEMA.BILLING },
  );
  return Array.isArray(rows)
    ? rows.map((row) => mapRawPaymentGateway(row))
    : [];
}

/**
 * @deprecated Use `listPaymentGateways` instead.
 */
export const listAllPaymentGateways = listPaymentGateways;

/**
 * Fetch Tenant Xu wallet balance (returns 0 Xu fallback if wallet row not yet initialized)
 */
export async function getTenantWallet(tenantId: string): Promise<TenantWallet> {
  const rows = await supabaseRequest<any[]>(
    `/rest/v1/wallets?tenant_id=eq.${encodeURIComponent(tenantId)}&select=*&limit=1`,
    { schema: SUPABASE_SCHEMA.BILLING },
  );
  if (Array.isArray(rows) && rows.length > 0) {
    return mapRawTenantWallet(rows[0]);
  }
  return {
    balance_credits: 0,
    id: '',
    tenant_id: tenantId,
    total_spent_credits: 0,
    total_topped_up_credits: 0,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch Tenant Xu wallet append-only transaction history
 */
export async function listWalletTransactions(
  tenantId: string,
  params?: ListWalletTransactionsParams,
): Promise<WalletTransaction[]> {
  const limit = params?.limit ?? 50;
  const rows = await supabaseRequest<any[]>(
    `/rest/v1/wallet_transactions?tenant_id=eq.${encodeURIComponent(tenantId)}&select=*&order=created_at.desc&limit=${limit}`,
    { schema: SUPABASE_SCHEMA.BILLING },
  );
  return Array.isArray(rows)
    ? rows.map((row) => mapRawWalletTransaction(row))
    : [];
}

/**
 * Create a new multi-channel payment intent (Bank Transfer, MoMo, Stripe, Crypto, or Instant Xu Wallet)
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams,
): Promise<PaymentIntent> {
  const raw = await supabaseRequest<any>('/rest/v1/rpc/create_payment_intent', {
    body: JSON.stringify({
      _amount_credits: Math.trunc(params.amount_credits),
      _buyer_email: params.buyer_email ?? null,
      _gateway_id: params.gateway_id,
      _target_id: params.target_id,
      _target_type: params.target_type,
      _tenant_id: params.tenant_id ?? null,
    }),
    method: 'POST',
    schema: SUPABASE_SCHEMA.BILLING,
  });
  return mapRawPaymentIntent(raw);
}

/**
 * Poll or inspect a single payment intent status
 */
export async function getPaymentIntentStatus(
  intentId: string,
): Promise<null | PaymentIntent> {
  const rows = await supabaseRequest<any[]>(
    `/rest/v1/payment_intents?id=eq.${encodeURIComponent(intentId)}&select=*&limit=1`,
    { schema: SUPABASE_SCHEMA.BILLING },
  );
  if (Array.isArray(rows) && rows.length > 0) {
    return mapRawPaymentIntent(rows[0]);
  }
  return null;
}

/**
 * Platform Admin: List payment intents held in manual_review (late transfer > 30m or underpaid)
 */
export async function listManualReviewIntents(): Promise<PaymentIntent[]> {
  const rows = await supabaseRequest<any[]>(
    `/rest/v1/payment_intents?status=eq.${PAYMENT_INTENT_STATUS.MANUAL_REVIEW}&select=*&order=updated_at.desc`,
    { schema: SUPABASE_SCHEMA.BILLING },
  );
  return Array.isArray(rows) ? rows.map((row) => mapRawPaymentIntent(row)) : [];
}

/**
 * Platform Admin: Force-approve a manual_review payment intent
 */
export async function approveManualPaymentIntent(
  intentId: string,
  adminNote = 'Approved manually by Platform Admin',
): Promise<SettlePaymentIntentResult> {
  return supabaseRequest<SettlePaymentIntentResult>(
    '/rest/v1/rpc/settle_payment_intent',
    {
      body: JSON.stringify({
        _actual_pay_amount: null,
        _force_approve: true,
        _intent_id: intentId,
        _provider_tx_id: null,
        _raw_metadata: { admin_note: adminNote },
        _transfer_code: null,
      }),
      method: 'POST',
      schema: SUPABASE_SCHEMA.BILLING,
    },
  );
}

/**
 * Platform Admin: Fetch all bank receiving accounts in pool (active & inactive)
 */
export async function listBankReceivingAccounts(): Promise<
  BankReceivingAccount[]
> {
  const rows = await supabaseRequest<any[]>(
    '/rest/v1/bank_receiving_accounts?select=*&order=priority.asc,created_at.asc',
    { schema: SUPABASE_SCHEMA.BILLING },
  );
  return Array.isArray(rows)
    ? rows.map((r) => mapRawBankReceivingAccount(r))
    : [];
}

/**
 * Platform Admin: Upsert a bank receiving account in pool (rotate number, adjust daily limit)
 */
export async function upsertBankReceivingAccount(
  payload: Partial<BankReceivingAccount> & { id: string },
): Promise<BankReceivingAccount> {
  const rows = await supabaseRequest<any[]>(
    '/rest/v1/bank_receiving_accounts?on_conflict=id',
    {
      body: JSON.stringify(payload),
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      method: 'POST',
      preferRepresentation: true,
      schema: SUPABASE_SCHEMA.BILLING,
    },
  );
  return mapRawBankReceivingAccount(Array.isArray(rows) ? rows[0] : rows);
}

/**
 * Platform Admin: Fast toggle status of receiving account (active / cooling / suspended)
 */
export async function toggleBankReceivingAccount(
  id: string,
  status: BankAccountStatus,
  isActive?: boolean,
): Promise<void> {
  const body: Record<string, any> = { status };
  if (isActive !== undefined) {
    body.is_active = isActive;
  }
  await supabaseRequest(
    `/rest/v1/bank_receiving_accounts?id=eq.${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(body),
      method: 'PATCH',
      schema: SUPABASE_SCHEMA.BILLING,
    },
  );
}

/**
 * Platform Admin: Upsert a payment gateway configuration (toggle active status, rate_per_credit, public_config).
 */
export async function upsertPaymentGateway(
  payload: Partial<PaymentGateway> & { id: string },
): Promise<PaymentGateway> {
  const rows = await supabaseRequest<any[]>(
    '/rest/v1/payment_gateways?on_conflict=id',
    {
      body: JSON.stringify(payload),
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      method: 'POST',
      preferRepresentation: true,
      schema: SUPABASE_SCHEMA.BILLING,
    },
  );
  return mapRawPaymentGateway(Array.isArray(rows) ? rows[0] : rows);
}

/**
 * Pure helper to filter wallet transactions for VXE Grid
 */
export function filterWalletTransactions(
  items: WalletTransaction[],
  filters?: { search?: string; tx_type?: string },
): WalletTransaction[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  let result = items;
  if (filters?.tx_type && filters.tx_type !== FILTER_ALL) {
    result = result.filter((tx) => tx.tx_type === filters.tx_type);
  }

  if (filters?.search) {
    const kw = String(filters.search).toLowerCase().trim();
    if (kw) {
      result = result.filter(
        (tx) =>
          (tx.description && tx.description.toLowerCase().includes(kw)) ||
          (tx.reference_id && tx.reference_id.toLowerCase().includes(kw)) ||
          (tx.reference_type && tx.reference_type.toLowerCase().includes(kw)) ||
          tx.id.toLowerCase().includes(kw),
      );
    }
  }

  return result;
}

export const billingApi = {
  approveManualPaymentIntent,
  createPaymentIntent,
  getPaymentIntentStatus,
  getTenantWallet,
  listActivePaymentGateways,
  listAllPaymentGateways,
  listBankReceivingAccounts,
  listManualReviewIntents,
  listPaymentGateways,
  listWalletTransactions,
  toggleBankReceivingAccount,
  upsertBankReceivingAccount,
  upsertPaymentGateway,
};
