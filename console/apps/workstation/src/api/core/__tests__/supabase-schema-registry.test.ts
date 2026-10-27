import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildDynamicVxeCreateSchema,
  buildDynamicVxeFormSchema,
  computeDirtyMutablePayload,
  computeInsertPayload,
  evaluateRowRlsPolicy,
  executeDynamicSupabaseInsert,
  executeDynamicSupabasePatch,
  inferResourceFromRouteAndRow,
  SUPABASE_TABLE_REGISTRY,
  validateRequiredInsertFields,
} from '../supabase-schema-registry';

const mockSupabaseRequest = vi.fn();
const mockGetActiveTenantId = vi.fn(() => 'tenant_active_01');

vi.mock('../supabase-client', () => ({
  SUPABASE_SCHEMA: {
    AUTOMA: 'automation',
    BILLING: 'billing',
    COMMERCE: 'commerce',
    EVENTS: 'events',
    MEDIA: 'media',
    PUBLIC: 'public',
    WORKERS: 'workers',
  },
  supabaseRequest: (...args: any[]) => mockSupabaseRequest(...args),
}));

vi.mock('../tenant', () => ({
  getActiveTenantId: () => mockGetActiveTenantId(),
}));

describe('supabase-schema-registry — Enterprise Dynamic Schema & RLS Engine', () => {
  beforeEach(() => {
    mockSupabaseRequest.mockReset();
  });

  it('registers all 19 canonical Supabase tables across 5 PostgREST schemas', () => {
    const keys = Object.keys(SUPABASE_TABLE_REGISTRY);
    expect(keys).toHaveLength(19);
    expect(keys).toEqual(
      expect.arrayContaining([
        'public.tenants',
        'automation.workflows',
        'automation.jobs',
        'workers.devices',
        'workers.browsers',
        'workers.proxies',
        'commerce.orders',
        'commerce.products',
        'billing.wallet_transactions',
        'billing.payment_intents',
        'billing.payment_gateways',
        'billing.bank_receiving_accounts',
        'billing.plans',
        'billing.subscriptions',
        'public.system_plugins',
        'public.profiles',
        'public.roles',
        'public.permissions',
        'public.audit_logs',
      ]),
    );
  });

  it('infers resource accurately from route paths and multi-grid row shapes', () => {
    expect(inferResourceFromRouteAndRow('/tenants', {})).toBe('public.tenants');
    expect(inferResourceFromRouteAndRow('/automation/workflows', {})).toBe(
      'automation.workflows',
    );
    expect(
      inferResourceFromRouteAndRow('/commerce/admin', {
        name: 'License Pro',
        product_type: 'serial_stock',
        visibility: 'public',
      }),
    ).toBe('commerce.products');
    expect(
      inferResourceFromRouteAndRow('/commerce/admin', {
        credits_amount: 500,
        reference_code: ' PAY_123',
      }),
    ).toBe('billing.payment_intents');
    expect(
      inferResourceFromRouteAndRow('/commerce/admin', {
        provider_code: 'bank_transfer',
        rate_per_credit: 1000,
      }),
    ).toBe('billing.payment_gateways');
    expect(
      inferResourceFromRouteAndRow('/system/roles', {
        is_system: true,
        name: 'owner',
        permission_count: 36,
      }),
    ).toBe('public.roles');
    expect(
      inferResourceFromRouteAndRow('/system/roles', {
        description: 'Manage workflows',
        id: 'automation.workflows.manage',
        module: 'automation',
      }),
    ).toBe('public.permissions');
  });

  it('evaluates Row-Level Security (RLS) policies accurately for immutable ledgers, system roles, and tenant RBAC', () => {
    const superadminAccess = {
      isSuperadmin: true,
      permissions: ['*'],
      tenantPermissions: {},
    };
    const viewerAccess = {
      isSuperadmin: false,
      permissions: ['automation.workflows.view'],
      tenantPermissions: {
        t_1: ['automation.workflows.view'],
      },
    };
    const managerAccess = {
      isSuperadmin: false,
      permissions: ['automation.workflows.manage'],
      tenantPermissions: {
        t_1: ['automation.workflows.manage'],
      },
    };

    // 1. Immutable append-only ledgers lock UPDATE even for superadmin
    const auditRls = evaluateRowRlsPolicy(
      'public.audit_logs',
      { id: 'log_1' },
      superadminAccess,
    );
    expect(auditRls.canUpdate.allowed).toBe(false);
    expect(auditRls.canUpdate.policyName).toBe('rls_append_only_ledger');

    const walletRls = evaluateRowRlsPolicy(
      'billing.wallet_transactions',
      { id: 'tx_1' },
      superadminAccess,
    );
    expect(walletRls.canUpdate.allowed).toBe(false);

    // 2. System roles (is_system: true) lock UPDATE even for superadmin
    const sysRoleRls = evaluateRowRlsPolicy(
      'public.roles',
      { id: 'r_owner', is_system: true, name: 'owner' },
      superadminAccess,
    );
    expect(sysRoleRls.canUpdate.allowed).toBe(false);
    expect(sysRoleRls.canUpdate.policyName).toBe('roles_system_immutable');

    // Custom role allows UPDATE when authorized
    const customRoleRls = evaluateRowRlsPolicy(
      'public.roles',
      { id: 'r_custom', is_system: false, name: 'ops' },
      superadminAccess,
    );
    expect(customRoleRls.canUpdate.allowed).toBe(true);

    // 3. Tenant RBAC enforcement on automation.workflows
    const viewerWorkflowRls = evaluateRowRlsPolicy(
      'automation.workflows',
      { id: 'wf_1', tenant_id: 't_1' },
      viewerAccess,
    );
    expect(viewerWorkflowRls.canUpdate.allowed).toBe(false);

    const managerWorkflowRls = evaluateRowRlsPolicy(
      'automation.workflows',
      { id: 'wf_1', tenant_id: 't_1' },
      managerAccess,
    );
    expect(managerWorkflowRls.canUpdate.allowed).toBe(true);
  });

  it('builds dynamic VxeForm schema merging grid columns, hidden mobile DB columns, and enum options', () => {
    const row = {
      _X_ROW_KEY: 'row_99',
      created_at: '2026-10-14T12:00:00Z',
      description: 'Sync TikTok shop orders',
      id: 'wf_01',
      name: 'TikTok Sync',
      nodeCount: 12,
      status: 'published',
      triggerSummary: 'Cron 5m',
      version: '1.2.0',
    };

    // Simulate mobile grid where only name and actions are in gridColumns
    const mobileGridColumns = [
      { field: 'name', title: 'common.name' },
      { field: 'actions', title: 'common.actions' },
    ];

    const schema = buildDynamicVxeFormSchema({
      gridColumns: mobileGridColumns,
      resource: 'automation.workflows',
      row,
      translate: (k) => k,
    });

    expect(schema.title).toBe('TikTok Sync');
    expect(schema.rls.canUpdate.allowed).toBe(true);

    const fieldMap = new Map(schema.fields.map((f) => [f.field, f]));
    // Hidden mobile columns (description, version, status, nodeCount, triggerSummary, id) are surfaced!
    expect(fieldMap.get('name')?.editable).toBe(true);
    expect(fieldMap.get('description')?.editable).toBe(true);
    expect(fieldMap.get('description')?.type).toBe('textarea');
    expect(fieldMap.get('version')?.editable).toBe(true);
    expect(fieldMap.get('status')?.editable).toBe(true);
    expect(fieldMap.get('status')?.options?.length).toBeGreaterThanOrEqual(3);
    expect(fieldMap.get('id')?.editable).toBe(false);
    expect(fieldMap.get('nodeCount')?.editable).toBe(false);
    expect(fieldMap.has('_X_ROW_KEY')).toBe(false);

    // Table column order is preserved first, with trailing system metadata (id, created_at) at the end
    const orderedKeys = schema.fields.map((f) => f.field);
    expect(orderedKeys.indexOf('name')).toBe(0);
    expect(orderedKeys.indexOf('nodeCount')).toBeLessThan(
      orderedKeys.indexOf('id'),
    );
    expect(orderedKeys.indexOf('id')).toBeLessThan(
      orderedKeys.indexOf('created_at'),
    );
  });

  it('locks core plugin status field while keeping name/description editable for superadmin', () => {
    const corePluginRow = {
      description: 'Core IAM',
      id: 'core-iam',
      is_core: true,
      name: 'Core IAM',
      status: 'installed',
      version: '1.0.0',
    };

    const schema = buildDynamicVxeFormSchema({
      resource: 'public.system_plugins',
      row: corePluginRow,
    });

    const fieldMap = new Map(schema.fields.map((f) => [f.field, f]));
    expect(fieldMap.get('name')?.editable).toBe(true);
    expect(fieldMap.get('status')?.editable).toBe(false);
  });

  it('computes dirty mutable payload and executes PostgREST PATCH with schema profile header', async () => {
    const originalRow = {
      created_at: '2026-10-14T00:00:00Z',
      description: 'Old desc',
      id: 'wf_123',
      name: 'Old Name',
      nodeCount: 8,
      status: 'draft',
      version: '1.0.0',
    };

    const formData = {
      ...originalRow,
      name: 'New Name',
      nodeCount: 999, // Virtual read-only field: must be stripped!
      status: 'published',
    };

    const dirty = computeDirtyMutablePayload(
      originalRow,
      formData,
      'automation.workflows',
    );
    expect(dirty).toEqual({
      name: 'New Name',
      status: 'published',
    });
    expect(dirty).not.toHaveProperty('nodeCount');

    mockSupabaseRequest.mockResolvedValueOnce([
      {
        ...originalRow,
        name: 'New Name',
        status: 'published',
      },
    ]);

    const result = await executeDynamicSupabasePatch(
      'automation.workflows',
      originalRow,
      formData,
    );

    expect(result.skipped).toBe(false);
    expect(result.updatedRow.name).toBe('New Name');
    expect(result.updatedRow.status).toBe('published');
    expect(mockSupabaseRequest).toHaveBeenCalledWith(
      '/rest/v1/workflows?id=eq.wf_123',
      expect.objectContaining({
        body: JSON.stringify({ name: 'New Name', status: 'published' }),
        method: 'PATCH',
        preferRepresentation: true,
        schema: 'automation',
      }),
    );
  });

  it('normalizes colon and dot permission delimiters and builds complete /system/* schemas', () => {
    const colonManagerAccess = {
      isSuperadmin: false,
      permissions: ['roles:manage'],
      tenantPermissions: {},
    };

    const customRoleRow = {
      created_at: '2026-10-15T00:00:00Z',
      description: 'Custom DevOps role',
      id: 'role_devops',
      is_system: false,
      name: 'devops',
      permission_count: 4,
      permissions: ['workers:devices:view', 'workers:devices:manage'],
    };

    const roleSchema = buildDynamicVxeFormSchema({
      access: colonManagerAccess,
      resource: 'public.roles',
      row: customRoleRow,
    });
    expect(roleSchema.rls.canUpdate.allowed).toBe(true);
    const roleFieldMap = new Map(roleSchema.fields.map((f) => [f.field, f]));
    expect(roleFieldMap.get('name')?.editable).toBe(true);
    expect(roleFieldMap.get('description')?.editable).toBe(true);
    expect(roleFieldMap.get('is_system')?.editable).toBe(false);

    // Billing plan schema excludes non-existent price_yearly_usd and exposes metadata as JSON
    const planSchema = buildDynamicVxeFormSchema({
      resource: 'billing.plans',
      row: {
        created_at: '2026-10-15T00:00:00Z',
        description: 'Pro tier',
        id: 'pro',
        is_active: true,
        max_members: 25,
        max_monthly_runs: 50_000,
        max_storage_mb: 10_240,
        metadata: { badge: 'popular' },
        name: 'Pro Plan',
        price_monthly_usd: 49,
      },
    });
    const planFieldMap = new Map(planSchema.fields.map((f) => [f.field, f]));
    expect(planFieldMap.has('price_yearly_usd')).toBe(false);
    expect(planFieldMap.get('price_monthly_usd')?.editable).toBe(true);
    expect(planFieldMap.get('metadata')?.group).toBe('json');
    expect(planFieldMap.get('metadata')?.editable).toBe(true);
  });

  it('extracts Supabase-style relational table descriptors for permissions, roles, workspaces, variants, items, and deliveries', () => {
    const roleSchema = buildDynamicVxeFormSchema({
      resource: 'public.roles',
      row: {
        id: 'role_admin',
        is_system: true,
        name: 'admin',
        permissions: ['system.roles.manage', 'tenants.read'],
      },
      translate: (k) => k,
    });

    expect(roleSchema.relations).toHaveLength(1);
    expect(roleSchema.relations[0]?.field).toBe('permissions');
    expect(roleSchema.relations[0]?.targetResource).toBe('public.permissions');
    expect(roleSchema.relations[0]?.rows).toEqual([
      { code: 'system.roles.manage', module: 'system' },
      { code: 'tenants.read', module: 'tenants' },
    ]);

    const userSchema = buildDynamicVxeFormSchema({
      resource: 'public.profiles',
      row: {
        email: 'admin@operon.com',
        full_name: 'Admin User',
        id: 'u_1',
        workspaces: [
          {
            role_name: 'owner',
            tenant_id: 't_100',
            tenant_name: 'Acme HQ',
            tenant_slug: 'acme',
          },
        ],
      },
      translate: (k) => k,
    });

    expect(userSchema.relations).toHaveLength(1);
    expect(userSchema.relations[0]?.field).toBe('workspaces');
    expect(userSchema.relations[0]?.targetResource).toBe('public.tenants');
    expect(userSchema.relations[0]?.rows[0]).toMatchObject({
      role_name: 'owner',
      tenant_id: 't_100',
      tenant_name: 'Acme HQ',
      tenant_slug: '/acme',
    });

    const productSchema = buildDynamicVxeFormSchema({
      resource: 'commerce.products',
      row: {
        id: 'prod_1',
        name: 'Cloud Browser Pro',
        product_type: 'subscription',
        variants: [
          {
            is_active: true,
            name: 'Monthly 100 Profiles',
            price_credits: 200,
            sku: 'CB-PRO-100',
            stock_available: 99,
          },
        ],
        visibility: 'public',
      },
      translate: (k) => k,
    });

    expect(productSchema.relations).toHaveLength(1);
    expect(productSchema.relations[0]?.field).toBe('variants');
    expect(productSchema.relations[0]?.targetResource).toBe(
      'commerce.product_variants',
    );
    expect(productSchema.relations[0]?.rows[0]).toMatchObject({
      name: 'Monthly 100 Profiles',
      price_credits: 200,
      sku: 'CB-PRO-100',
    });
  });

  it('builds Supabase Studio Create Mode schema (hiding uuid/system fields while keeping text PKs with insertable: true)', () => {
    const workflowCreate = buildDynamicVxeCreateSchema({
      resource: 'automation.workflows',
      translate: (k) => k,
    });

    expect(workflowCreate.rls.canInsert.allowed).toBe(true);
    const wfFields = workflowCreate.fields.map((f) => f.field);
    expect(wfFields).toEqual(['name', 'description', 'version', 'status']);
    expect(wfFields).not.toContain('id');
    expect(wfFields).not.toContain('created_at');
    expect(wfFields).not.toContain('nodeCount');
    expect(workflowCreate.initialData).toEqual({
      description: '',
      name: '',
      status: 'draft',
      version: '1.0.0',
    });

    // Text PK tables (`public.permissions`, `billing.plans`, `public.system_plugins`, `billing.payment_gateways`) include `id` first
    const permCreate = buildDynamicVxeCreateSchema({
      resource: 'public.permissions',
      translate: (k) => k,
    });
    expect(permCreate.fields.map((f) => f.field)).toEqual([
      'id',
      'module',
      'description',
    ]);
    expect(permCreate.initialData.module).toBe('core-iam');

    // Append-only ledgers deny canInsert
    const auditCreate = buildDynamicVxeCreateSchema({
      resource: 'public.audit_logs',
      translate: (k) => k,
    });
    expect(auditCreate.rls.canInsert.allowed).toBe(false);
  });

  it('validates required fields, auto-attaches tenant_id, and executes PostgREST POST in executeDynamicSupabaseInsert', async () => {
    expect(validateRequiredInsertFields({}, 'automation.workflows')).toEqual([
      'name',
    ]);

    await expect(
      executeDynamicSupabaseInsert('automation.workflows', { name: '   ' }),
    ).rejects.toThrow(/Missing required fields: name/);

    const payload = computeInsertPayload(
      {
        description: '  Auto sync orders  ',
        name: '  TikTok Order Sync  ',
        status: 'draft',
        version: '1.0.0',
      },
      'automation.workflows',
    );
    expect(payload).toEqual({
      description: 'Auto sync orders',
      name: 'TikTok Order Sync',
      status: 'draft',
      tenant_id: 'tenant_active_01',
      version: '1.0.0',
    });

    mockSupabaseRequest.mockResolvedValueOnce([
      {
        ...payload,
        id: 'wf_new_01',
      },
    ]);

    const res = await executeDynamicSupabaseInsert('automation.workflows', {
      description: 'Auto sync orders',
      name: 'TikTok Order Sync',
      status: 'draft',
      version: '1.0.0',
    });

    expect(res.createdRow.id).toBe('wf_new_01');
    expect(res.insertPayload.tenant_id).toBe('tenant_active_01');
    expect(mockSupabaseRequest).toHaveBeenCalledWith(
      '/rest/v1/workflows',
      expect.objectContaining({
        body: JSON.stringify(payload),
        method: 'POST',
        preferRepresentation: true,
        schema: 'automation',
      }),
    );
  });
});
