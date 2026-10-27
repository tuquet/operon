import type { Tenant } from './tenant';

import { $t } from '@operon/locales';

import { supabaseRequest } from './supabase-client';

export type TenantDetailTab = 'audit' | 'members' | 'overview' | 'usage';

export interface WorkspaceMemberRole {
  display_name: string;
  id: string;
  name: 'admin' | 'member' | 'owner' | 'viewer';
}

export interface WorkspaceMember {
  avatar_url?: null | string;
  email: string;
  full_name?: null | string;
  id: string;
  joined_at: string;
  role: WorkspaceMemberRole;
  status: 'active' | 'invited' | 'suspended';
  user_id: string;
}

export interface WorkspaceSubscriptionPlan {
  description?: null | string;
  id: string;
  max_members: number;
  max_monthly_runs: number;
  max_storage_mb: number;
  name: string;
  price_monthly_usd: number;
}

export interface WorkspaceSubscription {
  cancel_at_period_end: boolean;
  current_period_end: string;
  current_period_start: string;
  id: string;
  plan: WorkspaceSubscriptionPlan;
  plan_id: string;
  status: string;
  tenant_id: string;
}

export interface WorkspaceUsageQuota {
  max_devices: number;
  max_members: number;
  max_monthly_runs: number;
  max_storage_mb: number;
  plan_name: string;
  used_devices: number;
  used_members: number;
  used_monthly_runs: number;
  used_storage_mb: number;
}

export interface TenantAuditLog {
  action: string;
  actor_email?: null | string;
  actor_id?: null | string;
  actor_name?: null | string;
  created_at: string;
  entity_id: string;
  entity_type: string;
  id: number | string;
}

export interface WorkspaceDetailData {
  active_devices_count: number;
  members: WorkspaceMember[];
  quota: WorkspaceUsageQuota;
  subscription: null | WorkspaceSubscription;
  tenant: Tenant;
  total_devices_count: number;
}

export interface InviteWorkspaceMemberInput {
  email: string;
  invitedBy: string;
  roleId: string;
  tenantId: string;
}

export interface UpdateWorkspaceMemberRoleInput {
  memberId: string;
  roleId: string;
  tenantId: string;
}

export interface UpdateWorkspaceInfoInput {
  name?: string;
  slug?: string;
}

function getDefaultOwnerRole(): WorkspaceMemberRole {
  return {
    display_name: $t('common.roleOwner'),
    id: '00000000-0000-0000-0000-000000000001',
    name: 'owner',
  };
}

function getDefaultMemberRole(): WorkspaceMemberRole {
  return {
    display_name: $t('common.roleMember'),
    id: '00000000-0000-0000-0000-000000000003',
    name: 'member',
  };
}

/**
 * Compute SHA-256 hash string from raw input token using Web Crypto API.
 */
export async function hashToken(rawToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawToken);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = [...new Uint8Array(hashBuffer)];
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Maps raw tenant_members records joined with profiles and member_roles to WorkspaceMember objects.
 */
export function mapRawMembersToWorkspaceMembers(
  rawRows: any[],
  ownerUserId?: null | string,
): WorkspaceMember[] {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return [];
  }

  return rawRows.map((m: any) => {
    let resolvedRole: WorkspaceMemberRole = getDefaultMemberRole();

    const assignedRoles: any[] = Array.isArray(m.member_roles)
      ? m.member_roles.map((mr: any) => mr.roles).filter(Boolean)
      : [];

    if (assignedRoles.length > 0) {
      // Preference order: owner > admin > member > viewer
      const rolePriority: Record<string, number> = {
        admin: 2,
        member: 1,
        owner: 3,
        viewer: 0,
      };

      const sortedRoles = assignedRoles.toSorted((a, b) => {
        return (rolePriority[b.name] ?? 0) - (rolePriority[a.name] ?? 0);
      });

      const topRole = sortedRoles[0];
      resolvedRole = {
        display_name: topRole.display_name || topRole.name,
        id: topRole.id,
        name: topRole.name as WorkspaceMemberRole['name'],
      };
    } else if (ownerUserId && m.user_id === ownerUserId) {
      resolvedRole = getDefaultOwnerRole();
    }

    const email = m.profiles?.email || 'member@operon.com';
    const fullName = m.profiles?.full_name || email;

    return {
      avatar_url: m.profiles?.avatar_url || null,
      email,
      full_name: fullName,
      id: m.id,
      joined_at: m.joined_at,
      role: resolvedRole,
      status: m.status || 'active',
      user_id: m.user_id,
    };
  });
}

