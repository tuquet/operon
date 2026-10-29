# Operon Cloud Platform — Database & Plugins Setup Guide

> Hướng dẫn thiết lập, khởi tạo sạch (fresh install), cài đặt các plugin và kiểm thử toàn vẹn cơ sở dữ liệu Operon Cloud (Supabase PostgreSQL) từ đầu cho người dùng/developer mới trong môi trường mạng tiêu chuẩn (không bị chặn gateway).

---

## 1. Yêu cầu tiên quyết (Prerequisites)

Trước khi bắt đầu, đảm bảo máy tính đã cài đặt:
1. **Docker Desktop** (đã bật và đang chạy).
2. **Supabase CLI** (khuyên dùng `v2.117+`):
   - Windows (Scoop / Winget): `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase`
   - macOS (Homebrew): `brew install supabase/tap/supabase`
   - Linux: `curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz`
3. **PowerShell** (Windows) hoặc **Bash** (macOS / Linux).

---

## 2. Thiết lập Môi trường Local (Local Development)

### Bước 2.1: Khởi động cụm Supabase Local
Mở terminal tại thư mục `cloud/`:
```bash
cd cloud
supabase start
```
*Lần đầu chạy, Docker sẽ kéo các container chính thức của Supabase (Postgres, Auth, Storage, Edge Runtime, Studio).*

### Bước 2.2: Reset sạch Database và Chạy Migrations cốt lõi
Lệnh này sẽ tạo mới database, áp dụng schema Core IAM (`tenants`, `profiles`, `roles`, `permissions`, `custom_access_token_hook`) và nạp seed dữ liệu mẫu:
```bash
supabase db reset --local
```

### Bước 2.3: Cài đặt toàn bộ 8 Plugin Pipelines
Cơ sở dữ liệu Operon được thiết kế theo kiến trúc module hóa với 8 plugins tách biệt. Chạy script cài đặt theo đúng thứ tự kiến trúc:

- **Trên Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/plugins/apply_plugins.ps1 -Target local
  ```
- **Trên macOS / Linux (Bash):**
  ```bash
  bash scripts/plugins/apply_plugins.sh local
  ```

*Toàn bộ 8 schema & plugins sẽ được cài đặt:*
1. `storage` (schema: `media` — Media assets & storage buckets)
2. `subscriptions` (schema: `billing` — Xu credits wallet, plans, payment gateways)
3. `webhooks` (schema: `events` — Asynchronous event outbox & deliveries)
4. `workers` (schema: `workers` — Device nodes, proxy pools)
5. `browsers` (schema: `browsers` — Stealth browser profiles & engine releases)
6. `automation` (schema: `automation` — Workflow graph & job queue claiming)
7. `secrets` (schema: `secrets` — Vault KEK -> DEK zero-knowledge credentials)
8. `commerce` (schema: `commerce` — Digital store, anti-double-sell serial stock)

---

## 3. Kiểm thử Toàn vẹn Database (Automated Test Suites)

Hệ thống đi kèm **11 suites kiểm thử tự động** bao phủ 100% Core IAM, RLS BOLA/IDOR isolation và 55 RBAC permissions:

- **Trên Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/test_db.ps1 -Target local
  ```
- **Chạy 1 Suite kiểm thử cụ thể (ví dụ RLS hoặc RBAC):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/test_db.ps1 -Target local -SpecificTest "09_verify_rls_isolation"
  ```
- **Trên VS Code (Giao diện trực quan):**
  - Nhấn `Ctrl + Shift + P` -> Chọn `Tasks: Run Task`.
  - Chọn **`[cloud] test db (all 11 suites)`** hoặc **`[cloud] reset & test db (local)`**.

*Kết quả mong đợi:*
```text
====================================================================
 [SUMMARY] Passed: 11 | Failed: 0 (Total: 11)
 Database integrity verified 100% successfully.
====================================================================
```

---

## 4. Thiết lập Môi trường Cloud (Supabase Remote/Linked Project)

Dành cho môi trường staging hoặc production trên Supabase Cloud (môi trường mạng tiêu chuẩn, không bị firewall/gateway chặn):

### Bước 4.1: Đăng nhập Supabase CLI
```bash
supabase login
```
*(Trình duyệt sẽ mở trang cấp quyền hoặc bạn nhập trực tiếp Personal Access Token tạo tại [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)).*

### Bước 4.2: Liên kết với Project Cloud
```bash
supabase link --project-ref <YOUR_PROJECT_REF>
```

### Bước 4.3: Đồng bộ Schema & Migrations lên Cloud
```bash
supabase db push
```

### Bước 4.4: Áp dụng các Plugin Pipelines lên Cloud
- **Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/plugins/apply_plugins.ps1 -Target linked
  ```
- **macOS / Linux (Bash):**
  ```bash
  bash scripts/plugins/apply_plugins.sh linked
  ```

### Bước 4.5: Chạy Test Suite đối soát tính toàn vẹn trên Cloud
```powershell
powershell -ExecutionPolicy Bypass -File scripts/test_db.ps1 -Target linked
```

---

## 5. Cấu trúc Thư mục Liên quan

```text
cloud/
├── scripts/
│   ├── plugins/
│   │   ├── apply_plugins.ps1      # Pipeline cài đặt/gỡ bỏ plugins (PowerShell)
│   │   └── apply_plugins.sh       # Pipeline cài đặt/gỡ bỏ plugins (Bash)
│   └── test_db.ps1                # Runner kiểm thử tự động 11 test suites
├── supabase/
│   ├── config.toml                # Cấu hình Supabase local stack
│   ├── migrations/                # Migrations nền tảng (Core IAM)
│   ├── plugins/                   # 8 Plugins độc lập (install.sql / uninstall.sql)
│   └── seed.sql                   # Dữ liệu seed mặc định & Master Vault KEK
└── tests/
    ├── presets/                   # Dữ liệu mock tenant/user cho kiểm thử
    └── db/                        # 11 Test Suites (.sql)
```
