# Spec: Quản Trị Phiên Chạy Tự Động Hóa & Nhật Ký Thực Thi (`/automation/jobs`)

> **Mã đặc tả:** `SPEC-automation-jobs`  
> **Route URL:** `/automation/jobs` & `/automation/jobs/:id`  
> **PostgreSQL Schema:** `automation` (bảng `automation.jobs` và `automation.execution_logs`)  
> **Foreign Keys:** `workers.devices` (`worker_id`), `automation.workflows` (`workflow_id`)  
> **Phân quyền (RBAC):** `['superadmin', 'automation:jobs:read']` / `automation:jobs:manage`  
> **Kiến trúc nguồn:** [`overview.md`](../architecture/overview.md), [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md)  
> **Liên kết phân hệ:** [`SPEC-automation-browsers.md`](SPEC-automation-browsers.md), [`SPEC-automation-devices.md`](SPEC-automation-devices.md), [`SPEC-automation-proxies.md`](SPEC-automation-proxies.md), [`SPEC-automation-workflow-mobile-first.md`](SPEC-automation-workflow-mobile-first.md)  
> **Ngày cập nhật:** `2026-10-22`  
> **Trạng thái:** **ACCEPTED & IMPLEMENTED**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Đặc tả màn hình Quản trị Phiên chạy Tự động hóa (**Automation Job Runs**) và Nhật ký Thực thi thời gian thực (**Real-time Execution Logs**) trên Web Admin:

1. **Danh sách phiên chạy (`/automation/jobs`):**
   - Nguồn dữ liệu từ bảng **`automation.jobs`** (schema `automation`), liên kết với Worker thực thi qua `worker:worker_id(name)` (`workers.devices`) và kịch bản `workflow:workflow_id(name)` (`automation.workflows`).
   - Hiển thị tiến độ hoàn thành tác vụ (`completed_tasks / total_tasks` kèm thanh tỷ lệ % trực quan).
   - Bộ lọc trạng thái đa chiều (`all`, `pending`, `queued`, `running`, `completed`, `failed`, `cancelled`) và phân trang `useVbenVxeGrid`.
   - Hỗ trợ thao tác Hủy phiên chạy (`cancelJob`) đối với các phiên đang chờ/chạy.

2. **Chi tiết phiên chạy & Nhật ký thực thi (`/automation/jobs/:id`):**
   - Hiển thị metadata phiên chạy qua `VxeForm` (Tên tác vụ, Kịch bản, Worker thực thi, Thông số đầu vào, Tổng kết kết quả, Thời gian bắt đầu/kết thúc).
   - Bảng nhật ký thời gian thực (`automation.execution_logs`) liên kết với `job_id`, phân loại màu theo log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`).
   - **Cơ chế Polling tự động (3000ms):** Khi phiên chạy ở trạng thái active (`pending`, `queued`, `running`), client tự động truy vấn cập nhật tiến độ công việc và log mới (`sinceId`), tự động dừng khi phiên kết thúc hoặc khi người dùng rời trang (`onUnmounted`).

---

## 2. Terminology & Database Schema Truth (Chuẩn Hóa Danh Xưng)

| Thuật ngữ UI / Route | Tên bảng Database | Foreign Key / Tham chiếu | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| **Runs / Jobs** | `automation.jobs` | `id` (PK, UUID) | Phiên thực thi một kịch bản tự động hóa |
| **Worker** | `workers.devices` | `worker_id` (FK -> `workers.devices.id`) | Thiết bị máy trạm / Worker node chịu trách nhiệm chạy Job |
| **Workflow** | `automation.workflows` | `workflow_id` (FK -> `automation.workflows.id`) | Bản thiết kế kịch bản tự động hóa |
| **Execution Logs** | `automation.execution_logs` | `job_id` (FK -> `automation.jobs.id`) | Dòng nhật ký thực thi chi tiết của Job |

> [!IMPORTANT]
> **Quy tắc danh xưng chuẩn:**
> - Tuyệt đối không dùng các thuật ngữ cũ gây nhầm lẫn như `runner` hay `campaign_runs`.
> - Thực thể thực thi tác vụ là **Worker** (`workers.devices`), bản ghi thực thi là **Job** (`automation.jobs`).

---

## 3. API & Interface Contract (`src/api/core/automation.ts`)

Tuân thủ nghiêm ngặt nguyên lý **Resource-Oriented SDK** theo chuẩn `addy-api-and-interface-design`:

```typescript
// ============================================================================
// CONTRACT: AUTOMATION JOBS & LOGS API (PostgreSQL schema: 'automation')
// ============================================================================

export interface ListJobsParams {
  status?: string;
  tenantId?: string;
  workflowId?: string;
}

export interface Job {
  completed_tasks: number;
  created_at: string;
  ended_at: null | string;
  error_message: null | string;
  failed_tasks: number;
  id: string;
  name: string;
  parameters?: Record<string, any>;
  result_summary?: Record<string, any>;
  started_at: null | string;
  status: JobStatus;
  tenant_id: string;
  total_tasks: number;
  worker?: null | { id?: string; name: string };
  worker_id: null | string;
  workflow?: null | { id?: string; name: string };
  workflow_id: null | string;
}

export interface ExecutionLog {
  id: number;
  job_id: string;
  level: LogLevel;
  logged_at: string;
  message: string;
  node_id: null | string;
  payload: Record<string, any>;
  step_name: null | string;
  tenant_id: string;
}

/** Lấy danh sách jobs từ automation.jobs */
export async function listJobs(params?: ListJobsParams): Promise<Job[]>;

/** Chi tiết một job thực thi */
export async function getJob(runId: string): Promise<Job>;

/** Hủy job đang active */
export async function cancelJob(runId: string): Promise<void>;

/** Lấy nhật ký thực thi của job (hỗ trợ phân trang incremental sinceId) */
export async function listExecutionLogs(
  jobId: string,
  options?: { limit?: number; sinceId?: number },
): Promise<ExecutionLog[]>;

// ============================================================================
// NAMESPACED SDK OBJECT
// ============================================================================

export const jobsApi = {
  cancel: cancelJob,
  get: getJob,
  list: listJobs,
  listLogs: listExecutionLogs,
};
```

---

## 4. Giao Diện & Trải Nghiệm Người Dùng (UI/UX)

- **Mobile First & Responsive:** Hỗ trợ xem dạng thẻ co giãn linh hoạt trên màn hình hẹp, tích hợp Sheet chi tiết tương thích mobile.
- **Trạng thái trực quan:**
  - `running`: Badge xanh lục (nhấp nháy / spinning icon).
  - `completed`: Badge xanh lá.
  - `failed`: Badge đỏ (hiển thị `error_message` dạng tooltip/popover).
  - `cancelled`: Badge xám.
  - `queued` / `pending`: Badge vàng cảnh báo.
- **An toàn thao tác:** Xác nhận qua Modal/Dialog trước khi thực hiện Hủy Job (`cancelJob`).

---

## 5. Testing & Verification

```bash
# 1. Chạy unit tests cho API automation & jobs
pnpm --filter @operon/admin-web exec vitest run src/api/core/__tests__/automation.test.ts

# 2. Kiểm tra typecheck TypeScript
pnpm --filter @operon/admin-web run typecheck

# 3. Linter & Format check
npx oxlint apps/web-admin/src/

# 4. Kiểm tra tài liệu VitePress & Cross-links
pnpm -C docs run build
```
