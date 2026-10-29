-- ============================================================================
-- COMMERCE PLUGIN SAMPLE SEED DATA
-- Description: Default Store Categories & Canonical Sample Digital Products
-- ============================================================================

INSERT INTO commerce.categories (slug, name, description, icon, sort_order, is_active)
VALUES
    ('accounts-keys', 'Tai khoan & License Key', 'Tai khoan so, phoi MMO (uid|pass|2fa) va ma kich hoat phan mem giao tuc thi', 'lucide:key-round', 1, TRUE),
    ('resources', 'Tai nguyen Tuquet', 'Proxy dan cu/datacenter, kich ban Automa mau va goi nang cap he sinh thai', 'lucide:cpu', 2, TRUE),
    ('digital-files', 'Tep so & Cong cu', 'Bo cai dat, tai lieu ky thuat va du lieu tai xuong', 'lucide:file-down', 3, TRUE),
    ('wallet-topup', 'Nap Xu Tra Truoc', 'Goi nap Xu tich luy vao vi Tenant kem uu dai tang them Xu', 'lucide:coins', 4, TRUE)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

DO $$
DECLARE
    v_cat_accounts UUID;
    v_cat_specter UUID;
    v_cat_files UUID;
    v_cat_topup UUID;
    v_prod_serial UUID;
    v_prod_resource UUID;
    v_prod_file UUID;
    v_prod_topup UUID;
BEGIN
    SELECT id INTO v_cat_accounts FROM commerce.categories WHERE slug = 'accounts-keys';
    SELECT id INTO v_cat_specter FROM commerce.categories WHERE slug = 'resources';
    SELECT id INTO v_cat_files FROM commerce.categories WHERE slug = 'digital-files';
    SELECT id INTO v_cat_topup FROM commerce.categories WHERE slug = 'wallet-topup';

    -- 1. Serial Stock Product
    INSERT INTO commerce.products (category_id, slug, name, short_description, product_type, visibility, is_active, tags, fulfillment_config, sort_order)
    VALUES (
        v_cat_accounts,
        'via-account-2fa-verified',
        'Tai khoan Via Xac Minh 2FA (Giao Tuc Thi)',
        'Phoi tai khoan dinh dang uid|pass|2fa|email kem bao hanh 24h',
        'serial_stock',
        'public',
        TRUE,
        ARRAY['2fa', 'instant', 'mmo'],
        '{"format": "uid|pass|2fa|email", "warranty_hours": 24}'::jsonb,
        1
    )
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_prod_serial;

    INSERT INTO commerce.product_variants (product_id, sku, name, price_credits, compare_at_credits, stock_mode, min_qty, max_qty, sort_order)
    VALUES (v_prod_serial, 'VIA-2FA-STD', 'Goi Tieu Chuan (1 Tai khoan)', 50, 65, 'serialized', 1, 50, 1)
    ON CONFLICT (sku) DO UPDATE SET price_credits = EXCLUDED.price_credits;

    -- 2. Ecosystem Resource Product
    INSERT INTO commerce.products (category_id, slug, name, short_description, product_type, visibility, is_active, tags, fulfillment_config, sort_order)
    VALUES (
        v_cat_specter,
        'residential-proxy-pack',
        'Proxy Dan Cu Tinh (Cap Thang Vao Workspace)',
        'Tu dong khoi tao va gan Proxy truc tiep vao bang workers.proxies cua Tenant',
        'resource',
        'tenant_only',
        TRUE,
        ARRAY['proxy', 'tuquet', 'workers'],
        '{"resource_subtype": "proxy_pool"}'::jsonb,
        2
    )
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_prod_resource;

    INSERT INTO commerce.product_variants (product_id, sku, name, price_credits, compare_at_credits, stock_mode, min_qty, max_qty, fulfillment_payload, sort_order)
    VALUES (
        v_prod_resource,
        'PROXY-VN-ISP-30D',
        'Proxy VN ISP Tinh (30 Ngay)',
        120,
        150,
        'serialized',
        1,
        20,
        '{"resource_subtype": "proxy_pool", "protocol": "socks5", "country_code": "VN", "is_residential": true}'::jsonb,
        1
    )
    ON CONFLICT (sku) DO UPDATE SET price_credits = EXCLUDED.price_credits;

    -- 3. Digital File Product
    INSERT INTO commerce.products (category_id, slug, name, short_description, product_type, visibility, is_active, tags, fulfillment_config, sort_order)
    VALUES (
        v_cat_files,
        'stealth-fingerprints-pack',
        'Bo Du Lieu Canvas & WebGL Fingerprint Cao Cap',
        'Tap tin ZIP chua 500 mau thong so phan cung thuc te cho trinh duyet antidetect',
        'digital_file',
        'public',
        TRUE,
        ARRAY['dataset', 'fingerprint', 'zip'],
        '{"delivery": "signed_download"}'::jsonb,
        3
    )
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_prod_file;

    INSERT INTO commerce.product_variants (product_id, sku, name, price_credits, compare_at_credits, stock_mode, min_qty, max_qty, fulfillment_payload, sort_order)
    VALUES (
        v_prod_file,
        'FP-PACK-500-ZIP',
        'Ban Day Du 500 Profiles (.zip)',
        200,
        250,
        'unlimited',
        1,
        1,
        '{"bucket_name": "tenant-assets", "file_path": "store/fingerprints-500.zip", "max_downloads": 5, "expire_hours": 168}'::jsonb,
        1
    )
    ON CONFLICT (sku) DO UPDATE SET price_credits = EXCLUDED.price_credits;

    -- 4. Prepaid Wallet Credit Pack
    INSERT INTO commerce.products (category_id, slug, name, short_description, product_type, visibility, is_active, tags, fulfillment_config, sort_order)
    VALUES (
        v_cat_topup,
        'prepaid-xu-credit-bundle',
        'Goi Nap Xu Tra Truoc (Tang Them Xu Thuong)',
        'Nap Xu vao vi Tenant qua VietQR / MoMo / Stripe / USDT de thanh toan tuc thi',
        'wallet_credit',
        'tenant_only',
        TRUE,
        ARRAY['xu', 'topup', 'bonus'],
        '{"instant_credit": true}'::jsonb,
        4
    )
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_prod_topup;

    INSERT INTO commerce.product_variants (product_id, sku, name, price_credits, compare_at_credits, stock_mode, min_qty, max_qty, fulfillment_payload, sort_order)
    VALUES (
        v_prod_topup,
        'XU-PACK-500-BONUS50',
        'Goi 500 Xu (+50 Xu Thuong = 550 Xu)',
        500,
        550,
        'unlimited',
        1,
        10,
        '{"credit_amount": 500, "bonus_credits": 50}'::jsonb,
        1
    )
    ON CONFLICT (sku) DO UPDATE SET price_credits = EXCLUDED.price_credits;
END $$;
