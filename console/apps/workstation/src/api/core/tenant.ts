import type { TenantPlan, TenantStatus } from '@operon/constants';

import { STORAGE_KEYS, TENANT_PLAN, TENANT_STATUS } from '@operon/constants';

import { supabaseRequest } from './supabase-client';

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

export const tenantsApi = {
  create: createTenant,
  list: listTenants,
};
