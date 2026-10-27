import { describe, expect, it } from 'vitest';

import {
  BROWSER_STATUS,
  BROWSER_STATUS_VALUES,
  buildEnumFilterOptions,
  COMMERCE_ORDER_STATUS,
  COMMERCE_ORDER_STATUS_VALUES,
  COMMERCE_PRODUCT_TYPE,
  COMMERCE_PRODUCT_TYPE_VALUES,
  COMMERCE_STOCK_STATUS_VALUES,
  DEVICE_STATUS,
  DEVICE_STATUS_VALUES,
  FILTER_ALL,
  getStatusToneMeta,
  INVITATION_STATUS_VALUES,
  JOB_STATUS,
  JOB_STATUS_VALUES,
  LOG_LEVEL_VALUES,
  PAYMENT_CHANNEL,
  PAYMENT_CHANNEL_VALUES,
  PAYMENT_INTENT_STATUS,
  PAYMENT_INTENT_STATUS_VALUES,
  PROXY_PROTOCOL_VALUES,
  PROXY_STATUS,
  PROXY_STATUS_VALUES,
  STATUS_TONE,
  STORAGE_KEYS,
  SUBSCRIPTION_STATUS_VALUES,
  SUPABASE_SCHEMA,
  SUPABASE_SCHEMA_VALUES,
  SYSTEM_PLUGIN_STATUS_VALUES,
  TENANT_PLAN_VALUES,
  TENANT_STATUS,
  TENANT_STATUS_VALUES,
  WALLET_TX_TYPE_VALUES,
  WORKFLOW_STATUS,
  WORKFLOW_STATUS_META,
  WORKFLOW_STATUS_VALUES,
} from '../index';

