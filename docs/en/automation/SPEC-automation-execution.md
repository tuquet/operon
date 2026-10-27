# Spec: Điều Phối Thực Thi Tự Động Hóa (Queue → Worker → Scheduler)

> **Mã đặc tả:** `SPEC-automation-execution`
> **PostgreSQL Schema:** `automation` (bảng `jobs`, `schedules`, `execution_logs`), `workers.devices`
> **RPC surface:** `automation.enqueue_job`, `automation.tick_schedules`, `automation.claim_next_job`, `automation.finish_job`, `automation.log_job_events`, `automation.renew_job_lease`, `automation.reap_stale_jobs`, `automation.cron_matches`, `automation.cron_field_matches`
> **Worker-facing (public schema, device-token auth):** `public.automation_claim_jobs`, `public.automation_finish_job`, `public.automation_renew_job_lease`, `public.automation_log_job_events`
> **Phân quyền (RBAC):** `automation:jobs:read` · `automation:jobs:manage` · `automation:schedules:manage`; mọi hàm `SECURITY DEFINER` chỉ gọi được bởi `service_role` hoặc tenant sở hữu
> **Liên kết:** [`SPEC-automation-jobs`](../admin/specs/SPEC-automation-jobs.md) · [`SPEC-secret-store`](../cloud/specs/SPEC-secret-store.md) · [`Block Coverage & Automa Parity`](./blocks.md) · [`Workflow Automation`](./index.md)
> **Ngày cập nhật:** `2026-10-24`
> **Trạng thái:** **ACCEPTED — chờ triển khai (Phase 3 + Phase 5)**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Đặc tả **đường vận hành** của automation: biến workflow (đã có engine + contract) thành thứ **chạy được theo lịch trên fleet**, thay vì chỉ chạy tay trên máy dev.

Ba mảnh còn thiếu — đây là toàn bộ phạm vi:

| # | Mảnh | Vấn đề hiện tại (đã kiểm chứng) |
| :-- | :--- | :--- |
| 1 | **Hàng đợi** | `automation.claim_next_job` tồn tại nhưng **0 caller**; **không có chỗ nào** `INSERT INTO automation.jobs` ⇒ cloud không giao được việc |
| 2 | **Lịch chạy** | Không có `enqueue_job`/`tick_schedules`, không có pg_cron; `automation.schedules` **thiếu cột `parameters`** |
| 3 | **Chống chạy trùng** | Không có `idempotency_key` ⇒ rủi ro double-approve (HRMS) / double-DM |

**Ngoài phạm vi:** thay đổi định dạng document workflow (đã chốt ở [`blocks.md`](./blocks.md)); Secret Store (đã có SPEC riêng); UI console (đã có [`SPEC-automation-jobs`](../admin/specs/SPEC-automation-jobs.md)).

---

## 2. Terminology & Database Schema Truth

| Thuật ngữ | Bảng / Cột thật | Ý nghĩa |
| :--- | :--- | :--- |
| **Job / Run** | `automation.jobs` | Một phiên thực thi của một workflow |
| **Schedule** | `automation.schedules` | Một biểu thức cron gắn với workflow, sinh job theo thời gian |
| **Slot** | (không phải bảng) | Mốc thời gian một schedule phải nổ; dùng làm khoá chống trùng |
| **Lease** | `automation.jobs.lease_expires_at` | Quyền sở hữu job có thời hạn của một worker |
| **Worker / Node** | `workers.devices` | Máy trạm chạy job (`worker_id`, `last_heartbeat_at`, `status`) |
| **Step log** | `automation.execution_logs` | Log từng bước của engine, gắn `job_id` |
| **Kênh secret** | Secret Store (`\{\{secrets@name\}\}`) | **Không phải** nguồn tham số; là kênh riêng, chỉ resolve lúc chạy |

Trạng thái job là enum thật `automation.job_status`:
`pending · queued · running · paused · completed · failed · cancelled`.

---

## 3. Hiện Trạng vs Mục Tiêu

