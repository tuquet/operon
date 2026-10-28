# Spec: Trang Tổng Quan Hệ Thống (`/system/overview`) & Tinh Gọn Giao Diện Danh Sách Mobile-First (`system-dashboard`)

> **Mã đặc tả:** `SPEC-system-dashboard`  
> **Module id:** `system-dashboard` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md), [`SPEC-system-catalog.md`](SPEC-system-catalog.md), [`SPEC-system-superadmin-routes.md`](SPEC-system-superadmin-routes.md), [`SPEC-core-enum-constants-ssot.md`](SPEC-core-enum-constants-ssot.md), [`SPEC-cross-i18n-en-vi.md`](SPEC-cross-i18n-en-vi.md)  
> **Trạng thái:** **ĐANG TRIỂN KHAI (APPROVED — AUTONOMOUS GOAL EXECUTION)**

---

## 1. Assumptions (Các Giả Định Kiến Trúc)

1. **Vị trí định tuyến Dashboard Hệ Thống (`/system/overview`):**
   - Đặt tại `/system/overview` (`name: 'SystemOverview'`), nằm ở vị trí đầu tiên trong menu **Quản trị hệ thống (`/system`)** và là trang đích mặc định khi truy cập `/system` (`redirect: '/system/overview'`).
   - Cấu hình `meta.plugin: ['core-iam', 'subscriptions']` và `meta.authority: ['superadmin', 'plugins:read', 'subscriptions:read']` (đồng bộ cơ chế lọc đa plugin với `/automation/overview`).
2. **Tập trung thống kê về `/system/overview` & Tinh gọn 6 màn hình danh sách con:**
   - Gom toàn bộ chỉ số tổng hợp của 6 phân hệ con (`plugins`, `plans`, `users`, `roles`, `subscriptions`, `audit-logs`) về `/system/overview`.
   - Tại 6 màn hình danh sách con (`/system/{plugins,plans,users,roles,subscriptions,audit-logs}`), áp dụng chuẩn **Mobile-First VxeGrid Compaction**:
     - Khi `isMobile === true` (`< 640px`), tự động ẩn các cột phụ (`visible: !mobile`) và gộp thông tin quan trọng vào ô chính để bảng vừa khít chiều ngang `375px` (không cuộn ngang).
     - Thu gọn thanh lọc `VbenForm` (`commonConfig.hideLabel: isMobile.value`) để các trường lọc nằm gọn trên 1 hàng ngang.
     - Chuẩn hóa toàn bộ class chữ tùy tiện (`text-[11px]`) về `text-2xs` theo đúng ma trận 7 bậc chữ (`TYPOGRAPHY.md`).
3. **Đa ngôn ngữ 100% (`en-US` & `vi-VN`):**
   - Toàn bộ khóa văn bản mới trên `/system/overview` được khai báo đối xứng trong `en-US/page.json` và `vi-VN/page.json` theo chuẩn `Sentence case`.

---

## 2. Objective (Mục Tiêu & Phạm Vi)

Tách biệt rõ **tầng giám sát quản trị hệ thống (`System Overview Dashboard`)** và **tầng vận hành dữ liệu (`Operational System Grids`)** trong nhánh `/system/*`:

