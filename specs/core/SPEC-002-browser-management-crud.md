# Browser Management — Full CRUD & Lifecycle Specification

## Goal Description

Design and implement complete, end-to-end **Browser Management** across the `operon` local daemon (`127.0.0.1:8765`), `local-db`/Cloud sync, and the `@operon/automation` micro-app (`apps/automation/src/views/browsers.vue`, currently a placeholder stub).

Today, partial browser primitives are split across three disconnected layers:
1. **`operon/crates/browser`**: Rich deterministic antidetect `BrowserProfile` model (`profile.json`, PRNG seed, hardware concurrency, RAM, screen geometry, Client Hints, WebRTC shield, `.tar.zst` snapshot packer, extension registry, proxy pre-flight probe).
2. **`operon/crates/cli`**: Axum REST handlers (`/api/v1/browsers/*`) backed by a minimal SQLite `browsers` table (`id, name, user_agent, timezone, proxy, extensions`) with missing `404` checks, destructive `PUT` defaults, no disk cleanup on `DELETE`, and `.zip` archives stored under `data_dir/browsers/` instead of the SSOT directory `~/.operon/browser/profiles/`.
3. **`console`**: Drizzle schema `browser_profiles` + Cloud sync in `packages/local-db`, ready-made `automation.json` i18n keys, and an empty stub `browsers.vue`.

This spec unifies the data contract, fixes existing backend safety gaps, and defines every **Create, Read, Update, Delete**, **Session**, **Extension**, **Proxy**, and **Batch/Cloud** behavior required for production Browser Management.

---

## User Review Required

