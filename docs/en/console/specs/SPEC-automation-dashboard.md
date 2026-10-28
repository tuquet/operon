# Spec: Trang Tổng Quan Tự Động Hóa (`/automation/overview`) & Tinh Gọn Giao Diện Danh Sách Mobile-First (`automation-dashboard`)

> **Mã đặc tả:** `SPEC-automation-dashboard`  
> **Module id:** `automation-dashboard` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md), [`SPEC-automation-jobs.md`](SPEC-automation-jobs.md), [`SPEC-automation-browsers.md`](SPEC-automation-browsers.md), [`SPEC-cross-i18n-en-vi.md`](SPEC-cross-i18n-en-vi.md)  
> **Trạng thái:** **ĐÃ NGHIỆM THU & TRIỂN KHAI 100% (ACCEPTED & IMPLEMENTED)**

---

## 1. Assumptions (Các Giả Định Đã Xác Nhận Với Người Dùng)

1. **Vị trí định tuyến Dashboard Automation:** Đặt tại `/automation/overview` (`name: 'AutomationOverview'`), nằm ở vị trí đầu tiên trong menu **Tự động hóa (`/automation`)** và là trang đích mặc định khi truy cập `/automation` (`redirect: '/automation/overview'`).
2. **Phạm vi lược bỏ khối thống kê ở màn hình chính:** Lược bỏ hoàn toàn các khối thẻ KPI (`FleetMetrics` trên `/automation/devices`) và thanh `Stats Bar` nội bộ (`border-b` phía trên bảng) tại **5 màn hình danh sách thuộc nhánh `/automation/*`** (`workflows`, `runs`, `devices`, `browsers`, `proxies`), gom toàn bộ chỉ số thống kê về `/automation/overview`.
3. **Tối ưu trải nghiệm Mobile (`< 640px`):** Thu gọn đồng thời phần Page Header (1 hàng ngang, ẩn mô tả phụ dài trên mobile) và bộ lọc `VbenForm` (`grid-cols-2` gọn gàng thay vì xếp chồng dọc 1 cột), giảm khoảng đệm thừa để bảng `VxeGrid` hiển thị ngay trong tầm nhìn đầu tiên (above the fold) trên điện thoại.
4. **Đa ngôn ngữ 100% (`en-US` & `vi-VN`):** Toàn bộ chuỗi văn bản mới trên `/automation/overview` tuân thủ chuẩn từ điển 3 tầng (`common.*`, `term.*`, `page.automation_view.*`) và quy tắc `Sentence case` tiếng Việt từ [`SPEC-cross-i18n-en-vi.md`](SPEC-cross-i18n-en-vi.md).

---

## 2. Objective (Mục Tiêu & Phạm Vi)

Tách biệt rõ **tầng giám sát thống kê (`Overview Dashboard`)** và **tầng thao tác dữ liệu (`Operational Data Grids`)** trong phân hệ Tự động hóa (`/automation/*`), giúp người dùng trên thiết bị di động thao tác bảng dữ liệu nhanh, thoáng và không phải cuộn qua nhiều tầng thẻ thống kê:

1. **Xây dựng Trang Tổng Quan Tự Động Hóa (`/automation/overview`):**
   - Tập trung toàn bộ chỉ số sức khỏe hạ tầng và tiến độ thực thi từ cả 2 schema `automation` và `workers` vào một màn hình điều phối duy nhất:
     - **Khối Hạ tầng Runner & Loopback Daemon (`FleetMetrics`):** Tổng thiết bị (`total_nodes`), Thiết bị trực tuyến (`online_nodes`), Tác vụ đang chạy (`active_jobs`), và Trạng thái cổng Loopback (`:8765` Online/Standby) — bố cục `grid-cols-2 lg:grid-cols-4` gọn gàng trên mobile.
     - **Lưới 5 Thẻ Điều Hướng Nhanh Phân Hệ (`Resource Breakdown Cards` — `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`):**
       1. **Quy trình (`Workflows`):** Tổng số kịch bản + phân bổ `published / draft / archived` $\rightarrow$ nhấn để mở `/automation/workflows`.
       2. **Chiến dịch chạy (`Runs`):** Tổng số phiên chạy + `running / completed / failed` $\rightarrow$ nhấn để mở `/automation/jobs`.
       3. **Thiết bị (`Devices`):** Số máy trạm `online / total` + `busy / idle` $\rightarrow$ nhấn để mở `/automation/devices`.
       4. **Hồ sơ trình duyệt (`Browsers`):** Tổng hồ sơ + `running / idle / error` $\rightarrow$ nhấn để mở `/automation/browsers`.
       5. **Bể Proxy (`Proxies`):** Tổng proxy + `active / failing` & độ trễ trung bình (`avgLatencyMs`) $\rightarrow$ nhấn để mở `/automation/proxies`.
     - **Bảng Hoạt Động Gần Đây (`Recent Campaign Runs & Active Devices`):** Hiển thị 5 phiên chạy mới nhất (kèm tiến độ `%` và liên kết xem log `/automation/jobs/:id`) cùng danh sách nhanh các thiết bị Runner đang hoạt động.
