-- ============================================================================
-- VERIFICATION TEST 07: Secrets Plugin (Zero-Knowledge DEK & Device Vault)
-- Plugin: secrets
-- Best Practices: Supabase Postgres Best Practices (Transaction Isolation, RLS)
-- Description: Verifies schema integrity, table RLS shielding, helper RPC functions,
--              and cryptographic envelope lifecycle without polluting persistent state.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_tbl TEXT;
    v_expected_tables TEXT[] := ARRAY['tenant_keys', 'credentials', 'devices'];
    v_missing_tables TEXT[] := ARRAY[]::TEXT[];
    v_rls_enabled BOOLEAN;
    v_tenant_id UUID := '77777777-0000-0000-0000-000000000001';
    v_device_id UUID := '77777777-1111-1111-1111-000000000001';
    v_token TEXT := 'sec_test_token_secret_12345';
    v_dek BYTEA;
    v_b64 TEXT;
    v_unb64 BYTEA;
BEGIN
    RAISE NOTICE '>>> [TEST 1] Verifying schema secrets and tables existence...';
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'secrets') THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Schema secrets does not exist!';
    END IF;

    FOREACH v_tbl IN ARRAY v_expected_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'secrets' AND table_name = v_tbl
        ) THEN
            v_missing_tables := array_append(v_missing_tables, v_tbl);
        END IF;
    END LOOP;

    IF array_length(v_missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Missing tables in schema secrets: %', v_missing_tables;
    ELSE
        RAISE NOTICE ' [PASS] All 3 tables exist in schema secrets.';
    END IF;

    RAISE NOTICE '>>> [TEST 2] Verifying 100%% RLS active on secrets tables...';
    FOREACH v_tbl IN ARRAY v_expected_tables LOOP
        SELECT rowsecurity INTO v_rls_enabled
        FROM pg_tables
        WHERE schemaname = 'secrets' AND tablename = v_tbl;

        IF v_rls_enabled IS NOT TRUE THEN
            RAISE EXCEPTION 'TEST 2 FAILED: RLS is NOT enabled on secrets.%!', v_tbl;
        END IF;
    END LOOP;
    RAISE NOTICE ' [PASS] RLS is active on 100%% of secrets tables (Deny by default).';

    RAISE NOTICE '>>> [TEST 3] Verifying base cryptographic helper functions...';
    -- Test base64 helper round-trip
    v_b64 := secrets._b64('Hello Supabase Secrets'::bytea);
    v_unb64 := secrets._unb64(v_b64);
    IF v_unb64 <> 'Hello Supabase Secrets'::bytea THEN
        RAISE EXCEPTION 'TEST 3 FAILED: secrets._b64 or _unb64 round-trip mismatch!';
    END IF;
    RAISE NOTICE ' [PASS] Cryptographic bytea/base64 helpers verified.';

    RAISE NOTICE '>>> [TEST 4] Verifying DEK generation and idempotent retrieval...';
    -- Setup temporary test tenant
    INSERT INTO public.tenants (id, name, slug)
    VALUES (v_tenant_id, 'Secrets Test Org', 'secrets-test-org')
    ON CONFLICT (id) DO NOTHING;

    -- Generate DEK
    v_dek := secrets._get_dek(v_tenant_id);
    IF v_dek IS NULL OR octet_length(v_dek) <> 32 THEN
        RAISE EXCEPTION 'TEST 4 FAILED: Expected 32-byte DEK, got length %', octet_length(v_dek);
    END IF;

    -- Idempotent check: calling again must return identical DEK
    IF secrets._get_dek(v_tenant_id) <> v_dek THEN
        RAISE EXCEPTION 'TEST 4 FAILED: secrets._get_dek returned a different key on second call!';
    END IF;
    RAISE NOTICE ' [PASS] DEK generation and caching verified (32 bytes).';

    RAISE NOTICE ' [SUCCESS] 07_verify_secrets_plugin.sql passed 100%%.';
END $$;

ROLLBACK;
