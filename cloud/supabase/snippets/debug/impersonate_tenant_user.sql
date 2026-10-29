-- ============================================================================
-- SUPABASE SNIPPET: IMPERSONATE TENANT USER (RLS & RBAC DEBUGGING)
-- Description: Simulates authenticated JWT claims directly in SQL Editor
--              to inspect RLS policy enforcement as a specific tenant user.
-- Usage: Run the entire block (Ctrl + Enter). It runs inside a transaction
--        and ROLLS BACK automatically so your database remains untouched.
-- ============================================================================

BEGIN;

-- 1. Declare identity fixture variables
DO $$
DECLARE
    v_tenant_id UUID;
    v_user_id   UUID;
BEGIN
    -- Select first available test tenant & user or fallback to known IDs
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
    SELECT id INTO v_user_id   FROM auth.users   LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'No tenant found, using mock UUIDs';
        v_tenant_id := '00000000-0000-0000-0000-000000000001'::uuid;
        v_user_id   := '00000000-0000-0000-0000-000000000002'::uuid;
    END IF;

    -- Set local session variables simulating Supabase PostgREST JWT claims
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.app_metadata', json_build_object('tenant_id', v_tenant_id)::text, true);

    RAISE NOTICE '--> Impersonation active: User=% | Tenant=%', v_user_id, v_tenant_id;
END $$;

-- 2. Inspect visibility across sensitive multi-tenant tables
-- If RLS is properly enforced, you will only see records belonging to your active tenant.
SELECT 'browsers.profiles' AS checked_table, count(*) AS visible_records FROM browsers.profiles
UNION ALL
SELECT 'commerce.orders' AS checked_table, count(*) AS visible_records FROM commerce.orders
UNION ALL
SELECT 'billing.wallets' AS checked_table, count(*) AS visible_records FROM billing.wallets
UNION ALL
SELECT 'workers.devices' AS checked_table, count(*) AS visible_records FROM workers.devices;

-- 3. Always rollback so the session does not retain spoofed claims
ROLLBACK;