1. **Xây dựng Trang Tổng Quan Hệ Thống (`/system/overview`):**
   - **Khối 4 Thẻ Chỉ Số Cốt Lõi (`System Telemetry Cards` — `grid-cols-2 lg:grid-cols-4`):**
     1. **System Plugins (`public.system_plugins`):** Tổng số plugin đã cài đặt + phân bổ `core kernel` vs `extension`.
     2. **Platform Users (`public.profiles`):** Tổng số người dùng toàn hệ thống + số người dùng đã thuộc tổ chức (`withWorkspaces`) vs chưa gán (`unassigned`).
     3. **Active Subscriptions & MRR (`billing.subscriptions`):** Số thuê bao đang hoạt động (`active`) trên tổng số thuê bao + doanh thu định kỳ hàng tháng ước tính (`$MRR/mo`).
     4. **IAM Security Policy (`public.roles` & `public.permissions`):** Tổng số vai trò (`system` + `custom`) và tổng số quyền hạn nguyên tử (`permissions`).
   - **Lưới 6 Thẻ Điều Hướng Nhanh Phân Hệ (`Quick-Jump Sub-Module Cards` — `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`):**
     1. **Plugins (`/system/plugins`):** Tổng số plugin + `{core} core • {extension} ext`.
     2. **Bảng giá (`/system/plans`):** Tổng số gói cước + `{active} active • {paused} paused`.
     3. **Người dùng (`/system/users`):** Tổng số tài khoản + `{withWorkspaces} orgs • {unassigned} free`.
     4. **Vai trò & Quyền (`/system/roles`):** Tổng số vai trò + `{permissions} permissions`.
     5. **Thuê bao (`/system/subscriptions`):** Tổng số thuê bao + `{active} active • ${mrr}/mo`.
     6. **Nhật ký kiểm toán (`/system/audit-logs`):** Tổng số sự kiện kiểm toán + bản ghi bảo mật bất biến.
   - **Khối Hoạt Động Hệ Thống Gần Đây (`Recent Audit Events & Latest Platform Users` — `grid-cols-1 lg:grid-cols-2`):**
     1. **5 Sự kiện Kiểm toán Mới nhất (`recentAuditLogs`):** Hiển thị `action` badge, `entity_type#entity_id`, thời gian và nút chuyển nhanh sang `/system/audit-logs`.
     2. **5 Người dùng Hệ thống Mới nhất (`recentUsers`):** Hiển thị Avatar, tên/email, `RoleBadge` vai trò chính, số lượng workspace và nút chuyển nhanh sang `/system/users`.
2. **Tinh Gọn Mobile-First Cho 6 Màn Hình Danh Sách (`/system/{plugins,plans,users,roles,subscriptions,audit-logs}`):**
   - Tích hợp `usePreferences().isMobile` vào `getColumns()` của cả 6 màn hình để ẩn các cột phụ trên màn hình `< 640px` và gộp thông tin trạng thái/phân loại vào ô chính.
   - Cấu hình `commonConfig.hideLabel: isMobile.value` trên `VbenForm` để thu gọn chiều cao bộ lọc trên điện thoại.
   - Xóa bỏ toàn bộ class `text-[11px]` còn sót trong `views/system/roles/index.vue` và `views/system/audit-logs/index.vue` (thay bằng `text-2xs`).

---

## 3. Tech Stack

- **Framework:** Vue 3.5 (`<script setup lang="ts">`), Vue Router 4, TypeScript 5, `vue-i18n` (`@operon/locales`).
- **Responsive State:** `usePreferences().isMobile` (`@operon/preferences`).
- **Data Grid & Form Engine:** `useVbenVxeGrid` từ `src/adapter/vxe-table.ts`.
- **Data Access Layer:** `src/api/core/system.ts` (`calculateSystemOverviewSummary`, `getSystemOverviewApi`).
- **UI Components & Icons:** `@operon/vue-ui` (`Avatar`, `Badge`, `Button`, `Dialog`, `toast`), `@lucide/vue`.

---

## 4. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests cho API System và Router
pnpm exec vitest run apps/web-admin/src/api/core/__tests__/ A

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
│   ├── system.ts                                     # Bổ sung SystemOverviewSummary, calculateSystemOverviewSummary(), getSystemOverviewApi()
│   └── __tests__/
│       └── system-overview.test.ts                   # [NEW] Unit tests kiểm định calculateSystemOverviewSummary & getSystemOverviewApi
├── router/routes/modules/
│   └── system.ts                                     # Thêm route /system/overview (order đầu tiên, redirect từ /system)
├── locales/langs/
│   ├── en-US/page.json                               # Từ điển tiếng Anh cho /system/overview
│   └── vi-VN/page.json                               # Từ điển tiếng Việt (Sentence case) cho /system/overview
└── views/system/
    ├── overview/
    │   └── index.vue                                 # [NEW] Trang Dashboard Hệ Thống tập trung KPI, Quick-Jump 6 phân hệ & Hoạt động gần đây
    ├── plugins/
    │   └── index.vue                                 # Cột VxeGrid thích ứng isMobile & bộ lọc hideLabel trên mobile
    ├── plans/
    │   └── index.vue                                 # Cột VxeGrid thích ứng isMobile & bộ lọc hideLabel trên mobile
    ├── users/
    │   └── index.vue                                 # Cột VxeGrid thích ứng isMobile & bộ lọc hideLabel trên mobile
    ├── roles/
    │   └── index.vue                                 # Cột VxeGrid thích ứng isMobile, bộ lọc hideLabel & chuẩn hóa text-2xs
    ├── subscriptions/
    │   └── index.vue                                 # Cột VxeGrid thích ứng isMobile & bộ lọc hideLabel trên mobile
    └── audit-logs/
        └── index.vue                                 # Cột VxeGrid thích ứng isMobile, bộ lọc hideLabel & chuẩn hóa text-2xs
