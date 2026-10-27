# Capability Map: Admin Tauri Desktop Application (`INITIATIVE-TAURI-DESKTOP`)

## 1. Executive Summary

Xây dựng phiên bản Native Desktop Application cho Admin Console (Web Admin) trên nền tảng **Tauri v2 (Stable 2.x)**, tích hợp liền mạch vào hệ thống pnpm workspace và Turborepo hiện có, đảm bảo hiệu năng cao nhất, dung lượng RAM siêu nhẹ ($\le 40\text{MB}$ khi khởi động), bảo mật ACL chuẩn enterprise, và giao tiếp native với hệ điều hành (Windows, macOS, Linux).

---

## 2. Capability Matrix

| Module ID | Trách nhiệm (Responsibility) | Phụ thuộc (Depends on) |
| --- | --- | --- |
| `desktop-scaffold` | Khởi tạo cấu trúc Tauri v2 trong monorepo (`src-tauri`), cấu hình Rust crate, tích hợp script build Vite 8 Rolldown & Turborepo pipeline | — |
| `desktop-security-acl` | Thiết lập mô hình bảo mật ACL Capabilities (`capabilities/default.json`), Content Security Policy (CSP), và cô lập tiến trình WebView/Core | `desktop-scaffold` |
| `desktop-window-lifecycle` | Quản lý vòng đời cửa sổ, chống khởi chạy trùng lặp (`single-instance`), lưu vị trí/kích thước (`window-state`), splashscreen chống nhấp nháy trắng, và khay hệ thống (System Tray) | `desktop-security-acl` |
| `desktop-native-integration` | Tích hợp các API hệ thống: Deep Linking (`operon://`), Thông báo native (`notification`), Hộp thoại tập tin (`dialog`), Lưu trữ cục bộ mã hóa (`store`), Bridge đồng bộ Token với route `/auth/desktop` | `desktop-window-lifecycle` |
| `desktop-distribution-ci` | Tự động hóa đóng gói đa nền tảng (Windows NSIS/MSI, macOS DMG, Linux AppImage/deb), cấu hình OTA Auto-Updater có chữ ký số (Ed25519) | `desktop-native-integration` |

---

## 3. Build & Execution Order

```text
desktop-scaffold
       │
       ▼
desktop-security-acl
       │
       ▼
desktop-window-lifecycle
       │
       ▼
desktop-native-integration
       │
       ▼
desktop-distribution-ci
```

---

## 4. Module Boundary Contracts

- **`desktop-scaffold`:** Cung cấp lệnh `pnpm run tauri:dev` và `pnpm run tauri:build`, chuẩn hóa môi trường Rust 1.98+, Vite 8 Rolldown, và pnpm catalog.
- **`desktop-security-acl`:** Cung cấp ma trận quyền hạt mịn trong `src-tauri/capabilities/`, nghiêm cấm cấu hình `core:default` wildcard lỏng lẻo.
- **`desktop-window-lifecycle`:** Đảm bảo trải nghiệm native: mượt mà, ghi nhớ kích thước màn hình, thu nhỏ về system tray, ngăn chặn mở 2 app cùng lúc.
- **`desktop-native-integration`:** Kết nối trực tiếp với giao thức `operon://` và daemon loopback port `8765` đã được xây dựng tại route `/auth/desktop`.
- **`desktop-distribution-ci`:** Xuất file cài đặt sản phẩm cuối cùng kèm cơ chế tự động cập nhật qua GitHub Releases / Cloudflare R2.
