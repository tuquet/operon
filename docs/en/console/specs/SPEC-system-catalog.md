# Spec: Quản Trị Plugins Hệ Thống & Danh Mục Gói Cước (`system-catalog`)

> **Mã đặc tả:** `SPEC-system-catalog`  
> **Module id:** `system-catalog` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md), [`docs/routes/system.md`](../routes/system.md)  
> **Trạng thái:** **ĐÃ HOÀN THÀNH (ACCEPTED & IMPLEMENTED)**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Xây dựng phân hệ Quản trị Danh mục Hệ thống (**System Catalog**) bao gồm 2 màn hình nghiệp vụ sử dụng bảng `useVbenVxeGrid` và biểu mẫu `VxeForm` với **100% dữ liệu thực tế** từ Cloud:

1. **Quản Trị Plugins Hệ Thống (`/system/plugins`):**
   - Truy vấn trực tiếp bảng `public.system_plugins` (`id`, `name`, `description`, `version`, `status`, `schema_name`, `manifest`, `installed_at`).
   - Phân định trực quan giữa **6 Core Kernel Plugins** (`core-iam`, `workers`, `automation`, `storage`, `subscriptions`, `webhooks`) và các **Extension Plugins** mở rộng (như `commerce`).
   - Hỗ trợ tìm kiếm theo tên/mã plugin/schema, lọc theo phân loại (`core` vs `extension`) và trạng thái (`installed`, `disabled`, `pending`), cùng hộp thoại xem chi tiết manifest (`VxeForm`).
2. **Quản Trị Gói Cước & Hạn Mức SaaS (`/system/plans`):**
   - Truy vấn trực tiếp bảng `billing.plans` (`schema: 'billing'`: `id`, `name`, `description`, `price_monthly_usd`, `max_members`, `max_storage_mb`, `max_monthly_runs`, `is_active`, `metadata`, `created_at`).
   - Hiển thị rõ đơn giá hàng tháng, hạn mức thành viên tối đa, dung lượng lưu trữ, số lượt chạy chiến dịch/tháng và trạng thái kích hoạt qua bảng `useVbenVxeGrid`.

---

## 2. Tech Stack

- **Framework:** Vue 3.5 (`<script setup lang="ts">`), Vue Router 4, TypeScript 5, `vue-i18n`.
- **Data Grid & Form Engine:** `useVbenVxeGrid` (`VxeTable`) và `VxeForm` từ `src/adapter/vxe-table.ts`.
- **UI & Icons:** `@operon/vue-ui` (`Badge`, `Button`, `Card`, `Dialog`, `toast`), `@lucide/vue`.
- **Data Access Layer:** `src/api/core/system.ts`.

---

## 3. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests cho API System
pnpm exec vitest run apps/web-admin/src/api/core/__tests__/system.test.ts

# 2. Kiểm tra kiểu dữ liệu TypeScript
pnpm --filter @operon/admin-web run typecheck

# 3. Kiểm tra linter và định dạng
npx oxlint apps/web-admin/src/
pnpm run lint

# 4. Đóng gói bản dựng production
pnpm run build:admin
```

---

## 4. Project Structure (Cấu Trúc Tệp Tác Động)

```text
apps/web-admin/src/
├── api/core/
│   ├── system.ts                                 # getSystemPluginsApi, getBillingPlansApi, isCorePlugin, mapRawPlugin
│   └── __tests__/
│       └── system.test.ts                        # Unit tests cho isCorePlugin, mapRawPlugin, getBillingPlansApi
├── router/routes/modules/
│   └── system.ts                                 # Định tuyến /system/plugins (core-iam) & /system/plans (subscriptions)
└── views/system/
    ├── plugins/
    │   └── index.vue                             # Bảng quản trị Plugins hệ thống (useVbenVxeGrid + Manifest Dialog)
    └── plans/
        └── index.vue                             # Bảng quản trị Gói cước & Quotas (useVbenVxeGrid + Plan Detail Dialog)