```

---

## 6. Code Style & Kiến Trúc Chi Tiết

### 6.1. Mô Hình Tổng Hợp `SystemOverviewSummary` (`src/api/core/system.ts`)

```ts
export interface SystemOverviewSummary {
  auditLogs: {
    total: number;
  };
  plans: {
    active: number;
    paused: number;
    total: number;
  };
  plugins: {
    core: number;
    extension: number;
    installed: number;
    total: number;
  };
  recentAuditLogs: GlobalAuditLogItem[];
  recentUsers: PlatformUserItem[];
  roles: {
    custom: number;
    permissionsTotal: number;
    system: number;
    total: number;
  };
  subscriptions: {
    active: number;
    canceled: number;
    mrrUsd: number;
    pastDue: number;
    total: number;
  };
  users: {
    total: number;
    unassigned: number;
    withWorkspaces: number;
  };
}
```

---

## 7. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests (`system-overview.test.ts`):**
   - Kiểm tra `calculateSystemOverviewSummary` tính toán chính xác số lượng plugins (`core` / `extension`), plans (`active` / `paused`), users (`withWorkspaces` / `unassigned`), roles (`system` / `custom` / `permissionsTotal`), subscriptions (`active` / `mrrUsd`), và cắt đúng 5 bản ghi mới nhất cho `recentAuditLogs` & `recentUsers`.
   - Kiểm tra `getSystemOverviewApi` xử lý an toàn ngay cả khi người dùng không có quyền superadmin trên một số bảng con.
2. **i18n & Typecheck Gate:**
   - `pnpm run check:i18n` pass 100% (`0` khóa thiếu).
   - `pnpm --filter @operon/admin-web run typecheck` và `pnpm run lint` đạt `0 errors`.

---

## 8. Boundaries (Ranh Giới Kỹ Thuật)

- **Always:**
  - Dùng `Promise.allSettled` hoặc xử lý lỗi cô lập trong `getSystemOverviewApi()` để nếu người dùng chỉ có quyền `plugins:read` hoặc `subscriptions:read` (không phải `superadmin`), trang `/system/overview` vẫn hiển thị đầy đủ dữ liệu các phân hệ được phép mà không bị lỗi 403 toàn trang.
  - Chuẩn hóa chữ theo thang 7 bậc (`text-2xs` đến `text-2xl`, xóa sạch `text-[11px]`).
  - Tuân thủ `Sentence case` cho toàn bộ chuỗi tiếng Việt và tiếng Anh.
- **Ask first:**
  - Thay đổi cấu trúc bảng hoặc chính sách RLS trên Supabase Cloud.
- **Never:**
  - Không chạy `git push` hoặc kích hoạt GitHub Actions CI/CD khi chưa có lệnh từ người dùng.

---

## 9. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1:** Truy cập `/system` tự động điều hướng về `/system/overview`, hiển thị 4 thẻ chỉ số cốt lõi, 6 thẻ điều hướng nhanh phân hệ và 2 danh sách hoạt động gần đây (`recentAuditLogs`, `recentSubscriptions`).
- [x] **SC2:** Cả 6 màn hình danh sách `/system/{plugins,plans,users,roles,subscriptions,audit-logs}` tự động thu gọn cột phụ và ẩn nhãn bộ lọc khi `isMobile === true` (`< 640px`), vừa khít chiều ngang `375px`.
- [x] **SC3:** Xóa bỏ hoàn toàn các class chữ tùy tiện `text-[11px]` trong `apps/web-admin/src/views/system/`.
- [x] **SC4:** Toàn bộ unit tests trong `system-overview.test.ts`, `pnpm run check:i18n`, `typecheck`, `lint`, và `pnpm run build:local` pass 100% với `0 errors`.
