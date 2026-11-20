import type { TenantPlan, TenantStatus } from '@operon/constants';

import { STORAGE_KEYS, TENANT_PLAN, TENANT_STATUS } from '@operon/constants';

import { hasCloudAuth, supabaseRequest } from './supabase-client';

export { TENANT_PLAN, TENANT_STATUS };
export type { TenantPlan, TenantStatus };

export interface Tenant {
  avatar_url: null | string;
  created_at: string;
  created_by: null | string;
  id: string;
  metadata?: {
    plan?: string | TenantPlan;
    region?: string;
    [key: string]: any;
  };
  name: string;
  slug: string;
  status: TenantStatus;
  updated_at: string;
}

export interface CreateTenantInput {
  name: string;
  plan?: string;
  slug: string;
}

export interface UpdateTenantInput {
  metadata?: Record<string, any>;
  name?: string;
  plan?: string;
  slug?: string;
  status?: TenantStatus;
}

const ACTIVE_TENANT_KEY = STORAGE_KEYS.ACTIVE_TENANT_ID;

export function getActiveTenantId(): string {
  return localStorage.getItem(ACTIVE_TENANT_KEY) || '';
}

export function setActiveTenantId(tenantId: string) {
  localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
}

/**
 * Fetch all tenants from Supabase Cloud
 */
export async function listTenants(): Promise<Tenant[]> {
  if (!hasCloudAuth()) {
    return [];
  }
  return supabaseRequest<Tenant[]>(
    '/rest/v1/tenants?select=*&order=created_at.desc',
  );
}

/**
 * Create a new workspace / tenant
 */
export async function createTenant(data: CreateTenantInput): Promise<Tenant> {
  const payload = {
    metadata: {
      plan: data.plan || TENANT_PLAN.PRO,
      region: 'ap-southeast-1',
    },
    name: data.name,
    slug: data.slug,
    status: TENANT_STATUS.ACTIVE,
  };

  const result = await supabaseRequest<Tenant | Tenant[]>('/rest/v1/tenants', {
    body: JSON.stringify(payload),
    method: 'POST',
    preferRepresentation: true,
  });

  const created = Array.isArray(result) ? result[0] : result;
  if (!created) {
    throw new Error('Failed to create tenant: empty response from server');
  }

  return created;
}

/**
 * Update an existing Cloud workspace / tenant
 */
export async function updateTenant(
  id: string,
  data: UpdateTenantInput,
): Promise<Tenant> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (data.name !== undefined) payload.name = data.name;
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.status !== undefined) payload.status = data.status;
  if (data.plan !== undefined || data.metadata !== undefined) {
    payload.metadata = {
      ...data.metadata,
      ...(data.plan ? { plan: data.plan } : {}),
    };
  }

  const result = await supabaseRequest<Tenant | Tenant[]>(
    `/rest/v1/tenants?id=eq.${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(payload),
      method: 'PATCH',
      preferRepresentation: true,
    },
  );

  const updated = Array.isArray(result) ? result[0] : result;
  if (!updated) {
    throw new Error('Failed to update tenant: empty response from server');
  }
  return updated;
}

/**
 * Permanently delete a Cloud workspace / tenant
 */
export async function deleteTenant(id: string): Promise<void> {
  await supabaseRequest(
    `/rest/v1/tenants?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  );
}

export const tenantsApi = {
  create: createTenant,
  delete: deleteTenant,
  list: listTenants,
  update: updateTenant,
};
