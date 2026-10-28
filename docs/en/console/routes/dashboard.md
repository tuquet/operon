# Đặc Tả Route: Dashboard & Telemetry Analytics

> **Đường dẫn:** `/dashboard` &rarr; `/dashboard/analytics`  
> **Module File:** `src/router/routes/modules/dashboard.ts`  
> **Component:** `src/views/dashboard/analytics/index.vue`  
> **Plugin Quản Lý:** `core-iam`  
> **Biểu tượng:** `lucide:layout-dashboard` / `lucide:area-chart`

---

## 1. Định Nghĩa Tuyến Đường (Route Definitions)

```typescript
{
  path: '/dashboard',
  name: 'Dashboard',
  redirect: '/dashboard/analytics',
  meta: {
    title: $t('page.dashboard.title'),
    icon: 'lucide:layout-dashboard',
    plugin: 'core-iam',
    order: -1,
    hideChildrenInMenu: true,
  },
  children: [
    {
      path: 'analytics',
      name: 'Analytics',
      component: () => import('#/views/dashboard/analytics/index.vue'),
      meta: {
        title: $t('page.dashboard.analytics'),
        icon: 'lucide:area-chart',
        affixTab: true,
      },
    },
  ]
}
```

---

## 2. Nguồn Dữ Liệu Thực Tế (100% Real Telemetry)

Trang Analytics không sử dụng bất kỳ số liệu giả hay mock data nào. Dữ liệu được đo đếm trực tiếp qua hàm `getRealAnalyticsDataApi()`:

| Chỉ Số Telemetry | Bảng Dữ Liệu Nguồn | Cách Tính Toán |
| :-- | :-- | :-- |
| **Tổng số Workspaces** | `public.tenants` | `SELECT count(*) FROM public.tenants` |
| **Workspaces hoạt động** | `public.tenants` | Đếm các bản ghi có `status = 'active'` |
| **Biểu đồ tăng trưởng** | `public.tenants.created_at` | Gom nhóm tích lũy theo mốc thời gian tạo workspace |
| **Phân bổ gói cước** | `public.tenants.metadata.plan` | Phân tích tỉ lệ các gói Free, Pro, Enterprise |
| **Trạng thái Plugins** | `public.system_plugins` | Đếm số lượng Core Kernel Plugins và Plugins mở rộng |
| **Độ trễ Edge Network** | Supabase REST Edge | Đo thời gian phản hồi thực tế (`performance.now()`) giữa trình duyệt và Cloudflare/Supabase |
| **Loopback Bridge** | `http://127.0.0.1:8765` | Thăm dò ngầm trạng thái daemon máy trạm Desk |

---

## 3. Lưu Ý Kỹ Thuật (Gotchas & Guardrails)

1. **Private Network Access (PNA):**
   - Trình duyệt Chromium có thể hiển thị thông báo cấp quyền khi web admin truy vấn `127.0.0.1:8765`.
   - Lệnh thăm dò gateway sử dụng `mode: 'no-cors'` và gắn `AbortController` timeout tối đa $1200\text{ms}$ để tránh treo giao diện nếu daemon không chạy hoặc người dùng chặn quyền.
2. **Tab Cố Định (`affixTab: true`):**
   - Trang `/dashboard/analytics` được cấu hình là trang mặc định khi đăng nhập thành công (`preferences.app.defaultHomePath = '/dashboard/analytics'`).
