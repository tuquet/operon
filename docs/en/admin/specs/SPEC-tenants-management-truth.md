# Spec: Quản Trị Workspace & Chi Tiết 4 Tabs Dữ Liệu Thực (`tenants-truth`)

> **Mã đặc tả:** `SPEC-tenants-truth`  
> **Module id:** `tenants-truth` (xem [`CAPABILITY-map-web-admin.md`](CAPABILITY-map-web-admin.md))  
> **Kiến trúc nguồn:** [`docs/architecture/overview.md`](../architecture/overview.md), [`docs/routes/tenants.md`](../routes/tenants.md)  
> **Trạng thái:** **ĐÃ HOÀN THÀNH (ACCEPTED & IMPLEMENTED)**

---

## 1. Objective (Mục Tiêu & Phạm Vi)

Xây dựng phân hệ Quản trị Workspace (`/tenants` và `/tenants/:id`) kết nối **100% dữ liệu đo đếm thực tế (Real Telemetry)** từ 3 schema `public`, `billing`, và `workers` của Cloud, sử dụng chuẩn bảng dữ liệu `useVbenVxeGrid` (`VxeTable`) và biểu mẫu `VxeForm`:

1. **Danh Sách Workspace (`/tenants`):**
   - Hiển thị danh mục toàn bộ Workspace mà người dùng có quyền truy cập (hoặc toàn bộ nền tảng đối với Superadmin) qua bảng `useVbenVxeGrid`.
   - Hỗ trợ tìm kiếm theo tên/slug/UUID, lọc theo trạng thái (`active`, `suspended`, `archived`), tạo Workspace mới qua `VxeForm` modal, và chọn Workspace làm ngữ cảnh hoạt động hiện tại (`activeTenantId`).
2. **Bộ Chọn Workspace Toàn Cục & State Propagation (`workspace-selector.vue`):**
   - Tích hợp tại Sidebar (Header hoặc Collapsed View) và các màn hình phân hệ (Commerce Wallet, Store, Orders) cho phép chuyển đổi nóng Workspace làm việc hiện hành.
   - Khi chọn một Workspace (`handleSelectWorkspace`), hệ thống kích hoạt chuỗi hành vi chuẩn mực:
     1. **Pinia Reactive State:** Cập nhật `activeWorkspaceId` trong `useWorkspaceStore`.
     2. **Persistence Storage:** Ghi đè khóa `localStorage.setItem("active_tenant_id", id)` (`STORAGE_KEYS.ACTIVE_TENANT_ID`).
     3. **Bugsink Telemetry:** Gắn tag ngữ cảnh `setBugsinkTag("workspace_id", id)` cho toàn bộ log lỗi và exception phát sinh.
     4. **User Feedback:** Hiển thị thông báo toast thành công (`page.workspace.switched_to`).
     5. **Event Broadcast:** Phát sự kiện Window Event `opn:workspace-changed` mang theo `{ detail: { tenantId, tenant } }` để các component phụ thuộc cập nhật lại dữ liệu.
     6. **Schema Registry Auto-fill:** Tự động điền giá trị mặc định `defaultValue: () => getActiveTenantId()` cho các trường `tenant_id` trong biểu mẫu `VxeForm` / `VxeGrid` khi tạo mới bản ghi.