2. **Tinh Gọn 5 Màn Hình Danh Sách Chính (`/automation/{workflows,runs,devices,browsers,proxies}`):**
   - **Gỡ bỏ khối KPI & Stats Bar:**
     - Xóa `<FleetMetrics :metrics="metrics" />` khỏi `devices/index.vue`.
     - Xóa thanh `Stats Bar` (`border-b border-border/40 pb-3`) phía trên `<Grid>` tại cả 5 trang `workflows`, `runs`, `devices`, `browsers`, `proxies`.
   - **Hiển thị tổng số bản ghi tinh gọn trên Header:** Đưa số lượng bản ghi tổng (`Badge` dạng pill nhỏ cạnh tiêu đề `h1`) lên ngay thanh Page Header.
   - **Tối ưu Bộ lọc `VbenForm` & Khoảng đệm Mobile (`< 640px`):**
     - Page Header xếp trên **1 hàng ngang** (`flex items-center justify-between gap-2`), phụ đề mô tả dùng `hidden sm:block`.
     - Bộ lọc `formOptions.wrapperClass` chuyển sang `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3` để trên điện thoại 2 trường lọc nằm ngang gọn trên 1 hàng thay vì xếp dọc chiếm chỗ.
     - Giảm padding container ngoài trên mobile (`p-3 sm:p-5 space-y-3 sm:space-y-4`), giúp vùng bảng `VxeGrid` hiển thị ngay trong màn hình đầu tiên trên thiết bị di động (`375x667`).

---

## 3. Tech Stack

- **Framework:** Vue 3.5 (`<script setup lang="ts">`), Vue Router 4, TypeScript 5, `vue-i18n` (`@operon/locales`).
- **Data Grid & Form Engine:** `useVbenVxeGrid` (`VxeTable`) và `useVbenForm` từ `src/adapter/vxe-table.ts`.
- **UI Components & Icons:** `@operon/vue-ui` (`Badge`, `Button`, `toast`), `@lucide/vue`.
- **Data Access Layer:** `src/api/core/automation.ts` (kết hợp `schema: 'automation'`, `schema: 'workers'`, và `probeLocalDaemonApi`).

---

## 4. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests cho API Automation, Plugin Gate và toàn bộ web-admin
pnpm exec vitest run apps/web-admin/src

# 2. Kiểm tra đối xứng từ điển đa ngôn ngữ en-US / vi-VN
pnpm run check:i18n

# 3. Kiểm tra kiểu dữ liệu TypeScript và Linter
pnpm --filter @operon/admin-web run typecheck
pnpm run lint