> [!IMPORTANT]
> **Contractual Decisions Requiring Sign-Off Before Coding**
> 1. **SSOT Storage Directory ([CONSTRAINTS.md §S1](file:///c:/Users/ndtu6/Repository/operon/CONSTRAINTS.md#L31-L34)):** Unify daemon API session directories under `~/.operon/browser/profiles/<id>/` (matching `crates/browser` CLI) instead of `data_dir/browsers/<id>.zip`, or support a one-time migration path? *(No fallback chains per §S2 — pick one canonical SSOT root.)*
> 2. **404 & Partial Update Semantics on `PUT` / `PATCH /api/v1/browsers/{id}`:** Existing `update_browser` overwrites missing `name` with `""` and clears omitted optional fields (`proxy`, `userAgent`, `timezone`) to `NULL`, and returns `200` on missing IDs. Plan proposes switching to **strict `404` if missing**, explicit **`PATCH` for partial field edits**, and **`PUT` requiring valid non-empty `name`**.
> 3. **Delete Behavior for Running Profiles:** Should `DELETE /api/v1/browsers/{id}` return `409 Conflict` when a session is actively running unless `?force=true` is passed (which kills the Chromium PID first before removing SQLite + disk sandbox)?
> 4. **Cloud Sync Ownership:** Should Cloud push/pull of `browser_profiles` remain in `console/packages/local-db` (PostgREST) or route through the daemon's Cloud RPCs (`acquire_browser` / `release_browser` / `.tar.zst` delta)?
> 5. **Tenant Scoping & Isolation Boundary:**
>    - Console already supports multiple local & cloud tenants (`local-default`, `local-<id>`, or Supabase tenant UUID via `kernel.tenant.activeId`), whereas daemon SQLite `browsers` currently has **no `tenant_id` column** and uses a single global `default_profile_id`.
>    - Plan scopes every browser profile to **`tenantId` (`tenant_id`)**, storing `defaultProfiles` **per tenant**, and keeping active running Chromium sessions safe in the background when the user switches tenant (with an indicator if sessions from another tenant are still running). Supports **"Move / Copy to Tenant"** and an **"All Tenants"** toggle.

---

## Open Questions

1. **Fingerprint Persistence Location:** Should all antidetect fields (`fingerprintSeed`, `osPlatform`, `hardwareConcurrency`, `deviceMemoryGb`, `screenWidth`, `screenHeight`, `webrtcMode`, `lang`, `groupName`, `tags`, `startupFlags`) be added as columns/JSON column on daemon SQLite `browsers` table (authoritative DB + synced to `profile.json`), so UI search/filtering works in SQLite without disk scans? *(Recommended: Yes — add `fingerprint_json`, `group_name`, `tags_json`, `browser_type` metadata columns via idempotent migration in `schema.rs` + `profile.json` mirror).*
2. **Proxy Credential Security ([CONSTRAINTS.md §Z1](file:///c:/Users/ndtu6/Repository/operon/CONSTRAINTS.md#L84-L88)):** When storing authenticated proxies (`http://user:pass@host:port` or `socks5://user:pass@host:port`), should credentials be stored via Vault/Secret Store reference (`secretRef` / redacted display in `GET /api/v1/browsers`) or masked in API responses?
3. **Browser Engine Auto-Install:** When creating/launching a profile and no Chromium runtime exists on disk, should UI trigger an inline runtime download progress flow or redirect to Daemon Doctor/Setup?

---

## System Architecture & State Machine

```mermaid
flowchart LR
    UI["Console UI<br/>apps/automation/src/views/browsers.vue"] -->|"kernel.api.invoke (/api/v1/browsers*)"| API["Operon Daemon Gateway<br/>127.0.0.1:8765 (Axum)"]
    UI <-->|"SSE (/api/v1/events)"| API
    API -->|"SQLite Metadata (WAL)"| DB["~/.operon/system/operon.db<br/>browsers table"]
    API -->|"Antidetect Sandbox & Snapshots"| FS["~/.operon/browser/profiles/<id>/<br/>profile.json + UserData + .tar.zst"]
    API -->|"Spawn / Kill / CDP"| CHR["Managed Chromium<br/>crates/browser"]
    UI <-->|"Sync (optional Cloud auth)"| CLOUD["Supabase Control Plane<br/>browser_profiles + lease RPCs"]
```

### Profile Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Created / Imported / Cloned
    Idle --> Launching: POST /browsers/{id}/session
    Launching --> Running: Chromium PID + CDP WS ready (SSE browser_online)
    Launching --> Error: Binary missing / Proxy probe failed / Timeout
    Error --> Idle: Dismiss / Retry
    Running --> Stopping: DELETE /browsers/{id}/session
    Stopping --> Idle: Graceful close -> sanitize -> pack -> SSE browser_offline
    Idle --> Locked: Acquired by another device (Cloud lease)
    Locked --> Idle: Released / Unbound
    Idle --> [*]: DELETE /browsers/{id} (SQLite + sandbox wiped)
```

---

## Canonical Data Model (`BrowserProfileDTO`)

| Field | Type | Required (Create) | Default | Description & Validation |
| --- | --- | --- | --- | --- |
| `id` | `string` | Optional | Auto slug + hex / UUID | `[a-zA-Z0-9_-]{1,64}` validated by `BrowserId::is_valid()`. Immutable after creation. |
| `tenantId` | `string` | Optional | Active `kernel.tenant.activeId` (`local-default`) | Owning tenant ID (`local-default`, `local-*`, or Cloud tenant UUID). Indexed in SQLite (`idx_browsers_tenant`). |
| `name` | `string` | **Yes** | — | Trimmed non-empty string, `1..100` chars. |
| `groupName` | `string \| null` | No | `"default"` | Logical folder/group label (`"default"`, `"marketing"`, `"qa"`). |
| `tags` | `string[]` | No | `[]` | Max 20 tags, lowercase trimmed. |
| `browserType` | `'chromium'` | No | `'chromium'` | Managed engine family. |
| `isDefault` | `boolean` | Read-only | `false` | Computed per-tenant from `settings.browser.default_profiles[tenantId]` (migrating legacy `default_profile_id`). Mutated via `set-default`. |
| `isOnline` | `boolean` | Read-only | `false` | Live process/CDP registry check (`connected_browsers` ∪ `browser_registry`). |
| `pid` / `debuggingPort` / `wsUrl` | `number \| string \| null` | Read-only | `null` | Populated while `isOnline === true`. |
| `diskSizeBytes` | `number` | Read-only | `0` | Profile sandbox size on disk (computed on detail inspect or cached). |
| `proxy` | `string \| null` | No | `null` | Validated URI (`http://`, `https://`, `socks5://`). Credentials redacted in list summary (`user:***@host:port`). |
| `timezone` | `string \| null` | No | Host/Auto | IANA timezone (e.g. `Asia/Ho_Chi_Minh`, `UTC`). |
| `lang` / `acceptLang` | `string \| null` | No | `"en-US"` | BCP-47 locale (`en-US`, `vi-VN`). |
| `userAgent` | `string \| null` | No | Auto-aligned | Custom UA string; auto-aligns `sec-ch-ua` hints if set. |
| `fingerprint` | `FingerprintConfig` | No | PRNG seeded | `seed` (`u32`), `osPlatform` (`windows\|macos\|linux`), `osVersion`, `hardwareConcurrency` (`2\|4\|8\|12\|16`), `deviceMemoryGb` (`4\|8\|16\|32`), `screenWidth`, `screenHeight`, `devicePixelRatio`, `webrtcMode` (`proxy_shielded\|disabled\|default`), `noiseLevel` (`off\|subtle\|balanced\|aggressive`). |
| `extensions` | `string[]` | No | `["automation"]` | Installed extension IDs or unpacked paths (`"automation"` enforced if workflow-enabled). |
| `startupFlags` | `string[]` | No | `[]` | Safe extra Chromium flags (denylisted dangerous flags blocked). |
| `cloudLock` | `CloudLockInfo \| null` | Read-only | `null` | `{ isLocked, lockedByDeviceId, lockedAt }` when synced with Cloud. |
| `createdAt` / `updatedAt` | `string (ISO 8601)` | Read-only | Server UTC | Timestamps. |

---

## Tenant Isolation & Multi-Tenant Rules

Tenants are a first-class boundary in Console (`useTenantStore` / `kernel.tenant`) and Cloud (`tenants` / RLS). Browser Management enforces strict tenant isolation across UI, Local DB, Daemon API, and Disk SSOT:

1. **Tenant Context Propagation:**
   - Every Browser API call from `@operon/automation` sends the active tenant (`tenantId = kernel.tenant.activeId || 'local-default'`) via query param (`?tenantId=...`), request body, or `X-Operon-Tenant` header.
   - Switching tenant in Console's `TenantSelector` fires `opn:tenant-changed` (and updates `kernel.tenant.activeId` & `kernel.auth.tenantId`):
     - `useBrowsersStore` clears row selection (`selectedIds`), closes stale detail drawers, and reloads the profile list for the new tenant.
     - Console invokes `POST /api/v1/system/tenants/switch` so daemon CLI/workers (`opn`) and UI operate on the exact same active tenant.
2. **Legacy Row Migration:**
   - Existing rows in daemon SQLite `browsers` (`tenant_id` / `workspace_id`) migrate idempotently to `tenant_id` (`DEFAULT 'local-default'`) in `schema.rs`.
3. **Filesystem Sandbox Isolation ([CONSTRAINTS.md §S1](file:///c:/Users/ndtu6/Repository/operon/CONSTRAINTS.md#L31-L34)):**
   - Profile IDs remain globally unique; `profile.json` records `tenant_id`, and runtime directories stay under `~/.operon/browser/profiles/<id>/` so move operations are O(1) without moving gigabytes of Chromium `UserData`.
4. **Per-Tenant Default Profile:**
   - `POST /api/v1/browsers/{id}/set-default` sets the default **only for the profile's `tenantId`**, ensuring Tenant A and Tenant B each keep an independent default profile for workflows and jobs.
5. **Active Sessions Across Tenant Switches:**
   - Chromium processes spawned in Tenant A **are not killed** when switching to Tenant B (preserving background automations per [CONSTRAINTS.md §P2](file:///c:/Users/ndtu6/Repository/operon/CONSTRAINTS.md#L16-L20)).
   - The toolbar optionally shows an informational badge if running sessions exist in other tenants (`"2 running in other tenants"`), with an optional `All Tenants` filter scope.
6. **Move / Copy Between Tenants (`POST /api/v1/browsers/{id}/move` & `clone`):**
   - **Move:** Allowed only when the profile is offline (`!isOnline && !isLocked`). Updates `tenant_id` in SQLite + `profile.json`, clears `isDefault` in the source tenant, and broadcasts `browser_changed` for both source & target tenants.
   - **Copy to Tenant (`clone` with `targetTenantId`):** Creates an independent copy in the target tenant with a fresh PRNG `fingerprintSeed` and optional clean `UserData`.

---

## Detailed Specification per CRUD Feature

### 1. CREATE (`POST /api/v1/browsers`, Clone, Batch CSV Import)

#### 1.1 Single Create (`CreateBrowserModal` / Drawer)
- **Trigger:** Primary CTA **`New Profile`** in top toolbar (`apps/automation/src/views/browsers.vue`).
- **Form Sections (shadcn-vue Flex layout, Zod validated):**
  1. **Identity:** `name` (required), optional `id` (auto-slug preview if left blank), `groupName`, `tags`.
  2. **Fingerprint & Device (Antidetect):**
     - `osPlatform` selector (`Windows`, `macOS`, `Linux`) → auto-adjusts default `screenWidth`/`screenHeight`/`dpr`/`secChUaPlatform`.
     - `seed` numeric input + **`Randomize Seed`** button (deterministic PRNG preview updates CPU cores `4/8/12/16`, RAM `8/16/32 GB`, resolution, canvas/audio noise level).
     - `userAgent` (optional override; blank = auto-match OS + Chrome major version).
     - `webrtcMode` (`Proxy Shielded` [default], `Disabled`, `Default`), `timezone`, `lang`.
  3. **Network & Proxy:**
     - `proxy` input (`Direct` or `socks5://` / `http://` / `https://`) + inline **`Test Proxy`** button calling `POST /api/v1/browsers/proxy/probe` (displays live RTT ms, egress IP, country/colo).
  4. **Extensions & Startup:**
     - Multi-select from installed extension registry (`GET /api/v1/browsers/extensions/catalog` or registered extensions; `automation` core engine toggle).
- **Backend Execution (`POST /api/v1/browsers`):**
  1. Resolve `tenantId` from request body / `X-Operon-Tenant` header (default `'local-default'`, validated `[a-zA-Z0-9_-]{1,64}`).
  2. Validate `name.trim().length > 0 && <= 100` → else `400 BadRequest`.
  3. Validate `id` (generate slug/UUID if omitted); reject invalid chars or duplicate ID (`409 Conflict`).
  4. Validate `proxy` scheme (`http`, `https`, `socks5`) and port range if provided (`400 BadRequest`).
  5. Auto-populate `FingerprintConfig` using `BrowserProfile::generate(...)` if omitted.
  6. Atomically persist row (`tenant_id`, metadata) in SQLite `browsers` + write `profile.json`. (Rollback SQLite row if filesystem init fails.)
  7. Broadcast SSE `{ type: "browser_changed", action: "create", id, tenantId }`.
  8. Return `201 Created` (or `200` with `BrowserResponse` payload so UI can insert immediately without extra roundtrip).

#### 1.2 Clone / Duplicate Profile (`POST /api/v1/browsers/{id}/clone`)
- **Action:** Row menu → **`Duplicate`** (or **`Copy to Tenant…`**).
- **Behavior:** Copies `groupName`, `tags`, `proxy`, `timezone`, `lang`, `extensions`, `fingerprint` config into `targetTenantId` (defaults to source `tenantId`) with a **fresh PRNG `fingerprintSeed`** (unless `preserveSeed: true` explicitly requested), name `"<original> (Copy)"`, and optional `copyStorage: boolean` (only allowed when source profile is offline).

#### 1.3 Batch Import CSV (`POST /api/v1/browsers/import-csv`)
- **Trigger:** Toolbar menu → **`Import CSV`**.
- **UI Flow:** File dropzone / paste textarea → client-side preview table (valid rows vs syntax errors highlighted) + sample CSV template download (`name,os,proxy,timezone,lang,tags,group`).
- **Backend Fix Required:** Current `importer.rs` silently discards `create_browser` errors (`let _ = ...`) and counts skipped/failed rows as imported! Update to return structured `{ imported, skipped, errors: [{ row, reason }] }`, support quoted CSV fields, auto-generate missing `id`, and emit SSE `browser_changed` (`action: "batch_create"`).

#### 1.4 Auto-Detect / Provision Default Profile (`POST /api/v1/browsers/auto-detect`)
- **Action:** Empty-state CTA **`Detect / Create Default Profile`**.
- Registers default managed Chromium profile if none exist and ensures `default_profile_id` is configured.

---

### 2. READ (`GET /api/v1/browsers`, `GET /api/v1/browsers/{id}`, Live Status & Inspection)

#### 2.1 List & Filtering (`browsers.vue`)
- **Top KPI Summary Strip (compact 4-card flex/grid row):**
  - `Total Profiles`, `Running Now` (live PIDs), `Proxied` vs `Direct`, `Cloud Locked` (when Cloud synced).
- **Toolbar Controls:**
  - Debounced Search (`300ms`) matching `name`, `id`, `groupName`, `proxy` host (`?search=`).
  - Filter Chips / Selects:
    - Status: `All` | `Running` | `Offline` | `Locked`
    - Proxy: `All` | `With Proxy` | `Direct`
    - Platform: `All` | `Windows` | `macOS` | `Linux`
    - Group / Tag filter
  - Pagination (`limit` / `offset`, page size `20 / 50 / 100`) returning `{ items, total, limit, offset }` (backward-compatible array or v2 envelope).
- **Table Columns (`@tanstack/vue-table` + shadcn `Table`):**
  1. Checkbox (batch selection)
  2. **Profile:** Avatar/OS icon + `name` + `Default` badge (if `isDefault`) + truncated `id` (click-to-copy) + group/tags chips
  3. **Status:** Live green dot **`Running`** (with port badge e.g. `:54321`) | **`Launching…`** | muted **`Idle`** | amber **`Locked`**
  4. **Fingerprint:** `Windows · 8c / 16GB · Seed #...`
  5. **Proxy:** Masked proxy host (`socks5://127.0.0.1:1080`) or `Direct` badge + inline latency dot if probed
  6. **Storage / Extensions:** Disk size (`42.3 MB`) + extension count pill
  7. **Updated:** Relative timestamp
  8. **Actions:** Primary quick-toggle **`Run`** / **`Stop`** button + `...` Dropdown (`Inspect`, `Edit`, `Probe Proxy`, `Set Default`, `Duplicate`, `Delete`)
- **Empty & Offline States (reusing `<Page>` from `@operon/common-ui`):**
  - While `bridge.isInitialChecking`: `<Page :loading="true">` skeleton matching KPI strip + table rows.
  - Empty DB: Clean empty state with **`New Profile`**, **`Import CSV`**, and **`Auto-Detect`**.

#### 2.2 Profile Detail Drawer (`GET /api/v1/browsers/{id}`)
- Slides open a `Sheet` (`BrowserDetailSheet.vue`) without leaving the table:
  - **Overview Tab:** Status, PID, CDP WebSocket URL (copy button), User-Data-Dir path (copy/reveal), Default status.
  - **Fingerprint Tab:** Readout of all antidetect properties (`seed`, `os`, `cores`, `ram`, `resolution`, `dpr`, `webrtcMode`, `secChUa`, `userAgent`, `timezone`, `lang`).
  - **Extensions & Flags Tab:** Loaded extensions with active/missing-on-disk verification + custom startup flags.
  - **Storage & Backup Tab:** Real-time disk footprint breakdown, cookie count (if packed), **`Sanitize Cache`** & **`Export (.tar.zst)`** triggers.

#### 2.3 Real-Time SSE Synchronization (`GET /api/v1/events`)
- Subscribe once on mount (`EventSource`) to daemon SSE stream:
  - `browser_changed` (`create` | `update` | `delete` | `batch_*`) → selectively refresh list or patch local Pinia store cache.
  - `browser_online` / `browser_offline` → flip row badge & action button (`Run` ↔ `Stop`) immediately without polling flicker.
  - `settings_updated` → update `isDefault` badge when default profile changes.

---

### 3. UPDATE (`PATCH /api/v1/browsers/{id}`, `PUT`, Extensions, Default, Proxy)

#### 3.1 Edit Profile Configuration (`EditBrowserDrawer.vue` / Modal)
- **Strict Validation & Safety Rules:**
  - **Not Found:** If `id` does not exist in SQLite → return `404 NotFound` (fixing current silent `200`).
  - **Partial Update (`PATCH /api/v1/browsers/{id}` — New / Preferred):** Only provided fields are updated; omitted fields retain existing DB & `profile.json` values; explicit `null` clears nullable fields (`proxy`, `userAgent`, `timezone`).
  - **Full Update (`PUT /api/v1/browsers/{id}`):** Validate `name` is non-empty (`400 BadRequest` if blank).
  - **Hot-Update Warning when Running (`isOnline === true`):** Fields requiring browser restart (`fingerprint`, `proxy`, `userAgent`, `extensions`, `startupFlags`) show an inline banner in the Edit UI: *"This profile is currently running. Changes will apply on next launch"* + optional **`Save & Restart`** action (graceful stop → save → relaunch).
  - Dual-write SQLite + `profile.json` atomically, align `sec_ch_ua` client hints if UA changed, emit SSE `browser_changed` (`action: "update"`).

#### 3.2 Extension Management per Profile
- **Attach / Detach Extensions (`PUT /api/v1/browsers/{id}/extensions` & `POST /api/v1/browsers/{id}/extensions`):**
  - Toggle built-in / catalog extensions (`ublock`, `cookie-injector`, etc.) or sideload custom unpacked extension path (server validates folder & `manifest.json` + rejects path traversal).
  - Core `"automation"` extension remains protected unless user explicitly disables automation integration.

#### 3.3 Set System Default (`POST /api/v1/browsers/{id}/set-default`)
- Row action **`Set as Default`** → updates `settings.browser.default_profile_id`, emits `settings_updated`, moves `Default` badge immediately.

#### 3.4 Proxy Pre-Flight Probe (`POST /api/v1/browsers/proxy/probe`)
- Tests proxy connectivity via `crates/browser::ProxyProbe::probe` (`timeout: 5s`) without launching Chromium, returning `{ alive, protocol, rttMs, egressIp, country, colo, error }`.

#### 3.5 Cloud Lease Unbind (`POST /api/v1/browsers/{id}/unbind` or Cloud RPC)
- Clears stale `locked_by_device_id` lease for offline/crashed remote nodes (maps to existing `browser_batch_unbound` i18n keys in `automation.json`).

---

### 4. DELETE (`DELETE /api/v1/browsers/{id}`, Batch Delete, Storage Cleanup)

#### 4.1 Single Profile Delete
- **UI Confirmation (`AlertDialog`):**
  - Displays profile name, ID, and disk size to be removed.
  - If `isOnline === true`, warns explicitly: *"This browser is currently running. Force-stop and delete permanently?"* (checkbox or dedicated button **`Force Stop & Delete`**).
  - If `isDefault === true`, warns that default profile will fallback to `null` / next available profile.
- **Backend Execution (`DELETE /api/v1/browsers/{id}?force=true|false`):**
  1. Validate ID (`400` if invalid). Return `404 NotFound` if profile does not exist in SQLite or disk.
  2. Check active registry (`browser_registry` + `connected_browsers`):
     - If running and `force !== true` → return **`409 Conflict`** (`"Browser session is active. Stop it first or pass force=true"`).
     - If running and `force === true` → terminate processes (`kill_browser_processes`), clear `browser_registry` & `browser_sessions`, emit `browser_offline`.
  3. Delete SQLite row (`DELETE FROM browsers WHERE id = ?`). If this profile was `settings.browser.default_profile_id`, clear `default_profile_id = None` and emit `settings_updated`.
  4. Clean up filesystem artifacts: remove `~/.operon/browser/profiles/<id>/` directory (and any legacy `.zip` / `.tar.zst` archive).
  5. If Cloud-synced (`tenant_id` active), record `deletedAt` tombstone in `local-db` so next sync propagates deletion safely.
  6. Broadcast SSE `{ type: "browser_changed", action: "delete", id }`.

#### 4.2 Batch Delete (`POST /api/v1/browsers/batch/delete`)
- Runs on selected table rows (`force?: boolean`), returns per-ID summary `{ deleted: string[], skipped: { id, reason }[], errors: { id, error }[] }` so partial failures (e.g. one running profile when `force=false`) never leave UI state out of sync.

---

### 5. SESSION & BATCH RUNTIME OPERATIONS

- **Launch Session (`POST /api/v1/browsers/{id}/session`):**
  - Launch options modal/popover or 1-click **`Run`**: `headless` override, `startUrl`, optional one-off `proxy` / `args`.
  - Backend passes full antidetect flags (`fingerprint_seed`, `os_platform`, `hardware_concurrency`, `device_memory_gb`, `screen_width`, `screen_height`, `webrtc_mode`, `lang`) from merged SQLite + `profile.json` into `BrowserManager`.
  - Idempotent: if already alive on OS PID table, returns existing session `{ pid, debuggingPort, wsUrl }`.
- **Stop Session (`DELETE /api/v1/browsers/{id}/session?force=false`):**
  - Graceful close → sanitize volatile caches (preserving `Default/Network/Cookies` & `Local Storage`!) → pack snapshot → emit `browser_offline`.
  - Force kill (`?force=true`): immediate OS PID kill + lock cleanup (`SingletonLock`).
- **Kill All Sessions (`DELETE /api/v1/browsers/sessions`):** Emergency "Stop All" button in toolbar.
- **Batch Run / Batch Stop / Batch Unbind:** Floating selection action bar at bottom/top of table when `>= 1` rows are checked (reusing existing `automation.json` keys `browser_batch_run_btn`, `browser_batch_stop_btn`, `browser_batch_unbind_btn`).

---

## Proposed Changes

### Component 1: `operon/crates/browser` & `operon/crates/cli` (Backend SSOT & REST API)

#### [MODIFY] [schema.rs](file:///c:/Users/ndtu6/Repository/operon/crates/cli/src/infrastructure/db/schema.rs) & [browsers.rs](file:///c:/Users/ndtu6/Repository/operon/crates/cli/src/infrastructure/db/browsers.rs)
- Add idempotent migration columns to `browsers` table: `workspace_id` (`NOT NULL DEFAULT 'local-default'`, indexed via `idx_browsers_workspace`), `group_name`, `tags`, `fingerprint_config` (JSON), `startup_flags` (JSON).
- Support workspace-filtered `get_browsers(..., workspace_id: Option<&str>)` and per-workspace `default_profiles` in `AppSettings.browser`.
- Return `usize` affected row count on `update_browser` and `delete_browser` so handlers can return accurate `404 NotFound`.
- Add `update_browser_partial` for `PATCH` semantics.

#### [MODIFY] [browsers.rs (API handlers)](file:///c:/Users/ndtu6/Repository/operon/crates/cli/src/api/handlers/browsers.rs) & [routes.rs](file:///c:/Users/ndtu6/Repository/operon/crates/cli/src/api/routes.rs)
- Enforce `400` on empty `name`, `404` on missing IDs, `409` on duplicate ID or deleting/moving active session without `?force=true`.
- Resolve `workspaceId` from query/header/body across all browser CRUD endpoints (`GET` filter, `POST` stamp, `set-default` per workspace, SSE `workspaceId` tag).
- Sync SQLite mutations with `~/.operon/browser/profiles/<id>/profile.json` and wipe sandbox directory on `delete_browser`.
- Pass full `BrowserProfile` antidetect flags (`fingerprint_seed`, `hardware_concurrency`, `device_memory_gb`, `screen_*`, `webrtc_mode`, `lang`, `startup_flags`) in `start_browser`.
- Add endpoints:
  - `PATCH /api/v1/browsers/{id}` (`patch_browser`)
  - `POST /api/v1/browsers/{id}/clone` (`clone_browser`)
  - `POST /api/v1/browsers/{id}/move` (`move_browser_workspace`)
  - `POST /api/v1/browsers/proxy/probe` (`probe_proxy`)
  - `POST /api/v1/browsers/batch/delete` (`batch_delete_browsers`)
  - `PUT /api/v1/browsers/{id}/extensions` (`set_browser_extensions`)
- Fix `import_csv` (`core/browser/importer.rs`) to report accurate `{ imported, skipped, errors }` and support RFC-4180 quoted fields.
- Update OpenAPI `#[derive(OpenApi)]` schemas in `routes.rs` and `requests/04-browsers.rest`.

---

### Component 2: `console/packages/local-db` (Sync Alignment)

#### [MODIFY] [automation.ts](file:///c:/Users/ndtu6/Repository/console/packages/local-db/src/schema/automation.ts) & [sync.ts](file:///c:/Users/ndtu6/Repository/console/packages/local-db/src/sync.ts)
- Align `fingerprint` JSON type in `browserProfiles` with `FingerprintConfig` (`seed`, `osPlatform`, `hardwareConcurrency`, `deviceMemoryGb`, `screenWidth`, `screenHeight`, `webrtcMode`, `lang`, `extensions`) so local daemon profiles and Cloud-synced profiles map 1:1 with zero schema drift.

---

### Component 3: `console/apps/automation` (Browser Management UI & Store)

#### [NEW] `apps/automation/src/api/browsers.ts`
- Typed API client wrapping `kernel.api.invoke(...)` for all `/api/v1/browsers*` endpoints + TypeScript interfaces (`BrowserProfileDTO`, `CreateBrowserPayload`, `UpdateBrowserPayload`, `ProxyProbeResult`, `CsvImportResult`, `BrowserSessionInfo`).

#### [NEW] `apps/automation/src/stores/browsers.ts`
- Pinia store (`useBrowsersStore`) managing:
  - Active workspace binding (`watch(() => kernel.auth.tenantId)` + `opn:workspace-changed` listener) so switching workspace resets selection, reloads scoped profiles, and isolates defaults.
  - List state, search/filter/pagination state, loading/mutating sets (`launchingIds`, `stoppingIds`, `deletingIds`), default ID per workspace, selected row IDs.
  - Optimistic / reactive SSE listener (`browser_changed`, `browser_online`, `browser_offline`, `settings_updated`) with clean teardown and `workspaceId` filtering.
  - Batch action orchestrators (run, stop, delete, unbind, move workspace) with per-item progress/summary toasts.

#### [MODIFY] [browsers.vue](file:///c:/Users/ndtu6/Repository/console/apps/automation/src/views/browsers.vue)
- Full **Browser Management** page built with `shadcn-vue` (`Card`, `Badge`, `Button`, `Input`, `Select`, `Checkbox`, `Table`, `Sheet`, `Dialog`, `AlertDialog`, `Tabs`, `Skeleton`, `DropdownMenu`):
  - Local bridge heartbeat guard (smooth skeleton while `bridge.isInitialChecking`, offline banner when daemon is down).
  - KPI strip + Search/Filter/Batch action toolbar + Responsive DataTable.

#### [NEW] Modular Subcomponents under `apps/automation/src/components/browsers/`
- `BrowserFormDialog.vue` (reusable Create & Edit form with Fingerprint Seed Generator + inline Proxy Probe + Extensions selector)
- `BrowserDetailSheet.vue` (read-only inspector: live CDP info, antidetect matrix, extensions, storage/cookie tools)
- `BrowserImportCsvDialog.vue` (CSV drag-drop / paste preview + validation summary + template download)
- `BrowserDeleteDialog.vue` (single & batch delete confirmation with active-session force-stop guard)

#### [MODIFY] [en-US/automation.json](file:///c:/Users/ndtu6/Repository/console/apps/automation/src/locales/langs/en-US/automation.json) & `vi-VN/automation.json`
- Add remaining CRUD/form/dialog i18n keys with 100% parity between `en-US` and `vi-VN`.

---

## Verification Plan

### Automated Tests
1. **Operon Rust Toolchain (`c:\Users\ndtu6\Repository\operon`):**
   - `cargo fmt --all --check`
   - `cargo clippy --workspace --all-targets -- -D warnings`
   - `cargo test -p cli browsers` (CRUD happy paths, workspace scoping & legacy `'local-default'` backfill, per-workspace default profile, `move_browser_workspace`, `400`/`404`/`409` validation, partial `PATCH`, `DELETE` disk cleanup, `import_csv` malformed rows, `clone`)
   - `cargo test -p cli schema_contract` (OpenAPI schema verification)
2. **Console Frontend (`c:\Users\ndtu6\Repository\console`):**
   - Unit tests for `apps/automation/src/stores/__tests__/browsers.test.ts` (workspace switch reload + selection reset, CRUD optimistic/SSE updates, batch selection, error rollback)
   - `pnpm -F @operon/automation run typecheck`
   - `pnpm -F @operon/shell run typecheck`
   - `pnpm run lint`
   - `pnpm run check:i18n` & `pnpm run check:architecture`

### Manual Verification
1. Start daemon (`opn worker start`) and launch Console (`http://localhost:5320/automation/browsers`).
2. **Workspace Isolation:** Create profiles in `Local Workspace` → switch workspace in `WorkspaceSelector` → verify list & `Default` badge isolate per workspace, create a profile in Workspace 2, move/copy an offline profile between workspaces, and confirm a running browser in Workspace 1 stays alive safely in the background when switching.
3. **Create:** Create a profile with custom OS + random PRNG seed + SOCKS5 proxy → run inline **Test Proxy** → confirm profile appears immediately via SSE and `profile.json` exists in `~/.operon/browser/profiles/<id>/`.
3. **Read / Filter / Inspect:** Filter by `With Proxy` / OS / search query → open Detail Sheet and verify fingerprint specs match.
4. **Session Run/Stop:** Click **Run** → verify Chromium opens with expected User-Agent & `--proxy-server` → row flips live to **Running** with PID & port → click **Stop** → verify graceful close, cookies preserved, row returns to **Idle**.
5. **Update:** Edit profile while Idle (partial update keeps omitted fields); edit while Running (verify restart prompt appears); toggle `Set Default` and verify badge transfers.
6. **Batch CSV Import & Duplicate:** Import sample 3-row CSV with 1 intentional invalid row → verify 2 imported + 1 structured error shown; Clone 1 profile and confirm new PRNG seed generated.
7. **Delete:** Attempt deleting a Running profile without force (`409` guard prompt) → confirm **Force Stop & Delete** → verify process terminates, SQLite row disappears, and sandbox directory is removed from disk.