3. **Chi Tiết Workspace 4 Tabs Đồng Bộ URL (`/tenants/:id?tab=overview|members|usage|audit`):**
   - **Tab `overview`:** Hiển thị hồ sơ định danh Workspace (`VxeForm`), số lượng máy trạm Runner trực tuyến / tổng số từ `workers.devices`, gói thuê bao hiện hành từ `billing.subscriptions`, và các thao tác quản trị (chọn làm Workspace đang hoạt động, đổi tên/slug, lưu trữ/xóa).
   - **Tab `members`:** Bảng `useVbenVxeGrid` hiển thị danh sách thành viên thật từ `public.tenant_members` liên kết `profiles` và vai trò qua `member_roles(role_id,roles(id,name,display_name))` (`owner`, `admin`, `member`, `viewer`). Hỗ trợ mời thành viên mới vào `public.tenant_invitations` (`role_id`, `token_hash`, `invited_by`, `expires_at`), đổi vai trò trong `public.member_roles`, và thu hồi quyền thành viên.
   - **Tab `usage`:** Hiển thị hạn mức và mức tiêu thụ tài nguyên thực tế từ `billing.subscriptions`, `billing.plans` (mặc định rơi về gói `free` nếu chưa có hợp đồng riêng), `billing.usage_meters`, `workers.devices` và `public.tenant_members`.
   - **Tab `audit`:** Bảng `useVbenVxeGrid` tra cứu nhật ký kiểm toán an ninh của Workspace từ `public.audit_logs` (`tenant_id = eq.<tenantId>`).

---

## 2. Tech Stack

- **Framework:** Vue 3.5 (`<script setup lang="ts">`), Vue Router 4, TypeScript 5.
- **Data Grid & Form Engine:** `useVbenVxeGrid` (`VxeTable`) và `VxeForm` từ `src/adapter/vxe-table.ts`.
- **UI & Icons:** `@operon/vue-ui` (`Badge`, `Button`, `Card`, `Dialog`, `Tabs`, `toast`), `@lucide/vue`.
- **Data Access Layer:** `src/api/core/tenant.ts` và `src/api/core/workspace-detail.ts`.

---

## 3. Commands (Lệnh Thực Thi & Kiểm Định)

```bash
# 1. Chạy unit tests cho API Workspace & Tenant
pnpm exec vitest run apps/web-admin/src/api/core/__tests__/workspace-detail.test.ts

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
│   ├── tenant.ts                                     # CRUD danh sách Workspace & quản lý activeTenantId
│   ├── workspace-detail.ts                           # Hợp nhất dữ liệu 4 tabs (public, workers, billing)
│   └── __tests__/
│       └── workspace-detail.test.ts                  # Unit tests cho chuẩn hóa dữ liệu thành viên, quota, token_hash
├── router/routes/modules/
│   └── tenants.ts                                    # Định tuyến /tenants và /tenants/:id
└── views/tenants/
    ├── index.vue                                     # Danh sách Workspace (useVbenVxeGrid + Create Modal VxeForm)
    ├── detail.vue                                    # Khung 4 tabs đồng bộ URL query ?tab=
    └── components/
        ├── workspace-overview-tab.vue                # Tab Overview (VxeForm cập nhật tên/slug & thống kê thiết bị)
        ├── workspace-members-tab.vue                 # Tab Members (useVbenVxeGrid + Invite/Change Role VxeForm Modals)
        ├── workspace-usage-tab.vue                   # Tab Usage & Quotas (billing.subscriptions + usage_meters)
        └── workspace-audit-tab.vue                   # Tab Audit Logs (useVbenVxeGrid tra cứu sự kiện an ninh)
```

---

## 5. Code Style & Kiến Trúc Chi Tiết

### 5.1. Mô Hình Dữ Liệu & Chữ Ký Hàm API (`workspace-detail.ts`)

```ts
export type TenantDetailTab = 'audit' | 'members' | 'overview' | 'usage';

export interface WorkspaceMemberRole {
  display_name: string;
  id: string;
  name: 'admin' | 'member' | 'owner' | 'viewer';
}

export interface WorkspaceMember {
  avatar_url?: null | string;
  email: string;
  full_name?: null | string;
  id: string;
  joined_at: string;
  role: WorkspaceMemberRole;
  status: 'active' | 'invited' | 'suspended';
  user_id: string;
}

export interface WorkspaceUsageQuota {
  max_devices: number;
  max_members: number;
  max_monthly_runs: number;
  max_storage_mb: number;
  plan_name: string;
  used_devices: number;
  used_members: number;
  used_monthly_runs: number;
  used_storage_mb: number;
}

export async function getWorkspaceDetailApi(
  tenantId: string,
): Promise<WorkspaceDetailData>;
export async function getTenantAuditLogsApi(
  tenantId: string,
  limit?: number,
): Promise<TenantAuditLog[]>;
export async function getAvailableRolesApi(): Promise<WorkspaceMemberRole[]>;
export async function inviteWorkspaceMemberApi(params: {
  email: string;
  invitedBy: string;
  roleId: string;
  tenantId: string;
}): Promise<void>;
export async function updateWorkspaceMemberRoleApi(params: {
  memberId: string;
  roleId: string;
  tenantId: string;
}): Promise<void>;
export async function removeWorkspaceMemberApi(memberId: string): Promise<void>;
```

