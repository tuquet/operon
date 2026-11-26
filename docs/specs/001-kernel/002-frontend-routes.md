---
id: KERNEL-002
title: Host Shell Frontend Routes
app: console
status: implemented
created: 2026-11-26
updated: 2026-11-26
depends_on: [KERNEL-001]
---

# KERNEL-002: Host Shell Frontend Routes

## 1. Goal & Scope

Inventory and contract for all frontend routes registered in `console/apps/shell/src/router/routes/` (`core.ts`, `modules/*.ts`).

## 2. Core & Fallback Routes (`core.ts`)

| Route | Name | Visibility / Access | Target |
| :--- | :--- | :--- | :--- |
| `/` | `Root` | Redirects to `preferences.app.defaultHomePath \|\| DEFAULT_HOME_PATH` | `BasicLayout` |
| `/profile` | `Profile` | `hideInMenu: true`, `hideInBreadcrumb: true` | `views/_core/profile/index.vue` |
| `/welcome` | `Welcome` | `hideInMenu: true`, `ignoreAccess: true` | `views/_core/welcome/index.vue` |
| `/:path(.*)*` | `FallbackNotFound` | `hideInMenu: true`, `hideInTab: true` | `views/_core/fallback/not-found.vue` |

## 3. Visible Sidebar Modules (`modules/*.ts`)

| Path | Name | Order | Authority / Gate | Target / Micro-App |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` → `/dashboard/overview` | `Dashboard` / `Overview` | `-1` | `platform: 'all'`, `affixTab: true` | `views/dashboard/overview/index.vue` |
| `/dashboard/analytics` | `Analytics` | `-1` | `platform: 'all'`, `affixTab: true` | `views/dashboard/analytics/index.vue` |
| `/browsers` → `/browsers/index` | `Browsers` / `BrowsersIndex` | `10` | `['superadmin', 'local_operator']`, `hideChildrenInMenu: true` | `AutomationBrowsers` (`@operon/automation`) + `setupLocales()` |
| `/tasks` → `/tasks/index` | `Tasks` / `TasksIndex` | `20` | `['superadmin', 'local_operator']`, `hideChildrenInMenu: true` | `PlaygroundTasks` (`@operon/playground`) + `setupLocales()` |
| `/tenants` | `TenantsRoot` | — | `['superadmin', 'tenants:read']`, `requiresCloud: true`, `hideChildrenInMenu: true` | `@operon/tenants` |
| `/system` | `System` | — | `requiresCloud: true` | `@operon/system` |

## 4. Hidden Micro-App Mounts (`hideInMenu: true`)

| Path | Name | Plugin | Target / Notes |
| :--- | :--- | :--- | :--- |
| `/automation/*` | `Automation` | `operon` | `@operon/automation` (retains direct URLs such as `/automation/browsers`) |
| `/playground/*` | `Playground` | `operon` | `@operon/playground` |

## 5. Checks

- `pnpm --dir console --filter @operon/shell typecheck`
- `node scripts/local-ci.mjs console`