| Hạng mục | Hiện tại | Sau đặc tả này |
| :--- | :--- | :--- |
| `claim_next_job(p_worker_id, p_batch_size)` | ✅ có (FIFO, `FOR UPDATE SKIP LOCKED`, set `running`) | giữ, **bổ sung lease + attempts** |
| `reap_stale_jobs(p_stale_interval)` | ✅ có (theo heartbeat worker) | giữ, **thêm nhánh lease hết hạn + retry** |
| `execution_logs` | ✅ có | giữ |
| `jobs.parameters` | ✅ có (GIN) | giữ |
| `schedules` | ✅ có (`cron_expression`, `timezone`, `next_run_at`, `last_run_at`, `is_active`) | **+ `parameters`, + `allow_overlap`** |
| `enqueue_job` | ❌ | ✅ mới |
| `tick_schedules` + `cron_matches` + pg_cron | ❌ | ✅ mới |
| `finish_job` + `log_job_events` | ❌ (worker hiện chỉ ghi sqlite local) | ✅ mới |
| `idempotency_key` | ❌ | ✅ mới |
| Vòng claim trong worker | ❌ (worker chỉ nhận `DispatchJob` qua WS) | ✅ mới |

---

## 4. Mô Hình Dữ Liệu (DDL)

Tất cả **idempotent** (`IF NOT EXISTS`) để chạy lại an toàn; migration không phá dữ liệu hiện có.

```sql
-- 4.1 jobs: chống trùng, truy vết nguồn, lease & retry
ALTER TABLE automation.jobs ADD COLUMN IF NOT EXISTS schedule_id      UUID REFERENCES automation.schedules(id) ON DELETE SET NULL;
ALTER TABLE automation.jobs ADD COLUMN IF NOT EXISTS idempotency_key  TEXT;
ALTER TABLE automation.jobs ADD COLUMN IF NOT EXISTS params_snapshot  JSONB;          -- tham số ĐÃ resolve tại thời điểm enqueue (audit)
ALTER TABLE automation.jobs ADD COLUMN IF NOT EXISTS attempts         INT NOT NULL DEFAULT 0;
ALTER TABLE automation.jobs ADD COLUMN IF NOT EXISTS max_attempts     INT NOT NULL DEFAULT 1 CHECK (max_attempts >= 1);
ALTER TABLE automation.jobs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

-- Chống chạy trùng: một (tenant, workflow, key) chỉ tồn tại một job
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_jobs_idempotency
    ON automation.jobs (tenant_id, workflow_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Hàng đợi & lease
CREATE INDEX IF NOT EXISTS idx_automation_jobs_queue
    ON automation.jobs (tenant_id, status, created_at)
    WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_automation_jobs_lease
    ON automation.jobs (status, lease_expires_at)
    WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_automation_jobs_schedule ON automation.jobs (schedule_id, created_at DESC);

-- 4.2 schedules: tham số đầu vào + chính sách chồng lấn
ALTER TABLE automation.schedules ADD COLUMN IF NOT EXISTS parameters     JSONB   NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE automation.schedules ADD COLUMN IF NOT EXISTS allow_overlap  BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_automation_schedules_due ON automation.schedules (next_run_at) WHERE is_active;
```

**Quy tắc:** không thêm cột dư. `params_snapshot` là **bản chụp** để audit; `jobs.parameters` vẫn là nguồn chạy (giữ tương thích SPEC-automation-jobs).

---

## 5. Vòng Đời Job (State Machine)

```
                 enqueue_job                claim_next_job                 finish_job
  (không có) ──▶ pending ──▶ queued ──────────────▶ running ──────────▶ completed
                    │            │                      │  │
                    │            │                      │  └─▶ failed (hết attempts / engine lỗi)
                    │            │                      └────▶ queued  (lease hết hạn, attempts < max)
                    │            └────▶ cancelled (user huỷ trước khi claim)
                    └────▶ cancelled
```

| Chuyển trạng thái | Ai thực hiện | Điều kiện |
| :--- | :--- | :--- |
| `→ pending` / `→ queued` | `enqueue_job` | `queued` khi có worker khả dụng (mặc định enqueue thẳng `queued`) |
| `queued → running` | `claim_next_job` | worker hợp lệ (`workers.devices.status IN ('idle','running')`), set `worker_id`, `started_at`, `lease_expires_at`, `attempts += 1` |
| `running → completed` | `finish_job` | engine trả `workflow_finished` |
| `running → failed` | `finish_job` hoặc `reap_stale_jobs` | engine lỗi, hoặc lease hết hạn và `attempts >= max_attempts` |
| `running → queued` | `reap_stale_jobs` | lease hết hạn **và** `attempts < max_attempts` (retry) |
| `pending/queued → cancelled` | user (RBAC `automation:jobs:manage`) | chưa claim |

`paused` giữ nguyên cho tương lai (chưa dùng trong đặc tả này).

---

## 6. Nguồn Tham Số & Thứ Tự Hợp Nhất

