/**
 * Workspace / Tenant Lifecycle Status (`public.tenants.status`)
 */
export const TENANT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  SUSPENDED: 'suspended',
} as const;

export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS];

export const TENANT_STATUS_VALUES = Object.values(
  TENANT_STATUS,
) as readonly TenantStatus[];

/**
 * Workspace / Tenant Service Plan Tier (`public.tenants.metadata.plan`)
 */
export const TENANT_PLAN = {
  ENTERPRISE: 'enterprise',
  FREE: 'free',
  PRO: 'pro',
} as const;

export type TenantPlan = (typeof TENANT_PLAN)[keyof typeof TENANT_PLAN];

export const TENANT_PLAN_VALUES = Object.values(
  TENANT_PLAN,
) as readonly TenantPlan[];

/**
 * Workspace Member Invitation Status (`public.tenant_invitations.status`)
 */
export const INVITATION_STATUS = {
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  PENDING: 'pending',
  REVOKED: 'revoked',
} as const;

export type InvitationStatus =
  (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

export const INVITATION_STATUS_VALUES = Object.values(
  INVITATION_STATUS,
) as readonly InvitationStatus[];
