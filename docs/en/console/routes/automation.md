# Đặc Tả Route: Automation Engine & Workers Fleet (Tự Động Hóa & Hạ Tầng Thực Thi)

> **Đường dẫn chính:** `/automation/overview`, `/automation/workflows`, `/automation/jobs`, `/automation/jobs/:id`, `/automation/devices`, `/automation/browsers`, `/automation/proxies`  
> **Module File:** `src/router/routes/modules/automation.ts`  
> **Plugins Quản Lý:** `automation` (cho kịch bản & phiên chạy) và `workers` (cho thiết bị, trình duyệt & proxy)  
> **Schemas Nguồn:** `automation` (`Accept-Profile: automation`) và `workers` (`Accept-Profile: workers`)  
> **Biểu tượng:** `lucide:workflow`

---

## 1. Định Nghĩa Tuyến Đường (Route Definitions)

```typescript
{
  meta: {
    icon: 'lucide:workflow',
    order: 20,
    title: $t('page.automation.title'),
  },
  name: 'Automation',
  path: '/automation',
  redirect: '/automation/overview',
  children: [
    {
      name: 'AutomationWorkflows',
      path: 'workflows',
      component: () => import('#/views/automation/workflows/index.vue'),
      meta: {
        authority: ['superadmin', 'automation:workflows:read'],
        icon: 'lucide:git-branch',
        plugin: 'automation',
        title: $t('page.automation.workflows'),
      },
    },
    {
      name: 'AutomationJobs',
      path: 'runs',
      component: () => import('#/views/automation/jobs/index.vue'),
      meta: {
        authority: ['superadmin', 'automation:campaigns:read'],
        icon: 'lucide:play-circle',
        plugin: 'automation',
        title: $t('page.automation.runs'),
      },
    },
    {
      name: 'AutomationDevices',
      path: 'devices',
      component: () => import('#/views/automation/devices/index.vue'),
      meta: {
        authority: ['superadmin', 'workers:devices:read'],
        icon: 'lucide:laptop',
        plugin: 'workers',
        title: $t('page.automation.devices'),
      },
    },
    {
      name: 'AutomationBrowsers',
      path: 'browsers',
      component: () => import('#/views/automation/browsers/index.vue'),
      meta: {
        authority: ['superadmin', 'workers:browsers:read'],
        icon: 'lucide:globe',
        plugin: 'workers',
        title: $t('page.automation.browsers'),
      },
    },
    {
      name: 'AutomationProxies',
      path: 'proxies',
      component: () => import('#/views/automation/proxies/index.vue'),
      meta: {
        authority: ['superadmin', 'workers:proxies:read'],
        icon: 'lucide:network',
        plugin: 'workers',
        title: $t('page.automation.proxies'),
      },
    },
    {
      name: 'AutomationRunDetail',
      path: 'runs/:id',
      component: () => import('#/views/automation/jobs/detail.vue'),
      meta: {
        authority: ['superadmin', 'automation:logs:read'],
        hideInMenu: true,
        icon: 'lucide:file-text',
        plugin: 'automation',
        title: $t('page.automation.runDetail'),
      },
    },
  ],
}
```

---

## 2. Chi Tiết Từng Tuyến Con (Sub-routes)

### 2.1. Quy Trình Tự Động Hóa: `/automation/workflows` (`automation`)

- **Mục Đích:** Quản lý danh mục các sơ đồ quy trình tự động hóa đồ họa (Automa Canvas Schemas).
- **Nguồn Dữ Liệu:** Bảng `automation.workflows`.
- **API Client:** `getWorkflowsApi(filter)` với `{ schema: 'automation' }`.
- **Giao Diện:** Bảng dữ liệu `useVbenVxeGrid` tích hợp thanh lọc `formOptions` theo trạng thái (`published`, `draft`, `archived`) và từ khóa tìm kiếm.

### 2.2. Lịch Sử Thực Thi: `/automation/jobs` (`automation`)

- **Mục Đích:** Theo dõi tiến độ chạy của các đợt chiến dịch hoặc tác vụ tự động hóa hàng loạt.
- **Nguồn Dữ Liệu:** Bảng `automation.jobs`.
- **API Client:** `getCampaignRunsApi(filter)` với `{ schema: 'automation' }`.
- **Các Chỉ Số Tính Toán:**
  - **Tiến độ (%):** Tính toán qua `calculateProgressPercentage(completed_tasks, total_tasks)`.
  - **Thời gian chạy (Duration):** Tính khoảng cách giữa `started_at` và `ended_at` (hoặc thời điểm hiện tại nếu run đang chạy).

### 2.3. Chi Tiết Lần Chạy & Console Nhật Ký: `/automation/jobs/:id` (`automation`)

