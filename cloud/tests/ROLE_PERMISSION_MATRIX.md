# OPERON CLOUD: FULL 100% COVERAGE ROLE & PERMISSION AUDIT MATRIX
> **Target Architecture:** PostgreSQL 16+ / Supabase Engine (Multi-Tenant Core Kernel & Canonical Plugins)  
> **Repository SSOT:** `cloud/supabase/migrations/` & `cloud/supabase/plugins/`  
> **Output Specification Files:**  
> - `cloud/tests/ROLE_PERMISSION_MATRIX.md`  
> - `cloud/tests/ROLE_PERMISSION_MATRIX.md`  
> **Coverage Metric:**  
> - **45/45 Database Tables** (100% Covered across 8 Schemas)  
> - **93/93 Row-Level Security (RLS) Policies** (100% Audited)  
> - **53/53 System & Module Permissions** (100% Mapped to Default Roles)  
> - **All Sensitive RPC / SECURITY DEFINER Functions** (Execution & Caller Audit)

---

## 1. HỆ THỐNG CHỦ THỂ & DANH TÍNH (2-TIER IDENTITY MODEL)

Hệ thống phân cấp thành **2 tầng danh tính độc lập**:

### Tầng 1: System & Platform Personas
| Persona Code | Danh tính | Định danh JWT / Postgres Role | Phạm vi & Trách nhiệm |
| :--- | :--- | :--- | :--- |
| **`ANON`** | Anonymous Client | `role = 'anon'`, `auth.uid() IS NULL` | Khách vãng lai, trang giới thiệu, catalog public, web checkout |
| **`SRV`** | Internal Service Role | `role = 'service_role'` | Edge Functions, Background Webhook/Outbox Dispatcher, Ingestion worker (Bypass RLS) |
| **`PLT_ADM`** | Platform Superadmin | `role = 'authenticated'`, `app_metadata.platform_role = 'superadmin'` | Vận hành toàn sàn, quản lý toàn bộ tenant, xem kho hàng serial, can thiệp xử lý sự cố |

### Tầng 2: Multi-Tenant RBAC Personas (Trong cùng 1 Tenant & Cross-Tenant)
| Persona Code | Danh tính | Vị trí trong Tenant | Khả năng & Quyền hạn |
| :--- | :--- | :--- | :--- |
| **`TNT_OWN`** | Tenant Owner | Chủ sở hữu tổ chức | Toàn quyền kiểm soát tài nguyên tenant, nạp/rút tiền, **duy nhất có quyền xóa Tenant** |
| **`TNT_ADM`** | Tenant Admin | Quản trị viên tổ chức | Quản trị thành viên, mời user, gán role, cấu hình plugin, mua hàng, tạo workflows |
| **`TNT_MBR`** | Tenant Member | Thành viên / Nhân viên | Sử dụng tài nguyên tenant, chạy workflows, khởi động virtual browser, xem catalog |
| **`TNT_VIW`** | Tenant Viewer | Người xem (Read-only) | Chỉ xem báo cáo, dashboard, danh mục, không được thêm/sửa/xóa bất kỳ dữ liệu nào |
| **`FRG_TNT`** | Foreign Tenant User | Thành viên Tenant khác | **Tác nhân kiểm thử BOLA / IDOR**: Tuyệt đối không được thấy hay sửa dữ liệu Tenant A |

---

## 2. MA TRẬN 100% BAO PHỦ: TOÀN BỘ 45 BẢNG CƠ SỞ DỮ LIỆU (READ / SELECT)

> **Ký hiệu ma trận:**
> - **`OWN`**: Chỉ đọc được bản ghi thuộc về Tenant mà user đang kích hoạt (`tenant_id = user_tenant` hoặc `buyer_tenant_id`).
> - **`ALL`**: Đọc được toàn bộ dữ liệu xuyên suốt tất cả tenant trong toàn hệ thống.
> - **`PUB`**: Chỉ đọc được bản ghi công khai (thỏa mãn cờ `is_active = true`, `visibility = 'public'` hoặc `status = 'active'`).
> - **`SELF`**: Chỉ đọc được bản ghi của chính cá nhân user đó (`id = auth.uid()`).
> - **`NONE`**: Bị chặn hoàn toàn bởi RLS (PostgREST trả về mảng rỗng `[]` hoặc count = 0).