Thứ tự hợp nhất (sau thắng trước) — **đúng một nguồn cho mỗi giá trị**:

```
1. trigger.data.parameters[].defaultValue   ← hợp đồng khai báo trên canvas (schema enforce)
2. schedules.parameters                     ← ghi đè theo lịch (fleet)
3. jobs.parameters                          ← ghi đè theo phiên chạy (thủ công / API)
──────────────────────────────────────────
   secrets                                   ← kênh RIÊNG, không trộn vào 3 tầng trên
```

- `params_snapshot` = kết quả sau bước (3), lưu tại thời điểm enqueue.
- Thiếu tham số bắt buộc ⇒ **fail-fast** lúc chạy (engine đã làm), không im lặng dùng rỗng.
- Validation lúc publish (`automation.validate_workflow_graph`) vẫn là chốt đầu tiên.

---

## 7. `automation.enqueue_job`

```sql
CREATE OR REPLACE FUNCTION automation.enqueue_job(
    p_tenant_id       UUID,
    p_workflow_id     UUID,
    p_name            TEXT        DEFAULT NULL,
    p_parameters      JSONB       DEFAULT '{}'::jsonb,
    p_schedule_id     UUID        DEFAULT NULL,
    p_idempotency_key TEXT        DEFAULT NULL,
    p_triggered_by    UUID        DEFAULT NULL,
    p_max_attempts    INT         DEFAULT 1
) RETURNS automation.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = automation, public, pg_temp
```

**Hành vi**
1. Xác thực workflow thuộc `p_tenant_id` và `status = 'published'`; ngược lại `RAISE EXCEPTION` (`workflow_not_found` / `workflow_not_published`).
2. Hợp nhất tham số theo §6, ghi vào `parameters` và `params_snapshot`.
3. Nếu `p_idempotency_key` khác NULL và đã tồn tại job cùng `(tenant_id, workflow_id, key)` ⇒ **trả về job cũ, KHÔNG tạo mới** (không phải lỗi — đây là hành vi chống trùng).
4. Ngược lại tạo job `status = 'queued'`, `attempts = 0`.
5. `name` mặc định: `workflow.name || ' · ' || to_char(now(), 'YYYY-MM-DD HH24:MI')`.

**Khoá chống trùng chuẩn (do scheduler sinh):**

```
schedule:<schedule_id>:<slot ISO8601 UTC>       ví dụ: schedule:8f3…:2026-10-25T01:00:00Z
```

Slot = `date_trunc('minute', now())` tại thời điểm tick ⇒ mỗi mốc lịch chỉ sinh **đúng một** job, kể cả khi tick chạy lặp.

---

## 8. Scheduler: `cron_matches` + `tick_schedules` + pg_cron

```sql
CREATE OR REPLACE FUNCTION automation.cron_matches(p_expr TEXT, p_ts TIMESTAMPTZ) RETURNS BOOLEAN
CREATE OR REPLACE FUNCTION automation.tick_schedules(p_now TIMESTAMPTZ DEFAULT now()) RETURNS INT
```

- `cron_matches` hỗ trợ cú pháp cron 5 trường chuẩn: `*`, danh sách `a,b`, khoảng `a-b`, bước `*/n`, `a-b/n`.
- `tick_schedules(p_now)`:
  1. Với mỗi schedule `is_active` có `next_run_at IS NULL OR next_run_at <= p_now`:
  2. Tính thời điểm theo **timezone của schedule**: `p_now AT TIME ZONE s.timezone`, rồi kiểm `cron_matches(s.cron_expression, ts_local)`.
  3. Khớp ⇒ gọi `enqueue_job(..., p_idempotency_key := 'schedule:'||s.id||':'||slot)`, cập nhật `last_run_at`, `next_run_at = p_now + interval '1 minute'`.
  4. **Chính sách chồng lấn:** nếu `s.allow_overlap = FALSE` và còn job của schedule này ở trạng thái `queued`/`running` ⇒ **bỏ qua slot** (không xếp hàng chồng).
  5. **Slot bị lỡ:** không chạy bù (mặc định `skip`); mỗi slot lỡ chỉ được ghi log, không enqueue.
  6. Trả về số job đã tạo.

**Nhịp chạy:** pg_cron gọi mỗi phút

```sql
SELECT cron.schedule('operon_automation_tick', '* * * * *', $$SELECT automation.tick_schedules()$$);
SELECT cron.schedule('operon_automation_reap', '* * * * *', $$SELECT automation.reap_stale_jobs()$$);
```