- **Mục Đích:** Giám sát trực tiếp quá trình thực thi, xem log đầu ra chi tiết của từng bước và hủy tác vụ khi cần.
- **Nguồn Dữ Liệu:** `automation.jobs` và `automation.execution_logs`.
- **Giao Diện:** Biểu mẫu thông tin chi tiết xây dựng trên `VxeForm` kết hợp Terminal Logs Viewer nền tối.
- **Cơ Chế Polling Động (3-Second Live Polling):**
  - Khi lần chạy ở trạng thái chưa kết thúc (`pending`, `queued`, `running`), hệ thống tự động kích hoạt bộ đếm thời gian polling **mỗi 3000ms** để cập nhật tiến độ và tải thêm các dòng log mới nhất.
  - Khi lần chạy chuyển sang trạng thái kết thúc (`completed`, `failed`, `cancelled`) hoặc khi unmount component, timer lập tức được giải phóng.
- **Hành Động Hủy Lần Chạy (Cancel Run):**
  - Kích hoạt hàm `cancelJobApi(id)` gửi lệnh PATCH cập nhật `status = 'cancelled'` lên `automation.jobs`.

### 2.4. Thiết Bị & Máy Trạm: `/automation/devices` (`workers`)

- **Mục Đích:** Giám sát toàn bộ các worker nodes (máy trạm Desk chạy macOS, Windows, Linux hoặc headless cloud VPS workers).
- **Nguồn Dữ Liệu:** Bảng `workers.devices`.
- **API Client:** `getFleetDevicesApi(filter)` với `{ schema: 'workers' }`.
- **Các Thành Phần Giao Diện:**
  - **Metric Cards (`fleet-metrics.vue`):** 4 thẻ đo đếm (Tổng số máy trạm, Thiết bị trực tuyến, Tác vụ đang chạy, trạng thái Loopback Daemon `:8765`).
  - **Bảng `useVbenVxeGrid`:** Hiển thị chi tiết phần cứng (OS, RAM, CPU, Fingerprint, Heartbeat cuối) kèm bộ lọc trạng thái (`idle`, `busy`, `offline`, `maintenance`).
  - **Modals:**
    - `connect-fleet-modal.vue`: Hướng dẫn ghép nối thiết bị qua CLI hoặc cầu nối SSO.
    - `node-detail-modal.vue`: Chi tiết telemetry phần cứng của thiết bị hiển thị qua `VxeForm`.

### 2.5. Hồ Sơ Trình Duyệt: `/automation/browsers` (`workers`)

- **Mục Đích:** Kiểm soát danh sách các hồ sơ trình duyệt Chromium chuyên dụng được vận hành bởi Automator workers.
- **Nguồn Dữ Liệu:** Bảng `workers.browsers`.
- **API Client:** `getFleetBrowsersApi(filter)` với `{ schema: 'workers' }`.
- **Thông Tin Hiển Thị (`useVbenVxeGrid`):** Tên hồ sơ, Phiên bản engine, Hệ điều hành, Proxy gắn kết, Thiết bị đang giữ khóa (`locked_by_device`), Dung lượng lưu trữ & số lượng cookies, Trạng thái (`idle`, `running`, `syncing`, `error`).

### 2.6. Pool Proxy Mạng: `/automation/proxies` (`workers`)

- **Mục Đích:** Giám sát pool proxy phân tán phục vụ thu thập dữ liệu và tác vụ tự động hóa.
- **Nguồn Dữ Liệu:** Bảng `workers.proxies`.
- **API Client:** `getFleetProxiesApi(filter)` với `{ schema: 'workers' }`.
- **Thông Tin Hiển Thị (`useVbenVxeGrid`):** Endpoint (`protocol://host:port`), Quốc gia / Thành phố, Phân loại (`Residential` / `Datacenter`), Độ trễ kết nối (`latency_ms`), Số lỗi tích lũy, Trạng thái (`active`, `failing`, `testing`, `disabled`).

---

## 3. Lưu Ý Kỹ Thuật (Gotchas & Guardrails)

1. **Phân Tách Plugin Gate Cấp Tuyến Con:**
   - Tuyến cha `/automation` chứa cả các tuyến thuộc plugin `automation` và `workers`. Hàm `filterRoutesByPlugins()` lọc độc lập từng tuyến con và chỉ ẩn `/automation` khi cả 2 plugin đều chưa cài đặt.
2. **Không Sử Dụng Supabase Realtime WebSocket Cho Logs (Quyết định D3):**
   - Bảng `automation.execution_logs` không đưa vào `supabase_realtime` publication để bảo vệ WebSocket worker. Cơ chế Polling 3s có điều kiện dừng là giải pháp chuẩn.
3. **Bắt Buộc Schema Header:**
   - Các truy vấn tới `automation.*` phải truyền `{ schema: 'automation' }` và các truy vấn tới `workers.*` phải truyền `{ schema: 'workers' }`.