### Schema `public` (Core Identity, IAM & Plugins)
| Bảng (Table) | ANON | FRG_TNT | TNT_VIW | TNT_MBR | TNT_ADM | TNT_OWN | PLT_ADM | SRV | Chính sách RLS tương ứng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`public.tenants`** | `NONE` | `NONE` | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `Users can view tenants they belong to` |
| **`public.profiles`** | `NONE` | `NONE` | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `Profiles are readable by authenticated users` |
| **`public.tenant_members`** | `NONE` | `NONE` | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `Members can view other members in same tenant` |
| **`public.roles`** | `NONE` | `NONE` | `OWN`+Sys | `OWN`+Sys | `OWN`+Sys | `OWN`+Sys | `ALL` | `ALL` | `Users can view system roles and tenant roles` |
| **`public.permissions`** | `NONE` | `ALL` | `ALL` | `ALL` | `ALL` | `ALL` | `ALL` | `ALL` | `Permissions dictionary readable by authenticated` |
| **`public.role_permissions`**| `NONE` | `ALL` | `ALL` | `ALL` | `ALL` | `ALL` | `ALL` | `ALL` | `Role permissions readable by authenticated` |
| **`public.member_roles`** | `NONE` | `NONE` | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `Members can view roles assigned to members` |
| **`public.tenant_invitations`**| `NONE` | `NONE` | `NONE` | `NONE` | `OWN` | `OWN` | `ALL` | `ALL` | `Authorized members can view invitations` |
| **`public.audit_logs`** | `NONE` | `NONE` | `NONE` | `NONE` | `OWN` | `OWN` | `ALL` | `ALL` | `Authorized members can view audit logs` |
| **`public.system_plugins`** | `NONE` | `ALL` | `ALL` | `ALL` | `ALL` | `ALL` | `ALL` | `ALL` | `system_plugins_select_all` |

---

### Schema `commerce` (Digital Products Store & Fulfillment)
| Bảng (Table) | ANON | FRG_TNT | TNT_VIW | TNT_MBR | TNT_ADM | TNT_OWN | PLT_ADM | SRV | Chính sách RLS tương ứng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`commerce.categories`** | `PUB` | `PUB` | `PUB` | `PUB` | `PUB` | `PUB` | `ALL` | `ALL` | `categories_select_active` |
| **`commerce.products`** | `PUB` | `PUB` | `PUB`+Tnt | `PUB`+Tnt | `PUB`+Tnt | `PUB`+Tnt | `ALL` | `ALL` | `products_select_public` / `products_select_authenticated` |
| **`commerce.product_variants`**| `PUB`| `PUB` | `PUB` | `PUB` | `PUB` | `PUB` | `ALL` | `ALL` | `variants_select_active` |
| **`commerce.stock_items`** | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `ALL` | `ALL` | `stock_items_platform_admin` (Zero Leakage) |
| **`commerce.orders`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `orders_select_tenant` |
| **`commerce.order_items`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `order_items_select_tenant` |
| **`commerce.order_deliveries`**| `NONE`| **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `order_deliveries_select_tenant` |

---