```

---

## 5. Code Style & Kiến Trúc Chi Tiết

### 5.1. Mô Hình Dữ Liệu & Hợp Đồng API (`src/api/core/system.ts`)

```ts
export interface SystemPluginItem {
  description: null | string;
  id: string;
  installed_at: string;
  is_core: boolean;
  manifest: Record<string, any>;
  name: string;
  schema_name: null | string;
  status: 'disabled' | 'installed' | 'pending' | string;
  version: string;
}

export interface BillingPlanItem {
  created_at: string;
  description: null | string;
  id: string;
  is_active: boolean;
  max_members: number;
  max_monthly_runs: number;
  max_storage_mb: number;
  metadata: Record<string, any>;
  name: string;
  price_monthly_usd: number;
}

const CORE_PLUGIN_IDS = new Set([
  'automation',
  'core-iam',
  'workers',
  'storage',
  'subscriptions',
  'webhooks',
]);

export function isCorePlugin(id: string): boolean {
  return CORE_PLUGIN_IDS.has(id);
}

export function mapRawPlugin(raw: any): SystemPluginItem;
export async function getSystemPluginsApi(): Promise<SystemPluginItem[]>;
export async function getBillingPlansApi(): Promise<BillingPlanItem[]>;
```

---

## 6. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests (`system.test.ts`):**
   - Kiểm tra `isCorePlugin` nhận diện chính xác 6 Core Kernel Plugins (`core-iam`, `workers`, `automation`, `storage`, `subscriptions`, `webhooks`) và trả về `false` cho các plugin mở rộng (`commerce`).
   - Kiểm tra `mapRawPlugin` chuẩn hóa trường `is_core` và giá trị mặc định an toàn khi thiếu `manifest`.
   - Kiểm tra `getBillingPlansApi` truyền đúng `{ schema: 'billing' }` và `getSystemPluginsApi` truy vấn đúng `public.system_plugins`.
2. **Typecheck & Lint Gate:** `pnpm --filter @operon/admin-web run typecheck` và `pnpm run lint` đạt `0 errors`.

---

## 7. Boundaries (Ranh Giới Kỹ Thuật)

- **Always:**
  - Sử dụng `useVbenVxeGrid` cho cả `/system/plugins` và `/system/plans`.
  - Truyền `{ schema: 'billing' }` khi truy vấn `billing.plans`.
  - Gắn `meta.plugin: 'core-iam'` cho `/system/plugins` và `meta.plugin: 'subscriptions'` cho `/system/plans`.
- **Ask first:**
  - Thay đổi danh sách 6 Core Kernel Plugins hoặc cấu trúc bảng `public.system_plugins`.
- **Never:**
  - Không cho phép gỡ cài đặt các plugin hạt nhân bắt buộc (`core-iam`) từ giao diện web làm gián đoạn xác thực hệ thống.

---

## 8. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1:** `/system/plugins` hiển thị chính xác toàn bộ các plugin trong `public.system_plugins` qua bảng `useVbenVxeGrid`, phân biệt rõ `Core Kernel` và `Extension`.
- [x] **SC2:** `/system/plans` hiển thị đầy đủ các gói cước từ `billing.plans` kèm đơn giá và hạn mức tài nguyên.
- [x] **SC3:** Khi plugin `subscriptions` không được cài đặt, tuyến `/system/plans` tự động được ẩn bởi `filterRoutesByPlugins` trong khi `/system/plugins` vẫn hoạt động bình thường.
- [x] **SC4:** Toàn bộ unit tests trong `system.test.ts` pass 100% và `typecheck` đạt 0 lỗi.

---

## 9. Resolved Decisions (Các Quyết Định Đã Chốt)

1. **Phân định 6 Core Kernel Plugins vs Extension Plugins:** 6 plugin nền tảng (`core-iam`, `workers`, `automation`, `storage`, `subscriptions`, `webhooks`) được định danh là hạt nhân kiến trúc (`isCorePlugin(id) === true`), trong khi các phân hệ nghiệp vụ gia tăng như `commerce` được phân loại là Extension Plugin có thể bật/tắt linh hoạt theo nhu cầu triển khai.
