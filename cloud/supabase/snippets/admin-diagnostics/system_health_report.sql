-- ============================================================================
-- SUPABASE SNIPPET: SYSTEM HEALTH & SECURITY AUDIT REPORT
-- Description: Instant 1-click diagnostics for Supabase Studio:
--              1. RLS enforcement verification across all user schemas
--              2. Table sizes and row estimates
--              3. Active plugin installation status
-- Usage: Run in Supabase Studio SQL Editor (Ctrl + Enter)
-- ============================================================================

-- 1. Plugin Inventory & Versions
SELECT 
    name AS plugin_id,
    version,
    schema_name,
    installed_at,
    description
FROM public.system_plugins
ORDER BY installed_at ASC;

-- 2. Security Audit: Check for user tables with RLS DISABLED
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'OK (Shielded)' 
        ELSE 'WARNING: RLS IS DISABLED!' 
    END AS security_status
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'storage', 'graphql', 'realtime', 'supabase_functions', 'extensions', 'auth')
ORDER BY rowsecurity ASC, schemaname ASC, tablename ASC;

-- 3. Top Database Tables by Physical Size & Row Count
SELECT 
    schemaname,
    relname AS table_name,
    n_live_tup AS estimated_rows,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 15;
