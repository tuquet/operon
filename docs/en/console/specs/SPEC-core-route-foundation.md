# Spec: Kiến Trúc Định Tuyến Đa Phân Hệ, Plugin Gate & Bảo Toàn Cuộn Nội Trang (`route-foundation`)

> **Mã đặc tả:** `SPEC-route-foundation`  
> **Module id:** `route-foundation` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md), [`docs/routes/index.md`](../routes/index.md)  
> **Trạng thái:** **ĐÃ HOÀN THÀNH (ACCEPTED & IMPLEMENTED)**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Thiết lập kiến trúc định tuyến phân rã theo module và ranh giới Plugin cho `@operon/admin-web`, bao gồm **29 tuyến đường** phân bổ trên **6 nhóm điều hướng Sidebar** (`/dashboard`, `/tenants`, `/automation`, `/commerce`, `/system`) và cụm định tuyến lõi `core.ts`:

1. **Cấu Trúc 6 Nhóm Điều Hướng Sidebar & Cụm Tuyến Lõi (29 Routes):**
   - **`dashboard.ts` (`order: 1`):** Trang chủ mặc định `/dashboard/analytics` (hiển thị Telemetry thực tế từ Cloud & Loopback Daemon).
   - **`tenants.ts` (`order: 10`):** Quản trị Workspace đa thuê bao (`/tenants` danh sách và `/tenants/:id` chi tiết 4 tabs `overview | members | usage | audit`).
   - **`automation.ts` (`order: 20`):** Hợp nhất toàn bộ kịch bản tự động hóa (plugin `automation`: `workflows`, `runs`, `runs/:id`) và hạ tầng thực thi (plugin `workers`: `devices`, `browsers`, `proxies`) dưới một nhánh `/automation/*` duy nhất, khớp 1-1 với cây thư mục `src/views/automation/*`.
   - **`commerce.ts` (`order: 25`):** Cổng thương mại sản phẩm số & Ví trả trước (`/commerce/store`, `/commerce/orders`, `/wallet`, `/commerce/admin`).
   - **`system.ts` (`order: 30`):** Danh mục hệ thống (`/system/plugins`, `/system/plans`) và 4 tuyến giám sát toàn nền tảng dành riêng cho Platform Superadmin (`/system/users`, `/system/audit-logs`, `/system/subscriptions`, `/system/roles`).
   - **`core.ts`:** Cụm xác thực (`/auth/login`, `register`, `forget-password`, `reset-password`, `callback`, `desktop`), trang hồ sơ `/profile`, và cửa hàng công khai `/store` (`PublicStorefront`).
2. **Bộ Lọc Động Theo Plugin (`filterRoutesByPlugins`):**
   - Cắt tỉa tự động các route mà `meta.plugin` chưa có trạng thái `installed` trong `public.system_plugins`.
   - Hỗ trợ menu cha hỗn hợp đa plugin (như `/automation` kết hợp `automation` + `workers`, `/commerce` kết hợp `commerce` + `subscriptions`, `/system` kết hợp `core-iam` + `subscriptions`), chỉ ẩn menu cha khi toàn bộ route con bị lọc bỏ.
3. **Bảo Toàn Vị Trí Cuộn & Triệt Tiêu Nháy Trang Nội Tuyến (`Intra-Page Scroll Preservation`):**
   - Dùng `route.path` làm khóa định danh mặc định (`getTabKey`) cho `router-view`, tắt hiệu ứng transition và giữ nguyên vị trí cuộn khi người dùng chỉ thay đổi query parameters trên cùng một đường dẫn (`?tab=`, `?status=`, `?tenant=`).

---

## 2. Tech Stack

- **Router & Access Control:** Vue Router 4, `@operon/access` (`accessMode: 'frontend'`), `@operon/preferences`.
- **Layout & Scroll Hooks:** `@operon/layouts` (`useLayoutHook`, `useLayoutScroll`), `@operon/stores` (`getTabKey`).
- **Icons:** `@lucide/vue` (`lucide:layout-dashboard`, `lucide:building-2`, `lucide:workflow`, `lucide:shopping-bag`, `lucide:shield-check`).

---

## 3. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests cho Router và Plugin Gate
pnpm exec vitest run apps/web-admin/src/router