/**
 * Computes usage quotas from real subscription, plans, and usage meters.
 */
export function computeWorkspaceQuota(params: {
  activeDevicesCount: number;
  defaultFreePlan?: null | WorkspaceSubscriptionPlan;
  membersCount: number;
  subscription?: null | WorkspaceSubscription;
  usageMeters?: Array<{ current_value: number; metric_name: string }> | null;
}): WorkspaceUsageQuota {
  const plan = params.subscription?.plan ||
    params.defaultFreePlan || {
      description: 'Default Free Tier',
      id: 'free',
      max_members: 2,
      max_monthly_runs: 1000,
      max_storage_mb: 500,
      name: 'Free Starter',
      price_monthly_usd: 0,
    };

  let maxDevices = 3;
  if (plan.id === 'enterprise') {
    maxDevices = 100;
  } else if (plan.id === 'pro') {
    maxDevices = 25;
  }

  const meters = Array.isArray(params.usageMeters) ? params.usageMeters : [];
  const usedStorage =
    meters.find((m) => m.metric_name === 'storage_mb')?.current_value || 0;
  const usedRuns =
    meters.find((m) => m.metric_name === 'monthly_runs')?.current_value || 0;

  return {
    max_devices: maxDevices,
    max_members: plan.max_members || 2,
    max_monthly_runs: plan.max_monthly_runs || 1000,
    max_storage_mb: plan.max_storage_mb || 500,
    plan_name: plan.name,
    used_devices: params.activeDevicesCount,
    used_members: params.membersCount,
    used_monthly_runs: usedRuns,
    used_storage_mb: usedStorage,
  };
}

/**
 * Fetch full workspace detail data with real telemetry from Cloud.
 */