# 4. Đóng gói bản dựng cục bộ và cập nhật Nginx preview (Zero Git Push)
pnpm run build:local
```

---

## 5. Project Structure (Cấu Trúc Tệp Tác Động)

```text
apps/web-admin/src/
├── api/core/
│   ├── automation.ts                                     # Bổ sung AutomationOverviewSummary, calculateAutomationOverviewSummary(), getAutomationOverviewApi()
│   └── __tests__/
│       └── automation.test.ts                            # Unit tests cho calculateAutomationOverviewSummary & getAutomationOverviewApi
├── router/
│   ├── plugin-gate.ts                                    # Hỗ trợ meta.plugin kiểu string | string[] cho route tổng hợp đa plugin
│   ├── __tests__/
│   │   └── plugin-gate.test.ts                           # Unit tests kiểm chứng /automation/overview với ['automation'] hoặc ['workers']
│   └── routes/modules/
│       └── automation.ts                                 # Thêm route /automation/overview (order đầu tiên, redirect từ /automation)
├── locales/langs/
│   ├── en-US/page.json                                   # Từ điển tiếng Anh cho /automation/overview
│   └── vi-VN/page.json                                   # Từ điển tiếng Việt (Sentence case) cho /automation/overview
└── views/automation/
    ├── overview/
    │   └── index.vue                                     # [NEW] Trang Dashboard Automation tập trung KPI, trạng thái Fleet & phiên chạy gần đây
    ├── workflows/
    │   └── index.vue                                     # Tinh gọn Stats Bar, tối ưu Header & VbenForm 2 cột trên mobile
    ├── runs/
    │   └── index.vue                                     # Tinh gọn Stats Bar, tối ưu Header & VbenForm 2 cột trên mobile
    ├── devices/
    │   ├── index.vue                                     # Gỡ bỏ FleetMetrics & Stats Bar, tối ưu Header & VbenForm 2 cột trên mobile
    │   └── components/
    │       └── fleet-metrics.vue                         # Tối ưu lưới grid-cols-2 lg:grid-cols-4 gọn trên mobile (tái sử dụng tại overview)
    ├── browsers/
    │   └── index.vue                                     # Tinh gọn Stats Bar, tối ưu Header & VbenForm 2 cột trên mobile
    └── proxies/
        └── index.vue                                     # Tinh gọn Stats Bar, tối ưu Header & VbenForm 2 cột trên mobile
```

---

## 6. Code Style & Mẫu Thiết Kế Chi Tiết

### 6.1. Hàm Tổng Hợp Thống Kê Thuần Khiết (`src/api/core/automation.ts`)

```ts
export interface AutomationOverviewSummary {
  browsers: {
    error: number;
    idle: number;
    running: number;
    total: number;
  };
  fleet: FleetMetricsData;
  proxies: {
    active: number;
    avgLatencyMs: number;
    failing: number;
    total: number;
  };
  recentDevices: FleetDeviceItem[];
  recentRuns: AutomaCampaignRunItem[];
  runs: {
    completed: number;
    failed: number;
    running: number;
    total: number;
  };
  workflows: {
    archived: number;
    draft: number;
    published: number;
    total: number;
  };
}
```

### 6.2. Mẫu Giao Diện Danh Sách Tinh Gọn Mobile-First (`views/automation/*/index.vue`)

```vue
<template>
  <div class="space-y-3 p-3 sm:space-y-4 sm:p-5">
    <!-- Compact Single-Row Mobile Header -->
    <div class="flex items-center justify-between gap-2">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1
            class="truncate text-base font-semibold tracking-tight text-foreground sm:text-xl"
          >
            {{ $t('page.automation.devices') }}
          </h1>
          <Badge variant="secondary" class="text-2xs shrink-0">
            {{ nodes.length }}
          </Badge>
        </div>
        <p class="hidden text-xs text-muted-foreground sm:block">
          {{ $t('page.automation.devices_desc') }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 px-2.5 text-xs"
          :title="$t('common.refresh')"
          @click="() => gridApi.reload()"
        >
          <RefreshCw class="size-3.5" />
          <span class="hidden sm:inline">{{ $t('common.refresh') }}</span>
        </Button>
        <Button
          size="sm"
          class="h-8 gap-1.5 px-2.5 text-xs font-medium"
          @click="isConnectModalVisible = true"
        >
          <Plus class="size-3.5" />
          <span>{{ $t('common.connect') }}</span>
        </Button>
      </div>
    </div>

    <!-- Direct Data Grid Container (Zero KPI Clutter) -->
    <div
      class="overflow-hidden rounded-xl border border-border/60 bg-card p-2.5 shadow-xs sm:p-4"
    >
      <Grid class="devices-vxe-grid">
        <!-- Slots... -->
      </Grid>
    </div>
  </div>
</template>
```

---

## 7. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests (`vitest`):**
   - Kiểm thử hàm `calculateAutomationOverviewSummary` và `getAutomationOverviewApi` trong `apps/web-admin/src/api/core/__tests__/automation.test.ts` (bao gồm trường hợp dữ liệu rỗng, tính độ trễ trung bình proxy, đếm trạng thái workflows/runs/devices/browsers).
   - Kiểm thử `filterRoutesByPlugins` trong `apps/web-admin/src/router/__tests__/plugin-gate.test.ts` xác nhận `/automation/overview` hiển thị khi cài `automation` hoặc `workers`, và bị cắt tỉa khi cả hai plugin đều chưa cài.
2. **Kiểm Định Đa Ngôn Ngữ & Tĩnh (`check:i18n`, `typecheck`, `lint`):**
   - Đảm bảo `0` chuỗi tiếng Việt hardcode trong `apps/web-admin/src/**/*.{vue,ts}` và 100% đối xứng khóa `en-US` / `vi-VN`.
3. **Kiểm Thử Giao Diện Mobile & Build Cục Bộ (`build:local`):**
   - Đóng gói và cập nhật lên `http://100.68.217.61/` để kiểm tra trực tiếp trên điện thoại và máy trạm.

