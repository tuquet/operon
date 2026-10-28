# Spec: Tuyến Quản Trị Nền Tảng Superadmin & Bảng IAM VXE Grid (`superadmin-routes`)

> **Mã đặc tả:** `SPEC-superadmin-routes`  
> **Module id:** `superadmin-routes` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md), [`docs/routes/system.md`](../routes/system.md)  
> **Trạng thái:** **ĐÃ HOÀN THÀNH (ACCEPTED & IMPLEMENTED)**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Xây dựng 4 tuyến đường quản trị cấp cao dưới `/system/*` dành riêng cho **Platform Superadmin** (`meta.authority: ['superadmin']`, bypass RLS qua hàm `public.is_platform_admin()`) trên nền bảng dữ liệu tốc độ cao `useVbenVxeGrid` (`VxeTable`) và biểu mẫu `VxeForm`:

1. **Danh Bạ Người Dùng Nền Tảng (`/system/users` — Enterprise User Directory):**
   - Truy vấn toàn bộ tài khoản từ `public.profiles` kết hợp liên kết `public.tenant_members` (`tenants` + `member_roles(roles)`).
   - Cung cấp thanh chỉ số KPI (`Stats Bar`: Tổng người dùng, Đã tham gia workspace, Chưa có tổ chức), tìm kiếm đa trường tức thì (`filterPlatformUsers`: Họ tên, Email, UUID, Tên/Slug Workspace), lọc theo tình trạng tổ chức và vai trò (`owner`, `admin`, `member`, `viewer`).
   - Hỗ trợ sao chép UUID 1 chạm và hộp thoại **User Inspector Dialog** hiển thị hồ sơ định danh kèm danh sách các Workspace mà người dùng tham gia (có nút điều hướng trực tiếp tới `/tenants/:id`).
2. **Nhật Ký Kiểm Toán Toàn Cầu (`/system/audit-logs` — Global Security Audit):**
   - Giám sát toàn bộ dòng sự kiện an ninh, phân quyền và thay đổi dữ liệu xuyên suốt mọi Workspace từ `public.audit_logs` qua bảng `useVbenVxeGrid`, kèm hộp thoại đối chiếu payload JSON (`old_values` / `new_values`).
3. **Quản Lý Hợp Đồng Thuê Bao Toàn Hệ Thống (`/system/subscriptions`):**
   - Giám sát tất cả hợp đồng thuê bao SaaS của mọi Workspace từ `billing.subscriptions` liên kết `tenants` và `billing.plans` (`schema: 'billing'`), thống kê doanh thu định kỳ hàng tháng (MRR) và trạng thái gia hạn.
4. **Ma Trận Vai Trò & Quyền Hạn Hệ Thống (`/system/roles` — Enterprise Policy Console):**
   - Gồm 2 chế độ bảng `useVbenVxeGrid` chuyển đổi mượt mà:
     - **Tab 1 — Vai trò hệ thống (`RolesGrid`):** Hiển thị 4 vai trò cốt lõi (`owner`, `admin`, `member`, `viewer`), lọc theo phân loại (`system` / `custom`) và module, kèm hộp thoại **Role Policy Inspector Dialog** gom nhóm toàn bộ quyền hạn theo từng module.
     - **Tab 2 — Danh mục quyền hạn (`PermissionsGrid`):** Hiển thị toàn bộ các quyền hạt nhân trong `public.permissions`, lọc chéo giữa `Module` $\leftrightarrow$ `Role`, sao chép nhanh mã quyền và hiển thị trực tiếp các `RoleBadge` sở hữu quyền đó.

---

## 2. Tech Stack

- **Framework:** Vue 3.5 (`<script setup lang="ts">`), Vue Router 4, TypeScript 5, `vue-i18n`.
- **Table & Form Engine:** `useVbenVxeGrid` (`VxeTable`) và `VxeForm` từ `src/adapter/vxe-table.ts`.
- **UI Components & Icons:** `@operon/vue-ui` (`Avatar`, `Badge`, `Button`, `Dialog`, `toast`), `@lucide/vue`, `RoleBadge`.
- **Data Access Layer:** `src/api/core/system.ts` (`public` và `billing` schemas).