export async function getWorkspaceDetail(
  tenantId: string,
): Promise<WorkspaceDetailData> {
  const encodedId = encodeURIComponent(tenantId);

  // 1. Fetch Tenant record
  const tenants = await supabaseRequest<Tenant[]>(
    `/rest/v1/tenants?id=eq.${encodedId}&select=*`,
  );
  const tenant = tenants[0];
  if (!tenant) {
    throw new Error($t('common.workspaceNotFoundOrDenied'));
  }

  // 2. Fetch Members & Profiles & Member Roles concurrently with Devices and Subscriptions
  const [
    rawMembersResult,
    devicesResult,
    subscriptionResult,
    usageMetersResult,
  ] = await Promise.allSettled([
    supabaseRequest<any[]>(
      `/rest/v1/tenant_members?tenant_id=eq.${encodedId}&select=id,status,joined_at,user_id,profiles(id,full_name,email,avatar_url),member_roles(role_id,roles(id,name,display_name))`,
    ),
    supabaseRequest<any[]>(
      `/rest/v1/devices?tenant_id=eq.${encodedId}&select=id,status`,
      { schema: 'workers' },
    ),
    supabaseRequest<any[]>(
      `/rest/v1/subscriptions?tenant_id=eq.${encodedId}&select=id,tenant_id,plan_id,status,current_period_start,current_period_end,cancel_at_period_end,plans:plan_id(*)`,
      { schema: 'billing' },
    ),
    supabaseRequest<any[]>(
      `/rest/v1/usage_meters?tenant_id=eq.${encodedId}&select=metric_name,current_value`,
      { schema: 'billing' },
    ),
  ]);

  // Parse members
  const rawMembers =
    rawMembersResult.status === 'fulfilled' &&
    Array.isArray(rawMembersResult.value)
      ? rawMembersResult.value
      : [];
  const members = mapRawMembersToWorkspaceMembers(
    rawMembers,
    tenant.created_by,
  );

  // Parse devices count
  const rawDevices =
    devicesResult.status === 'fulfilled' && Array.isArray(devicesResult.value)
      ? devicesResult.value
      : [];
  const total_devices_count = rawDevices.length;
  const active_devices_count = rawDevices.filter(
    (d: any) => d.status === 'online',
  ).length;

  // Parse subscription
  let subscription: null | WorkspaceSubscription = null;
  const rawSubs =
    subscriptionResult.status === 'fulfilled' &&
    Array.isArray(subscriptionResult.value)
      ? subscriptionResult.value
      : [];

  if (rawSubs.length > 0 && rawSubs[0]?.plans) {
    const s = rawSubs[0];
    subscription = {
      cancel_at_period_end: !!s.cancel_at_period_end,
      current_period_end: s.current_period_end,
      current_period_start: s.current_period_start,
      id: s.id,
      plan: s.plans,
      plan_id: s.plan_id,
      status: s.status,
      tenant_id: s.tenant_id,
    };
  }

  // Parse default free plan if no subscription
  let defaultFreePlan: null | WorkspaceSubscriptionPlan = null;
  if (!subscription) {
    try {
      const freePlans = await supabaseRequest<WorkspaceSubscriptionPlan[]>(
        `/rest/v1/plans?id=eq.free&select=*`,
        { schema: 'billing' },
      );
      if (freePlans && freePlans.length > 0) {
        defaultFreePlan = freePlans[0] ?? null;
      }
    } catch {
      // Fallback in computeWorkspaceQuota
    }
  }

  // Parse usage meters
  const usageMeters =
    usageMetersResult.status === 'fulfilled' &&
    Array.isArray(usageMetersResult.value)
      ? usageMetersResult.value
      : [];

  const quota = computeWorkspaceQuota({
    activeDevicesCount: active_devices_count,
    defaultFreePlan,
    membersCount: members.length,
    subscription,
    usageMeters,
  });

  return {
    active_devices_count,
    members,
    quota,
    subscription,
    tenant,
    total_devices_count,
  };
}

/**
 * Fetch tenant audit logs from public.audit_logs.
 */
export async function listTenantAuditLogs(
  tenantId: string,
  limit = 50,
): Promise<TenantAuditLog[]> {
  const encodedId = encodeURIComponent(tenantId);
  const rows = await supabaseRequest<any[]>(
    `/rest/v1/audit_logs?tenant_id=eq.${encodedId}&select=id,action,entity_type,entity_id,created_at,actor_id,profiles(id,full_name,email)&order=created_at.desc&limit=${limit}`,
  );

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((r: any) => ({
    action: r.action,
    actor_email: r.profiles?.email || null,
    actor_id: r.actor_id || null,
    actor_name: r.profiles?.full_name || null,
    created_at: r.created_at,
    entity_id: String(r.entity_id || ''),
    entity_type: r.entity_type,
    id: r.id,
  }));
}

/**
 * Fetch available system roles (owner, admin, member, viewer).
 */
export async function listAvailableRoles(): Promise<WorkspaceMemberRole[]> {
  const rows = await supabaseRequest<WorkspaceMemberRole[]>(
    `/rest/v1/roles?select=id,name,display_name&is_system=eq.true&order=id.asc`,
  );
  return Array.isArray(rows) ? rows : [];
}

/**
 * Invite a member to Workspace via public.tenant_invitations.
 */