### 5.2. Hợp Đồng Giao Tiếp Đa Schema PostgREST

| Mục Đích | Schema | Endpoint PostgREST |
| :-- | :-- | :-- |
| **Thông tin Workspace** | `public` | `GET /rest/v1/tenants?id=eq.<tenantId>&select=*` |
| **Thành viên & Vai trò** | `public` | `GET /rest/v1/tenant_members?tenant_id=eq.<tenantId>&select=id,status,joined_at,user_id,profiles(id,full_name,email,avatar_url),member_roles(role_id,roles(id,name,display_name))` |
| **Thiết bị Runner kết nối** | `workers` | `GET /rest/v1/devices?tenant_id=eq.<tenantId>&select=id,status` |
| **Hợp đồng thuê bao & Gói** | `billing` | `GET /rest/v1/subscriptions?tenant_id=eq.<tenantId>&select=id,tenant_id,plan_id,status,current_period_start,current_period_end,cancel_at_period_end,plans:plan_id(*)` |
| **Hạn mức mặc định (`free`)** | `billing` | `GET /rest/v1/plans?id=eq.free&select=*` |
| **Bộ đếm tiêu thụ** | `billing` | `GET /rest/v1/usage_meters?tenant_id=eq.<tenantId>&select=metric_name,current_value` |
| **Nhật ký kiểm toán** | `public` | `GET /rest/v1/audit_logs?tenant_id=eq.<tenantId>&select=id,action,entity_type,entity_id,created_at,actor_id,profiles(id,full_name,email)&order=created_at.desc&limit=50` |
| **Gửi lời mời gia nhập** | `public` | `POST /rest/v1/tenant_invitations` (`role_id`, `token_hash`, `invited_by`, `expires_at`) |
| **Cập nhật vai trò** | `public` | `DELETE /rest/v1/member_roles?member_id=eq.<id>` + `POST /rest/v1/member_roles` |

### 5.3. Kiến Trúc Giao Diện Chi Tiết Workspace Chuẩn Responsive & Built-in Theme (`/tenants/:id`)

1. **Khắc phục lỗi tràn dọc 1 ký tự/dòng trên Mobile trong `workspace-overview-tab.vue`:**
   - **Nguyên nhân gốc rễ:** `VxeForm` với `<VxeFormItem span="12">` chia 2 cột `50%` cố định ngay cả trên màn hình điện thoại 375px và đặt nhãn (`title`) nằm ngang bên trái giá trị, khiến cột giá trị chỉ còn rộng ~20px và làm tên Workspace (`Nguyen Dinh Tu`), Slug (`personal-dev`), UUID (`b0000000-...`) bị bẻ gãy từng chữ cái theo chiều dọc.
   - **Giải pháp chuẩn:** Thay thế `VxeForm` chỉ đọc (read-only) trong `workspace-overview-tab.vue` bằng lưới thông tin **Responsive Description Grid** (`grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3`):
     - Mỗi ô thông tin xếp nhãn (`text-xs text-muted-foreground`) nằm **phía trên** giá trị (`text-sm font-semibold text-foreground` hoặc `text-xs break-all`), đảm bảo hiển thị 1 cột rộng rãi trên Mobile, 2 cột trên Tablet và 3 cột trên Desktop.
