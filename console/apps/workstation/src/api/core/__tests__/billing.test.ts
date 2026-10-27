import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  approveManualPaymentIntent,
  createPaymentIntent,
  filterWalletTransactions,
  getPaymentIntentStatus,
  getTenantWallet,
  listActivePaymentGateways,
  listAllPaymentGateways,
  listBankReceivingAccounts,
  listManualReviewIntents,
  listWalletTransactions,
  mapRawBankReceivingAccount,
  mapRawPaymentGateway,
  mapRawPaymentIntent,
  mapRawTenantWallet,
  mapRawWalletTransaction,
  toggleBankReceivingAccount,
  upsertBankReceivingAccount,
  upsertPaymentGateway,
} from '../billing';
import { supabaseRequest } from '../supabase-client';

vi.mock('../supabase-client', () => ({
  supabaseRequest: vi.fn(),
}));

describe('billing & payment-gateway core api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapRawPaymentGateway', () => {
    it('normalizes payment gateway row and rate_per_credit numeric value', () => {
      const raw = {
        channel: 'bank_transfer',
        currency: 'VND',
        driver: 'sepay',
        id: 'bank_vietqr',
        is_active: true,
        name: 'Chuyen khoan Ngan hang 24/7 (VietQR)',
        public_config: { account_no: '0000123456789', bank_name: 'MBBank' },
        rate_per_credit: '1000.000000',
        sort_order: 2,
      };

      const mapped = mapRawPaymentGateway(raw);
      expect(mapped).toEqual({
        channel: 'bank_transfer',
        currency: 'VND',
        driver: 'sepay',
        id: 'bank_vietqr',
        is_active: true,
        name: 'Chuyen khoan Ngan hang 24/7 (VietQR)',
        public_config: { account_no: '0000123456789', bank_name: 'MBBank' },
        rate_per_credit: 1000,
        sort_order: 2,
      });
    });
  });

  describe('mapRawTenantWallet & mapRawWalletTransaction', () => {
    it('truncates floating values safely and extracts wallet balances', () => {
      const wallet = mapRawTenantWallet({
        balance_credits: '500.89',
        id: 'wallet-1',
        tenant_id: 'tenant-1',
        total_spent_credits: 120.4,
        total_topped_up_credits: 621.29,
      });

      expect(wallet).toEqual({
        balance_credits: 500,
        id: 'wallet-1',
        tenant_id: 'tenant-1',
        total_spent_credits: 120,
        total_topped_up_credits: 621,
        updated_at: expect.any(String),
      });

      const tx = mapRawWalletTransaction({
        amount_credits: -100.99,
        balance_after_credits: '400.1',
        id: 'tx-1',
        tenant_id: 'tenant-1',
        tx_type: 'purchase',
        wallet_id: 'wallet-1',
      });

      expect(tx.amount_credits).toBe(-100);
      expect(tx.balance_after_credits).toBe(400);
      expect(tx.tx_type).toBe('purchase');
    });
  });

  describe('listActivePaymentGateways & getTenantWallet', () => {
    it('queries active payment gateways via billing RPC', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          channel: 'e_wallet',
          currency: 'VND',
          driver: 'momo_ipn',
          id: 'momo_ewallet',
          name: 'MoMo',
          public_config: { wallet_phone: '0900000000' },
          rate_per_credit: 1000,
          sort_order: 3,
        },
      ]);

      const gateways = await listActivePaymentGateways();
      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/rpc/get_active_gateways',
        expect.objectContaining({
          method: 'POST',
          schema: 'billing',
        }),
      );
      expect(gateways).toHaveLength(1);
      expect(gateways[0]?.id).toBe('momo_ewallet');
    });

    it('queries all payment gateways for admin', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          channel: 'bank_transfer',
          currency: 'VND',
          driver: 'manual',
          id: 'bank_vietqr',
          is_active: false,
          name: 'VietQR',
          public_config: {},
          rate_per_credit: 1000,
          sort_order: 1,
        },
      ]);

      const all = await listAllPaymentGateways();
      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/payment_gateways?select=*&order=sort_order.asc,id.asc',
        { schema: 'billing' },
      );
      expect(all).toHaveLength(1);
    });

    it('returns zero-balance fallback when tenant has no wallet row yet', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([]);
      const wallet = await getTenantWallet('tenant-uuid-1');

      expect(wallet.tenant_id).toBe('tenant-uuid-1');
      expect(wallet.balance_credits).toBe(0);
    });

    it('fetches wallet transaction ledger for a tenant', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          amount_credits: 100,
          balance_after_credits: 100,
          created_at: '2026-10-14T00:00:00Z',
          description: 'Nap 100 Xu',
          id: 'tx-100',
          tenant_id: 'tenant-uuid-1',
          tx_type: 'topup',
          wallet_id: 'w-1',
        },
      ]);

      const txs = await listWalletTransactions('tenant-uuid-1');
      expect(supabaseRequest).toHaveBeenCalledWith(
        expect.stringContaining(
          '/rest/v1/wallet_transactions?tenant_id=eq.tenant-uuid-1',
        ),
        { schema: 'billing' },
      );
      expect(txs[0]?.amount_credits).toBe(100);
    });
  });

  describe('createPaymentIntent & approveManualPaymentIntent', () => {
    it('creates a payment intent in Xu and maps checkout_payload', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce({
        amount_credits: 200,
        checkout_payload: {
          qr_image_url:
            'https://img.vietqr.io/image/970422-0000123456789-compact2.png',
          transfer_code: 'TQ12AB34',
        },
        created_at: '2026-10-14T00:00:00Z',
        expires_at: '2026-10-14T00:30:00Z',
        gateway_id: 'bank_vietqr',
        id: 'intent-1',
        pay_amount: 200_000,
        pay_currency: 'VND',
        status: 'pending',
        target_id: 'tenant-uuid-1',
        target_type: 'wallet_topup',
        tenant_id: 'tenant-uuid-1',
        transfer_code: 'TQ12AB34',
      });

      const intent = await createPaymentIntent({
        amount_credits: 200,
        gateway_id: 'bank_vietqr',
        target_id: 'tenant-uuid-1',
        target_type: 'wallet_topup',
        tenant_id: 'tenant-uuid-1',
      });

      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/rpc/create_payment_intent',
        expect.objectContaining({
          body: JSON.stringify({
            _amount_credits: 200,
            _buyer_email: null,
            _gateway_id: 'bank_vietqr',
            _target_id: 'tenant-uuid-1',
            _target_type: 'wallet_topup',
            _tenant_id: 'tenant-uuid-1',
          }),
          method: 'POST',
          schema: 'billing',
        }),
      );
      expect(intent.transfer_code).toBe('TQ12AB34');
      expect(intent.pay_amount).toBe(200_000);
    });

    it('inspects single payment intent status', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          amount_credits: 100,
          gateway_id: 'bank_vietqr',
          id: 'intent-inspect-1',
          status: 'succeeded',
        },
      ]);

      const res = await getPaymentIntentStatus('intent-inspect-1');
      expect(res?.status).toBe('succeeded');
    });

    it('lists manual_review intents and force-approves via settle_payment_intent RPC', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        mapRawPaymentIntent({
          amount_credits: 50,
          gateway_id: 'momo_ewallet',
          id: 'intent-late-1',
          pay_amount: 50_000,
          pay_currency: 'VND',
          status: 'manual_review',
          target_id: 't-1',
          target_type: 'wallet_topup',
          transfer_code: 'TQ998877',
        }),
      ]);

      const manualList = await listManualReviewIntents();
      expect(manualList).toHaveLength(1);
      expect(manualList[0]?.status).toBe('manual_review');

      vi.mocked(supabaseRequest).mockResolvedValueOnce({
        amount_credits: 50,
        idempotent: false,
        intent_id: 'intent-late-1',
        settled: true,
      });

      const approval = await approveManualPaymentIntent(
        'intent-late-1',
        'Verified MoMo receipt manually',
      );
      expect(supabaseRequest).toHaveBeenLastCalledWith(
        '/rest/v1/rpc/settle_payment_intent',
        expect.objectContaining({
          body: JSON.stringify({
            _actual_pay_amount: null,
            _force_approve: true,
            _intent_id: 'intent-late-1',
            _provider_tx_id: null,
            _raw_metadata: { admin_note: 'Verified MoMo receipt manually' },
            _transfer_code: null,
          }),
          method: 'POST',
          schema: 'billing',
        }),
      );
      expect(approval.settled).toBe(true);
    });

    it('upserts payment gateway configuration via upsertPaymentGateway and filters wallet transactions', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          channel: 'bank_transfer',
          currency: 'VND',
          driver: 'sepay',
          id: 'bank_vietqr',
          is_active: true,
          name: 'VietQR 24/7',
          public_config: { account_no: '99998888' },
          rate_per_credit: 1000,
          sort_order: 10,
        },
      ]);

      const gw = await upsertPaymentGateway({
        id: 'bank_vietqr',
        is_active: true,
        rate_per_credit: 1000,
      });

      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/payment_gateways?on_conflict=id',
        expect.objectContaining({
          method: 'POST',
          preferRepresentation: true,
          schema: 'billing',
        }),
      );
      expect(gw.id).toBe('bank_vietqr');
      expect(gw.rate_per_credit).toBe(1000);

      const txs = [
        mapRawWalletTransaction({
          amount_credits: 500,
          balance_after_credits: 500,
          description: 'Nap Xu VietQR TQ1122',
          id: 'tx-1',
          reference_id: 'intent-1',
          reference_type: 'payment_intent',
          tenant_id: 't-1',
          tx_type: 'topup',
          wallet_id: 'w-1',
        }),
        mapRawWalletTransaction({
          amount_credits: -150,
          balance_after_credits: 350,
          description: 'Mua Proxy ORD-261014-AA11',
          id: 'tx-2',
          reference_id: 'ord-1',
          reference_type: 'commerce_order',
          tenant_id: 't-1',
          tx_type: 'purchase',
          wallet_id: 'w-1',
        }),
      ];

      expect(filterWalletTransactions(txs, { tx_type: 'topup' })).toHaveLength(
        1,
      );
      expect(
        filterWalletTransactions(txs, { search: 'ORD-261014' }),
      ).toHaveLength(1);
      expect(filterWalletTransactions([], { search: 'any' })).toEqual([]);
    });
  });

  describe('bank receiving accounts pool & rotation', () => {
    it('normalizes raw bank account row with daily limits and status', () => {
      const raw = {
        account_name: 'OPN PLATFORM',
        account_no: '0000123456789',
        bank_bin: '970422',
        bank_name: 'MBBank',
        current_daily_total: '125000000.50',
        daily_limit_vnd: '300000000.00',
        id: 'mbbank_primary',
        is_active: true,
        priority: '1',
        qr_template: 'compact2',
        status: 'active',
      };

      const mapped = mapRawBankReceivingAccount(raw);
      expect(mapped).toEqual({
        account_name: 'OPN PLATFORM',
        account_no: '0000123456789',
        bank_bin: '970422',
        bank_name: 'MBBank',
        created_at: expect.any(String),
        current_daily_total: 125_000_000.5,
        daily_limit_vnd: 300_000_000,
        id: 'mbbank_primary',
        is_active: true,
        metadata: {},
        priority: 1,
        qr_template: 'compact2',
        status: 'active',
        updated_at: expect.any(String),
      });
    });

    it('fetches, upserts, and toggles receiving accounts', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          account_name: 'OPN PLATFORM',
          account_no: '0000123456789',
          bank_bin: '970422',
          bank_name: 'MBBank',
          id: 'mbbank_primary',
          priority: 1,
          status: 'active',
        },
      ] as any);

      const accounts = await listBankReceivingAccounts();
      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/bank_receiving_accounts?select=*&order=priority.asc,created_at.asc',
        { schema: 'billing' },
      );
      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.id).toBe('mbbank_primary');

      // Test upsert
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          account_name: 'VPBANK NEW',
          account_no: '9888777666',
          bank_bin: '970432',
          bank_name: 'VPBank',
          id: 'vpbank_secondary',
          status: 'active',
        },
      ] as any);

      const upserted = await upsertBankReceivingAccount({
        account_name: 'VPBANK NEW',
        account_no: '9888777666',
        id: 'vpbank_secondary',
      });
      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/bank_receiving_accounts?on_conflict=id',
        expect.objectContaining({
          method: 'POST',
          preferRepresentation: true,
          schema: 'billing',
        }),
      );
      expect(upserted.id).toBe('vpbank_secondary');

      // Test toggle
      vi.mocked(supabaseRequest).mockResolvedValueOnce({} as any);
      await toggleBankReceivingAccount('mbbank_primary', 'cooling', false);
      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/bank_receiving_accounts?id=eq.mbbank_primary',
        {
          body: JSON.stringify({ status: 'cooling', is_active: false }),
          method: 'PATCH',
          schema: 'billing',
        },
      );
    });
  });
});
