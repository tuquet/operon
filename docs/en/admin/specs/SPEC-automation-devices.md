# Spec: Quản Trị Thiết Bị & Máy Trạm Worker (`/automation/devices`)

> **Mã đặc tả:** `SPEC-automation-devices`  
> **Route URL:** `/automation/devices`  
> **Component:** `apps/web-admin/src/views/automation/devices/index.vue`  
> **PostgreSQL Schema:** `workers.devices`  
> **Phân quyền (RBAC):** `['superadmin', 'workers:devices:read']` / `workers:devices:manage`  
> **Kiến trúc nguồn:** [`overview.md`](../architecture/overview.md), [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md)  
> **Liên kết phân hệ:** [`SPEC-automation-browsers.md`](SPEC-automation-browsers.md), [`SPEC-automation-proxies.md`](SPEC-automation-proxies.md), [`SPEC-automation-jobs.md`](SPEC-automation-jobs.md), [`SPEC-ui-mobile-vxe-detail-sheet.md`](SPEC-ui-mobile-vxe-detail-sheet.md)  
> **Ngày cập nhật:** `2026-10-22`  
> **Trạng thái:** **ACCEPTED & IMPLEMENTED**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Quản trị toàn bộ danh mục **Thiết bị & Máy trạm Worker biên (Worker Fleet Nodes)** tham gia cụm thực thi tự động hóa phân tán:

1. **4 Thẻ Chỉ Số KPI (Realtime Fleet Telemetry):**
   - Tổng số máy trạm (`total_nodes`).
   - Thiết bị trực tuyến (`online_nodes` = `idle` + `busy`).
   - Tác vụ đang chạy trên cụm (`active_jobs`).
   - Thăm dò Loopback Daemon nội bộ qua `probeLocalDaemon(8765)` (an toàn theo tiêu chuẩn W3C Private Network Access).

2. **Lưới Dữ Liệu Thiết Bị (`useVbenVxeGrid`):**
   - Tên thiết bị (`name`), Machine Fingerprint (`machine_fingerprint`).
   - Trạng thái trực tuyến (`idle`, `busy`, `offline`, `maintenance`, `disabled`).
   - Phiên bản Worker daemon (`version`), Hệ điều hành (`os_info`).
   - Phần cứng: Số nhân CPU (`cpu_cores`), Dung lượng RAM (`ram_mb`).
   - Khả năng thực thi (`capabilities`: `browser`, `cdp`...).
   - Tác vụ đang chạy (`active_jobs`), Nhịp tim cuối (`last_heartbeat_at`).

3. **Thao Tác Quản Trị:**
   - Hướng dẫn kết nối máy trạm mới (`ConnectFleetModal` - hiển thị lệnh CLI token kết nối).
   - Xem chi tiết thông số phần cứng (`NodeDetailModal` với `VxeForm`).
   - Thu hồi quyền thiết bị máy trạm (`revokeDevice(id)`).

---

## 2. API & Interface Contract (`src/api/core/automation.ts`)

Tuân thủ nghiêm ngặt nguyên lý **Resource-Oriented SDK** theo chuẩn `addy-api-and-interface-design`:

```typescript
// ============================================================================
// CONTRACT: WORKER DEVICES API (PostgreSQL schema: 'workers')
// ============================================================================

export interface ListDevicesParams {
  search?: string;
  status?: string;
  tenantId?: string;
}

export interface Device {
  active_jobs: number;
  capabilities: string[];
  cpu_cores: number;
  driver_type: string;
  id: string;
  ip_address: string;
  last_heartbeat_at: string;
  machine_fingerprint: string;
  name: string;
  os_info: string;
  ram_mb: number;
  status: DeviceStatus;
  tenant_id: string;
  version: string;
}

/** Lấy danh sách máy trạm từ workers.devices */
export async function listDevices(params?: ListDevicesParams): Promise<Device[]>;

/** Thu hồi quyền hoạt động của một máy trạm */
export async function revokeDevice(deviceId: string): Promise<void>;

/** Thăm dò daemon nội bộ của máy trạm qua loopback */
export async function probeLocalDaemon(port?: number): Promise<{
  activeJobs: number;
  online: boolean;
  version: string;
}>;

// ============================================================================
// NAMESPACED SDK OBJECT
// ============================================================================

export const devicesApi = {
  list: listDevices,
  probeDaemon: probeLocalDaemon,
  revoke: revokeDevice,
};
```

---

## 3. Tech Stack & File Tác Động

- **View Component:** `apps/web-admin/src/views/automation/devices/index.vue`
- **Modals:**
  - `apps/web-admin/src/views/automation/devices/components/connect-fleet-modal.vue`
  - `apps/web-admin/src/views/automation/devices/components/node-detail-modal.vue`
- **Tầng API Client:** `apps/web-admin/src/api/core/automation.ts` (`listDevices`, `revokeDevice`, `probeLocalDaemon`)
- **Schema Registry SSOT:** `apps/web-admin/src/api/core/supabase-schema-registry.ts` (`workers.devices`)
- **Route Definition:** `apps/web-admin/src/router/routes/modules/automation.ts` (`name: 'AutomationDevices', path: 'devices'`)

---

## 4. Testing & Verification

```bash
# 1. Chạy unit tests cho API automation & devices
pnpm --filter @operon/admin-web exec vitest run src/api/core/__tests__/automation.test.ts

# 2. Kiểm tra typecheck TypeScript
pnpm --filter @operon/admin-web run typecheck

# 3. Linter & Format check
npx oxlint apps/web-admin/src/

# 4. Kiểm tra tài liệu VitePress & Cross-links
pnpm -C docs run build
```
