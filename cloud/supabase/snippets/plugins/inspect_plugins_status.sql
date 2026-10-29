-- ============================================================================
-- SUPABASE SNIPPET: INSPECT PLUGINS & EXTENSIONS MATRIX
-- Description: Audits all installed plugins, their underlying PostgreSQL
--              schemas, active tables count, and RLS shield compliance.
-- Usage: Execute in Supabase Studio SQL Editor (Ctrl + Enter)
-- ============================================================================

WITH plugin_schemas AS (
    SELECT 
        p.id AS plugin_key,
        p.name AS plugin_name,
        p.version,
        p.schema_name,
        p.installed_at,
        p.dependencies
    FROM public.system_plugins p
),
schema_stats AS (
    SELECT 
        schemaname,
        count(*) AS total_tables,
        count(*) FILTER (WHERE rowsecurity = true) AS rls_enabled_tables,
        count(*) FILTER (WHERE rowsecurity = false) AS rls_disabled_tables
    FROM pg_tables
    GROUP BY schemaname
)
SELECT 
    ps.plugin_name,
    ps.version,
    ps.schema_name,
    COALESCE(ss.total_tables, 0) AS total_tables,
    CASE 
        WHEN COALESCE(ss.rls_disabled_tables, 0) = 0 THEN '100% Shielded (Pass)'
        ELSE 'FAIL: ' || ss.rls_disabled_tables || ' tables exposed!'
    END AS rls_compliance,
    ps.dependencies,
    ps.installed_at
FROM plugin_schemas ps
LEFT JOIN schema_stats ss ON ps.schema_name = ss.schemaname
ORDER BY ps.installed_at ASC;
