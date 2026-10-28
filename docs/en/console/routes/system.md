# Đặc Tả Route: System Catalog & Superadmin Platform (Danh Mục Hệ Thống & Quản Trị Nền Tảng)

> **Đường dẫn chính:** `/system/*`  
> **Module File:** `src/router/routes/modules/system.ts`  
> **Biểu tượng:** `lucide:shield-check`

---

## 1. Định Nghĩa Tuyến Đường (Route Definitions)

```typescript
{
  path: '/system',
  name: 'System',
  redirect: '/system/plugins',
  meta: {
    title: $t('page.system.title'),
    icon: 'lucide:shield-check',
    plugin: 'core-iam',
    order: 30,
  },
  children: [
    {
      path: 'plugins',
      name: 'SystemPlugins',
      component: () => import('#/views/system/plugins/index.vue'),
      meta: {
        title: $t('page.system.plugins'),
        icon: 'lucide:puzzle',
        plugin: 'core-iam',
        authority: ['superadmin', 'plugins:read'],
      },
    },
    {
      path: 'plans',
      name: 'SystemPlans',
      component: () => import('#/views/system/plans/index.vue'),
      meta: {
        title: $t('page.system.plans'),
        icon: 'lucide:credit-card',
        plugin: 'subscriptions',
        authority: ['superadmin', 'subscriptions:read'],
      },
    },
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
    },
    {
      path: 'audit-logs',
      name: 'SystemAuditLogs',
      component: () => import('#/views/system/audit-logs/index.vue'),
      meta: {
        title: $t('page.system.auditLogs'),
        icon: 'lucide:scroll-text',
        plugin: 'core-iam',
        authority: ['superadmin'],
      },
    },
    {
      path: 'subscriptions',
      name: 'SystemSubscriptions',
      component: () => import('#/views/system/subscriptions/index.vue'),
      meta: {
        title: $t('page.system.subscriptions'),
        icon: 'lucide:receipt',
        plugin: 'subscriptions',
        authority: ['superadmin'],
      },
    },
    {
      path: 'roles',
      name: 'SystemRoles',
      component: () => import('#/views/system/roles/index.vue'),
      meta: {
        title: $t('page.system.roles'),
        icon: 'lucide:key-round',
        plugin: 'core-iam',
        authority: ['superadmin'],
      },
    },
  ]
}
```

---

## 2. Chi Tiết Từng Tuyến Con (Sub-routes)

### 2.1. Quản Lý Plugins: `/system/plugins`

- **Mục Đích:** Kiểm soát và hiển thị tình trạng các plugin vi dịch vụ (Microservice Pillars) đã cài đặt vào Cloud qua bảng `useVbenVxeGrid`.
- **Nguồn Dữ Liệu:** Bảng `public.system_plugins`.
- **API Client:** `getSystemPluginsApi()`.
- **Quy Tắc Nhận Diện 6 Core Kernel Plugins:**
  - Hệ thống áp dụng hàm thuần khiết `isCorePlugin(id)` để phân định 6 module nhân cốt lõi:
    1. `core-iam` (Multi-Tenant IAM & Auth)
    2. `workers` (Worker Mesh & Hardware Telemetry)
    3. `automation` (Automa Automation Engine)
    4. `storage` (Media & Cloud Object Storage)
    5. `subscriptions` (SaaS Billing & Quotas Engine)
    6. `webhooks` (Event Hooks & Subscriptions)
  - Các plugin nhân này được gắn nhãn `Core Kernel` với màu sắc nhận diện đặc biệt (`bg-primary/10 text-primary border-primary/20`).

### 2.2. Gói Cước & Hạn Mức Quotas: `/system/plans`

- **Mục Đích:** Quản lý bảng giá thuê bao SaaS toàn hệ thống và các giới hạn tài nguyên phân bổ cho từng hạng thành viên (`useVbenVxeGrid`).
- **Nguồn Dữ Liệu:** Bảng `billing.plans` (schema `billing`).
- **API Client:** `getBillingPlansApi()` với `{ schema: 'billing' }`.
- **Quyền Hạn Yêu Cầu:** `['superadmin', 'subscriptions:read']`.

