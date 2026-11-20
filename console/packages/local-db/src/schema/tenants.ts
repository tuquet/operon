import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 1. Tenants (Cached Multi-Tenant Accounts)
export const tenants = sqliteTable(
  'tenants',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    tier: text('tier', { enum: ['free', 'pro', 'enterprise'] })
      .default('free')
      .notNull(),
    maxProfiles: integer('max_profiles').default(10).notNull(),
    maxWorkflows: integer('max_workflows').default(50).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_tenants_slug').on(table.slug)],
);

// 2. Tenant Members (Local membership cache)
export const tenantMembers = sqliteTable(
  'tenant_members',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    email: text('email').notNull(),
    role: text('role', { enum: ['owner', 'admin', 'member', 'viewer'] })
      .default('member')
      .notNull(),
    joinedAt: text('joined_at').notNull(),
  },
  (table) => [
    index('idx_tenant_members_tenant').on(table.tenantId),
    index('idx_tenant_members_user').on(table.userId),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type TenantMember = typeof tenantMembers.$inferSelect;
export type NewTenantMember = typeof tenantMembers.$inferInsert;