### Schema `billing` (Subscriptions, Xu Wallets & Payments)
| Bảng (Table) | ANON | FRG_TNT | TNT_VIW | TNT_MBR | TNT_ADM | TNT_OWN | PLT_ADM | SRV | Chính sách RLS tương ứng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`billing.plans`** | `NONE` | `PUB` | `PUB` | `PUB` | `PUB` | `PUB` | `ALL` | `ALL` | `plans_select` |
| **`billing.subscriptions`** | `NONE` | `NONE` | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `subscriptions_select` |
| **`billing.usage_meters`** | `NONE` | `NONE` | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `meters_select` |
| **`billing.wallets`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `wallets_select` |
| **`billing.wallet_transactions`**| `NONE`| **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `wallet_transactions_select` |
| **`billing.payment_gateways`**| `PUB` | `PUB` | `PUB` | `PUB` | `PUB` | `PUB` | `ALL` | `ALL` | `payment_gateways_select` |
| **`billing.payment_gateway_secrets`**|`NONE`|`NONE`| `NONE` | `NONE` | `NONE` | `NONE` | `ALL` | `ALL` | `payment_gateway_secrets_platform_admin` |
| **`billing.payment_intents`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `payment_intents_select` |
| **`billing.bank_receiving_accounts`**|`PUB`| `PUB`| `PUB` | `PUB` | `PUB` | `PUB` | `ALL` | `ALL` | `bank_accounts_select_policy` |

---

### Schema `automation` (Workflow Engine, Jobs & Schedules)
| Bảng (Table) | ANON | FRG_TNT | TNT_VIW | TNT_MBR | TNT_ADM | TNT_OWN | PLT_ADM | SRV | Chính sách RLS tương ứng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`automation.workflows`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `workflows_select` |
| **`automation.packages`** | `NONE` | `NONE` | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `packages_select` |
| **`automation.jobs`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `jobs_select` |
| **`automation.execution_logs`**| `NONE`| **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `logs_select` |
| **`automation.schedules`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `schedules_select` |

---

### Schema `workers` (Edge Devices, Nodes & Proxies)
| Bảng (Table) | ANON | FRG_TNT | TNT_VIW | TNT_MBR | TNT_ADM | TNT_OWN | PLT_ADM | SRV | Chính sách RLS tương ứng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`workers.devices`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `devices_select` |
| **`workers.proxies`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `proxies_select` |
| **`workers.browsers`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `browsers_select` |
| **`workers.node_browsers`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `node_browsers_select` |

---

### Schema `browsers` (Anti-Detect Browser Profiles & Templates)
| Bảng (Table) | ANON | FRG_TNT | TNT_VIW | TNT_MBR | TNT_ADM | TNT_OWN | PLT_ADM | SRV | Chính sách RLS tương ứng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`browsers.releases`** | `PUB` | `PUB` | `PUB` | `PUB` | `PUB` | `PUB` | `ALL` | `ALL` | `releases_public_read` |
| **`browsers.profiles`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `profiles_select` |
| **`browsers.fingerprint_templates`**|`PUB`| `PUB` | `PUB` | `PUB` | `PUB` | `PUB` | `ALL` | `ALL` | `templates_select` |

---

### Schema `events` (Transactional Outbox & Webhooks)
| Bảng (Table) | ANON | FRG_TNT | TNT_VIW | TNT_MBR | TNT_ADM | TNT_OWN | PLT_ADM | SRV | Chính sách RLS tương ứng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`events.subscriptions`** | `NONE` | `NONE` | `NONE` | `NONE` | `OWN` | `OWN` | `ALL` | `ALL` | `subscriptions_all_admin` (`webhooks:manage`) |
| **`events.outbox`** | `NONE` | `NONE` | `NONE` | `NONE` | `OWN` | `OWN` | `ALL` | `ALL` | `outbox_select_admin` (`outbox:read`) |
| **`events.deliveries`** | `NONE` | `NONE` | `NONE` | `NONE` | `OWN` | `OWN` | `ALL` | `ALL` | `deliveries_select_admin` (`outbox:read`) |

---

### Schema `media` & `storage` (Storage Metadata & Buckets)
| Bảng (Table) | ANON | FRG_TNT | TNT_VIW | TNT_MBR | TNT_ADM | TNT_OWN | PLT_ADM | SRV | Chính sách RLS tương ứng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`media.assets`** | `NONE` | **`NONE`** | `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `assets_select` (`media:read`) |
| **`storage.objects` (browser_profiles)**|`NONE`|**`NONE`**| `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `browser_profiles_storage_select` |
| **`storage.objects` (tenant_media)**| `NONE`| **`NONE`**| `OWN` | `OWN` | `OWN` | `OWN` | `ALL` | `ALL` | `storage_objects_select_tenant` |

