# Spec: Quản Trị Bể Proxy Phân Tán (`/automation/proxies`)

> **Mã đặc tả:** `SPEC-automation-proxies`  
> **Route URL:** `/automation/proxies`  
> **Component:** `apps/web-admin/src/views/automation/proxies/index.vue`  
> **PostgreSQL Schema:** `workers.proxies`  
> **Phân quyền (RBAC):** `['superadmin', 'workers:proxies:read']` / `workers:proxies:manage`  
> **Kiến trúc nguồn:** [`overview.md`](../architecture/overview.md), [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md)  
> **Liên kết phân hệ:** [`SPEC-automation-browsers.md`](SPEC-automation-browsers.md), [`SPEC-automation-devices.md`](SPEC-automation-devices.md), [`SPEC-automation-jobs.md`](SPEC-automation-jobs.md), [`SPEC-ui-mobile-vxe-detail-sheet.md`](SPEC-ui-mobile-vxe-detail-sheet.md)  
> **Ngày cập nhật:** `2026-10-22`  
> **Trạng thái:** **ACCEPTED & IMPLEMENTED**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Quản trị danh mục Proxy mạng (HTTP, HTTPS, SOCKS4, SOCKS5) phục vụ che giấu IP, định tuyến đa vùng và chống rò rỉ WebRTC cho các phiên trình duyệt tự động:

1. **Lưới Dữ Liệu (`useVbenVxeGrid`):**
   - Host & Port (`host`, `port`).
   - Giao thức (`protocol`: `http`, `https`, `socks4`, `socks5`).
   - Vị trí địa lý: Quốc gia (`country_code`), Thành phố (`city`).
   - Trạng thái kiểm tra: Độ trễ phản hồi (`latency_ms`), Số lỗi gặp phải (`error_count`), Lần kiểm tra cuối (`last_checked_at`).
   - Loại Proxy: Dân cư (`is_residential`).
   - Trạng thái: `active`, `testing`, `failing`, `disabled`.

2. **Bộ Lọc Nhanh (Search & Filter Bar):**
   - Lọc theo trạng thái: Tất cả (`all`), Hoạt động (`active`), Lỗi (`failing`), Đang test (`testing`), Vô hiệu hóa (`disabled`).
   - Ô tìm kiếm text theo Host hoặc Quốc gia.

3. **Thêm Mới & Chỉnh Sửa Proxy (`New record` - `vxe-row-detail-sheet`):**
   - Host, Port, Giao thức, Username, Password (lưu trữ và mã hóa an toàn).

---

## 2. API & Interface Contract (`src/api/core/automation.ts`)

Tuân thủ nghiêm ngặt nguyên lý **Resource-Oriented SDK** theo chuẩn `addy-api-and-interface-design`:

```typescript
// ============================================================================
// CONTRACT: PROXIES POOL API (PostgreSQL schema: 'workers')
// ============================================================================

export interface ListProxiesParams {
  countryCode?: string;
  protocol?: string;
  search?: string;
  status?: string;
  tenantId?: string;
}

export interface ProxyNode {
  country_code: string;
  host: string;
  id: string;
  latency_ms: number;
  port: number;
  protocol: ProxyProtocol;
  status: ProxyStatus;
  tenant_id: string;
}

/** Lấy danh sách proxy pool từ workers.proxies */
export async function listProxies(params?: ListProxiesParams): Promise<ProxyNode[]>;

// ============================================================================
// NAMESPACED SDK OBJECT
// ============================================================================

export const proxiesApi = {
  list: listProxies,
};
```

---

## 3. Tech Stack & File Tác Động

- **View Component:** `apps/web-admin/src/views/automation/proxies/index.vue`
- **Tầng API Client:** `apps/web-admin/src/api/core/automation.ts` (`listProxies`)
- **Schema Registry SSOT:** `apps/web-admin/src/api/core/supabase-schema-registry.ts` (`workers.proxies`)
- **Detail Form Sheet:** `apps/web-admin/src/components/vxe-detail-sheet/vxe-row-detail-sheet.vue`
- **Route Definition:** `apps/web-admin/src/router/routes/modules/automation.ts` (`name: 'AutomationProxies', path: 'proxies'`)

---

## 4. Testing & Verification

```bash
# 1. Chạy unit tests cho API automation & proxies
pnpm --filter @operon/admin-web exec vitest run src/api/core/__tests__/automation.test.ts

# 2. Kiểm tra typecheck TypeScript
pnpm --filter @operon/admin-web run typecheck

# 3. Linter & Format check
npx oxlint apps/web-admin/src/

# 4. Kiểm tra tài liệu VitePress & Cross-links
pnpm -C docs run build
```
