# Spec: UI Information Deduplication & Zero-Redundancy Component Density (`SPEC-ui-information-deduplication`)

- **Version**: `1.0.0`
- **Status**: `Approved — Enterprise Standard`
- **Scope**: `@operon/admin-web` (`apps/web-admin/src/views/**`)

---

## 1. Objective

Enforce an enterprise-grade **"One Fact, One Place per Viewport" (Zero-Redundancy Information Architecture)** across `@operon/admin-web` dashboards, module overviews, workspace detail tabs, and multi-tab headers.

### Enterprise Design Resolutions

1. **Executive Analytics KPI Cards (`views/dashboard/analytics/index.vue`)**:
   - Each of the 4 top KPI cards uses a 2-row high-signal layout:
     - **Row 1**: Metric title + muted icon container.
     - **Row 2**: Single primary value (`text-xl sm:text-2xl font-bold`) on the left + single semantic status pill on the right.
   - Eliminate adjacent duplicate numbers (`3 ● 3 Active`), synonymous status words (`Ready ● Online`), and 3rd-line chart echoes (`2 Pro plan • 1 Free tier`, `8 Core Kernel • Extension Modules`) that duplicate `PlansChart` and `PluginsChart` directly below.
   - Remove the duplicate `Desktop Bridge (:8765)` row from the `Infrastructure Services` list (already represented by the `Fleet Bridge :8765` KPI card) and remove the duplicate count in the `PluginsChart` card subtitle.

2. **Unified Actionable Overview Grids (`views/system/overview/index.vue` & `views/automation/overview/index.vue`)**:
   - Eliminate the double-row duplication where Row 1 (4 static KPI cards) and Row 2 (5–6 clickable Module cards) repeated the exact same numbers and subtext.
   - **`views/system/overview/index.vue`**: Consolidate into a single 6-card interactive Governance KPI Grid (`Plugins`, `Plans`, `Users`, `Roles`, `Subscriptions` with MRR, `Audit Logs`) above the Recent Activity panels.
   - **`views/automation/overview/index.vue`**: Consolidate into a single 5-card interactive Automation & Fleet KPI Grid (`Workflows`, `Runs`, `Devices`, `Browsers`, `Proxies`) with a compact Loopback Daemon status pill (`:8765 ● Online / Standby`) in the header action bar.

3. **Workspace Detail Hero vs. Tab Separation (`views/tenants/detail.vue` & sub-components)**:
   - **`WorkspaceHero`**: Distinguish between account status (`Active` / `Suspended` on the left) and active CLI session context (`Selected Workspace` badge on the right) so two identical `Active` badges never appear simultaneously.
   - **`WorkspaceOverviewTab`**: Remove the 3 boxes (`Workspace Name`, `Slug`, `Created At`) that duplicate `WorkspaceHero` 40px above, retaining a 3-column operational summary (`Tenant ID` with copy action, `Service Plan` with monthly price, `Device Infrastructure` with fleet link). Use distinct `:description` (`delete_modal_warning`) and `:button-text` (`archive_or_delete`) on `DangerZoneCard`.
   - **`WorkspaceUsageTab`**: Remove the 3rd duplicate of Plan Name & Price, keeping a compact billing period indicator alongside the 4 quota progress cards.
   - **`WorkspaceMembersTab`**: Remove the duplicate `· {count}` suffix from the inner tab heading (already displayed in the `Members · {count}` tab trigger).

4. **Multi-Tab Page Headers (`views/commerce/admin/index.vue` & `views/system/roles/index.vue`)**:
   - Remove the top `<h1>` count `<Badge>` on multi-tab pages where the tab buttons immediately below already display per-tab counts. Keep the `<h1>` count `<Badge>` on single-table pages (where VXE `pagerConfig.autoHidden` hides the pager on single-page datasets).

---

## 2. Tech Stack

- **Framework**: Vue 3.5 (`<script setup lang="ts">`)
- **UI Primitives**: `@operon/vue-ui` (`Badge`, `Button`, `Tabs`), `@operon-core/shadcn-ui` (`DonutChart`)
- **I18n**: `vue-i18n` (`apps/web-admin/src/locales/langs/{en-US,vi-VN}/page.json`)
- **Testing**: Vitest (`vitest run`)

---

## 3. Commands

