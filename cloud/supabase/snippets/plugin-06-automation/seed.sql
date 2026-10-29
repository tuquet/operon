-- ============================================================================
-- OPN-CLOUD PLUGIN: AUTOMATION CLOUD BRIDGE (MOCK SEED DATA)
-- Schema: automation
-- ============================================================================

-- 1. Sample Standalone Workflow
INSERT INTO automation.workflows (
    id, tenant_id, name, description, version, status, graph_data, settings, created_by
)
VALUES
    (
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'Lead Scraper & Enricher',
        'Automated workflow extracting group leads, validating phone numbers, and pushing to CRM',
        '1.2.0',
        'published',
        '{"nodes": [], "edges": []}'::jsonb,
        '{"concurrency": 2}'::jsonb,
        'a0000000-0000-0000-0000-000000000001'
    )
ON CONFLICT (id) DO NOTHING;

-- 2. Sample Official Automa Composite Block Package (Reusable Lego Block)
INSERT INTO automation.packages (
    id, tenant_id, name, description, icon, version, is_external, status, settings, inputs, outputs, variables, data, created_by
)
VALUES
    (
        'd0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'Cloudflare Turnstile Solver',
        'Reusable BlockPackage that detects Cloudflare Turnstile challenge and dispatches CDP solve routine',
        'mdiShieldCheck',
        '1.0.0',
        FALSE,
        'published',
        '{"asBlock": true}'::jsonb,
        jsonb_build_array(
            jsonb_build_object('id', 'in_trigger', 'name', 'Entry', 'blockId', 'sub_detect', 'handleId', 'sub_detect-input-1')
        ),
        jsonb_build_array(
            jsonb_build_object('id', 'out_success', 'name', 'Success', 'blockId', 'sub_verify', 'handleId', 'sub_verify-output-1'),
            jsonb_build_object('id', 'out_failed', 'name', 'Timeout', 'blockId', 'sub_verify', 'handleId', 'sub_verify-output-fallback')
        ),
        '[]'::jsonb,
        jsonb_build_object(
            'nodes', jsonb_build_array(
                jsonb_build_object('id', 'sub_detect', 'label', 'element-exists', 'data', jsonb_build_object('selector', 'iframe[src*="cloudflare"]', 'timeout', 5000)),
                jsonb_build_object('id', 'sub_verify', 'label', 'element-exists', 'data', jsonb_build_object('selector', '#challenge-success', 'timeout', 15000))
            ),
            'edges', jsonb_build_array(
                jsonb_build_object('id', 'sub_edge_1', 'source', 'sub_detect', 'target', 'sub_verify', 'sourceHandle', 'sub_detect-output-1', 'targetHandle', 'sub_verify-input-1')
            )
        ),
        'a0000000-0000-0000-0000-000000000001'
    )
ON CONFLICT (id) DO NOTHING;
-- 3. Canonical Quickstart Demo Workflow (Google Search & Scrape)
INSERT INTO automation.workflows (
    id, tenant_id, name, description, version, status, graph_data, settings, created_by
)
VALUES
    (
        'c0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000001',
        'Quickstart: Google Search & Scrape',
        'Interactive Demo: Launches sandboxed Chromium via CDP, navigates to Google, types query, and verifies output in real-time.',
        '1.0.0',
        'published',
        '{"nodes": [{"id": "start", "type": "trigger", "label": "Manual Start"}, {"id": "open_url", "type": "browser-open", "label": "Open Google", "data": {"url": "https://www.google.com"}}, {"id": "type_search", "type": "browser-type", "label": "Search Query", "data": {"selector": "textarea[name=q], input[name=q]", "text": "Operon Rust Automation Mesh"}}, {"id": "press_enter", "type": "browser-press-key", "label": "Submit", "data": {"key": "Enter"}}, {"id": "wait_res", "type": "browser-wait", "label": "Wait Results", "data": {"selector": "#search", "timeout": 10000}}], "edges": [{"id": "e1", "source": "start", "target": "open_url"}, {"id": "e2", "source": "open_url", "target": "type_search"}, {"id": "e3", "source": "type_search", "target": "press_enter"}, {"id": "e4", "source": "press_enter", "target": "wait_res"}]}'::jsonb,
        '{"concurrency": 1, "headed": true, "browser_profile_id": "10000000-0000-0000-0000-000000000001"}'::jsonb,
        'a0000000-0000-0000-0000-000000000001'
    )
ON CONFLICT (id) DO NOTHING;