---

## 8. Boundaries (Ranh Giới Kỹ Thuật)

- **Always:**
  - Sử dụng `$t(...)` cho 100% văn bản hiển thị mới, tuân thủ `Sentence case` cho tiếng Việt và cấu trúc từ điển 3 tầng (`common.*`, `term.*`, `page.*`).
  - Giữ nguyên toàn bộ chức năng lọc, tìm kiếm, phân trang và modal thao tác (`ConnectFleetModal`, `NodeDetailModal`, xem log `/automation/jobs/:id`) trên 5 màn hình `/automation/*`.
  - Chạy `pnpm run build:local` để kiểm định trực tiếp trên `http://100.68.217.61/`.
- **Ask first:**
  - Lược bỏ thẻ KPI trên các phân hệ ngoài nhánh `/automation/*` (như `/tenants`, `/commerce/*`, `/system/*`).
  - Thay đổi cấu trúc bảng cơ sở dữ liệu Supabase.
- **Never:**
  - Không thêm chuỗi tiếng Việt/Anh hardcode vào `.vue` hoặc `.ts`.
  - Không chạy `git push` khi chưa có yêu cầu rõ ràng từ người dùng.

---

## 9. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1 (Unified Automation Overview Route):** Tuyến `/automation/overview` hoạt động là trang mặc định khi mở `/automation`, tổng hợp chính xác số liệu từ `workflows`, `jobs`, `devices`, `browsers`, `proxies` và `loopback daemon`, cho phép điều hướng 1 chạm tới từng màn hình con.
- [x] **SC2 (Zero KPI Clutter on 5 Automation List Screens):** Cả 5 màn hình `/automation/{workflows,runs,devices,browsers,proxies}` không còn thẻ KPI rời rạc (`FleetMetrics`) hay thanh `Stats Bar` thừa phía trên bảng; tổng số bản ghi được gắn gọn thành `Badge` cạnh tiêu đề trang.
- [x] **SC3 (Mobile-First Above-the-Fold Ergonomics):** Trên màn hình di động (`< 640px`), Page Header nằm gọn trên 1 hàng ngang, bộ lọc `VbenForm` xếp 2 cột (`grid-cols-2`), giúp bảng dữ liệu `VxeGrid` hiển thị ngay trong nửa đầu màn hình đầu tiên mà không cần cuộn qua các khối thống kê.
- [x] **SC4 (100% i18n & Quality Gate):** `0` dòng tiếng Việt hardcode, 100% đối xứng khóa `en-US` / `vi-VN` (`1,441 / 1,441` khóa), pass toàn bộ unit tests (`vitest`), `pnpm run check:type`, `pnpm run lint` (`0 errors`) và cập nhật bản dựng tại `http://100.68.217.61/`.

---

## 10. Open Questions (Câu Hỏi Mở)

Đã hoàn tất triển khai và nghiệm thu toàn bộ 4 tiêu chí SC1–SC4.