```bash
pnpm --filter @operon/admin-web test:unit
pnpm check:i18n
pnpm oxlint
pnpm --filter @operon/admin-web typecheck
```

---

## 4. Project Structure

```text
apps/web-admin/src/
├── views/
│   ├── dashboard/analytics/
│   │   ├── index.vue                            → 2-row high-signal KPI cards & deduplicated Infrastructure list
│   │   └── __tests__/analytics-dedup.test.ts    → Unit tests for zero-redundancy KPI & overview rendering
│   ├── system/
│   │   ├── overview/index.vue                   → Unified 6-card Governance KPI Grid
│   │   └── roles/index.vue                      → Deduplicated multi-tab header
│   ├── automation/
│   │   └── overview/index.vue                   → Unified 5-card Automation KPI Grid + header Loopback pill
│   ├── commerce/
│   │   └── admin/index.vue                      → Deduplicated multi-tab header
│   └── tenants/
│       └── components/
│           ├── workspace-hero.vue               → Distinct "Selected Workspace" badge vs. "Active" status
│           ├── workspace-overview-tab.vue       → 3-column operational summary & distinct DangerZone copy
│           ├── workspace-members-tab.vue        → Clean inner heading without duplicate count
│           └── workspace-usage-tab.vue          → Quota progress grid without 3rd duplicate Plan card
```

---

## 5. Code Style

```vue
<!-- Enterprise 2-Row KPI Card: Single Primary Metric + Semantic Status Pill -->
<div class="rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 shadow-xs">
  <div class="flex items-center justify-between gap-2">
    <span class="truncate text-xs font-medium text-muted-foreground sm:text-sm">
      {{ $t('page.analytics.total_workspaces') }}
    </span>
    <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
      <Building2 class="size-4" />
    </span>
  </div>
  <div class="mt-2.5 flex items-baseline justify-between gap-2">
    <span class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
      {{ analyticsData.tenants.total }}
    </span>
    <span class="inline-flex items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
      <span class="size-1.5 shrink-0 rounded-full bg-success"></span>
      <span>{{ activeWorkspacesLabel }}</span>
    </span>
  </div>
</div>
```

---

## 6. Testing Strategy

- **Unit Tests (`vitest`)**: `apps/web-admin/src/views/dashboard/analytics/__tests__/analytics-dedup.test.ts` verifying:
  - Analytics KPI cards do not render duplicate adjacent counts (`3 3`) or duplicate chart breakdowns (`Pro plan`, `Free tier`).
  - `WorkspaceHero` renders `Selected Workspace` instead of a second `Active` badge when `isCurrentActive` is true.
  - `WorkspaceOverviewTab` renders the 3 operational cards (`Tenant ID`, `Service Plan`, `Device Infrastructure`) without repeating `Workspace Name`, `Slug`, or `Created At`, and passes distinct `description` vs. `buttonText` to `DangerZoneCard`.
- **Quality Gates**: `pnpm check:i18n`, `pnpm oxlint`, `pnpm --filter @operon/admin-web typecheck`.

---

## 7. Boundaries

- **Always**: Preserve 7-tier typography tokens (`text-2xs` to `text-2xl`), maintain `en-US` / `vi-VN` parity, keep API contracts intact.
- **Ask first**: Removing chart components or altering router paths.
- **Never**: Render duplicate numbers inside a single KPI card, repeat identical KPI cards and module cards in consecutive rows, or commit local workstation paths.

---

## 8. Success Criteria

- [x] **SC-1**: `views/dashboard/analytics/index.vue` KPI cards follow the 2-row single-value enterprise layout with zero chart/list duplication.
- [x] **SC-2**: `views/system/overview/index.vue` and `views/automation/overview/index.vue` use a single unified grid of actionable KPI module cards without a redundant top KPI strip.
- [x] **SC-3**: `views/tenants/detail.vue` (`WorkspaceHero`, `WorkspaceOverviewTab`, `WorkspaceUsageTab`, `WorkspaceMembersTab`) displays each workspace attribute once per viewport.
- [x] **SC-4**: `views/commerce/admin/index.vue` and `views/system/roles/index.vue` remove duplicate header count badges above multi-tab bars.
- [x] **SC-5**: All unit tests, `check:i18n`, `oxlint`, and `typecheck` pass with 0 errors.
