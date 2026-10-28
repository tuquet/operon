# Đặc Tả Route: Tenants / Workspaces (Không Gian Làm Việc)

> **Đường dẫn chính:** `/tenants` (Danh sách) và `/tenants/:id` (Chi tiết Workspace)  
> **Module File:** `src/router/routes/modules/tenants.ts`  
> **Plugin Quản Lý:** `core-iam`  
> **Quyền Truy Cập (`meta.authority`):** `['superadmin', 'tenants:read']`  
> **Biểu tượng:** `lucide:building-2`

---

## 1. Định Nghĩa Tuyến Đường (Route Definitions)

```typescript
{
  path: '/tenants',
  name: 'TenantsRoot',
  redirect: '/tenants',
  meta: {
    title: $t('page.tenants.title'),
    icon: 'lucide:building-2',
    plugin: 'core-iam',
    authority: ['superadmin', 'tenants:read'],
    order: 10,
    hideChildrenInMenu: true,
  },
  children: [
    {
      path: '',
      name: 'Tenants',
      component: () => import('#/views/tenants/index.vue'),
      meta: {
        title: $t('page.tenants.title'),
        icon: 'lucide:building-2',
        authority: ['superadmin', 'tenants:read'],
      },
    },
    {
      path: ':id',
      name: 'TenantDetail',
      component: () => import('#/views/tenants/detail.vue'),
      meta: {
        title: $t('page.tenants.detail'),
        icon: 'lucide:layout-grid',
        authority: ['superadmin', 'tenants:read'],
        hideInMenu: true,
      },
    },
  ]
}
```

---

## 2. Route Danh Sách: `/tenants`

### 2.1. Nguồn Dữ Liệu

- Bảng: `public.tenants`
- API Client: `getTenantsApi()`
- Bộ lọc & Tìm kiếm (`formOptions`): Tìm kiếm theo Tên (`name`), Slug (`slug`), Gói thuê bao (`plan`), hoặc Trạng thái (`active`, `suspended`, `archived`).

### 2.2. Bảng Dữ Liệu `useVbenVxeGrid` & Biểu Mẫu `VxeForm`

- Hiển thị bảng dữ liệu `useVbenVxeGrid` với các cột: Tên Workspace (kèm Avatar/Badge), Slug, Gói cước (`Free`, `Pro`, `Enterprise`), Số thành viên, Ngày tạo, Trạng thái (Badge), Nút Thao tác.
- **Hành Động Người Dùng:**
  - Nút **`$t('common.create')`** (`Tạo` / `Create` kèm icon `<Plus />`) mở modal `create-workspace-modal.vue` (sử dụng `VxeForm`) &rarr; gọi `createTenantApi({ name, slug, plan })`.
  - Nút **`$t('common.refresh')`** (`Làm mới` / `Refresh`) tải lại dữ liệu lưới.

---

## 3. Route Chi Tiết: `/tenants/:id`

Chi tiết Workspace được thiết kế dạng **Single Route với 4 Tabs nội dung**, trạng thái tab được đồng bộ 2 chiều với URL query `?tab=` (bảo toàn vị trí cuộn, không remount component):

| Tab Value | Component Con | Mục Đích & Nguồn Dữ Liệu Thực Tế |
| :-- | :-- | :-- |
| **`overview`** _(mặc định)_ | `workspace-overview-tab.vue` | Hiển thị thông tin tổng quan qua `VxeForm`, thời gian tạo, định danh duy nhất (UUID), trạng thái kết nối Cloud, card thống kê nhanh. |
| **`members`** | `workspace-members-tab.vue` | Quản lý danh sách thành viên từ `public.tenant_members` kết nối `public.profiles` và bảng phân quyền `public.member_roles`. Có modal `VxeForm` mời thành viên, sửa vai trò, xóa thành viên. |
| **`usage`** | `workspace-usage-tab.vue` | Đo đếm tài nguyên thực tế: Quota từ `billing.subscriptions` và `billing.plans` (schema `billing`), dung lượng lưu trữ, số lượng thiết bị Workers đã kết nối. |
| **`audit`** | `workspace-audit-tab.vue` | Nhật ký kiểm toán bảo mật từ `public.audit_logs` có điều kiện lọc nghiêm ngặt `tenant_id = :id`. |

### 3.1. Quy Trình Mời & Phân Quyền Thành Viên (RBAC Flow)

- **Mời Thành Viên:** Gửi email và vai trò lựa chọn (Owner, Admin, Member, Viewer). Hệ thống tìm kiếm `role_id` từ `public.roles`, sinh `token_hash` ngẫu nhiên và ghi nhận `invited_by = auth.uid()`.
- **Cập Nhật Vai Trò:** Cập nhật bản ghi trong bảng nối `public.member_roles` giữa `member_id` và `role_id`.

---

## 4. Quyết Định Kiến Trúc & Ràng Buộc (Gotchas)

1. **Loại Bỏ Tab "API Keys" (Quyết định D4):**
   - Không tồn tại bảng API Keys độc lập ở backend Supabase. Khóa kết nối headless thực tế được gắn với từng máy trạm qua cơ chế `enroll_device` của schema `workers`. Vì vậy tab này được lược bỏ để tránh lưu khóa giả vào `metadata`.
2. **Không Khởi Tạo Router Con Cho Từng Tab:**
   - Thay vì tạo `/tenants/:id/overview`, `/tenants/:id/members`... hệ thống sử dụng một component điều phối `detail.vue` lắng nghe `$route.query.tab`. Cách tiếp cận này giúp chuyển tab mượt mà không tải lại toàn bộ layout.
