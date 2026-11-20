# Operon Canonical Glossary (SSOT)

Mọi tài liệu spec, API, schema database, biến môi trường, và UI copy trên toàn bộ hệ sinh thái **Operon** bắt buộc phải tuân thủ đúng thuật ngữ chuẩn dưới đây. Không tạo alias song song ([ADR-0001](./adr/ADR-0001-canonical-tenant-terminology.md)).

| Thuật ngữ chuẩn | Định nghĩa | Thuật ngữ CẤM dùng cho domain |
| --- | --- | --- |
| **`tenant`** | Đơn vị cô lập dữ liệu & ngữ cảnh làm việc đa người dùng (`local-default`, `local-*`, hoặc Cloud UUID trong `public.tenants`). | ~~`workspace`~~, ~~`org`~~ (trừ thuật ngữ gói/hiển thị không phải key domain) |
| **`tenantId` / `tenant_id`** | Khóa ngoại / query param / header định danh tenant sở hữu tài nguyên (`browsers`, `workflows`, `proxies`). | ~~`workspaceId`~~, ~~`workspace_id`~~ |
| **`browser profile`** | Một hồ sơ trình duyệt antidetect cô lập (fingerprint seed, proxy, extensions, user-data dir). | ~~`browser instance`~~ (khi nói về cấu hình tĩnh) |
| **`browser session`** | Tiến trình Chromium đang chạy thực tế (`pid`, `debuggingPort`, `wsUrl`) gắn với 1 `browser profile`. | — |
| **`daemon`** | Tiến trình nền `opn` chạy local trên máy người dùng (HTTP/SSE Gateway tại `127.0.0.1:8765`). | — |
| **`console`** | Ứng dụng điều khiển Web / Tauri Desktop (`@operon/shell` + micro-apps). | — |
| **`kernel`** | Lớp giao tiếp `@operon/kernel` (`useKernel()`) làm cầu nối giữa Shell và Micro-apps. | — |

> **Lưu ý:** Từ khóa `workspace` chỉ được phép xuất hiện khi nói về công cụ build (`pnpm-workspace.yaml`, `workspace:*`, `Cargo workspace`) hoặc sản phẩm bên thứ ba (`Google Workspace`).