> Timezone **không** nằm ở cron expression mà ở `schedules.timezone` (mặc định `Asia/Ho_Chi_Minh` cho tenant Việt Nam) — để đổi múi giờ không phải sửa biểu thức.

---

## 9. Claim, Lease, Retry

`claim_next_job(p_worker_id, p_batch_size)` được **bổ sung**:

```sql
SET worker_id = p_worker_id,
    status = 'running',
    started_at = COALESCE(r.started_at, now()),
    attempts = r.attempts + 1,
    lease_expires_at = now() + (p_lease INTERVAL DEFAULT INTERVAL '15 minutes')
```

- **Heartbeat** đã có ở `workers.devices.last_heartbeat_at` (worker gửi định kỳ).
- Worker đang chạy job **gia hạn lease** mỗi nhịp heartbeat (xem §10).
- `reap_stale_jobs` xử lý hai tín hiệu:
  1. worker chết (`last_heartbeat_at` cũ hơn ngưỡng) — như hiện tại;
  2. **lease hết hạn** (`lease_expires_at < now()`).
  Với mỗi job: `attempts < max_attempts` ⇒ trả về `queued` (retry, ghi `error_message` lần trước); ngược lại ⇒ `failed`.
- **Backoff:** retry đặt `created_at`-order tự nhiên; worker chờ tối thiểu `poll_interval` trước khi claim lại. Không cần backoff luỹ thừa ở tầng DB (số lần thử rất nhỏ).

---

## 10. Vòng Claim Trong Worker

Bổ sung vào worker (Rust) cạnh đường `DispatchJob` hiện có:

| Biến môi trường | Mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `TQ_CLAIM_ENABLED` | `0` | Bật vòng claim từ cloud |
| `TQ_CLAIM_INTERVAL` | `15s` | Nhịp poll (có jitter ±20%) |
| `TQ_CLAIM_BATCH` | `1` | Số job mỗi lần claim |
| `TQ_MAX_CONCURRENT_JOBS` | `1` | Trần job chạy song song |
| `TQ_JOB_LEASE` | `15m` | Thời hạn lease, gia hạn mỗi heartbeat |

Trình tự: `claim_next_job` → chạy engine (như `DispatchJob`) → `finish_job(status, result_summary, error_message)` → đẩy step logs qua `log_job_events` → lặp.

- **Shutdown mềm:** nhận `SIGTERM` ⇒ ngừng claim, chờ job đang chạy xong (tối đa `grace`), nếu quá hạn thì để lease hết hạn cho reaper xử lý.
- **Idempotency phía worker:** nếu job đã `completed` (do retry/trùng) ⇒ bỏ qua, không chạy lại.
- Đường `DispatchJob` (đẩy tay từ CLI/console) **giữ nguyên** — claim là bổ sung, không thay thế.

---

## 11. Bảo Mật & Che Secret (bắt buộc cho MỌI đường chạy)

1. Secret chỉ resolve **lúc chạy**, từ Secret Store; **không** vào `jobs.parameters`, `params_snapshot`, `graph_data`, log.
2. **Mọi** đường thực thi phải đăng ký secret với masker **trước** khi chạy engine — kể cả đường local của CLI (hiện `cli/src/core/engine/job_coordinator.rs` **chưa có masker** ⇒ lỗ hổng đã biết, phải bịt trong đợt này).
3. `log_job_events` phải chạy qua masker trước khi ghi `execution_logs`.
4. `params_snapshot` lưu **sau** khi thay secret placeholder, không lưu giá trị secret.

---

## 12. Relay / Webhook (yêu cầu bảo mật đi kèm)

`operon-error-relay` khai báo `WEBHOOK_SECRET` nhưng **không kiểm** ⇒ ai có URL đều bơm được alert vào group. Yêu cầu: xác thực HMAC-SHA256 trên body (`X-Operon-Signature`), so sánh **constant-time**, từ chối 401 khi sai/thiếu; giữ đường cũ trong 1 nhịp deploy để không mất alert (bật kiểm ở relay trước, client gửi kèm sau).

---

## 13. Observability

| Kênh | Nội dung |
| :--- | :--- |
| `automation.execution_logs` | Log từng bước (đã có), nay do worker đẩy lên qua `log_job_events` |
| Telegram | Job `failed` ⇒ alert vào group `-5079028223` (Tu Quet - Notification) kèm `job_id`, workflow, worker, lỗi |
| Metrics tối thiểu | `queued_depth`, `running_count`, `stale_reaped_total`, `tick_enqueued_total`, `claim_latency_ms` |

