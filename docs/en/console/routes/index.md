# Tài Liệu Đặc Tả Hệ Thống Định Tuyến (Admin Routing Reference)

> **Mã tài liệu:** `ARCH-ADMIN-ROUTES`  
> **Áp dụng cho:** `operon/admin` (`apps/web-admin`)  
> **Tài liệu kiến trúc tổng thể:** [`docs/architecture/overview.md`](../architecture/overview.md)  
> **Quyết định liên quan:** | | ---

## 1. Tổng Quan Kiến Trúc (Architecture Overview)

Hệ thống định tuyến của Web Admin bao gồm **29 tuyến đường chuẩn mực**, được phân rã thành **6 module nghiệp vụ Sidebar** tại thư mục `src/router/routes/modules/` (21 tuyến nghiệp vụ) kết hợp cùng cụm tuyến xác thực và công khai `core.ts` (8 tuyến lõi).

Mỗi tuyến đường nghiệp vụ được cô lập theo ranh giới Plugin (`plugin boundary`) từ `public.system_plugins`. Giao diện chỉ hiển thị và kích hoạt tuyến đường khi plugin tương ứng mang trạng thái `installed`.

```mermaid
graph TD
    AppRoot["/ (Root Router)"] --> AuthModule["/auth (AuthPageLayout — 6 routes)"]
    AppRoot --> PublicStore["/store (PublicStorefront — Guest Checkout)"]
    AppRoot --> CoreModule["/ (BasicLayout + /profile)"]

    CoreModule --> DashboardMod["/dashboard (core-iam — 1 route)"]
    CoreModule --> TenantsMod["/tenants (core-iam — 2 routes)"]
    CoreModule --> AutoMod["/automation (automation | workers — 7 routes)"]
    CoreModule --> CommerceMod["/commerce (commerce — 3 routes)"]
    CoreModule --> WalletMod["/wallet (subscriptions — 1 route)"]
    CoreModule --> SystemMod["/system (core-iam | subscriptions — 7 routes)"]

    DashboardMod --> Analytics["/dashboard/analytics"]

    TenantsMod --> TenantsList["/tenants (List)"]
    TenantsMod --> TenantDetail["/tenants/:id (?tab=)"]

    AutoMod --> AutoOverview["/automation/overview (automation | workers)"]
    AutoMod --> Workflows["/automation/workflows (automation)"]
    AutoMod --> Jobs["/automation/jobs (automation)"]
    AutoMod --> JobDetail["/automation/jobs/:id (automation)"]
    AutoMod --> Devices["/automation/devices (workers)"]
    AutoMod --> Browsers["/automation/browsers (workers)"]
    AutoMod --> Proxies["/automation/proxies (workers)"]

    CommerceMod --> CStore["/commerce/store (commerce)"]
    CommerceMod --> COrders["/commerce/orders (commerce)"]
    CommerceMod --> CAdmin["/commerce/admin (commerce)"]

    WalletMod --> CWallet["/wallet (subscriptions, alias /commerce/wallet)"]

    SystemMod --> SysOverview["/system/overview (core-iam | subscriptions)"]
    SystemMod --> SysPlugins["/system/plugins (core-iam)"]
    SystemMod --> SysPlans["/system/plans (subscriptions)"]
    SystemMod --> SysUsers["/system/users (superadmin)"]
    SystemMod --> SysAudit["/system/audit-logs (superadmin)"]
    SystemMod --> SysSubs["/system/subscriptions (superadmin)"]
    SystemMod --> SysRoles["/system/roles (superadmin)"]
```

---

## 2. Bảng Danh Mục Tuyến Đường Toàn Diện (29 Routes Master Inventory)

