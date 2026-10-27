# Spec: Tầng Truy Cập Dữ Liệu Đa Schema & Phân Quyền Động (`data-access`)

> **Mã đặc tả:** `SPEC-data-access`  
> **Module id:** `data-access` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md)  
> **Trạng thái:** **ĐÃ HOÀN THÀNH (ACCEPTED & IMPLEMENTED)**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Thiết lập tầng truy cập dữ liệu trung tâm (Single Source of Truth — SSOT) cho `@operon/admin-web` kết nối trực tiếp tới Cloud PostgREST & GoTrue mà không phụ thuộc vào SDK `@supabase/supabase-js`:

1. **Giao Tiếp Đa Schema PostgREST (`supabaseRequest`):**
   - Hỗ trợ đọc/ghi trên toàn bộ **7 schema chuyên biệt** của Cloud: `public`, `workers`, `automation`, `billing`, `commerce`, `media`, và `events`.
   - Tự động đính kèm header `Accept-Profile: <schema>` cho các truy vấn đọc (`GET`, `HEAD`) và `Content-Profile: <schema>` cho các truy vấn ghi/RPC (`POST`, `PUT`, `PATCH`, `DELETE`).
   - Hỗ trợ cờ `skipAuth: true` cho các truy vấn công khai (như `/store` Guest Checkout) chỉ gửi `apikey` (`anon` key) mà không đính kèm JWT phiên đăng nhập, cùng cơ chế tự động làm mới token (`refreshSession`) khi gặp `401 Unauthorized`.
2. **Động Hóa Quyền Hạn Từ Cơ Sở Dữ Liệu (`getEffectiveAccessApi`):**
   - **Platform Superadmin** (`app_metadata.platform_role = 'superadmin'` trong JWT): Sở hữu toàn bộ danh mục quyền trong `public.permissions` kèm mã quyền `'superadmin'`.
   - **Multi-Tenant Member (User thường):** Hợp nhất tập quyền thực tế từ cơ sở dữ liệu qua chuỗi quan hệ `public.tenant_members` $\rightarrow$ `member_roles` $\rightarrow$ `roles` $\rightarrow$ `role_permissions` của tất cả các Workspace đang `active`.
   - Lưu bộ nhớ đệm đơn luồng (single-flight promise cache) cho mỗi phiên đăng nhập và xóa sạch khi đăng xuất (`clearAccessCache()`).
3. **Truy Vấn Trạng Thái Cài Đặt Plugin (`getInstalledPluginsApi`):**
   - Truy vấn danh sách các plugin có `status = 'installed'` từ `public.system_plugins` để cung cấp đầu vào cho bộ lọc định tuyến `filterRoutesByPlugins()`.

---

## 2. Tech Stack

- **Framework & Stores:** Vue 3.5, Pinia (`@operon/stores`), `@operon/access` (chế độ `'frontend'`).
- **HTTP & Auth Protocol:** Native `fetch` API chuẩn hóa qua `supabase-client.ts`, Supabase PostgREST v12 + GoTrue REST API.
- **Testing:** Vitest (`happy-dom`).

---

## 3. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests cho toàn bộ tầng API Core
pnpm exec vitest run apps/web-admin/src/api/core

# 2. Kiểm tra kiểu dữ liệu TypeScript cho web-admin
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
apps/web-admin/src/api/core/
├── supabase-client.ts                        # SSOT HTTP client (7 schemas, auto-refresh JWT, skipAuth)
├── access.ts                                 # getEffectiveAccessApi(), getInstalledPluginsApi(), pure helpers
├── auth.ts                                   # GoTrue Auth & getAccessCodesApi() -> gọi access.ts
├── user.ts                                   # getUserInfoApi() -> trả về roles & permissions thật từ access.ts
└── __tests__/
    └── access.test.ts                        # Unit tests cho readPlatformRole, flattenMemberships, schema headers
```

---

## 5. Code Style & Kiến Trúc Chi Tiết

### 5.1. Hợp Đồng `supabaseRequest` & Đa Schema PostgREST

```ts
export type SupabaseSchema =
  'automation' | 'billing' | 'commerce' | 'events' | 'media' | 'public' | 'workers';

export interface SupabaseRequestOptions extends RequestInit {
  _isRetry?: boolean;
  _retryToken?: string;
  preferRepresentation?: boolean;
  schema?: SupabaseSchema; // Mặc định 'public' -> không gửi Profile header
  skipAuth?: boolean; // true -> chỉ gửi apikey (dùng cho Public Storefront /store)
}
```

### 5.2. Ma Trận Truy Vấn Quyền Hạn & Plugin (`access.ts`)

```ts
export interface EffectiveAccess {
  isSuperadmin: boolean;
  permissions: string[]; // Danh sách permission_id đã loại trùng & sắp xếp
  tenantPermissions: Record<string, string[]>; // tenant_id -> permissions[]
}