---

## 14. RBAC & RPC Surface

| Hàm | Ai gọi được | Ghi chú |
| :--- | :--- | :--- |
| `enqueue_job` | `service_role`, worker cùng tenant | validate tenant + workflow published |
| `tick_schedules` / `reap_stale_jobs` | pg_cron (`service_role`) | SECURITY DEFINER |
| `claim_next_job` / `finish_job` / `renew_job_lease` / `log_job_events` | worker (định danh bằng `device_token`) | chỉ job của worker/tenant mình |
| `public.automation_*` (wrapper) | worker qua PostgREST | xác thực `sha256(device_token)` so với `workers.devices.device_token_hash`, rồi kiểm `worker_id = p_device_id` |
| Đọc jobs/logs | `automation:jobs:read` | như SPEC-automation-jobs |

PostgREST production chỉ expose schema `public` ⇒ console gọi qua wrapper `public.automation_jobs_*` (SECURITY INVOKER), đúng quy ước hiện có.

---

## 15. Tiêu Chí Nghiệm Thu (chạy thật, không mock)

| # | Kịch bản | Kỳ vọng |
| :-- | :--- | :--- |
| A1 | Tạo schedule `0 8 * * 1-5` (`Asia/Ho_Chi_Minh`) + `tick_schedules` tại 08:00 VN | sinh **1** job `queued`, `params_snapshot` đúng thứ tự hợp nhất |
| A2 | Gọi `tick_schedules` lần hai cùng phút | **không** sinh thêm job (idempotency theo slot) |
| A3 | `enqueue_job` hai lần với cùng `idempotency_key` | lần hai trả về **cùng job id** |
| A4 | Worker bật `TQ_CLAIM_ENABLED=1` | claim job → `running` → chạy engine thật → `completed`, `execution_logs` có log từng bước |
| A5 | Giết worker giữa chừng, chờ lease hết hạn | job về `queued` (nếu `attempts < max_attempts`) hoặc `failed`, `error_message` ghi rõ |
| A6 | Workflow HRMS chạy theo lịch, submit ở chế độ dry-run | 9 bước, không submit, log đẩy lên cloud |
| A7 | Chạy local (CLI) với secret | log **không** chứa plaintext secret (kiểm bằng grep) |

---

## 16. Migration & Rollout

1. Áp `install.sql` (idempotent) lên `operon-cloud` — không downtime, không phá dữ liệu.
2. Bật pg_cron 2 job (`tick`, `reap`) sau khi `tick_schedules` được verify trên staging.
3. Bật `TQ_CLAIM_ENABLED=1` **trên một worker** trước, theo dõi `queued_depth` + `stale_reaped_total`.
4. Console: hiển thị `schedule_id`, `attempts`, `params_snapshot` ở trang chi tiết job (mở rộng SPEC-automation-jobs).
5. Rollback: `TQ_CLAIM_ENABLED=0` + `cron.unschedule` — không cần revert schema (cột mới nullable/default).

---

## 17. Decision Log

| # | Quyết định | Lý do |
| :-- | :--- | :--- |
| D1 | Job-level retry **chỉ** khi lease hết hạn / worker chết | Tránh retry mù che lỗi logic; engine đã có `restartTimes` cho lỗi trong-workflow |
| D2 | Idempotency theo **slot** cho schedule, theo **key** cho API | Schedule có khoá tự nhiên (thời gian); API cần khoá do người gọi |
| D3 | Không chạy bù slot lỡ | Đúng ngữ nghĩa vận hành (tránh dồn việc); ghi log để quan sát |
| D4 | `allow_overlap` mặc định FALSE | An toàn cho nghiệp vụ có side-effect (submit timesheet, gửi DM) |
| D5 | Timezone ở `schedules.timezone`, không nhét vào cron expr | Đổi múi giờ không phải viết lại biểu thức |
| D6 | Claim là **bổ sung**, không thay `DispatchJob` | Đường local/console đang chạy tốt, không phá |
| D7 | `params_snapshot` lưu bản đã resolve | Audit được "phiên này chạy với tham số nào" |
| D8 | `claim_jobs` trả **envelope** (job + document + tham số) trong 1 lời gọi | Worker không cần round-trip thứ hai để lấy workflow |
| D9 | Chỉ `idle`/`busy` được nhận việc | `workers.device_status` = `{offline, idle, busy, maintenance, disabled}` — **không tồn tại `running`** (hàm cũ so sánh `'running'` nên lỗi 22P02 khi gọi) |