| STT | Tuyến Đường (Path) | Tên Tuyến (Name) | Plugin Quản Lý | Quyền Truy Cập (`meta.authority`) | Layout | File Giao Diện (Component) | Schema & Bảng Dữ Liệu |
| :-: | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | **`/dashboard/analytics`** | `Analytics` | `core-iam` | Authenticated | `BasicLayout` | `analytics/index.vue` | `public.tenants`, `public.system_plugins` |
| 2 | **`/tenants`** | `Tenants` | `core-iam` | `['superadmin', 'tenants:read']` | `BasicLayout` | `tenants/index.vue` | `public.tenants` |
| 3 | **`/tenants/:id`** | `TenantDetail` | `core-iam` | `['superadmin', 'tenants:read']` | `BasicLayout` | `tenants/detail.vue` | `public.tenants`, `tenant_members`, `billing.subscriptions`, `audit_logs` |
| 4 | **`/automation/overview`** | `AutomationOverview` | `automation` + `workers` | `['superadmin', 'automation:workflows:read', 'automation:jobs:read', 'workers:devices:read', 'workers:browsers:read', 'workers:proxies:read']` | `BasicLayout` | `automation/overview/index.vue` | `automation.*`, `workers.*` |
| 5 | **`/automation/workflows`** | `AutomationWorkflows` | `automation` | `['superadmin', 'automation:workflows:read']` | `BasicLayout` | `automation/workflows/index.vue` | `automation.workflows` |
| 6 | **`/automation/jobs`** | `AutomationJobs` | `automation` | `['superadmin', 'automation:jobs:read']` | `BasicLayout` | `automation/jobs/index.vue` | `automation.jobs` |
| 7 | **`/automation/jobs/:id`** | `AutomationJobDetail` | `automation` | `['superadmin', 'automation:jobs:read']` | `BasicLayout` | `automation/jobs/detail.vue` | `automation.jobs`, `automation.execution_logs` |
| 8 | **`/automation/devices`** | `AutomationDevices` | `workers` | `['superadmin', 'workers:devices:read']` | `BasicLayout` | `automation/devices/index.vue` | `workers.devices` |
| 9 | **`/automation/browsers`** | `AutomationBrowsers` | `workers` | `['superadmin', 'workers:browsers:read']` | `BasicLayout` | `automation/browsers/index.vue` | `workers.browsers` |
| 10 | **`/automation/proxies`** | `AutomationProxies` | `workers` | `['superadmin', 'workers:proxies:read']` | `BasicLayout` | `automation/proxies/index.vue` | `workers.proxies` |
| 11 | **`/commerce/store`** | `CommerceStore` | `commerce` | `['superadmin', 'commerce:read']` | `BasicLayout` | `commerce/store/index.vue` | `commerce.categories`, `products`, `product_variants` |
| 12 | **`/commerce/orders`** | `CommerceOrders` | `commerce` | `['superadmin', 'commerce:read']` | `BasicLayout` | `commerce/orders/index.vue` | `commerce.orders`, `order_items`, `order_deliveries` |
| 13 | **`/commerce/admin`** | `CommerceAdmin` | `commerce` | `['superadmin', 'commerce:manage']` | `BasicLayout` | `commerce/admin/index.vue` | `commerce.*`, `billing.payment_gateways`, `payment_intents` |
| 14 | **`/wallet`** *(alias `/commerce/wallet`)* | `CommerceWallet` | `subscriptions` | `['superadmin', 'subscriptions:read', 'commerce:read']` | `BasicLayout` | `commerce/wallet/index.vue` | `billing.wallets`, `wallet_transactions`, `payment_intents` |
| 15 | **`/system/overview`** | `SystemOverview` | `core-iam` + `subscriptions` | `['superadmin', 'plugins:read', 'subscriptions:read']` | `BasicLayout` | `system/overview/index.vue` | `public.system_plugins`, `billing.*` |
| 16 | **`/system/plugins`** | `SystemPlugins` | `core-iam` | `['superadmin', 'plugins:read']` | `BasicLayout` | `system/plugins/index.vue` | `public.system_plugins` |
| 17 | **`/system/plans`** | `SystemPlans` | `subscriptions` | `['superadmin', 'subscriptions:read']` | `BasicLayout` | `system/plans/index.vue` | `billing.plans` |
| 18 | **`/system/users`** | `SystemUsers` | `core-iam` | `['superadmin']` | `BasicLayout` | `system/users/index.vue` | `public.profiles` |
| 19 | **`/system/audit-logs`** | `SystemAuditLogs` | `core-iam` | `['superadmin']` | `BasicLayout` | `system/audit-logs/index.vue` | `public.audit_logs` |
| 20 | **`/system/subscriptions`** | `SystemSubscriptions` | `subscriptions` | `['superadmin']` | `BasicLayout` | `system/subscriptions/index.vue` | `billing.subscriptions` |
| 21 | **`/system/roles`** | `SystemRoles` | `core-iam` | `['superadmin']` | `BasicLayout` | `system/roles/index.vue` | `public.roles`, `permissions` |
| 22 | **`/auth/login`** | `Login` | Core | Public | `AuthPageLayout` | `login.vue` | Supabase Auth API |
| 23 | **`/auth/register`** | `Register` | Core | Public | `AuthPageLayout` | `register.vue` | Supabase Auth API |
| 24 | **`/auth/forget-password`** | `ForgetPassword` | Core | Public | `AuthPageLayout` | `forget-password.vue` | Supabase Auth API |
| 25 | **`/auth/reset-password`** | `ResetPassword` | Core | Public | `AuthPageLayout` | `reset-password.vue` | Supabase Auth API |
| 26 | **`/auth/callback`** | `AuthCallback` | Core | Public | `AuthPageLayout` | `callback.vue` | Supabase OAuth Flow |
| 27 | **`/auth/desktop`** | `DesktopBridge` | Core | Authenticated | `AuthPageLayout` | `desktop-gateway.vue` | Desktop Loopback SSO |
| 28 | **`/profile`** | `Profile` | Core | Authenticated | `BasicLayout` | `profile/index.vue` | `public.profiles` |
| 29 | **`/store`** | `PublicStorefront` | Core | Public (`ignoreAccess`) | Standalone | `public-store/index.vue` | `commerce.*`, `billing.payment_gateways` (`skipAuth`) |

