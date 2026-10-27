# Tài Liệu Kỹ Thuật Admin (`@operon/admin-web`)

> **Mã tài liệu:** `DOCS-INDEX`  
> **Áp dụng cho:** `operon/admin` (`apps/web-admin`)  
> **Trạng thái:** **ACTIVE & ACCEPTED**

Chào mừng đến với trung tâm tài liệu kỹ thuật chính thức (Single Source of Truth — SSOT) của ứng dụng **Admin** (Web Admin). Toàn bộ kiến trúc, quyết định thiết kế, đặc tả tuyến đường và 15 bản đặc tả module chuẩn hóa được tổ chức thành 4 trụ cột dưới đây.

---

## 1. Kiến Trúc Nền Tảng (`architecture/`)

Định nghĩa mô hình tổng thể, giao thức đa schema PostgREST, mô hình phân quyền RBAC/Superadmin, chuẩn bảng dữ liệu `useVbenVxeGrid` (`VxeTable`) & `VxeForm`, và hệ thống Design Tokens.

- [`architecture/overview.md`](architecture/overview.md) — **Kiến trúc tổng thể hệ thống:** Multi-Schema PostgREST (`public`, `workers`, `automation`, `billing`, `commerce`, `media`, `events`), 2 chế độ truy cập (`Multi-Tenant Member` & `Platform Superadmin`) kèm Guest Storefront (`skipAuth`), cơ chế lọc động `Plugin Gate`, polling 3s, và cây định tuyến 29 routes (6 nhóm Sidebar + `core.ts`).
- [`architecture/styling-guide.md`](architecture/styling-guide.md) — **Quy chuẩn giao diện & Design Tokens:** Bảng tra cứu Semantic CSS Variables (HSL), tương thích 14 Built-in Themes & Dark/Light Mode, quy chuẩn `VxeTable`/`VxeForm` và Typography.

---

## 2. Đặc Tả Tuyến Đường (`routes/`)

Tài liệu tham chiếu chi tiết cho toàn bộ **29 tuyến đường** (6 module nghiệp vụ Sidebar + cụm tuyến xác thực và công khai `core.ts`).

- [`routes/index.md`](routes/index.md) — **Danh mục tổng thể 29 tuyến đường**, sơ đồ cây Router, cơ chế `filterRoutesByPlugins()` và đánh giá quyền động.
- [`routes/dashboard.md`](routes/dashboard.md) — Nhóm `/dashboard` (`/dashboard/analytics` — Telemetry thực tế & thăm dò Loopback Daemon).
- [`routes/tenants.md`](routes/tenants.md) — Nhóm `/tenants` (`/tenants` danh sách Workspace & `/tenants/:id` chi tiết 4 chế độ `overview`, `members`, `usage`, `audit`).
- [`routes/automation.md`](routes/automation.md) — Nhóm `/automation` hợp nhất engine Automation và hạ tầng Workers (`/automation/overview`, `/automation/workflows`, `/automation/jobs`, `/automation/jobs/:id`, `/automation/devices`, `/automation/browsers`, `/automation/proxies`).
- [`routes/commerce.md`](routes/commerce.md) — Nhóm `/commerce` (`/commerce/store`, `/commerce/orders`, `/commerce/admin`), module độc lập Ví Xu `/wallet` (alias `/commerce/wallet`) và cửa hàng công khai `/store` (`PublicStorefront`).
- [`routes/system.md`](routes/system.md) — Nhóm `/system` (`/system/plugins`, `/system/plans` và 4 tuyến đặc quyền Superadmin: `users`, `audit-logs`, `subscriptions`, `roles`).
- [`routes/auth.md`](routes/auth.md) — Cụm tuyến xác thực (`/auth/login`, `register`, `forget-password`, `reset-password`, `callback`, `desktop` SSO Bridge), `/profile`, và `/store`.

---

## 4. Đặc Tả Kỹ Thuật Theo Module — Specs (`specs/`)

Bộ **15 bản đặc tả kỹ thuật chuẩn hóa (Canonical Module Specs)** được xây dựng theo quy trình **Spec-Driven Development** (Specify $\rightarrow$ Plan $\rightarrow$ Tasks $\rightarrow$ Implement) với cấu trúc 9 mục đồng nhất.