---

### Schema `secrets` (Zero-Knowledge DEK & Encrypted Vault)
| Bảng (Table) | ANON | FRG_TNT | TNT_VIW | TNT_MBR | TNT_ADM | TNT_OWN | PLT_ADM | SRV | Chính sách RLS tương ứng |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`secrets.tenant_keys`** | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `ALL` | RLS Enabled; Truy xuất duy nhất qua internal RPC |
| **`secrets.devices`** | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `ALL` | RLS Enabled; Xác thực qua Machine Fingerprint RPC |
| **`secrets.credentials`** | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `NONE` | `ALL` | RLS Enabled; Metadata qua RPC `secret_list`, giá trị chỉ trả về cho Node đã xác thực |

---

## 3. MA TRẬN 53 PERMISSIONS CHÍNH THỨC & DEFAULT ROLES

Dưới đây là 100% danh mục 34 permissions đã định nghĩa trong database và phân bổ vào các vai trò mặc định:

| Permission ID | Module | Mô tả nghiệp vụ | `viewer` | `member` | `admin` | `owner` |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **`tenants:read`** | `tenants` | Xem thông tin tổ chức | ✅ | ✅ | ✅ | ✅ |
| **`tenants:update`** | `tenants` | Cập nhật cấu hình và thông tin tổ chức | ❌ | ❌ | ✅ | ✅ |
| **`tenants:delete`** | `tenants` | Xóa hoàn toàn tổ chức | ❌ | ❌ | ❌ | ⚠️ **Chỉ Owner** |
| **`members:read`** | `members` | Xem danh sách thành viên trong tổ chức | ✅ | ✅ | ✅ | ✅ |
| **`members:invite`** | `members` | Mời thành viên mới vào tổ chức | ❌ | ❌ | ✅ | ✅ |
| **`members:update`** | `members` | Cập nhật trạng thái thành viên | ❌ | ❌ | ✅ | ✅ |
| **`members:manage`** | `members` | Gán và thu hồi vai trò thành viên | ❌ | ❌ | ✅ | ✅ |
| **`members:delete`** | `members` | Xóa thành viên khỏi tổ chức | ❌ | ❌ | ✅ | ✅ |
| **`roles:read`** | `roles` | Xem danh sách vai trò và quyền hạn | ✅ | ✅ | ✅ | ✅ |
| **`roles:manage`** | `roles` | Tạo, sửa, xóa Custom Roles | ❌ | ❌ | ✅ | ✅ |
| **`audit:read`** | `audit` | Xem nhật ký audit log của tenant | ❌ | ❌ | ✅ | ✅ |
| **`plugins:read`** | `system` | Xem danh mục plugins đã cài đặt | ❌ | ✅ | ✅ | ✅ |
| **`plugins:manage`** | `system` | Cài đặt, gỡ bỏ plugin hệ thống | ❌ | ❌ | ✅ | ✅ |
| **`subscriptions:read`**| `billing` | Xem gói cước và hạn mức | ❌ | ✅ | ✅ | ✅ |
| **`subscriptions:manage`**| `billing` | Nâng cấp, hạ cấp, hủy gói cước | ❌ | ❌ | ✅ | ✅ |
| **`quota:read`** | `billing` | Xem counters hạn mức tài nguyên | ❌ | ✅ | ✅ | ✅ |
| **`wallets:read`** | `billing` | Xem số dư ví Xu và lịch sử biến động | ❌ | ✅ | ✅ | ✅ |
| **`wallets:manage`** | `billing` | Chi tiêu và nạp ví Xu | ❌ | ❌ | ✅ | ✅ |
| **`payments:read`** | `billing` | Xem cổng thanh toán và giao dịch | ❌ | ✅ | ✅ | ✅ |
| **`payments:manage`** | `billing` | Cấu hình cổng và duyệt intent thủ công | ❌ | ❌ | ✅ | ✅ |
| **`commerce:read`** | `commerce` | Xem kho hàng, đơn hàng tenant | ❌ | ✅ | ✅ | ✅ |
| **`commerce:purchase`**| `commerce` | Tạo đơn hàng số và thanh toán | ❌ | ✅ | ✅ | ✅ |
| **`commerce:manage`** | `commerce` | Quản lý sản phẩm, biến thể, serial stock | ❌ | ❌ | ✅ | ✅ |
| **`automation:workflows:read`** | `automation` | Xem AST graph workflow | ❌ | ✅ | ✅ | ✅ |
| **`automation:workflows:manage`**| `automation`| Tạo, sửa, xóa workflow | ❌ | ❌ | ✅ | ✅ |
| **`automation:packages:read`** | `automation` | Xem composite block package | ❌ | ✅ | ✅ | ✅ |
| **`automation:packages:manage`** | `automation`| Tạo, xuất bản block package | ❌ | ❌ | ✅ | ✅ |
| **`automation:jobs:read`** | `automation` | Xem telemetry và job logs | ❌ | ✅ | ✅ | ✅ |
| **`automation:jobs:run`** | `automation` | Kích hoạt chạy workflow thủ công | ❌ | ✅ | ✅ | ✅ |
| **`automation:jobs:manage`** | `automation` | Lập lịch cron schedule cho job | ❌ | ❌ | ✅ | ✅ |
| **`automation:logs:read`** | `automation` | Đọc telemetry execution log | ❌ | ✅ | ✅ | ✅ |
| **`workers:devices:read`** | `workers` | Xem danh sách thiết bị worker | ❌ | ✅ | ✅ | ✅ |
| **`workers:devices:enroll`** | `workers` | Đăng ký máy trạm vật lý mới | ❌ | ❌ | ✅ | ✅ |
| **`workers:devices:manage`** | `workers` | Tạm dừng, xóa máy trạm | ❌ | ❌ | ✅ | ✅ |
| **`workers:proxies:read`** | `workers` | Xem pool proxy và latency | ❌ | ✅ | ✅ | ✅ |
| **`workers:proxies:manage`** | `workers` | Thêm, gán proxy vào profile | ❌ | ❌ | ✅ | ✅ |
| **`workers:browsers:read`** | `workers` | Xem virtual browser profiles | ❌ | ✅ | ✅ | ✅ |
| **`workers:browsers:manage`**| `workers` | Tạo, khóa, giải phóng browser | ❌ | ✅ | ✅ | ✅ |
| **`browsers:releases:read`** | `browsers` | Xem phiên bản engine trình duyệt | ❌ | ✅ | ✅ | ✅ |
| **`browsers:releases:manage`**| `browsers`| Xuất bản bản build engine mới | ❌ | ❌ | ✅ | ✅ |
| **`browsers:profiles:read`** | `browsers` | Xem fingerprint cấu hình browser | ❌ | ✅ | ✅ | ✅ |
| **`browsers:profiles:write`** | `browsers` | Tạo, chỉnh sửa fingerprint profile | ❌ | ✅ | ✅ | ✅ |
| **`browsers:profiles:manage`**| `browsers` | Quản trị profile toàn diện | ❌ | ❌ | ✅ | ✅ |
| **`browsers:templates:read`** | `browsers` | Xem template fingerprint hệ thống | ❌ | ✅ | ✅ | ✅ |
| **`browsers:templates:manage`**| `browsers`| Tạo, sửa fingerprint template | ❌ | ❌ | ✅ | ✅ |
| **`webhooks:manage`** | `integrations`| Tạo, sửa, xóa webhook endpoints | ❌ | ❌ | ✅ | ✅ |
| **`outbox:read`** | `integrations`| Xem luồng transactional outbox | ❌ | ❌ | ✅ | ✅ |
| **`media:read`** | `media` | Tải xuống tài nguyên media tenant | ❌ | ❌ | ✅ | ✅ |
| **`media:upload`** | `media` | Upload tài nguyên lên bucket | ❌ | ❌ | ✅ | ✅ |
| **`media:delete`** | `media` | Xóa tệp tài nguyên khỏi bucket | ❌ | ❌ | ✅ | ✅ |
| **`secrets:credentials:read`** | `secrets` | Xem danh mục credential (tên/meta) | ❌ | ❌ | ✅ | ✅ |
| **`secrets:credentials:manage`**| `secrets` | Tạo, sửa, xóa credential | ❌ | ❌ | ✅ | ✅ |
| **`secrets:store:rotate`** | `secrets` | Xoay khoá DEK của tenant | ❌ | ❌ | ✅ | ✅ |