---

## 3. Cơ Chế Lọc Plugin Gate (`plugin-gate.ts`)

Mỗi khi người dùng khởi động phiên làm việc, router chạy hàm lọc thuần khiết `filterRoutesByPlugins(routes, installedPluginIds)`.

### Quy Tắc Xử Lý:

1. **Route không khai báo `meta.plugin`:** Được giữ nguyên hoặc đánh giá dựa trên danh sách `children` (ví dụ route cha `/automation`, `/commerce`, `/wallet`).
2. **Route khai báo `meta.plugin`:** Kiểm tra xem plugin ID có nằm trong danh sách các plugin đã cài đặt (`status === 'installed'` trong `public.system_plugins`) hay không. `meta.plugin` có thể là **mảng** (ví dụ `/automation/overview` thuộc `['automation', 'workers']`).
3. **Đệ quy trên Route Con (`children`):**
   - Nếu toàn bộ route con bị lọc bỏ và route cha không có `component`, route cha tự động bị cắt tỉa (pruned) khỏi menu.
   - Trong nhóm `/automation`, các route con thuộc `automation` (`overview`, `workflows`, `jobs`, `jobs/:id`) và các route con thuộc `workers` (`devices`, `browsers`, `proxies`) được đánh giá độc lập.
   - `/wallet` là **module độc lập** (plugin `subscriptions`), tách khỏi `/commerce`; route con giữ `alias: '/commerce/wallet'` để tương thích liên kết cũ.
   - Trong nhóm `/commerce`, các route con thuộc `commerce` (`store`, `orders`, `admin`) được đánh giá độc lập.

---

## 4. Động Hóa Đánh Giá Quyền Hạn (Dynamic Authority)

Thay vì kiểm tra vai trò cứng (`role: ['admin']`), router áp dụng cơ chế đánh giá động qua `src/api/core/access.ts`:

1. **Superadmin Bypass:** Nếu tài khoản có `platform_role === 'superadmin'` (qua JWT `app_metadata` hoặc hàm `public.is_platform_admin()`), user sở hữu quyền `superadmin` và toàn quyền truy cập 100% routes.
2. **Tenant Dynamic Permissions:** Với user thông thường, hệ thống truy vấn các vai trò của user qua `public.tenant_members` $\rightarrow$ `public.member_roles` $\rightarrow$ `public.roles` $\rightarrow$ `public.role_permissions`.
3. Khớp chuỗi permission định dạng `<module>:<action>` hoặc `<module>:<resource>:<action>` (ví dụ `workers:devices:read`, `automation:workflows:read`, `automation:jobs:read`, `commerce:read`).

---

## 5. Tiêu Chuẩn Giao Diện Bắt Buộc (UI Standards)

Mọi route quản trị đều tuân thủ các quy tắc sau:

- **Bảng dữ liệu `useVbenVxeGrid` & Biểu mẫu `VxeForm`:**
  - Mọi trang danh sách sử dụng `useVbenVxeGrid` (`VxeTable`) từ `src/adapter/vxe-table.ts` kèm bộ lọc `formOptions`, đường kẻ semantic token `border-border/40`, cuộn ngang tự nhiên (`overflow-x: auto`) và phân trang căn giữa trên thiết bị di động.
  - Mọi trang chi tiết và hộp thoại modal sử dụng `VxeForm`.
- **Biểu tượng (Icons):** Chỉ sử dụng Lucide Icons (`@lucide/vue`), tuyệt đối không dùng Emoji làm biểu tượng hệ thống.
- **Đồng bộ URL & Bảo toàn vị trí cuộn:** Mọi trạng thái lọc (`?tenant=`, `?status=`, `?tab=`) đều gắn hai chiều vào URL Query mà không gây nháy trang hay nhảy cuộn lên đầu trang.

---

## 6. Liên Kết Chi Tiết Từng Module

- [Dashboard & Analytics](dashboard.md)
- [Automation Engine & Workers Fleet](automation.md)
- [System Catalog & Governance](system.md)
- [Auth & Core Routes](auth.md)