### 2.3. Người Dùng Nền Tảng: `/system/users` (Superadmin Only)

- **Mục Đích:** Quản lý danh bạ tài khoản người dùng đăng ký trên toàn nền tảng Cloud theo chuẩn **Enterprise User Directory** (`useVbenVxeGrid`), hỗ trợ tìm kiếm đa trường (Họ tên, Email, UUID, Tên/Slug Workspace), lọc theo trạng thái tổ chức và vai trò, sao chép UUID 1 chạm, và hộp thoại **User Inspector Dialog** hiển thị danh sách Workspace tham gia kèm điều hướng trực tiếp tới `/tenants/:id`.
- **Nguồn Dữ Liệu:** Bảng `public.profiles` kết hợp liên kết `public.tenant_members` (`tenants`, `member_roles(roles)`).
- **API Client & Helpers:** `getPlatformUsersApi()` và `filterPlatformUsers()`.
- **Quyền Hạn Yêu Cầu:** `authority: ['superadmin']`.

### 2.4. Nhật Ký Kiểm Toán Toàn Cầu: `/system/audit-logs` (Superadmin Only)

- **Mục Đích:** Giám sát nhật ký an ninh, phân quyền và thao tác dữ liệu trên toàn bộ hệ thống không phân biệt tenant (`useVbenVxeGrid`).
- **Nguồn Dữ Liệu:** Bảng `public.audit_logs`.
- **API Client:** `getGlobalAuditLogsApi()`.
- **Tính Năng:** Lọc theo hành động/tenant, hộp thoại xem chi tiết payload JSON `old_values` và `new_values`.
- **Quyền Hạn Yêu Cầu:** `authority: ['superadmin']`.

### 2.5. Quản Lý Thuê Bao Toàn Hệ Thống: `/system/subscriptions` (Superadmin Only)

- **Mục Đích:** Giám sát hợp đồng thuê bao SaaS của tất cả các tenant, theo dõi doanh thu định kỳ (MRR) và trạng thái thanh toán (`useVbenVxeGrid`).
- **Nguồn Dữ Liệu:** Bảng `billing.subscriptions` kết nối `tenants` và `plans` (schema `billing`).
- **API Client:** `getPlatformSubscriptionsApi()` với `{ schema: 'billing' }`.
- **Quyền Hạn Yêu Cầu:** `authority: ['superadmin']`, plugin `subscriptions`.

### 2.6. Vai Trò & Phân Quyền Hệ Thống: `/system/roles` (Superadmin Only)

- **Mục Đích:** Quản trị và tra cứu ma trận RBAC theo chuẩn **Enterprise Policy Console** với 2 bảng `useVbenVxeGrid` (`RolesGrid` cho 4 System Roles `owner`, `admin`, `member`, `viewer` và `PermissionsGrid` cho 36 quyền hạt nhân trong `public.permissions`), hỗ trợ lọc chéo Module $\leftrightarrow$ Role, hiển thị trực tiếp `RoleBadge` sở hữu từng quyền, sao chép nhanh mã quyền và hộp thoại **Role Policy Inspector Dialog** gom nhóm quyền hạn theo từng module.
- **Nguồn Dữ Liệu:** Bảng `public.roles`, `public.permissions`, `public.role_permissions`.
- **API Client & Helpers:** `getSystemRolesApi()`, `getSystemPermissionsApi()`, `filterSystemRoles()`, và `filterSystemPermissions()`.
- **Quyền Hạn Yêu Cầu:** `authority: ['superadmin']`.

---

## 3. Lưu Ý Kỹ Thuật & Độc Lập Phụ Thuộc (Gotchas)

1. **Ranh Giới Bảo Mật Cấp Superadmin:**
   - 4 tuyến `/system/users`, `/system/audit-logs`, `/system/subscriptions`, `/system/roles` có `meta.authority: ['superadmin']`. User thông thường hoàn toàn bị ẩn và chặn bởi guard định tuyến.
2. **PostgREST Schema Switch:**
   - Tuyến `/system/subscriptions` và `/system/plans` bắt buộc phải truyền `{ schema: 'billing' }` để đính kèm header `Accept-Profile: billing`.
