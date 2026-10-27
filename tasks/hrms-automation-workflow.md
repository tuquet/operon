# Task: Workflow HRMS Automation trên Operon(re-lock theo doctrine Automa schema)

> **Bản này thay thế hoàn toàn bản tiếng Anh trước đó** (còn trong git history). Lý do re-lock: hệ thống
> đang xây workflow **trên schema của Automa** để dùng lại canvas kéo-thả của nó. Mọi thứ trước đây tự
> định nghĩa song song (params, secrets, variables) đều bị bỏ.

## 0. Doctrine nền tảng — Automa schema là SSOT

> **Workflow document = Automa schema = SSOT duy nhất. OperonKHÔNG định nghĩa lại bất cứ thứ gì đã có trong document.**

### 0.1 Bốn nguyên tắc

| # | Nguyên tắc |
| --- | --- |
| (a) | Mọi thứ **thuộc về tác giả workflow** (tham số, trigger, settings, globalData, table, tham chiếu secret, composition) → nằm **trong document**, theo đúng **dialect Automa**. |
| (b) | Mọi thứ **thuộc vận hành Operon** (tenant, thiết bị, queue, lịch cloud, ciphertext, device key) → nằm **ngoài document** (job params / bảng cloud / Secret Store). |
| (c) | Cầu nối duy nhất giữa hai thế giới = **giá trị truyền vào** + **secret**. Không nhét cấu hình vận hành vào graph. |
| (d) | **Canvas khai báo mà engine bỏ qua = bug P0.** Nếu không honour thì canvas chỉ là authoring giả. |

### 0.2 Parity checklist — dialect bắt buộc

| Khái niệm | Automa dialect | Operonhiện tại | Việc phải làm |
| --- | --- | --- | --- |
| Contract tham số | `trigger.data.parameters[]` = `{name*, type, defaultValue, placeholder, description}` — đã có trong `cli/schema/workflow.schema.json` (`$defs.blockData.properties.parameters`, `$defs.parameter`; `additionalProperties: true`) | ❌ engine bỏ qua | **honour + fail-fast** (Phase 1) |
| Giá trị tham số | prompt UI (`/root/automa/src/params/App.vue`) → `workflow.params` | — | headless: lấy từ schedule/job (§8.2) |
| Secrets | **`{{secrets@name}}`** — regex `/\{\{\s*secrets@(.*?)\}\}/` (`EditorUsedCredentials.vue`); engine nạp `referenceData.secrets[name]` | ❌ đang dùng `{{secrets.*}}` | **đổi sang `{{secrets@name}}`** (Phase 4) |
| Biến runtime | `{{variables.x}}` | ✅ | giữ |
| Global data / table | `globalData`/`global_data`, `table`, `dataColumns` | ❓ | verify ở Phase 1 |
| Composition (tái sử dụng) | **`includedWorkflows`** (`/root/automa/src/utils/workflowData.js` — export nhúng workflow con) + block execute-workflow | ❌ | **dùng lại**, không tự chế subflow |
| Trigger | **top-level `trigger`** + node `trigger`; canvas có `TriggerCronJob`, `TriggerInterval`, `TriggerDate`, `TriggerSpecificDay`, `TriggerContextMenu`, `TriggerKeyboardShortcut`, `TriggerVisitWeb`, `TriggerElementChange` | engine chỉ nhận job push | map ⇄ `automation.schedules` (§8.5) |
| Flags | `isDisabled`, `testingMode`, `hostId`, `teamId`, `settings{onError, blockDelay, concurrency}` | một phần | honour; map tenant ↔ `hostId`/`teamId` |
| Mở rộng | `$defs.parameter.additionalProperties: true` | — | thêm field Operon**bên trong** parameter (vd `"secret": true`), **không** thêm cột mới |

### 0.3 Nguyên tắc chống "im lặng": **declared ⇒ satisfied**