2. **Thanh chuyển đổi 4 Tabs cuộn ngang mượt trên Mobile (`detail.vue`):**
   - Trên màn hình nhỏ, `<TabsList>` sử dụng `flex w-full justify-start overflow-x-auto no-scrollbar sm:w-auto sm:inline-flex` và mỗi `<TabsTrigger>` có `shrink-0 whitespace-nowrap gap-1.5` để 4 tab (`Overview`, `Members`, `Quotas & resources`, `Audit logs`) luôn nằm trên 1 hàng ngang, không bị tràn khỏi khung Card hoặc rớt dòng icon/chữ.
3. **Đồng bộ Built-in Theme & Loại bỏ trùng lặp nút thao tác (`workspace-hero.vue` & `workspace-overview-tab.vue`):**
   - Avatar đại diện Workspace trong `workspace-hero.vue` sử dụng `bg-primary/10 text-primary border border-primary/20` (thay cho gradient xanh dương cố định `from-sky-600 to-indigo-600`).
   - Loại bỏ sự trùng lặp của 3 nút thao tác (`Set Primary`, `Pair CLI`, `Edit Settings`) vốn đang xuất hiện lặp lại ở cả `WorkspaceHero` phía trên và thẻ `Admin actions` phía dưới trong `workspace-overview-tab.vue`.
4. **Tuân thủ thang chữ 7-Tier Modular Scale (`workspace-usage-tab.vue`, `workspace-audit-tab.vue`, `workspace-members-tab.vue`):**
   - Thay toàn bộ class kích thước chữ tùy tiện `text-[11px]` bằng token chuẩn `text-xs` hoặc `text-2xs`.
   - Đồng bộ `AvatarFallback` của thành viên trong `workspace-members-tab.vue` sang `bg-primary/10 text-primary`.

---

## 6. Testing Strategy (Chiến Lược Kiểm Thử)

1. **Unit Tests (`workspace-detail.test.ts`):**
   - Kiểm tra ánh xạ dữ liệu thành viên từ cấu trúc lồng nhau `tenant_members -> profiles & member_roles -> roles`.
   - Kiểm tra tính toán hạn mức `WorkspaceUsageQuota` khi có hợp đồng `billing.subscriptions` và khi fallback về gói `free`.
   - Kiểm tra sinh `token_hash` và payload gửi lời mời trong `inviteWorkspaceMemberApi`.
2. **Component & Layout Verification:**
   - Kiểm tra `workspace-overview-tab.vue` không còn sử dụng `<VxeFormItem span="12">` gây vỡ chữ dọc trên màn hình hẹp.
   - Kiểm tra `0` kết quả `text-[11px]` trong toàn bộ `apps/web-admin/src/views/tenants/`.
3. **Typecheck & Lint Gate:** `pnpm --filter @operon/admin-web run typecheck` và `pnpm run lint` đạt `0 errors`.

---

## 7. Boundaries (Ranh Giới Kỹ Thuật)

- **Always:**
  - Sử dụng `useVbenVxeGrid` cho bảng danh sách Workspace, và `VxeForm` cho các Modal nhập liệu (Create/Edit Workspace, Invite/Edit Member).
  - Sử dụng lưới CSS Grid chuẩn (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) cho thẻ thông tin định danh chỉ đọc (Read-only Metadata) trên `workspace-overview-tab.vue` để đảm bảo tương thích Mobile 100%.
  - Đồng bộ 2 chiều tab đang mở với query parameter `?tab=overview|members|usage|audit` qua `router.replace`.
  - Truyền đúng `{ schema: 'workers' }` và `{ schema: 'billing' }` khi truy vấn thiết bị và gói cước.
- **Ask first:**
  - Thay đổi cấu trúc bảng `public.tenant_invitations` hoặc `public.member_roles`.