# 2. Kiểm tra kiểu dữ liệu TypeScript toàn bộ workspace
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
├── preferences.ts                            # defaultHomePath: '/dashboard/analytics'
├── router/
│   ├── index.ts                              # Khởi tạo Vue Router & scrollBehavior bảo toàn cuộn nội trang
│   ├── access.ts                             # Kết nối getInstalledPluginsApi() với filterRoutesByPlugins()
│   ├── plugin-gate.ts                        # Hàm thuần khiết filterRoutesByPlugins(routes, installedPlugins)
│   ├── __tests__/
│   │   └── plugin-gate.test.ts               # Unit tests kiểm thử lọc plugin đơn & hỗn hợp (automation/workers/commerce)
│   └── routes/
│       ├── index.ts                          # Tự động nạp modules/*.ts qua import.meta.glob
│       ├── core.ts                           # Root, /profile, /auth/* (6 routes), và /store (PublicStorefront)
│       └── modules/
│           ├── dashboard.ts                  # /dashboard/analytics (order: 1)
│           ├── tenants.ts                    # /tenants, /tenants/:id (order: 10)
│           ├── automation.ts                 # /automation/{workflows,runs,runs/:id,devices,browsers,proxies} (order: 20)
│           ├── commerce.ts                   # /commerce/{store,orders,wallet,admin} (order: 25)
│           ├── system.ts                     # /system/{plugins,plans,users,audit-logs,subscriptions,roles} (order: 30)
│           └── secrets.ts                    # /secrets/credentials (order: 40)
└── views/
    ├── dashboard/analytics/                  # Trang chủ Telemetry
    ├── tenants/                              # Danh sách & Chi tiết Workspace 4 tabs
    ├── automation/                           # Đồng bộ 100% với /automation/{workflows,runs,devices,browsers,proxies}
    ├── commerce/                             # Đồng bộ 100% với /commerce/{store,orders,wallet,admin} & public-store
    ├── system/                               # Đồng bộ 100% với /system/{plugins,plans,users,audit-logs,subscriptions,roles}
    └── secrets/                              # Đồng bộ 100% với /secrets/credentials (schema `secrets`)