export async function inviteWorkspaceMember(
  params: InviteWorkspaceMemberInput,
): Promise<void> {
  const rawToken = crypto.randomUUID().replaceAll('-', '');
  const token_hash = await hashToken(rawToken);

  const expDate = new Date();
  expDate.setDate(expDate.getDate() + 7);

  await supabaseRequest('/rest/v1/tenant_invitations', {
    body: JSON.stringify({
      email: params.email,
      expires_at: expDate.toISOString(),
      invited_by: params.invitedBy,
      role_id: params.roleId,
      status: 'pending',
      tenant_id: params.tenantId,
      token_hash,
    }),
    method: 'POST',
  });
}

/**
 * Update member's role in public.member_roles.
 * Safely inserts the new role first (preventing 0-role orphaned state on network disruption)
 * and then purges obsolete roles, propagating database guard exceptions (e.g. last owner protection).
 */
export async function updateWorkspaceMemberRole(
  params: UpdateWorkspaceMemberRoleInput,
): Promise<void> {
  const encodedMemberId = encodeURIComponent(params.memberId);
  const encodedRoleId = encodeURIComponent(params.roleId);

  // 1. Assign/Upsert new role first with merge-duplicates so caller never drops to 0 roles
  await supabaseRequest('/rest/v1/member_roles', {
    body: JSON.stringify({
      member_id: params.memberId,
      role_id: params.roleId,
      tenant_id: params.tenantId,
    }),
    headers: {
      Prefer: 'resolution=merge-duplicates',
    },
    method: 'POST',
  });

  // 2. Remove previous roles assigned to this member within this tenant (excluding the new one)
  await supabaseRequest(
    `/rest/v1/member_roles?member_id=eq.${encodedMemberId}&role_id=neq.${encodedRoleId}`,
    {
      method: 'DELETE',
    },
  );
}

/**
 * Remove a member from the workspace (public.tenant_members).
 */
export async function removeWorkspaceMember(memberId: string): Promise<void> {
  await supabaseRequest(
    `/rest/v1/tenant_members?id=eq.${encodeURIComponent(memberId)}`,
    {
      method: 'DELETE',
    },
  );
}

/**
 * Update workspace info (Name, Slug).
 */
export async function updateWorkspaceInfo(
  tenantId: string,
  data: UpdateWorkspaceInfoInput,
): Promise<Tenant> {
  const payload: Record<string, any> = {};
  if (data.name) payload.name = data.name;
  if (data.slug) payload.slug = data.slug;

  const result = await supabaseRequest<Tenant[]>(
    `/rest/v1/tenants?id=eq.${encodeURIComponent(tenantId)}`,
    {
      body: JSON.stringify(payload),
      method: 'PATCH',
      preferRepresentation: true,
    },
  );

  const updatedItem = Array.isArray(result) ? result[0] : (result as any);
  if (!updatedItem) {
    throw new Error($t('common.updateWorkspaceFailed'));
  }
  return updatedItem;
}

/**
 * Delete or archive workspace.
 */
export async function deleteWorkspace(tenantId: string): Promise<void> {
  try {
    await supabaseRequest(
      `/rest/v1/tenants?id=eq.${encodeURIComponent(tenantId)}`,
      {
        method: 'DELETE',
      },
    );
  } catch {
    // If foreign key constraint prevents hard delete, archive instead
    await supabaseRequest(
      `/rest/v1/tenants?id=eq.${encodeURIComponent(tenantId)}`,
      {
        body: JSON.stringify({ status: 'archived' }),
        method: 'PATCH',
      },
    );
  }
}

export const workspaceApi = {
  delete: deleteWorkspace,
  getDetail: getWorkspaceDetail,
  inviteMember: inviteWorkspaceMember,
  listAuditLogs: listTenantAuditLogs,
  listRoles: listAvailableRoles,
  removeMember: removeWorkspaceMember,
  updateInfo: updateWorkspaceInfo,
  updateMemberRole: updateWorkspaceMemberRole,
};