---

## 3. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests cho API System (mappers & pure filter helpers) và Router
pnpm exec vitest run apps/web-admin/src/api/core/__tests__/system.test.ts apps/web-admin/src/router

# 2. Kiểm tra kiểu dữ liệu TypeScript (0 errors)
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
│   ├── system.ts                                 # APIs & pure filter helpers (filterPlatformUsers, filterSystemRoles, filterSystemPermissions)
│   └── __tests__/
│       └── system.test.ts                        # Unit tests cho mappers và bộ lọc đa trường users, roles, permissions, subscriptions, audit-logs
├── components/iam/
│   └── role-badge.vue                            # Badge chuẩn hóa màu sắc cho 4 vai trò hệ thống (owner, admin, member, viewer)
├── router/routes/modules/
│   └── system.ts                                 # Đăng ký 4 routes với authority: ['superadmin']
└── views/system/
    ├── users/
    │   └── index.vue                             # Enterprise User Directory (useVbenVxeGrid + Stats Bar + User Inspector Dialog)
    ├── audit-logs/
    │   └── index.vue                             # Global Audit Logs (useVbenVxeGrid + JSON Diff Inspector Dialog)
    ├── subscriptions/
    │   └── index.vue                             # Cross-Tenant SaaS Subscriptions (useVbenVxeGrid + MRR KPIs)
    └── roles/
        └── index.vue                             # Enterprise Policy Console (RolesGrid + PermissionsGrid + Role Policy Inspector Dialog)
```

---

## 5. Code Style & Kiến Trúc Chi Tiết

### 5.1. Mô Hình Dữ Liệu & Pure Filter Helpers (`src/api/core/system.ts`)

```ts
export interface PlatformUserWorkspaceSummary {
  role_name: string;
  status: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
}

export interface PlatformUserItem {
  avatar_url: null | string;
  created_at: string;
  email?: null | string;
  full_name: null | string;
  id: string;
  primary_role?: string;
  tenant_count: number;
  updated_at: string;
  workspaces?: PlatformUserWorkspaceSummary[];
}

export function filterPlatformUsers(
  users: PlatformUserItem[],
  filters?: {
    role_filter?: string;
    search?: string;
    tenant_filter?: string;
  },
): PlatformUserItem[];

export function filterSystemRoles(
  roles: SystemRoleItem[],
  filters?: {
    module?: string;
    role_type?: string;
    search?: string;
  },
): SystemRoleItem[];

export function filterSystemPermissions(
  permissions: SystemPermissionItem[],
  roles: SystemRoleItem[],
  filters?: {
    module?: string;
    role?: string;
    search?: string;
  },
): SystemPermissionItem[];
```

### 5.2. Khai Báo Route Bảo Vệ Nghiêm Ngặt Bằng `authority: ['superadmin']`

```ts
// apps/web-admin/src/router/routes/modules/system.ts
{
  path: 'users',
  name: 'SystemUsers',
  component: () => import('#/views/system/users/index.vue'),
  meta: {
    title: $t('page.system.users'),
    icon: 'lucide:users',
    plugin: 'core-iam',
    authority: ['superadmin'],
  },
}
```

---

## 6. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests (`system.test.ts`):**
   - Kiểm tra `mapRawPlatformUser`, `mapRawGlobalAuditLog`, `mapRawPlatformSubscription`, `mapRawSystemRole` xử lý an toàn dữ liệu khuyết và liên kết lồng nhau.
   - Kiểm tra `filterPlatformUsers`: lọc chính xác theo `tenant_filter` (`has_tenants`, `no_tenants`), `role_filter` (`owner`, `admin`, `member`, `viewer`), và tìm kiếm không phân biệt hoa thường trên cả 4 trường (`full_name`, `email`, `id` UUID, `tenant_name`/`tenant_slug`).
   - Kiểm tra `filterSystemRoles` và `filterSystemPermissions`: lọc chéo giữa `module`, `role`, `role_type` và từ khóa tìm kiếm.
   - Kiểm tra `getPlatformSubscriptionsApi` truyền đúng `{ schema: 'billing' }`.
2. **Typecheck & Lint Gate:** `pnpm --filter @operon/admin-web run typecheck` và `pnpm run lint` đạt `0 errors`.

---

## 7. Boundaries (Ranh Giới Kỹ Thuật)

- **Always:**
  - Gắn `meta.authority: ['superadmin']` trên cả 4 tuyến `/system/users`, `/system/audit-logs`, `/system/subscriptions`, `/system/roles`.
  - Sử dụng `useVbenVxeGrid` từ `#/adapter/vxe-table` và nhãn hành động chuẩn từ `$t('common.*')` (`filter`, `reset`, `refresh`, `detail`).
  - Bảo vệ tính bất biến của 4 System Roles (`is_system = true`) và bộ quyền hạt nhân.