```

---

## 5. Code Style & Kiến Trúc Chi Tiết

### 5.1. Ma Trận 28 Tuyến Đường & Ranh Giới Plugin / Authority

| Nhóm Module | Đường Dẫn (Path) | Tên Tuyến (Name) | Plugin (`meta.plugin`) | Quyền Truy Cập (`meta.authority`) |
| :-- | :-- | :-- | :-- | :-- |
| **Dashboard** | `/dashboard/analytics` | `Analytics` | `core-iam` | Authenticated |
| **Tenants** | `/tenants` | `Tenants` | `core-iam` | `['superadmin', 'tenants:read']` |
| **Tenants** | `/tenants/:id` | `TenantDetail` | `core-iam` | `['superadmin', 'tenants:read']` |
| **Automation** | `/automation/workflows` | `AutomationWorkflows` | `automation` | `['superadmin', 'automation:workflows:read']` |
| **Automation** | `/automation/jobs` | `AutomationRuns` | `automation` | `['superadmin', 'automation:campaigns:read']` |
| **Automation** | `/automation/jobs/:id` | `AutomationRunDetail` | `automation` | `['superadmin', 'automation:logs:read']` |
| **Automation** | `/automation/devices` | `AutomationDevices` | `workers` | `['superadmin', 'workers:devices:read']` |
| **Automation** | `/automation/browsers` | `AutomationBrowsers` | `workers` | `['superadmin', 'workers:browsers:read']` |
| **Automation** | `/automation/proxies` | `AutomationProxies` | `workers` | `['superadmin', 'workers:proxies:read']` |
| **Commerce** | `/commerce/store` | `CommerceStore` | `commerce` | `['superadmin', 'commerce:read']` |
| **Commerce** | `/commerce/orders` | `CommerceOrders` | `commerce` | `['superadmin', 'commerce:read']` |
| **Commerce** | `/wallet` | `CommerceWallet` | `subscriptions` | `['superadmin', 'subscriptions:read', 'commerce:read']` |
| **Commerce** | `/commerce/admin` | `CommerceAdmin` | `commerce` | `['superadmin', 'commerce:manage']` |
| **System** | `/system/plugins` | `SystemPlugins` | `core-iam` | `['superadmin', 'plugins:read']` |
| **System** | `/system/plans` | `SystemPlans` | `subscriptions` | `['superadmin', 'subscriptions:read']` |
| **System** | `/system/users` | `SystemUsers` | `core-iam` | `['superadmin']` |
| **System** | `/system/audit-logs` | `SystemAuditLogs` | `core-iam` | `['superadmin']` |
| **System** | `/system/subscriptions` | `SystemSubscriptions` | `subscriptions` | `['superadmin']` |
| **System** | `/system/roles` | `SystemRoles` | `core-iam` | `['superadmin']` |
| **Secret Store** | `/secrets/credentials` | `SecretsCredentials` | `secrets` | `['superadmin', 'secrets:credentials:read']` |
| **Core & Auth** | `/auth/{login,register,forget-password,reset-password,callback}` | `Login`..`AuthCallback` | Core | Public |
| **Core & Auth** | `/auth/desktop` | `DesktopBridge` | Core | Authenticated |
| **Core & Auth** | `/profile` | `Profile` | Core | Authenticated |
| **Core & Auth** | `/store` | `PublicStorefront` | Core | Public (`ignoreAccess: true`) |

### 5.2. Thuật Toán Cắt Tỉa Nhánh Động `filterRoutesByPlugins`

```ts
// apps/web-admin/src/router/plugin-gate.ts
export function filterRoutesByPlugins(
  routes: RouteRecordRaw[],
  installedPlugins: string[],
): RouteRecordRaw[] {
  const result: RouteRecordRaw[] = [];

  for (const route of routes) {
    const requiredPlugin = (route.meta as { plugin?: string } | undefined)
      ?.plugin;
    if (requiredPlugin && !installedPlugins.includes(requiredPlugin)) {
      continue;
    }

    const cloned = { ...route };
    if (cloned.children && cloned.children.length > 0) {
      cloned.children = filterRoutesByPlugins(
        cloned.children,
        installedPlugins,
      );
      if (cloned.children.length === 0 && !cloned.component) {
        continue; // Tự động ẩn menu cha nếu toàn bộ route con bị lọc bỏ
      }
    }
    result.push(cloned);
  }

  return result;
}
```

### 5.3. Bảo Toàn Cuộn Nội Trang (`Intra-Page Navigation Invariant`)

```ts
// apps/web-admin/src/router/index.ts
scrollBehavior(to, _from, savedPosition) {
  if (savedPosition) {
    return savedPosition;
  }
  // Giữ nguyên vị trí cuộn khi chỉ thay đổi query params trên cùng route path
  if (_from?.matched?.length && to.path === _from.path) {
    return false;
  }
  return to.hash ? { behavior: 'smooth', el: to.hash } : { left: 0, top: 0 };
}
```

---

## 6. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests (`plugin-gate.test.ts`):**
   - Kiểm tra lọc độc lập từng nhánh con trong các menu hỗn hợp (`/automation` với `automation` + `workers`; `/commerce` với `commerce` + `subscriptions`; `/system` với `core-iam` + `subscriptions`).
   - Kiểm tra tự động cắt tỉa (prune) menu cha khi 0 route con còn lại.
   - Kiểm tra bảo toàn tính bất biến (immutability) của mảng `routes` đầu vào.
2. **Typecheck & Lint Gate:** `pnpm --filter @operon/admin-web run typecheck` và `pnpm run lint` đạt `0 errors`.

---

## 7. Boundaries (Ranh Giới Kỹ Thuật)

- **Always:**
  - Khai báo đầy đủ `meta.plugin` và `meta.authority` trên mọi route nghiệp vụ.
  - Giữ cấu trúc thư mục trong `src/views/<module>/` khớp 1-1 với đường dẫn URL `/<module>/*`.
  - Bảo toàn vị trí cuộn và khóa `:key="route.path"` khi điều hướng query nội trang (`?tab=`, `?status=`).
- **Ask first:**
  - Thêm nhóm menu cấp 1 mới lên thanh Sidebar (hiện chuẩn hóa ở 6 nhóm cốt lõi).
  - Thêm route công khai mới vào `coreRoutes` (`ignoreAccess: true`).
- **Never:**
  - Không tạo các route redirect dư thừa hoặc giữ lại thư mục view không còn khớp với đường dẫn URL.
  - Không dùng `route.fullPath` làm khóa mặc định của `router-view` gây hủy/tạo lại component khi lọc bảng.

---

## 8. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1:** Thanh Sidebar hiển thị đúng 6 nhóm điều hướng cấp 1 theo thứ tự: `Dashboard` (`1`), `Workspaces` (`10`), `Automation` (`20`), `Commerce` (`25`), `Wallet` (`26`), và `System` (`30`).
- [x] **SC2:** Nhóm `/automation` hợp nhất trọn vẹn 6 tuyến con (`workflows`, `runs`, `runs/:id`, `devices`, `browsers`, `proxies`) với thư mục view đồng bộ tại `src/views/automation/*` và ranh giới plugin độc lập (`automation` vs `workers`).
- [x] **SC3:** Nhóm `/commerce` và tuyến công khai `/store` hoạt động chính xác với bộ lọc plugin (`commerce`, `subscriptions`) và cờ `ignoreAccess: true` cho khách vãng lai.
- [x] **SC4:** Thay đổi query parameter (`?tab=members`, `?status=running`) không gây nháy hiệu ứng chuyển trang hoặc nhảy thanh cuộn lên đầu trang.
- [x] **SC5:** 100% unit tests trong `plugin-gate.test.ts` pass và `typecheck` đạt 0 lỗi.

---

## 9. Resolved Decisions (Các Quyết Định Đã Chốt)

1. **Hợp nhất `Fleet` và `Automation` dưới `/automation`:** Gom 3 màn hình hạ tầng (`devices`, `browsers`, `proxies`) và 3 màn hình kịch bản (`workflows`, `runs`, `runs/:id`) vào cùng một menu `/automation` và thư mục `src/views/automation/`, trong khi vẫn giữ nguyên 2 mã plugin độc lập (`workers` và `automation`) để đánh giá quyền và trạng thái cài đặt chính xác.
2. **Fallback an toàn khi tải danh sách Plugin:** Nếu lời gọi `getInstalledPluginsApi()` gặp sự cố mạng tạm thời lúc khởi động, router mặc định rơi về `['core-iam']` để người vận hành vẫn truy cập được Dashboard và Workspaces mà không bị kẹt màn hình trắng.