- **Publish-time validation**: khi `workflow_upsert` → mọi param declared phải có `defaultValue` **hoặc** có nguồn giá trị; `trigger.type` phải tương thích chế độ chạy (fleet + `type = manual` ⇒ **invalid**).
- **Runtime**: thiếu giá trị ⇒ **fail-fast**. **Cấm** fallback nằm trong block (hack cũ của bản trước).
- **Cấm** cấu hình vận hành trong graph: credential, mã tenant, URL môi trường, link cọc…

### 0.4 Hai host, một document

| | Automa host (extension) | Operonhost (fleet) |
| --- | --- | --- |
| Định nghĩa | canvas editor (authoring) | console read-only + RPC `public.workflow_*` |
| Giá trị tham số | prompt UI | schedule/job params (headless) |
| Secrets | IndexedDB (AES+HMAC) | Secret Store cloud (envelope, DEK sealed per-device) — **cùng cú pháp `{{secrets@name}}`** |
| Trigger | browser triggers | `automation.schedules` (pg_cron) |
| Thực thi | `WorkflowEngine` (browser API) | engine Rust + CDP |
| Lưu trữ | IndexedDB | `automation.workflows` (cloud-first) |

## 1. Trạng thái

- **Đã chốt doctrine + quyết định** (mục §2). Sẵn sàng triển khai.
- **Không** `git push` / CI/CD nếu không được yêu cầu (invariant #5).
- Chặn bởi: **Phase 1 (engine parity)** — phải làm trước, cả task IG sau này cũng phụ thuộc.
- Chặn bởi 1 input runtime: máy chạy worker (open item #9).

## 2. Quyết định đã chốt

| # | Câu hỏi | Quyết định |
| --- | --- | --- |
| 1 | Chiến lược thực thi | **Hybrid** — logic qua REST API của HRMS (`fetch` + JWT) từ **trong page context**; browser (CDP) chỉ để giữ session + lấy token. |
| 2 | Đường dispatch job | **`automation.jobs` (cloud)** + fleet claim (`automation.claim_next_job`). Gateway local `127.0.0.1:8765` là **local-only**, không phải entrypoint cloud. |
| 3 | Host scheduler | **`pg_cron` + Edge Function** materialize `automation.schedules` → `automation.jobs`. |
| 4 | Credential HRMS | **`{{secrets@name}}`** (dialect Automa) trỏ vào **Secret Store** cloud (mã hoá client-side, DEK sealed per-device). Không plaintext ở bất kỳ đâu (graph/payload/log/git/DB). **Không** fallback trong block. |
| 5 | Lịch + cutoff | **08:00 Asia/Ho_Chi_Minh, T2–T6** (`0 8 * * 1-5`). Cutoff = hết ngày trước; chỉ ngày `< today`. |
| 6 | Rollout submit | **Dry-run trước** nhiều ngày công; `mode=submit` chỉ bật sau **owner duyệt**, có policy gate. |
| 7 | Vị trí adapter | Logic nằm trong block `javascript-code` (option A). Tham số **khai báo ở `trigger.data.parameters` trên canvas**, không có cơ chế riêng. |
| 8 | Target đầu tiên | Tenant admin `e0f30395-3d42-41f6-a4ca-c11411e4f24b`; workstation `HNDW-NDTU6` (`24cf97b1-ee98-4f1f-b6c8-b8e5d63fc48d`); profile `hrms-cmc-03e6b9`. |
| 9 | **Contract tham số** | **`trigger.data.parameters[]`** (schema Automa) là SSOT. Giá trị resolve theo §8.2. |
| 10 | **Tái sử dụng** | Dùng **`includedWorkflows`** của Automa. Không tự chế subflow. |
| 11 | **Cấu hình vận hành** | Không bao giờ nằm trong graph. Chỉ vào qua job/schedule params + Secret Store. |
| 12 | Fleet + trigger | Fleet **cấm** `trigger.type = manual` (phải có nguồn schedule/job). |

### Đối tượng cloud

**Đã có:** `automation.workflows` → `HRMS Timesheet Review` (`a27093ce-a768-4e3a-bcc1-e4d87da6157c`, `draft`, v1.0.0, **12 nodes**, `has_cred = false` — đã verify 2026-10-24).

**Cần tạo/sửa:**
- `automation.schedules` — thêm cột `parameters jsonb not null default '{}'`.
- `automation.jobs` — thêm `schedule_id`, `idempotency_key` (+ unique), `params_snapshot`.
- Bảng `automation.workflow_state` — cursor/state cho workflow incremental.
- Hàm `automation.enqueue_job(...)` (idempotent) + `automation.tick_schedules()`.
- Validation trong `public.workflow_upsert` (publish-time).

### Khác gì so với bản trước

- `{{secrets.*}}` → **`{{secrets@name}}`** (dialect Automa). Phải migrate workflow `a27093ce`.
- Bỏ đề xuất thêm `workflows.param_schema` — **contract đã có** ở `trigger.data.parameters`.
- Bỏ fallback credential trong block; thay bằng **publish-time validation** + fail-fast.
- Thêm **Phase 1 (engine parity)** làm trước mọi thứ.
- Thêm `workflows.variables` vào danh sách **xoá** (trùng chức năng, đang chết).

## 3. Mục tiêu

Chuyển luồng HRMS thủ công (đọc timesheet → phát hiện ngày thiếu giờ → gửi đơn `TIME_OFF`) thành workflow Automation của Operon, chạy bởi workstation đã enroll.

Scheduler Supabase materialize `automation.schedules` → job; workstation (fleet mode) claim, chạy workflow qua engine native + browser (CDP cho session, API cho HRMS), báo cáo trạng thái + log về Cloud.

Cloud **không bao giờ** chạy Node CLI trực tiếp và **không** mở Chromium trong scheduler.

## 4. Khối đã có (verified)

- `opn auth login` — auth + enrollment (`cli/src/commands/cloud.rs`).
- `opn worker` — `start` (gồm `--cloud`), `status`, `logs`.
- Worker fleet transport — WS outbound (`worker/src/transport/ws_client.rs`) + `workers.enroll_device` / `heartbeat`.
- `opn automation` — `run`, `inspect`, `workflow list/import/export/info/delete`.
- `opn browser` — `profile list/create/inspect/pack/unpack/push/pull/cloud` + runtime CDP (`~/.opn/browser/runtimes/v148.0.7778.215/chrome`).
- **Workflow store cloud-first** — CLI/console qua RPC `public.workflow_list/get/upsert/delete` (PostgREST chỉ expose `public`, nếu không sẽ `PGRST106`); `cli/src/infrastructure/cloud/workflow_store.rs`.
- **Secret Store v2** — `opn secret init/set/list/rm/path/push/pull/remote/rotate`; local `~/.opn/system/secrets.json` (AES-256-GCM) + device keypair X25519 (`~/.opn/system/.device_key`); plugin `secrets` v2 (`secrets.credentials`, `secrets.tenant_keys`, `secrets.devices.wrapped_dek`).
- **Cloud queue** — `automation.workflows` / `jobs` / `execution_logs` / `schedules` / `packages`; hàm hiện có **chỉ 3**: `claim_next_job(p_worker_id, p_batch_size)` (FOR UPDATE SKIP LOCKED), `reap_stale_jobs(p_stale_interval)`, `notify_job_queued()`. `jobs.parameters` là `jsonb` và **đã có GIN index** (`idx_automation_jobs_params_gin`).
- **Antidetect profile + lease** — `browsers.profiles`, `browsers.fingerprint_templates`, `browsers.releases`, `acquire_profile` / `release_profile`.
- **Block engine** (`worker/src/drivers/cdp/workflow.rs`) — nhãn đã verify: `trigger`, `delay`, `new-tab`, `javascript-code`, `webhook`, `conditions`, `while-loop`, `loop-data`, `insert-data`, `get-text`, `attribute-value`, `event-click`, `forms`, `tab-url`. Interpolation: `{{variables.*}}`, `{{table.*}}`, `{{loopData.*}}`.
- **CDP surface engine thực dùng** — `Runtime.evaluate`, `Page.navigate/reload/enable/getFrameTree/createIsolatedWorld/captureScreenshot`, `Network.setCookie/getCookies/deleteCookies`, `Input.dispatchMouseEvent/dispatchKeyEvent`. → **không có `Network.responseReceived` / `Fetch`** ⇒ mọi đọc dữ liệu phải qua `fetch` **trong page** (đúng decision #1).

### Chưa có (phải tạo)

- **Engine KHÔNG đọc `trigger.data.parameters`** — grep `parameters` trong `worker/src/drivers/cdp/*.rs` và `workflow_resolver/*.rs` = **0**. (Đây là P0 của Phase 1.)
- Engine chưa resolve **`{{secrets@name}}`** (đang là `{{secrets.*}}`).
- Không có `automation.enqueue_job`, `tick_schedules`, `pg_cron` usage, Edge Function.
- `automation.schedules` **không có cột `parameters`**; `automation.jobs` **không có `schedule_id`**, **không có `idempotency_key`**.
- `tools/hrms` **không tồn tại** → adapter viết lại từ §16.

## 5. Nguồn sự thật / tham chiếu audit

### 5.1 Contract workflow (Operon)

| Concern | Tham chiếu | Dùng để |
| --- | --- | --- |
| Workflow model | `cli/src/core/models/workflow.rs` | shape serialize |
| Workflow schema | `cli/schema/workflow.schema.json` | JSON Schema của graph + `$defs.parameter` |
| Validation cấu trúc | `cli/src/core/engine/workflow_resolver/validator.rs` | luật chấp nhận `nodes`/`drawflow` |
| Fixture | `cli/fixtures/google_search.workflow.json` | ví dụ graph hợp lệ |
| Browser executor | `worker/src/drivers/cdp/workflow.rs` | nhãn block, interpolation, loop, cancel |
| Output | `worker/src/protocol/schema.rs` | result, variables, tables, logs |
| Queue/claim | `cloud/supabase/plugins/automation/install.sql` | jobs, claim, reap, schedules |
| Workflow store RPC | cùng file (`public.workflow_*`) | CRUD cloud-first |
| Secret Store | `cloud/supabase/plugins/secrets/install.sql` (v2) · `docs/en/cloud/specs/SPEC-secret-store.md` | credential |
| Browser profile + lease | `cloud/supabase/plugins/browsers/install.sql` | profiles, acquire/release |

### 5.2 Dialect Automa (bắt buộc tuân)

| Concern | Tham chiếu | Dùng để |
| --- | --- | --- |
| Contract tham số + UI tác giả | `/root/automa/src/components/newtab/workflow/edit/EditWorkflowParameters.vue` | cột Name/Type/Placeholder/DefaultValue |
| Prompt giá trị tham số | `/root/automa/src/params/App.vue` (+ `workflow:params`) | form nhập khi chạy tay |
| Engine honour params | `/root/automa/src/workflowEngine/WorkflowEngine.js:157-230` | `checkParams`, `preferParamsInTab` |
| Cú pháp secret | `/root/automa/src/components/newtab/workflow/editor/EditorUsedCredentials.vue` | regex `{{secrets@…}}` |
| Nạp secret | `/root/automa/src/workflowEngine/WorkflowEngine.js:323` | `referenceData.secrets[name]` |
| Composition | `/root/automa/src/utils/workflowData.js` (`includedWorkflows`) | tái sử dụng workflow con |
| Trigger types | `/root/automa/src/components/newtab/workflow/edit/Trigger/*.vue` | cron/interval/date/… |
| Đăng ký trigger | `/root/automa/src/utils/workflowTrigger.js` | map sang lịch cloud |
| Xuất/nhập document | `/root/automa/src/utils/workflowData.js` | envelope export |

### 5.3 Quy tắc audit

1. Không hard-code selector, app id, CSRF token — đọc runtime từ page.
2. Không gửi request mutate khi `mode = dry-run`.
3. Không ghi PII (mã NV, email) vào log.
4. Claim nào không có file/hành vi thật chứng minh ⇒ đánh dấu `ASSUMPTION`.

## 6. Phạm vi

### Trong phạm vi (v1)

- Đọc timesheet kỳ hiện tại qua API HRMS (từ page context).
- Phân tích ngày thiếu giờ theo `absent_time` server trả về.
- Sinh đề xuất `TIME_OFF` (`reason_type` mặc định `LOA_CORP_4`).
- Dry-run mặc định; submit chỉ khi policy cho phép + owner duyệt.
- Output có cấu trúc cho console + `automation.execution_logs`.

### Ngoài phạm vi (v1)

- Tự login headless (login RSA client-side → bắt buộc qua form browser; re-login là bước recovery thủ công).
- Sửa/duyệt đơn trên HRMS UI.
- Nhiều tenant / nhiều nhân viên một lần chạy.
- LLM/classifier — v1 chỉ rule-based.

## 7. Luồng đích

```
[pg_cron 0 8 * * 1-5 Asia/Ho_Chi_Minh]
        │
        ▼
automation.tick_schedules() ──► automation.enqueue_job(workflow='HRMS Timesheet Review')
        │                                   │
        │                                   ▼
        │                        automation.jobs (status=queued, schedule_id, idempotency_key)
        ▼                                   │ pg_notify
   (tick kế tiếp)                 workstation đã enroll (fleet)
                                            │ claim_next_job
                                            ▼
                            acquire_profile('hrms-cmc-03e6b9')   ← lease 1 session
                                            │
                            new-tab(hrms.cmcglobal.com.vn) → javascript-code(session guard)
                                 ├─ không có JWT → fail-fast, release lease, alert
                                 └─ có → JS fetch API timesheet (trong page)
                                            │
                            phân tích absent_time → buckets
                                 (no_absence / existing_request / today_or_future / eligible)
                                            │
                            mode == submit? (policy + owner approved)
                                 ├─ không → ghi kết quả, release lease, done
                                 └─ có → POST đơn TIME_OFF (idempotent), ghi nhận, release lease
```

## 8. Contracts

### 8.1 Contract tham số — SSOT = `trigger.data.parameters[]`

Khai báo trên canvas, lưu trong `graph_data`, validate bởi `workflow.schema.json`:

```jsonc
// graph_data.nodes[label=trigger].data
{
  "type": "manual",                 // ⚠ fleet: KHÔNG được manual (§0.3) → phải là cron/schedule-driven
  "parameters": [
    { "name": "mode",            "type": "select", "defaultValue": "dry-run", "description": "dry-run | submit" },
    { "name": "minLateMinutes",  "type": "number", "defaultValue": 1 },
    { "name": "maxLateMinutes",  "type": "number", "defaultValue": 60 },
    { "name": "reasonType",      "type": "text",   "defaultValue": "LOA_CORP_4" }
  ]
}
```

### 8.2 Thứ tự resolve giá trị (headless)

```
trigger.data.parameters[].defaultValue      ← contract + default (canvas)
        ↓ override bởi
automation.schedules.parameters             ← giá trị theo LỊCH   (cột cần thêm)
        ↓ override bởi
automation.jobs.parameters                  ← giá trị theo LẦN CHẠY (đã có, GIN)
──────────────────────────────────────────
{{secrets@name}}                            ← credential, kênh RIÊNG, không bao giờ trong params
settings{onError, blockDelay, concurrency}  ← hành vi runtime, KHÔNG phải param
```

Quy tắc:
- Chạy tay (canvas/CLI) ⇒ **prompt** (như Automa).
- Chạy fleet/cloud ⇒ prompt **tắt** (`checkParams = false`), resolve theo 3 tầng trên.
- Thiếu giá trị **và** không có default ⇒ **fail-fast**, không dùng fallback trong block.

### 8.3 Publish-time validation (mới)

`public.workflow_upsert` phải chặn:
- param declared không có `defaultValue` **và** không có nguồn giá trị ⇒ reject.
- fleet chạy mà `trigger.type = manual` ⇒ reject.
- graph chứa credential/plaintext (heuristic) ⇒ reject.
- `trigger.data.parameters` trùng tên ⇒ reject.

### 8.4 Enqueue (SQL helper mới)

```sql
-- automation.enqueue_job(p_workflow_id uuid, p_tenant_id uuid, p_schedule_id uuid,
--                        p_parameters jsonb, p_idempotency_key text)
-- Insert automation.jobs (status='queued'), set params_snapshot, fire notify_job_queued().
-- IDEMPOTENT trên (workflow_id, idempotency_key): tick lặp KHÔNG tạo job thứ hai.
```

### 8.5 Scheduler (SQL helper mới + pg_cron)

```sql
-- automation.tick_schedules() → materialize automation.schedules đã tới hạn thành jobs.
-- pg_cron: '0 1 * * 1-5' (UTC)  ⇒ 08:00 Asia/Ho_Chi_Minh, T2–T6
-- idempotency_key = 'hrms:' || date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')
```

### 8.6 Output job (`automation.jobs.result_summary`)

```jsonc
{
  "period": { "from": "2026-09-26", "to": "2026-10-25" },
  "scanned_days": 28,
  "eligible": 0,
  "skipped": { "no_absence": 17, "existing_request": 3, "today_or_future": 1 },
  "submitted": 0,          // = 0 khi dry-run — KHÔNG được khác cho tới khi rollout
  "errors": []
}
```

### 8.7 Schema bổ sung

```sql
alter table automation.jobs      add column schedule_id uuid references automation.schedules(id);
alter table automation.jobs      add column idempotency_key text;
create unique index on automation.jobs (workflow_id, idempotency_key) where idempotency_key is not null;
alter table automation.jobs      add column params_snapshot jsonb;   -- params + workflow version đã chạy
alter table automation.schedules add column parameters jsonb not null default '{}';

create table automation.workflow_state (        -- cursor/state cho workflow incremental
  tenant_id uuid, workflow_id uuid, schedule_id uuid,
  key text, value jsonb, updated_at timestamptz default now(),
  primary key (tenant_id, workflow_id, coalesce(schedule_id, '00000000-0000-0000-0000-000000000000'::uuid), key)
);

alter table automation.workflows drop column variables;   -- cột chết, trùng chức năng trigger params
```

## 9. Các phase

### Phase 1 — Automa schema parity (engine) ← **làm trước tiên**

1. Engine đọc `trigger.data.parameters` → seed vào scope (default + type), tôn trọng namespace interpolation.
2. Resolve **`{{secrets@name}}`** (+ scrub qua masker). Giữ `{{variables.*}}`, `{{table.*}}`, `{{loopData.*}}`.
3. Map `trigger.type` ⇄ nguồn kích hoạt (fleet: từ `automation.jobs`; manual ⇒ reject ở fleet).
4. Honour `settings{onError, blockDelay, concurrency}`; log cảnh báo cho field chưa hỗ trợ (không im lặng).
5. Test: workflow có param declared + chạy headless ⇒ giá trị vào đúng block; thiếu giá trị ⇒ fail-fast.

**Verify:** chạy workflow HRMS không truyền `-p` ⇒ dùng **default từ trigger** (không cần fallback trong block).

### Phase 2 — Re-author workflow trên canvas

1. Khai báo `mode/minLateMinutes/maxLateMinutes/reasonType` ở **`trigger.data.parameters`** (canvas).
2. Xoá mọi credential/plaintext/default nhét trong block; login dùng `{{secrets@name}}`.
3. Đặt `trigger.type` phù hợp chế độ fleet (không `manual`).
4. Upsert qua `workflow_upsert` (đi qua publish-time validation).

**Verify:** `opn automation inspect` pass; `workflow_get` trả `has_cred=false`; validation chặn được graph cố tình để thiếu default.

### Phase 3 — Workstation browser & worker

1. Chạy local dry-run với profile `hrms-cmc-03e6b9`.
2. Lease acquire/release kể cả khi fail (không kẹt lock).
3. Claim đúng ở fleet mode.

**Verify:** 2 run đồng thời không cùng giữ profile; sau run fail không còn `locked_by`.

### Phase 4 — Secrets (`{{secrets@name}}`) + session

1. `opn secret set hrms_username` / `hrms_password` (Secret Store, mã hoá).
2. **Migrate** workflow `a27093ce`: `{{secrets.hrms_*}}` → **`{{secrets@hrms_*}}`**.
3. Session reuse từ snapshot profile — password **không** dùng lúc chạy.
4. `opn secret push` → máy khác `pull` chạy được cùng job.

**Verify:** payload + log không plaintext; máy mới chỉ với `opn secret pull` chạy được; token sai bị từ chối.

### Phase 5 — Cloud scheduling & enqueue

1. Thêm `enqueue_job` + `tick_schedules` + các cột ở §8.7 (**cần owner duyệt schema change**).
2. Tạo row `automation.schedules` (08:00 T2–T6) + entry `pg_cron`.
3. Idempotent mỗi tick.

**Verify:** 1 tick ⇒ đúng 1 job; tick lặp ⇒ 0 job mới.

### Phase 6 — Observability & rollout

1. Summary mỗi run → console + `automation.execution_logs`; alert chỉ khi `errors.length > 0` hoặc session guard fail.
2. Dry-run nhiều ngày công; so sánh kết quả với kỳ vọng owner.
3. Bật `mode=submit` **sau khi owner duyệt**; kill switch = `automation.schedules.is_active = false`.

**Verify:** ngày dry-run ⇒ `submitted = 0`; tắt schedule ⇒ không sinh job mới trong 1 tick.

## 10. First slice

Phase **1 → 2 → 3** ở dry-run, một tenant, một nhân viên, không submit. Deliverable: engine honour params + workflow re-author sạch + kết quả có cấu trúc.

## 11. Lệnh verify

```bash
# Build (xem skill operon-workspace)
# Browser + profile
opn browser profile list
opn browser profile inspect hrms-cmc-03e6b9

# Secrets (dialect mới)
opn secret list && opn secret remote

# Workflow: validate + chạy local (positional = ĐƯỜNG DẪN FILE)
opn automation inspect /tmp/hrms.workflow.json
opn automation run /tmp/hrms.workflow.json -p mode=dry-run     # hoặc KHÔNG -p ⇒ lấy default từ trigger

# Cloud (sau Phase 5)
#   select status, result_summary, params_snapshot from automation.jobs
#   where workflow_id = 'a27093ce-a768-4e3a-bcc1-e4d87da6157c' order by created_at desc limit 5;
```

## 12. Yêu cầu an toàn

- **Zero plaintext** credential trong `graph_data`, payload, log, audit, git — chỉ `{{secrets@name}}`.
- **Một session / một profile** — lease bắt buộc, reap stale lock, không bypass.
- **PII**: mã nhân viên/email chỉ vào job output, mask trong log.
- **Fail closed**: session guard fail / thiếu param / policy deny ⇒ không submit, release lease, alert.
- **Idempotent** trước mọi request mutate (đơn `TIME_OFF`).
- Không `cargo build --release` trên VPS; không push/CI khi chưa được yêu cầu.

## 13. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- |
| Ghi đơn trùng lên HRMS | Cao | idempotency_key + check Pending/Approved + dry-run |
| Hai phiên HRMS song song | Cao | lease `browsers.profiles` + reap stale |
| **Engine bỏ qua canvas declared** | Cao | Phase 1 parity + publish-time validation (§0.3) |
| Login RSA đổi key/flow | Trung bình | dùng form browser (SPA tự mã hoá), không hard-code |
| Session/JWT mất khi đổi máy | Trung bình | snapshot + `opn secret push/pull` |
| Fingerprint bị phát hiện | Trung bình | engine C++ fingerprint-chromium + CreepJS + webrtc shield |
| Hiểu sai `absent_time` | Trung bình | chỉ dùng `absent_time` server |
| Bật submit quá sớm | Cao | policy gate + owner approval |
| ~~Credential plaintext~~ | — | ✅ đã xử lý (verify `has_cred=false`); còn nợ **rotate mật khẩu HRMS tại CMC** |

## 14. Open items

| # | Việc | Trạng thái |
| --- | --- | --- |
| 1 | Cột `idempotency_key` + `schedule_id` + `schedules.parameters` + `workflow_state` | **cần owner duyệt schema change** |
| 2 | Flag CLI chạy workflow đã lưu theo **id** (không chỉ đường dẫn file) | cần xác nhận |
| 3 | Mapping `reason_type` (mặc định `LOA_CORP_4`) | cần xác nhận |
| 4 | Kênh alert "không có ngày đủ điều kiện" | cần chốt |
| 5 | ~~Migrate credential → store~~ | ✅ DONE (dialect sẽ đổi sang `secrets@`) |
| 6 | Profile `hrms-cmc`: dùng proxy hay không? | cần chốt |
| 7 | `browsers.profiles.id` cloud của `hrms-cmc` | xác nhận sau khi tạo |
| 8 | ~~Hướng dispatch~~ | ✅ RESOLVED (a) |
| 9 | Cài & chạy worker trên **máy nào** (VPS chưa có `opn`; `HNDW-NDTU6` là Windows) | **cần chốt — chặn Phase 3** |
| 10 | ~~Engine hỗ trợ secrets~~ | ✅ DONE (đổi dialect ở Phase 4) |
| 11 | ~~Port credential sang máy khác~~ | ✅ DONE (device keypair + sealed DEK) |
| 12 | Xoá `automation.workflows.variables` | theo §8.7 |
| 13 | Verify `globalData` / `table` / `dataColumns` có được engine honour không | Phase 1 |

## 15. Migration từ trạng thái hiện tại

| Việc | Chi tiết |
| --- | --- |
| Workflow `a27093ce` | `{{secrets.hrms_username}}` → `{{secrets@hrms_username}}`; `{{secrets.hrms_password}}` → `{{secrets@hrms_password}}` |
| `trigger.data` | thêm `parameters[]` đầy đủ; đổi `type` khỏi `manual` nếu chạy fleet |
| Block login | xoá fallback credential/default đã nhét trong block |
| `workflows.variables` | drop column |
| Docs | cập nhật mọi chỗ ghi `{{secrets.*}}` → `{{secrets@name}}` (SPEC-secret-store, CLI docs, plan) |

## 16. Reference code (viết lại — `tools/hrms` không còn tồn tại)

```js
// Block: session guard (javascript-code) — chạy trong page context trên hrms.cmcglobal.com.vn
const s = JSON.parse(localStorage.getItem('session_login') || 'null');
if (!s?.access_token) return { ok: false, reason: 'no_hrms_session' };
return { ok: true, userName: s.userName };
```

```js
// Block: đọc + phân tích timesheet (javascript-code)
// LƯU Ý: KHÔNG hard-code credential. Username lấy qua {{secrets@hrms_username}} nếu cần.
const token = JSON.parse(localStorage.getItem('session_login')).access_token;
const me = await (await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })).json();
const employeeId = me.data.userId;                       // bug đã fix: KHÔNG dùng me.data.id

const period = await (await fetch(`/api/timesheets/flexible/${employeeId}/employee/${employeeId}/period`,
  { headers: { Authorization: `Bearer ${token}` } })).json();
const timesheetId = period.data.period.timesheet_id;     // bug đã fix

const sheet = await (await fetch(`/api/timesheets/flexible/${employeeId}/employee/${employeeId}?timesheet_id=${timesheetId}`,
  { headers: { Authorization: `Bearer ${token}` } })).json();
const rows = sheet.data.timesheets;                      // bug đã fix: KHÔNG dùng sheet.data.rows
// ... phân tích absent_time → buckets
```

> Endpoint/field ở trên là bản đã verify trên live API 2026-10-23 (28 ngày, 0 eligible, 17 `no_absence`,
> 3 `existing_request`, 1 `today_or_future`). Phase 2 phải chạy lại và đối chiếu trước khi tin tuyệt đối.