- **Ask first:**
  - Bổ sung thao tác xóa vĩnh viễn tài khoản người dùng khỏi `auth.users` hoặc sửa trực tiếp bảng `public.permissions`.
- **Never:**
  - Không hiển thị bất kỳ tuyến nào trong 4 tuyến này trên Sidebar đối với tài khoản không có quyền `superadmin`.
  - Không dùng dữ liệu mẫu giả lập hoặc mã màu tĩnh hardcode.

---

## 8. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1 — Cô lập quyền Superadmin:** 4 tuyến `/system/users`, `/system/audit-logs`, `/system/subscriptions`, `/system/roles` chỉ xuất hiện và cho phép truy cập đối với tài khoản Platform Superadmin.
- [x] **SC2 — `/system/users`:** Tìm kiếm đa trường (`filterPlatformUsers`) hoạt động tức thì theo Họ tên, Email, UUID và Tên Workspace; hiển thị `Stats Bar`, sao chép UUID 1 chạm và hộp thoại `User Inspector Dialog` điều hướng nhanh tới `/tenants/:id`.
- [x] **SC3 — `/system/roles`:** Cung cấp 2 bảng `useVbenVxeGrid` (`RolesGrid` & `PermissionsGrid`) có lọc chéo `Module` $\leftrightarrow$ `Role`, hiển thị `RoleBadge` sở hữu từng quyền và hộp thoại `Role Policy Inspector Dialog`.
- [x] **SC4 — `/system/audit-logs` & `/system/subscriptions`:** Hiển thị đầy đủ nhật ký kiểm toán toàn cầu và hợp đồng thuê bao xuyên tenant qua bảng `useVbenVxeGrid`.
- [x] **SC5 — Kiểm định tự động:** 100% unit tests trong `system.test.ts` pass và `typecheck` đạt 0 lỗi.

---

## 9. Resolved Decisions (Các Quyết Định Đã Chốt)

1. **Chuẩn Enterprise Cloud Console IAM cho `/system/users` và `/system/roles`:** Các vai trò hệ thống (`owner`, `admin`, `member`, `viewer`) và quyền hạt nhân được quản lý như những chính sách nền tảng bất biến (Immutable Platform Primitives) để bảo vệ tính toàn vẹn RLS đa tenant, tập trung tối đa vào khả năng tra cứu bảng `useVbenVxeGrid` và thanh tra liên kết chéo qua Inspector Dialogs.
2. **Tìm kiếm đa trường phía Client kết hợp dữ liệu thực PostgREST:** Hàm `filterPlatformUsers` cho phép lọc tức thì theo cả UUID, Email, Họ tên lẫn tên Workspace mà không cần gõ lại truy vấn phức tạp khi chuyển đổi tiêu chí lọc.