export function readPlatformRole(accessToken: string): null | string;
export function flattenMemberships(
  rows: MembershipRow[],
): Pick<EffectiveAccess, 'permissions' | 'tenantPermissions'>;
export async function getEffectiveAccessApi(): Promise<EffectiveAccess>;
export async function getInstalledPluginsApi(): Promise<string[]>;
```

| Mục Đích | Schema | Truy Vấn PostgREST |
| :-- | :-- | :-- |
| **Quyền của Superadmin** | `public` | `GET /rest/v1/permissions?select=id` |
| **Quyền của User thường** | `public` | `GET /rest/v1/tenant_members?user_id=eq.<uid>&status=eq.active&select=tenant_id,member_roles(roles(role_permissions(permission_id)))` |
| **Danh sách Plugin đã cài** | `public` | `GET /rest/v1/system_plugins?status=eq.installed&select=id` |

---

## 6. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests (`access.test.ts`):**
   - Kiểm tra `readPlatformRole`: giải mã base64url JWT hợp lệ, token không có `platform_role`, và token sai định dạng.
   - Kiểm tra `flattenMemberships`: gộp quyền từ nhiều Workspace, khử trùng lặp `permission_id`, xử lý mảng `member_roles` rỗng.
   - Kiểm tra `supabaseRequest`: tự động gắn `Accept-Profile` cho `GET`/`HEAD` và `Content-Profile` cho `POST`/`PATCH`/`DELETE` trên cả 7 schemas.
2. **Typecheck & Lint Gate:** `pnpm --filter @operon/admin-web run typecheck` và `pnpm run lint` đạt `0 errors`.

---

## 7. Boundaries (Ranh Giới Kỹ Thuật)

- **Always:**
  - Mọi truy vấn HTTP tới Cloud trong `apps/web-admin` bắt buộc đi qua `supabaseRequest<T>()`.
  - Xóa bộ nhớ đệm quyền hạn (`clearAccessCache()`) ngay khi người dùng đăng xuất hoặc làm mới phiên thất bại.
  - Sử dụng `encodeURIComponent` khi truyền tham số động vào chuỗi truy vấn PostgREST.
- **Ask first:**
  - Thêm schema PostgreSQL mới vào kiểu `SupabaseSchema`.
  - Thay đổi cơ chế `accessMode` của `@operon/access`.
- **Never:**
  - Không bao giờ đọc quyền `superadmin` từ `user_metadata` (do người dùng cuối có thể tự chỉnh sửa `user_metadata`; chỉ tin cậy `app_metadata.platform_role`).
  - Không đọc danh sách quyền từ JWT claim (do giới hạn cắt 25 quyền của JWT hook).
  - Không fallback về danh sách quyền giả lập khi truy vấn mạng thất bại.

---

## 8. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1:** `supabaseRequest` hỗ trợ đầy đủ 7 schemas (`public`, `workers`, `automation`, `billing`, `commerce`, `media`, `events`), tự động gắn đúng `Accept-Profile` / `Content-Profile` theo HTTP method.
- [x] **SC2:** Hoàn toàn loại bỏ các mã vai trò tĩnh (`'super'`, `'user'`) khỏi `auth.ts` và `user.ts`.
- [x] **SC3:** Tài khoản thường nhận đúng tập hợp `permission_id` thực tế từ các Workspace đang hoạt động; tài khoản có `app_metadata.platform_role = 'superadmin'` nhận toàn bộ quyền và role `'superadmin'`.
- [x] **SC4:** Single-flight promise cache đảm bảo `fetchUserInfo()` và `getAccessCodesApi()` chỉ kích hoạt duy nhất 1 lượt truy vấn DB cho mỗi lần đăng nhập.
- [x] **SC5:** Toàn bộ unit tests trong `src/api/core/__tests__/` và `typecheck` pass 100%.

---

## 9. Resolved Decisions (Các Quyết Định Đã Chốt)

1. **Xác thực Superadmin qua `app_metadata.platform_role`:** Đồng bộ với hàm bảo mật `public.is_platform_admin()` tại tầng cơ sở dữ liệu `operon/cloud`, đảm bảo tính nhất quán giữa quyền giao diện và chính sách Row-Level Security (RLS).
2. **Single-Flight Access Cache:** Lưu promise đang chạy trong `access.ts` để hai lời gọi song song `fetchUserInfo()` và `getAccessCodesApi()` lúc khởi động ứng dụng dùng chung kết quả mà không nhân đôi truy vấn mạng.
