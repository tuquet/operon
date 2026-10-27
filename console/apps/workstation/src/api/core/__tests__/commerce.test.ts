import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  claimOrderWarranty,
  createCheckoutOrder,
  fulfillOrder,
  getGuestOrderDeliveries,
  importStockBatch,
  inspectStockItem,
  listCommerceCategories,
  listCommerceProducts,
  listStockItems,
  mapRawCommerceOrder,
  mapRawCommerceProduct,
  mapRawProductVariant,
} from '../commerce';
import { supabaseRequest } from '../supabase-client';

vi.mock('../supabase-client', () => ({
  supabaseRequest: vi.fn(),
}));

describe('commerce core api (digital-commerce)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapRawProductVariant & mapRawCommerceProduct', () => {
    it('normalizes integer Xu prices, stock counters, and embedded variants', () => {
      const product = mapRawCommerceProduct({
        category_id: 'cat-1',
        created_at: '2026-10-14T10:00:00Z',
        description: 'Full description',
        fulfillment_config: { format: 'uid|pass|2fa' },
        id: 'prod-1',
        is_active: true,
        name: 'Tai khoan Via 2FA',
        product_type: 'serial_stock',
        product_variants: [
          {
            available_stock: '42',
            compare_at_credits: '65',
            created_at: '2026-10-14T10:00:00Z',
            fulfillment_payload: {},
            id: 'var-1',
            is_active: true,
            max_qty: '50',
            min_qty: '1',
            name: 'Goi 1 Tai khoan',
            price_credits: '50',
            product_id: 'prod-1',
            sku: 'VIA-2FA-STD',
            sold_count: '18',
            sort_order: 1,
            stock_mode: 'serialized',
            updated_at: '2026-10-14T10:00:00Z',
          },
        ],
        short_description: 'Giao tuc thi',
        slug: 'via-account-2fa',
        sort_order: 1,
        tags: ['2fa', 'mmo'],
        thumbnail_url: null,
        updated_at: '2026-10-14T10:00:00Z',
        visibility: 'public',
      });

      expect(product.product_type).toBe('serial_stock');
      expect(product.variants).toHaveLength(1);
      expect(product.variants?.[0]?.price_credits).toBe(50);
      expect(product.variants?.[0]?.compare_at_credits).toBe(65);
      expect(product.variants?.[0]?.available_stock).toBe(42);
      expect(product.variants?.[0]?.sold_count).toBe(18);
    });

    it('handles null compare_at_credits cleanly', () => {
      const variant = mapRawProductVariant({
        available_stock: 10,
        compare_at_credits: null,
        id: 'var-2',
        name: 'Standard',
        price_credits: 120,
        product_id: 'prod-2',
        sku: 'PROXY-VN-30D',
        stock_mode: 'serialized',
      });
      expect(variant.compare_at_credits).toBeNull();
      expect(variant.price_credits).toBe(120);
    });
  });

  describe('listCommerceCategories & listCommerceProducts', () => {
    it('fetches active categories and products from schema commerce', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          created_at: '2026-10-14T00:00:00Z',
          description: 'Accounts',
          icon: 'lucide:key-round',
          id: 'cat-1',
          is_active: true,
          name: 'Tai khoan & Key',
          slug: 'accounts-keys',
          sort_order: 1,
          updated_at: '2026-10-14T00:00:00Z',
        },
      ]);

      const categories = await listCommerceCategories({ skipAuth: true });
      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/categories?is_active=eq.true&select=*&order=sort_order.asc,name.asc',
        {
          method: 'GET',
          schema: 'commerce',
          skipAuth: true,
        },
      );
      expect(categories).toHaveLength(1);
      expect(categories[0]?.slug).toBe('accounts-keys');

      vi.mocked(supabaseRequest).mockResolvedValueOnce([]);
      await listCommerceProducts({
        categoryId: 'cat-1',
        productType: 'serial_stock',
      });
      expect(supabaseRequest).toHaveBeenLastCalledWith(
        '/rest/v1/products?is_active=eq.true&category_id=eq.cat-1&product_type=eq.serial_stock&select=*,product_variants(*)&order=sort_order.asc,created_at.desc',
        {
          method: 'GET',
          schema: 'commerce',
          skipAuth: undefined,
        },
      );
    });
  });

  describe('createCheckoutOrder', () => {
    it('invokes create_checkout_order RPC for instant Tenant Xu wallet checkout', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce({
        claim_token: null,
        fulfillment: {
          deliveries: [
            {
              buyer_tenant_id: 'tenant-1',
              created_at: '2026-10-14T10:05:00Z',
              delivered_payload: {
                batch_code: 'BATCH-01',
                serial: '100088001|passA|2FASECRET',
                sku: 'VIA-2FA-STD',
              },
              delivery_type: 'serial_stock',
              download_count: 0,
              expires_at: null,
              id: 'deliv-1',
              max_downloads: null,
              order_id: 'ord-1',
              order_item_id: 'item-1',
              stock_item_id: 'stk-1',
            },
          ],
          fulfilled: true,
          idempotent: false,
          order_code: 'ORD-261014-AA11BB',
          order_id: 'ord-1',
        },
        order: {
          buyer_email: 'owner@operon.com',
          buyer_tenant_id: 'tenant-1',
          created_at: '2026-10-14T10:05:00Z',
          discount_credits: 0,
          fulfilled_at: '2026-10-14T10:05:00Z',
          id: 'ord-1',
          order_code: 'ORD-261014-AA11BB',
          paid_at: '2026-10-14T10:05:00Z',
          payment_intent_id: 'pi-1',
          payment_method: 'internal_wallet',
          status: 'completed',
          subtotal_credits: '50',
          total_credits: '50',
          updated_at: '2026-10-14T10:05:00Z',
        },
        payment_intent: {
          amount_credits: '50',
          checkout_payload: { instant_wallet_debit: true },
          gateway_id: 'internal_wallet',
          id: 'pi-1',
          pay_amount: '50',
          pay_currency: 'CREDITS',
          status: 'succeeded',
          target_id: 'ord-1',
          target_type: 'commerce_order',
          tenant_id: 'tenant-1',
          transfer_code: 'TQ998877',
        },
      });

      const result = await createCheckoutOrder({
        buyer_email: 'owner@operon.com',
        buyer_tenant_id: 'tenant-1',
        gateway_code: 'internal_wallet',
        idempotency_key: 'idem-1',
        items: [{ quantity: 1, variant_id: 'var-1' }],
        payment_method: 'internal_wallet',
      });

      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/rpc/create_checkout_order',
        {
          body: JSON.stringify({
            _buyer_email: 'owner@operon.com',
            _buyer_tenant_id: 'tenant-1',
            _gateway_code: 'internal_wallet',
            _idempotency_key: 'idem-1',
            _items: [{ quantity: 1, variant_id: 'var-1' }],
            _payment_method: 'internal_wallet',
          }),
          method: 'POST',
          schema: 'commerce',
          skipAuth: undefined,
        },
      );

      expect(result.order.status).toBe('completed');
      expect(result.order.total_credits).toBe(50);
      expect(result.fulfillment?.fulfilled).toBe(true);
      expect(result.fulfillment?.deliveries[0]?.delivered_payload.serial).toBe(
        '100088001|passA|2FASECRET',
      );
    });
  });

  describe('importStockBatch, getGuestOrderDeliveries & fulfillOrder', () => {
    it('calls import_stock_batch RPC and normalizes deduplication counters', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce({
        available_stock: '15',
        imported_count: '2',
        input_count: '3',
        skipped_duplicates: '1',
        variant_id: 'var-1',
      });

      const batchRes = await importStockBatch({
        batch_code: 'BATCH-OCT-14',
        lines: ['line1', 'line2', 'line1'],
        variant_id: 'var-1',
      });

      expect(batchRes).toEqual({
        available_stock: 15,
        imported_count: 2,
        input_count: 3,
        skipped_duplicates: 1,
        variant_id: 'var-1',
      });
    });

    it('looks up guest order deliveries with skipAuth: true and supports manual admin fulfillment', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce({
        deliveries: [
          {
            delivered_payload: { serial: 'KEY-ABC-123' },
            delivery_type: 'serial_stock',
            download_count: 0,
            id: 'deliv-guest-1',
            order_id: 'ord-guest-1',
            order_item_id: 'oi-guest-1',
          },
        ],
        items: [],
        order: mapRawCommerceOrder({
          buyer_email: 'guest@example.com',
          id: 'ord-guest-1',
          order_code: 'ORD-261014-GUEST1',
          payment_method: 'bank_transfer',
          status: 'completed',
          subtotal_credits: 100,
          total_credits: 100,
        }),
      });

      const guestRes = await getGuestOrderDeliveries(
        'ORD-261014-GUEST1',
        'CLM_SECRET_TOKEN',
      );

      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/rpc/get_guest_order_deliveries',
        {
          body: JSON.stringify({
            _claim_token: 'CLM_SECRET_TOKEN',
            _order_code: 'ORD-261014-GUEST1',
          }),
          method: 'POST',
          schema: 'commerce',
          skipAuth: true,
        },
      );
      expect(guestRes.order.order_code).toBe('ORD-261014-GUEST1');
      expect(guestRes.deliveries).toHaveLength(1);

      vi.mocked(supabaseRequest).mockResolvedValueOnce({
        deliveries: [],
        fulfilled: true,
        idempotent: true,
        order_code: 'ORD-261014-GUEST1',
        order_id: 'ord-guest-1',
      });

      const fulfillRes = await fulfillOrder('ord-guest-1');
      expect(fulfillRes.fulfilled).toBe(true);
      expect(fulfillRes.idempotent).toBe(true);
    });
  });

  describe('filterCommerceProducts & filterCommerceOrders', () => {
    it('filters products by category, type, visibility, and SKU/name search', async () => {
      const { filterCommerceProducts, filterCommerceOrders } =
        await import('../commerce');

      const products = [
        mapRawCommerceProduct({
          category_id: 'cat-acc',
          id: 'p-1',
          name: 'Tai khoan Via 2FA',
          product_type: 'serial_stock',
          slug: 'via-2fa',
          variants: [
            {
              id: 'v-1',
              name: 'Via Co',
              price_credits: 50,
              product_id: 'p-1',
              sku: 'VIA-CO-01',
            },
          ],
          visibility: 'public',
        }),
        mapRawCommerceProduct({
          category_id: 'cat-proxy',
          id: 'p-2',
          name: 'Proxy Dan Cu VN',
          product_type: 'resource',
          slug: 'proxy-vn',
          variants: [
            {
              id: 'v-2',
              name: 'Goi 10 IP',
              price_credits: 120,
              product_id: 'p-2',
              sku: 'PRX-VN-10',
            },
          ],
          visibility: 'tenant_only',
        }),
      ];

      expect(
        filterCommerceProducts(products, { product_type: 'resource' }),
      ).toHaveLength(1);
      expect(
        filterCommerceProducts(products, { search: 'PRX-VN-10' }),
      ).toHaveLength(1);
      expect(
        filterCommerceProducts(products, { visibility: 'public' }),
      ).toHaveLength(1);

      const orders = [
        mapRawCommerceOrder({
          buyer_email: 'owner@operon.com',
          buyer_tenant_id: 'tenant-1',
          id: 'ord-1',
          order_code: 'ORD-261014-AAA111',
          payment_method: 'internal_wallet',
          status: 'completed',
          total_credits: 50,
        }),
        mapRawCommerceOrder({
          buyer_email: 'guest@example.com',
          id: 'ord-2',
          order_code: 'ORD-261014-BBB222',
          payment_method: 'bank_transfer',
          status: 'manual_review',
          total_credits: 200,
        }),
      ];

      expect(
        filterCommerceOrders(orders, { status: 'manual_review' }),
      ).toHaveLength(1);
      expect(
        filterCommerceOrders(orders, { payment_method: 'internal_wallet' }),
      ).toHaveLength(1);
      expect(filterCommerceOrders(orders, { search: 'BBB222' })).toHaveLength(
        1,
      );
    });

    it('persists and retrieves guest orders with claim_token in localStorage', async () => {
      const { getSavedGuestOrders, saveGuestOrderLocal } =
        await import('../commerce');

      const saved = saveGuestOrderLocal({
        buyer_email: 'guest@operon.com',
        claim_token: 'CLM_1234567890ABCDEF',
        created_at: '2026-10-14T12:00:00Z',
        order_code: 'ORD-261014-GUEST99',
        total_credits: 150,
      });

      expect(saved).toHaveLength(1);
      expect(saved[0]?.order_code).toBe('ORD-261014-GUEST99');
      expect(saved[0]?.claim_token).toBe('CLM_1234567890ABCDEF');
      expect(getSavedGuestOrders()[0]?.total_credits).toBe(150);
    });

    it('evaluates variant stock availability and formats serial deliveries cleanly', async () => {
      const { formatSerialDeliveriesText, isVariantInStock } =
        await import('../commerce');

      expect(isVariantInStock(null)).toBe(false);
      expect(
        isVariantInStock(
          mapRawProductVariant({
            available_stock: 0,
            id: 'v-unlimited',
            is_active: true,
            stock_mode: 'unlimited',
          }),
        ),
      ).toBe(true);
      expect(
        isVariantInStock(
          mapRawProductVariant({
            available_stock: 0,
            id: 'v-empty',
            is_active: true,
            stock_mode: 'serialized',
          }),
        ),
      ).toBe(false);

      const text = formatSerialDeliveriesText([
        {
          buyer_tenant_id: 't-1',
          created_at: '2026-10-14T12:00:00Z',
          delivered_payload: { serial: 'UID1|PASS1|2FA1' },
          delivery_type: 'serial_stock',
          download_count: 0,
          expires_at: null,
          id: 'd-1',
          max_downloads: null,
          order_id: 'o-1',
          order_item_id: 'oi-1',
          stock_item_id: 's-1',
        },
        {
          buyer_tenant_id: 't-1',
          created_at: '2026-10-14T12:00:00Z',
          delivered_payload: { download_url: 'https://example.com/file.zip' },
          delivery_type: 'digital_file',
          download_count: 0,
          expires_at: null,
          id: 'd-2',
          max_downloads: null,
          order_id: 'o-1',
          order_item_id: 'oi-2',
          stock_item_id: null,
        },
      ]);

      expect(text).toBe('UID1|PASS1|2FA1');
    });
  });

  describe('claimOrderWarranty, inspectStockItem & listStockItems', () => {
    it('calls claim_order_warranty RPC and maps refund and wallet balance', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce({
        claimed_at: '2026-10-18T00:00:00Z',
        delivery_id: 'deliv-1',
        new_wallet_balance: '1250',
        order_code: 'ORD-261018-DEFECT',
        order_id: 'ord-defect-1',
        refund_amount_credits: '50',
        stock_item_id: 'stk-dead-1',
        success: true,
      });

      const result = await claimOrderWarranty({
        delivery_id: 'deliv-1',
        order_id: 'ord-defect-1',
        reason: 'Proxy dead on arrival',
      });

      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/rpc/claim_order_warranty',
        {
          body: JSON.stringify({
            _delivery_id: 'deliv-1',
            _order_id: 'ord-defect-1',
            _reason: 'Proxy dead on arrival',
          }),
          method: 'POST',
          schema: 'commerce',
        },
      );

      expect(result.success).toBe(true);
      expect(result.refund_amount_credits).toBe(50);
      expect(result.new_wallet_balance).toBe(1250);
      expect(result.stock_item_id).toBe('stk-dead-1');
    });

    it('invokes admin_inspect_stock_item RPC to toggle health status', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce({
        health_status: 'defective',
        inspected_at: '2026-10-18T00:05:00Z',
        status: 'defective',
        stock_id: 'stk-100',
        success: true,
        variant_id: 'var-1',
      });

      const res = await inspectStockItem({
        is_healthy: false,
        notes: 'Failed proxy handshake',
        stock_id: 'stk-100',
      });

      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/rpc/admin_inspect_stock_item',
        {
          body: JSON.stringify({
            _is_healthy: false,
            _notes: 'Failed proxy handshake',
            _stock_id: 'stk-100',
          }),
          method: 'POST',
          schema: 'commerce',
        },
      );

      expect(res.success).toBe(true);
      expect(res.status).toBe('defective');
      expect(res.health_status).toBe('defective');
    });

    it('fetches stock items with status and variant filtering', async () => {
      vi.mocked(supabaseRequest).mockResolvedValueOnce([
        {
          batch_code: 'BATCH-01',
          created_at: '2026-10-18T00:00:00Z',
          id: 'stk-1',
          metadata: { health_status: 'healthy' },
          order_item_id: null,
          public_hint: 'user1',
          reserved_until: null,
          secret_payload: 'user1:pass1:host:port',
          sold_at: null,
          sold_to_tenant_id: null,
          status: 'available',
          updated_at: '2026-10-18T00:00:00Z',
          variant_id: 'var-1',
        },
      ]);

      const items = await listStockItems({
        limit: 50,
        status: 'available' as any,
        variant_id: 'var-1',
      });

      expect(supabaseRequest).toHaveBeenCalledWith(
        '/rest/v1/stock_items?select=*&order=created_at.desc&variant_id=eq.var-1&status=eq.available&limit=50',
        {
          method: 'GET',
          schema: 'commerce',
        },
      );

      expect(items).toHaveLength(1);
      expect(items[0]?.batch_code).toBe('BATCH-01');
      expect(items[0]?.status).toBe('available');
    });

    it('evaluates delivery warranty eligibility based on warranty_claimed and duration hours', async () => {
      const { isDeliveryEligibleForWarranty } = await import('../commerce');

      const now = new Date();
      const past1Hour = new Date(
        now.getTime() - 1 * 60 * 60 * 1000,
      ).toISOString();
      const past25Hours = new Date(
        now.getTime() - 25 * 60 * 60 * 1000,
      ).toISOString();

      // 1. In-warranty delivery (delivered 1h ago, 24h warranty default)
      const freshDelivery: any = {
        created_at: past1Hour,
        delivered_payload: { sku: 'TEST-SKU' },
        id: 'deliv-fresh',
      };
      expect(isDeliveryEligibleForWarranty(freshDelivery, 24)).toBe(true);

      // 2. Expired warranty delivery (delivered 25h ago, 24h warranty limit)
      const expiredDelivery: any = {
        created_at: past25Hours,
        delivered_payload: { sku: 'TEST-SKU' },
        id: 'deliv-expired',
      };
      expect(isDeliveryEligibleForWarranty(expiredDelivery, 24)).toBe(false);

      // 3. Already claimed delivery
      const claimedDelivery: any = {
        created_at: past1Hour,
        delivered_payload: { sku: 'TEST-SKU', warranty_claimed: true },
        id: 'deliv-claimed',
      };
      expect(isDeliveryEligibleForWarranty(claimedDelivery, 24)).toBe(false);

      // 4. Null / invalid delivery
      expect(isDeliveryEligibleForWarranty(null)).toBe(false);
    });
  });
});
