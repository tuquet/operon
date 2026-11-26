---
id: BROWSERS-003
title: Automation Browsers Console UI (/automation/browsers)
app: console
status: implemented
created: 2026-11-26
updated: 2026-11-26
depends_on: [BROWSERS-001, TENANT-001, KERNEL-001]
---

# BROWSERS-003: Automation Browsers Console UI (`/automation/browsers`)

## 1. Goal & Scope

Define the `micro-app` UI at `/automation/browsers` (`console/apps/automation/src/views/browsers.vue`, `useBrowsersStore`), consuming `operon` daemon endpoints from [BROWSERS-001](./001-crud.md) via shared `@operon/common-ui` `DataTable`.

## 2. States, Scoping & Real-Time Sync

- **Heartbeat Gates:**
  - `bridge.isInitialChecking`: renders 4 KPI skeletons + table row skeletons.
  - `!bridge.isHealthy`: renders Daemon Offline card (`common.refresh` triggers `bridge.checkNow()`), disabling header mutations (`Refresh`, `Auto-detect`, `Import CSV`, `New profile`).
- **Tenant & Scope Control:**
  - Header toggle switches `scopeMode` between `tenant` (`Current tenant`, default) and `all` (`All tenants`).
  - Switching active `tenant` in `kernel` or toggling `scopeMode` clears row selection and resets/refreshes data (and displays each profile's `tenantId` badge on the `Profile` cell in `all` mode).
- **SSE Auto-Sync:** Subscribes to `http://127.0.0.1:<daemonPort>/api/v1/events` and triggers a 150ms debounced silent refresh on `browser_changed`, `browser_online`, `browser_offline`, `settings_updated`, and `tenant_switched`.

## 3. DataTable, KPI Presets & Filter Toolbar

Built on `@operon/common-ui` `DataTable` (`enable-row-selection`, `interactive-rows`, client-side filtering/sorting/pagination from loaded `store.items`):

- **Header Action Group:** `Scope Toggle` (`Current tenant` / `All tenants`), `Auto-detect` (`POST /browsers/auto-detect`), `Refresh`, `Import CSV`, and `+ New profile`.
- **KPI Preset Cards (`BrowsersTableMetrics`):** 4 clickable summary cards computed over current loaded scope (`Total profiles`, `Running now`, `With proxy`, `Direct route`). Clicking a card sets the matching filter preset; clicking again (or clicking `Total profiles`) clears filters.
- **Toolbar (`BrowsersTableToolbar`):**
  - Search input matching `name`, `id`, `groupName`, `proxy`, or any entry in `tags` (keyboard shortcut `/` focuses search outside editable inputs).
  - 3 faceted filters (`DataTableFacetedFilter`): `Status` (`online` / `offline`), `Network` (`proxied` / `direct`), `OS Platform` (`windows` / `macos` / `linux`), plus conditional `Reset` button.
  - View controls: `DataTableDensityToggle` (`Compact` / `Default` / `Comfortable`) and `DataTableViewOptions` (`Columns` toggle).
- **Table Columns (`columns.ts`):**
  - Selection checkbox (header select-all + per-row checkbox, click stopped from triggering row inspect).
  - `Profile` (clickable `name` opens Detail Sheet, `Default` badge, `tenantId` badge when `scope === 'all'`, `id • groupName`, plus compact `#tag` badges up to 3 tags and `+N` overflow).
  - `Status` (`Running` + `:debuggingPort` when online, `Idle` when offline).
  - `Fingerprint` (`osPlatform · hardwareConcurrency c / deviceMemoryGb GB`).
  - `Proxy` (URI monospace or `Direct` badge).
  - `Extensions` (extension count badge).
  - `Actions` (`Run`/`Stop` button + `...` menu).
- **Empty State:** Shows filter `Reset` when items exist but filters exclude all rows; shows `+ New profile`, `Import CSV`, and `Auto-detect` CTAs when no profiles exist.

## 4. Row Actions, Bulk Bar & Dialogs

- **Row Actions (`BrowsersTableRowActions`):**
  - Primary inline button toggles `Run` (`POST /session`) / `Stop` (`DELETE /session?force=false`) with per-row `mutating` spinner.
  - Dropdown menu: `Inspect`, `Edit`, `Test Proxy` (shown when `profile.proxy` is set), `Set default` (disabled if already default), `Duplicate`, `Unbind` (disabled while online), `Delete`.
- **Floating Bulk Bar (`BrowsersTableBulkBar`):** Appears when 1+ rows are selected; provides sequential `Batch Run` (offline rows only), `Batch Stop` (online rows only), `Batch Delete` (`POST /batch/delete`), and clear selection (`X` button or `Esc` when no dialog is open).
- **`BrowserFormDialog` (Create & Edit):**
  - Fields: `name` (required), custom `id` (editable on create only), `groupName` (`default`), comma-separated `tags`, `osPlatform` preset (`macOS` sets `2560x1440`, DPR `2`; `Windows`/`Linux` sets `1920x1080`, DPR `1`), numeric `seed` + `Randomize` button, `hardwareConcurrency`, `deviceMemoryGb`, `screenWidth` x `screenHeight`, `webrtcMode`, `timezone`, `lang`, `proxy` + inline `Test` probe badge, `userAgent`.
  - Editing an online profile shows warning banner and secondary `Save & Restart` action (`PATCH` + `stopSession` + `launchProfile`).
- **`BrowserDetailSheet` (Inspector):**
  - Header badges (`Running`, `Default`, full `profile.tags`), quick actions (`Run`/`Stop`, `Set default`, `Duplicate`), and 3 tabs:
    - `Overview`: `tenantId`, `diskSizeBytes`, live `pid`/`debuggingPort`/`wsUrl` with copy button, and `Move to Tenant` control (shown when >1 tenant exists, disabled while profile is online).
    - `Fingerprint`: read-only summary (`OS`, `Seed`, `CPU/RAM`, `Viewport`, `WebRTC`, `Timezone/Lang`).
    - `Extensions`: comma-separated editor (`PUT /browsers/{id}/extensions`) + extension badges.
- **`BrowserImportCsvDialog`:** CSV textarea (`id,name,userAgent,timezone,proxy,group,tags`) with sample CSV loader and per-row import/skip error report.
- **`BrowserDeleteDialog`:** Single or batch confirmation; if any target `isOnline`, locks `Delete` until user checks the force-stop confirmation (`force=true`).

## 5. Out of Scope in Console UI v1 (API / CLI Only)

To keep forms and table controls minimal, these daemon/CLI capabilities are intentionally omitted from UI v1:
- `startupFlags`, `osVersion`, `acceptLang`, `noiseLevel` editing
- Custom launch overrides (`headless`, `startUrl`, `args`) and clone options (`preserveSeed`, `copyStorage`)
- Unpacked extension path sideloading (`POST /api/v1/browsers/{id}/extensions` + `allowRemoveAutomation` toggle)
- Server-side paginated querying and `group` faceted dropdown (Search `/` covers `groupName` and `tags`)
- Managing Chromium runtime versions inside Console UI ([BROWSERS-002](./002-antidetect-runtime.md))

## 6. Checks

- `pnpm --dir console test:unit apps/automation/src/views/__tests__/browsers.test.ts apps/automation/src/stores/__tests__/browsers.test.ts`
- `node scripts/local-ci.mjs console`