- [`specs/CAPABILITY-map-web-admin.md`](specs/CAPABILITY-map-web-admin.md) — **Bản đồ năng lực hệ thống (15/15 Canonical Modules)** và sơ đồ phụ thuộc kiến trúc.
- [`specs/SPEC-core-platform-foundation.md`](specs/SPEC-core-platform-foundation.md) — Kiến trúc monorepo, hạ tầng build cục bộ `build:local`, PWA auto-update và cổng kiểm định chất lượng.
- [`specs/SPEC-ui-layout-preferences.md`](specs/SPEC-ui-layout-preferences.md) — Kiểm toán chống khóa giao diện (Anti-Lockout), bảo vệ điều hướng Sidebar và đồng bộ Preferences Drawer.
- [`specs/SPEC-cross-i18n-en-vi.md`](specs/SPEC-cross-i18n-en-vi.md) — Kiến trúc đa ngôn ngữ `en-US` / `vi-VN`, từ điển thuật ngữ `term.json`, tái sử dụng `$t('common.*')` và chuẩn Sentence case tiếng Việt.
- [`specs/SPEC-core-data-access.md`](specs/SPEC-core-data-access.md) — Tầng truy cập đa schema `supabaseRequest({ schema, skipAuth })` (7 schemas) và nạp quyền động từ cơ sở dữ liệu.
- [`specs/SPEC-core-route-foundation.md`](specs/SPEC-core-route-foundation.md) — Kiến trúc 27 routes, bộ lọc `filterRoutesByPlugins()` và bảo toàn vị trí cuộn nội trang.
- [`specs/SPEC-tenants-management-truth.md`](specs/SPEC-tenants-management-truth.md) — Quản trị `/tenants` và `/tenants/:id` (4 chế độ `overview / members / usage / audit` với `useVbenVxeGrid` & `VxeForm`).
- [`specs/SPEC-automation-jobs.md`](specs/SPEC-automation-jobs.md) — Quản trị kịch bản `/automation/workflows`, phiên chạy `/automation/jobs` và nhật ký `/automation/jobs/:id` (Polling 3s) qua `src/api/core/automation.ts`.
- [`specs/SPEC-automation-browsers.md`](specs/SPEC-automation-browsers.md) — Quản trị thiết bị `/automation/devices`, hồ sơ trình duyệt `/automation/browsers` và bể proxy `/automation/proxies` dùng `useVbenVxeGrid`.
- [`specs/SPEC-system-catalog.md`](specs/SPEC-system-catalog.md) — Quản trị kho Plugins hệ thống `/system/plugins` (Core Kernel & Extension Plugins) và Gói cước `/system/plans`.
- [`specs/SPEC-system-superadmin-routes.md`](specs/SPEC-system-superadmin-routes.md) — 4 tuyến đường đặc quyền Platform Superadmin (`/system/users`, `/system/roles`, `/system/subscriptions`, `/system/audit-logs`) chuẩn hóa trên `useVbenVxeGrid`.
- [`specs/SPEC-commerce-payment-gateway.md`](specs/SPEC-commerce-payment-gateway.md) — Cổng thanh toán đa kênh (VietQR, MoMo, Stripe, USDT, Ví Xu `internal_wallet`), sổ cái `billing.wallets` (`BIGINT`) và Edge Function `payment-webhook`.
- [`specs/SPEC-commerce-digital-store.md`](specs/SPEC-commerce-digital-store.md) — Kho sản phẩm số (`schema: commerce`), chống bán trùng `FOR UPDATE SKIP LOCKED` và giao hàng tự động xuyên schema (Auto-Fulfillment).
- [`specs/admin-commerce-portal.md`](specs/SPEC-commerce-admin-portal.md) — Cổng thương mại điện tử nội bộ `/commerce/{store,orders,wallet,admin}`.
- [`specs/public-storefront.md`](specs/SPEC-commerce-public-storefront.md) — Cửa hàng sản phẩm số công khai `/store` (Guest Checkout & tra cứu `claim_token`).
- [`specs/SPEC-cross-tauri-desktop.md`](specs/SPEC-cross-tauri-desktop.md) — Ứng dụng Native Desktop hoàn chỉnh trên nền tảng Tauri v2 (Frameless Titlebar, System Tray, SSO Deep Linking `operon://`).

---