describe('enum & Constants SSOT (@operon/constants + #/constants)', () => {
  it('exposes all canonical PostgREST schemas', () => {
    expect(SUPABASE_SCHEMA_VALUES).toEqual([
      'automation',
      'billing',
      'browsers',
      'commerce',
      'events',
      'media',
      'public',
      'workers',
    ]);
    expect(SUPABASE_SCHEMA.AUTOMATION).toBe('automation');
    expect(SUPABASE_SCHEMA.COMMERCE).toBe('commerce');
    expect(SUPABASE_SCHEMA.WORKERS).toBe('workers');
    expect(STORAGE_KEYS.ACTIVE_TENANT_ID).toBe('OPERON_ACTIVE_TENANT_ID');
  });

  it('matches database CHECK constraints for Tenant, Automation & Fleet domains', () => {
    expect(TENANT_STATUS_VALUES).toEqual(['active', 'archived', 'suspended']);
    expect(TENANT_PLAN_VALUES).toEqual(['enterprise', 'free', 'pro']);
    expect(INVITATION_STATUS_VALUES).toEqual([
      'accepted',
      'expired',
      'pending',
      'revoked',
    ]);
    expect(WORKFLOW_STATUS_VALUES).toEqual(['archived', 'draft', 'published']);
    expect(JOB_STATUS_VALUES).toEqual([
      'cancelled',
      'completed',
      'failed',
      'paused',
      'pending',
      'queued',
      'running',
    ]);
    expect(LOG_LEVEL_VALUES).toEqual([
      'debug',
      'error',
      'fatal',
      'info',
      'trace',
      'warn',
    ]);
    expect(DEVICE_STATUS_VALUES).toEqual([
      'busy',
      'disabled',
      'idle',
      'maintenance',
      'offline',
    ]);
    expect(BROWSER_STATUS_VALUES).toEqual([
      'error',
      'idle',
      'running',
      'syncing',
    ]);
    expect(PROXY_STATUS_VALUES).toEqual([
      'active',
      'disabled',
      'failing',
      'testing',
    ]);
    expect(PROXY_PROTOCOL_VALUES).toEqual([
      'http',
      'https',
      'socks4',
      'socks5',
    ]);
  });

  it('matches database CHECK constraints for Commerce, Billing & System domains', () => {
    expect(COMMERCE_PRODUCT_TYPE_VALUES).toEqual([
      'digital_file',
      'serial_stock',
      'resource',
      'wallet_credit',
    ]);
    expect(COMMERCE_ORDER_STATUS_VALUES).toEqual([
      'cancelled',
      'completed',
      'failed',
      'fulfilling',
      'manual_review',
      'paid',
      'pending_payment',
      'refunded',
    ]);
    expect(COMMERCE_STOCK_STATUS_VALUES).toEqual([
      'available',
      'defective',
      'reserved',
      'sold',
    ]);
    expect(PAYMENT_CHANNEL_VALUES).toEqual([
      'bank_transfer',
      'card_intl',
      'crypto',
      'e_wallet',
      'internal_wallet',
    ]);
    expect(PAYMENT_INTENT_STATUS_VALUES).toEqual([
      'expired',
      'failed',
      'manual_review',
      'pending',
      'processing',
      'refunded',
      'succeeded',
    ]);
    expect(WALLET_TX_TYPE_VALUES).toEqual([
      'admin_adjustment',
      'bonus',
      'purchase',
      'refund',
      'topup',
    ]);
    expect(SUBSCRIPTION_STATUS_VALUES).toEqual([
      'active',
      'canceled',
      'free_tier',
      'past_due',
      'trialing',
      'unpaid',
    ]);
    expect(SYSTEM_PLUGIN_STATUS_VALUES).toEqual([
      'disabled',
      'installed',
      'pending',
    ]);
  });

  it('resolves status badge tone metadata and falls back to neutral on unknown values', () => {
    const publishedMeta = getStatusToneMeta(
      WORKFLOW_STATUS.PUBLISHED,
      WORKFLOW_STATUS_META,
    );
    expect(publishedMeta.tone).toBe(STATUS_TONE.SUCCESS);
    expect(publishedMeta.badgeClass).toContain('emerald-500');

    const unknownMeta = getStatusToneMeta(
      'custom_unknown_state',
      WORKFLOW_STATUS_META,
    );
    expect(unknownMeta.tone).toBe(STATUS_TONE.NEUTRAL);
    expect(unknownMeta.fallbackLabel).toBe('custom_unknown_state');
  });

  it('builds localized filter options with FILTER_ALL prepended in explicit order', () => {
    const dict: Record<string, string> = {
      'page.workflows_view.status_all': 'All statuses',
      'page.workflows_view.status_archived': 'Archived',
      'page.workflows_view.status_draft': 'Draft',
      'page.workflows_view.status_published': 'Published',
    };
    const t = (key: string) => dict[key] ?? key;

    const options = buildEnumFilterOptions(WORKFLOW_STATUS_META, t, {
      allLabelKey: 'page.workflows_view.status_all',
      order: [
        WORKFLOW_STATUS.PUBLISHED,
        WORKFLOW_STATUS.DRAFT,
        WORKFLOW_STATUS.ARCHIVED,
      ],
    });

    expect(options).toEqual([
      { label: 'All statuses', value: FILTER_ALL },
      { label: 'Published', value: WORKFLOW_STATUS.PUBLISHED },
      { label: 'Draft', value: WORKFLOW_STATUS.DRAFT },
      { label: 'Archived', value: WORKFLOW_STATUS.ARCHIVED },
    ]);
  });

  it('exposes domain constants with exact string values', () => {
    expect(TENANT_STATUS.ACTIVE).toBe('active');
    expect(JOB_STATUS.RUNNING).toBe('running');
    expect(DEVICE_STATUS.IDLE).toBe('idle');
    expect(BROWSER_STATUS.IDLE).toBe('idle');
    expect(PROXY_STATUS.ACTIVE).toBe('active');
    expect(COMMERCE_PRODUCT_TYPE.SERIAL_STOCK).toBe('serial_stock');
    expect(COMMERCE_ORDER_STATUS.COMPLETED).toBe('completed');
    expect(PAYMENT_CHANNEL.BANK_TRANSFER).toBe('bank_transfer');
    expect(PAYMENT_INTENT_STATUS.MANUAL_REVIEW).toBe('manual_review');
  });
});