- **Never:**
  - Không dùng `VxeFormItem span="12"` với nhãn nằm ngang cho dữ liệu chỉ đọc khiến chữ bị ép dọc 1 ký tự/dòng trên điện thoại.
  - Không dùng class kích thước pixel tùy tiện (`text-[11px]`) hoặc màu gradient cố định (`from-sky-600 to-indigo-600`) lệch khỏi Built-in Theme.

---

## 8. Success Criteria (Tiêu Chí Nghiệm Thu)

- [x] **SC1:** Danh sách `/tenants` và chi tiết `/tenants/:id` vận hành 100% trên dữ liệu thật từ `public`, `workers`, `billing`.
- [x] **SC2:** Chuyển đổi giữa 4 tabs (`overview`, `members`, `usage`, `audit`) đồng bộ tức thì với `?tab=` trên URL, giữ nguyên tab khi F5 và không gây nháy trang hay nhảy cuộn.
- [x] **SC3:** Mời thành viên mới tạo bản ghi hợp lệ trong `public.tenant_invitations` và đổi vai trò cập nhật chính xác bảng nối `public.member_roles`.
- [x] **SC4:** Tab `usage` tính toán đúng tỷ lệ sử dụng Thành viên, Thiết bị, Lượt chạy và Dung lượng lưu trữ so với hạn mức của gói cước hiện hành.
- [x] **SC5:** Toàn bộ unit tests trong `workspace-detail.test.ts` pass 100% và `typecheck` đạt 0 lỗi.
- [x] **SC6 — Mobile-First Workspace Overview & Tabs Bar:** Trên màn hình Mobile (375px), thanh 4 Tabs cuộn ngang gọn trong khung Card (`whitespace-nowrap`), và toàn bộ thông tin `Workspace details` (Name, Slug, Tenant ID, Created At, Service Plan, Device Infra) hiển thị rõ ràng theo bố cục 1 cột (Mobile) $\rightarrow$ 2 cột (Tablet) $\rightarrow$ 3 cột (Desktop), tuyệt đối không bị gãy chữ theo chiều dọc.
- [x] **SC7 — Action Deduplication & Built-in Theme Coherence:** Avatar của Workspace trong `WorkspaceHero` và `WorkspaceMembersTab` đồng bộ theo màu `--primary`; khu vực thao tác quản trị không bị lặp lại trùng lặp giữa `WorkspaceHero` và `WorkspaceOverviewTab`.
- [x] **SC8 — Typography Compliance & Zero Regression:** Loại bỏ hoàn toàn `text-[11px]` trong `views/tenants/**`, vượt qua `typecheck`, `oxlint`, và `pnpm run build:local`.

---

## 9. Resolved Decisions (Các Quyết Định Đã Chốt)

1. **Tập trung 4 Tabs chuẩn mực (`overview`, `members`, `usage`, `audit`):** Không sử dụng tab API Keys tĩnh tại cấp Workspace vì toàn bộ kết nối từ máy trạm Desk và Headless Runner được xác thực định danh theo từng thiết bị qua `workers.devices.device_token_hash` và cổng Desktop Loopback SSO (`/auth/desktop`).
2. **Fallback hạn mức tự động về gói `free`:** Khi một Workspace mới khởi tạo chưa có bản ghi trong `billing.subscriptions`, tầng API tự động đối chiếu định nghĩa gói `free` trong `billing.plans` để luôn hiển thị đầy đủ thanh đo lường hạn mức.
3. **Tinh gọn nút thao tác & Chuyên biệt hóa Danger Zone (Phương án A):** Giữ các nút thao tác nhanh (`Set Primary`, `Pair CLI`, `Settings`, `Refresh`) trên thanh `WorkspaceHero` ở đầu trang; thẻ phía dưới trong Tab `Overview` chỉ đóng vai trò khu vực **Quản lý vòng đời / Danger zone** (`Archive or delete`) để loại bỏ sự trùng lặp 3 nút giống hệt nhau trên cùng màn hình.

---

## 10. Open Questions (Câu Hỏi Mở)

_(Không còn câu hỏi mở — Tất cả quyết định thiết kế đã được phê duyệt)._