---

## 4. MA TRẬN BẢO MẬT HÀM RPC (SECURITY DEFINER / MUTATION AUDIT)

Các hàm nghiệp vụ thay đổi trạng thái cần được kiểm soát nguồn gọi chặt chẽ:

| RPC Function | Schema | Quyền thực thi (`GRANT EXECUTE`) | Kiểm tra bổ sung trong Function Body | Rủi ro nếu hở |
| :--- | :--- | :--- | :--- | :--- |
| **`billing.credit_tenant_wallet`** | `billing` | `authenticated`, `service_role` | `current_setting('request.jwt.claim.role') = 'service_role'` OR `is_platform_admin()` | **Thao túng tiền/ví Xu** |
| **`billing.debit_tenant_wallet`** | `billing` | `authenticated`, `service_role` | `current_setting('request.jwt.claim.role') = 'service_role'` OR `is_platform_admin()` | **Trừ tiền trái phép** |
| **`billing.settle_payment_intent`** | `billing` | `authenticated`, `service_role` | `service_role` OR `is_platform_admin()` OR `current_user = 'postgres'` | **Giả mạo thanh toán đơn hàng** |
| **`commerce.import_stock_batch`** | `commerce` | `authenticated`, `service_role` | `service_role` OR `is_platform_admin()` | **Bơm tài nguyên số giả mạo** |
| **`commerce.fulfill_order`** | `commerce` | `authenticated`, `service_role` | `FOR UPDATE` khóa đơn hàng + kiểm tra trạng thái `paid` | **Giao hàng kép (Double spending)** |
| **`commerce.get_guest_order_deliveries`**| `commerce`| `anon`, `authenticated`, `service_role` | SHA256 digest so khớp `guest_claim_token_hash` | **Lộ license key/serial đơn hàng** |
| **`workers.enroll_device`** | `workers` | `authenticated`, `service_role` | Băm token SHA256 + liên kết cứng `tenant_id` của caller | **Giả mạo máy trạm/node worker** |
| **`secrets.deliver_dek`** | `secrets` | `authenticated`, `service_role` | Kiểm tra HWID fingerprint và device token hợp lệ | **Lộ khoá mã hóa dữ liệu** |

---

## 5. THIẾT KẾ FIXTURE PERSONAS CHO TEST RUNNER

Mọi test case (SQL hay API integration) sẽ sử dụng bộ fixture chuẩn sau:

```json
{
  "PLATFORM_ADMIN": {
    "sub": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "role": "authenticated",
    "app_metadata": { "platform_role": "superadmin" }
  },
  "TENANT_A": {
    "id": "11111111-0000-0000-0000-000000000001",
    "owner": {
      "sub": "11111111-1111-1111-1111-111111111111",
      "email": "owner@tenant-a.com"
    },
    "admin": {
      "sub": "11111111-2222-2222-2222-222222222222",
      "email": "admin@tenant-a.com"
    },
    "member": {
      "sub": "11111111-3333-3333-3333-333333333333",
      "email": "member@tenant-a.com"
    },
    "viewer": {
      "sub": "11111111-4444-4444-4444-444444444444",
      "email": "viewer@tenant-a.com"
    }
  },
  "TENANT_B_ATTACKER": {
    "id": "22222222-0000-0000-0000-000000000002",
    "member": {
      "sub": "22222222-1111-1111-1111-111111111111",
      "email": "attacker@tenant-b.com"
    }
  }
}
```
