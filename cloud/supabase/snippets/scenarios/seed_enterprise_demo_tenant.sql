-- ============================================================================
-- SUPABASE SNIPPET: SEED ENTERPRISE DEMO TENANT & PERSONA
-- Description: Creates a fully populated Tenant with an Owner user,
--              active subscription, funded Xu wallet, browser profiles,
--              and sample proxy assignments for instant UI testing.
-- Usage: Execute in Supabase Studio SQL Editor.
-- ============================================================================

DO $$
DECLARE
    v_tenant_id  UUID;
    v_user_id    UUID;
    v_role_id    UUID;
    v_plan_id    UUID;
    v_wallet_id  UUID;
    v_profile_id UUID;
    v_proxy_id   UUID;
BEGIN
    -- 1. Create Demo Tenant
    INSERT INTO public.tenants (name, slug, tier, status)
    VALUES ('Tuquet Enterprise Labs', 'tuquet-enterprise', 'enterprise', 'active')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_tenant_id;

    -- 2. Lookup or Provision Owner User in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo.owner@tuquet.local' LIMIT 1;
    IF v_user_id IS NULL THEN
        v_user_id := extensions.gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        )
        VALUES (
            v_user_id, '00000000-0000-0000-0000-000000000000', 'demo.owner@tuquet.local',
            crypt('Password123!', gen_salt('bf')), now(),
            jsonb_build_object('provider', 'email', 'providers', array['email'], 'tenant_id', v_tenant_id),
            jsonb_build_object('full_name', 'Demo Enterprise Owner'),
            now(), now(), 'authenticated', 'authenticated'
        );
    END IF;

    -- 3. Bind Role & Tenant Membership
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'owner' AND tenant_id IS NULL LIMIT 1;
    INSERT INTO public.tenant_users (tenant_id, user_id, role_id)
    VALUES (v_tenant_id, v_user_id, v_role_id)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;

    -- 4. Assign Pro Subscription Plan
    SELECT id INTO v_plan_id FROM billing.plans WHERE code = 'plan_pro' LIMIT 1;
    IF v_plan_id IS NOT NULL THEN
        INSERT INTO billing.subscriptions (tenant_id, plan_id, status, current_period_end)
        VALUES (v_tenant_id, v_plan_id, 'active', now() + interval '30 days')
        ON CONFLICT (tenant_id) DO UPDATE SET status = 'active', current_period_end = now() + interval '30 days';
    END IF;

    -- 5. Seed Xu Wallet Balance (1,000 Xu)
    INSERT INTO billing.wallets (tenant_id, currency, balance, lifetime_credited)
    VALUES (v_tenant_id, 'XU', 1000.00, 1000.00)
    ON CONFLICT (tenant_id) DO UPDATE SET balance = 1000.00
    RETURNING id INTO v_wallet_id;

    -- 6. Seed Sample Residential Proxy
    INSERT INTO workers.proxies (tenant_id, name, protocol, host, port, username, password, country_code, status)
    VALUES (v_tenant_id, 'VN Residential High-Speed', 'http', '103.150.12.34', 8080, 'resi_user', 'resi_pass', 'VN', 'active')
    RETURNING id INTO v_proxy_id;

    -- 7. Seed Sample Antidetect Browser Profile
    INSERT INTO browsers.profiles (
        tenant_id, name, group_name, browser_type, engine_version,
        fingerprint_seed, os_platform, os_version, browser_brand,
        cpu_cores, ram_gb, screen_width, screen_height, device_pixel_ratio,
        proxy_id, status
    )
    VALUES (
        v_tenant_id, 'Vietnam E-commerce Automation', 'Shopee-Store', 'ungoogled-chromium', '148.0.7778.215',
        882914102, 'windows', '10.0.0', 'Chrome',
        8, 16, 1920, 1080, 1.0,
        v_proxy_id, 'idle'
    )
    RETURNING id INTO v_profile_id;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE ' [SUCCESS] Demo Enterprise Fixture Provisioned:';
    RAISE NOTICE '  - Tenant Slug : tuquet-enterprise (ID: %)', v_tenant_id;
    RAISE NOTICE '  - Owner User  : demo.owner@tuquet.local';
    RAISE NOTICE '  - Wallet Fund : 1,000 XU';
    RAISE NOTICE '  - Browser ID  : %', v_profile_id;
    RAISE NOTICE '=======================================================';
END $$;
