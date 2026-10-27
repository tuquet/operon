# Kiến Trúc Tinh Gọn & Tích Hợp Daemon API Vào Operon Workstation Desktop

> **Mã tài liệu:** `SPEC-ARCH-DESKTOP-DAEMON-EMBED`  
> **Áp dụng cho:** `operon` (Monorepo), `crates/cli`, `crates/worker`, `console/apps/workstation/src-tauri`  
> **Phương pháp luận:** Spec-Driven Development (Specify → Plan → Tasks → Implement)  
> **Nguyên lý kiến trúc:** SOLID, Clean Architecture, Google Open Source Standards  

---

## 1. Phân Tích 5W1H Chuyên Sâu (Deep 5W1H Analysis)

### 1.1. WHAT (Cái gì?)
- Tích hợp động cơ thực thi **Daemon API (Axum HTTP/WebSocket Server trên port 8765)** chạy ngầm tự động cùng tiến trình với **Operon Workstation Desktop App (Tauri v2)**.
- Tách bạch rõ ràng giữa **Presentation Layer (Tauri GUI & Terminal CLI)** và **Execution/Server Layer (Daemon Runtime Engine)** theo đúng các nguyên lý **SOLID**:
  - `S` (Single Responsibility): Crate Server chỉ lo API & Socket; Crate CLI chỉ lo cờ lệnh Terminal; Tauri App chỉ lo điều khiển cửa sổ Desktop.
  - `O` (Open/Closed): Cho phép Desktop Console mở rộng thêm tính năng điều khiển Job/Device mà không sửa mã nguồn CLI.
  - `L` (Liskov Substitution): Mọi Client (Web Browser, Tauri Desktop, AI Agent MCP) đều tương tác với cùng một chuẩn Daemon Interface mà không cần phân biệt runtime nào đang chạy nó.
  - `I` (Interface Segregation): Tách interface quản trị thiết bị, job worker, browser profiles thành các module handler độc lập.
  - `D` (Dependency Inversion): Tauri Desktop và CLI đều phụ thuộc vào Core Daemon Module chung, tuyệt đối không để UI này phụ thuộc vào UI kia.

### 1.2. WHY (Tại sao phải làm?)
- **Tránh "liệt" chức năng trên Desktop Console**: Desktop Console là trung tâm điều khiển (Command Center) để người dùng đặt lệnh Job, bật Browser profile, kiểm tra trạng thái Worker Node. Nếu Daemon API `8765` chưa chạy từ terminal hoặc Docker, toàn bộ các nút bấm trên Console sẽ bị lỗi `Failed to fetch (ERR_CONNECTION_REFUSED)`.
- **Loại bỏ thao tác thủ công (Zero Setup DX)**: Người dùng tải file cài đặt Desktop App về máy, click đúp mở app lên là phải dùng được ngay. Không thể bắt người dùng phổ thông hoặc operator phải tự mở PowerShell, gõ lệnh `opn worker start` hoặc tự cấu hình Docker.
- **Dọn dẹp tài nguyên triệt để (No Zombie Processes)**: Khi Daemon được nhúng trực tiếp vào vòng đời của Tauri:
  - Khi người dùng đóng app hoặc Quit ở System Tray, Daemon API tự động giải phóng socket mạng, đóng các process Chromium con sạch sẽ.
  - Tránh tình trạng tắt giao diện rồi mà các tiến trình ngầm vẫn chạy ngốn 100% CPU/RAM của máy.

### 1.3. WHO (Ai sử dụng và ai hưởng lợi?)
- **End-user / Operator**: Mở app là dùng được ngay, đặt lệnh job tự động hóa trơn tru chỉ với 1 cú click.
- **Kỹ sư phát triển (Developer)**: Cấu trúc monorepo gọn gàng, biên dịch nhanh, không bị dependency vòng vèo (circular dependency).
- **AI Coding Agents**: Dễ dàng kiểm thử, gọi API và kiểm tra trạng thái hệ thống mà không cần phụ thuộc vào Docker Desktop.

### 1.4. WHERE (Vị trí thay đổi trong codebase?)
- `crates/cli/src/api/`: Trích xuất logic Axum Server thành module/crate tái sử dụng được.
- `crates/cli/src/commands/workstation/mod.rs`: Bổ sung kiểm tra khởi động song song.
- `console/apps/workstation/src-tauri/Cargo.toml`: Thêm dependency server core.
- `console/apps/workstation/src-tauri/src/lib.rs`: Khởi tạo luồng chạy Daemon API trong hàm `.setup()` của Tauri.

### 1.5. WHEN (Khi nào kích hoạt?)
- Ngay khi ứng dụng Tauri Desktop khởi chạy (`app.setup()` lifecycle).
- Khi kiểm tra thấy port `8765` chưa có dịch vụ nào khác chiếm dụng. Nếu máy đã có sẵn một daemon độc lập (ví dụ chạy từ Docker hoặc terminal trước đó), Tauri sẽ tự động kết nối như một Client mà không bind đè lên cổng.

### 1.6. HOW (Làm như thế nào?)
- Áp dụng kỹ thuật **Embedded In-Process Server (Tokio Task)** bên trong Tauri:
  1. Khi Tauri App khởi động, gọi hàm `setup_embedded_daemon()`.
  2. Probe cổng `127.0.0.1:8765/api/v1/health`.
  3. Nếu offline: Kích hoạt `tokio::spawn` chạy máy chủ Axum Router trên loopback `127.0.0.1:8765`.
  4. Đăng ký hook thu hồi (Shutdown hook) khi cửa sổ Tauri nhận sự kiện `ExitRequested` để đóng an toàn mọi phiên làm việc.

---

## 2. Thiết Kế Kiến Trúc SOLID (Architectural Blueprint)

```
                            ┌───────────────────────────────────┐
                            │    crates/browser (Chromium CDP)  │
                            └─────────────────┬─────────────────┘
                                              │
                            ┌─────────────────▼─────────────────┐
                            │    crates/worker (Job Execution)  │
                            └─────────────────┬─────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     │                                                 │
          ┌──────────▼──────────┐                           ┌──────────▼──────────┐
          │   Embedded Daemon   │                           │   Embedded Daemon   │
          │   Server Runtime    │                           │   Server Runtime    │
          │ (Axum REST & WS Hub)│                           │ (Axum REST & WS Hub)│
          │   Port 127.0.0.1:   │                           │   Port 127.0.0.1:   │
          │        8765         │                           │        8765         │
          └──────────▲──────────┘                           └──────────▲──────────┘
                     │                                                 │
         ┌───────────┴───────────┐                         ┌───────────┴───────────┐
         │                       │                         │                       │
┌────────┴────────┐     ┌────────┴────────┐       ┌────────┴────────┐     ┌────────┴────────┐
│   crates/cli    │     │    src-tauri    │       │   crates/cli    │     │    src-tauri    │
│  (Terminal UI)  │     │  (Desktop App)  │       │  (Terminal UI)  │     │  (Desktop App)  │
│ `opn worker`    │     │ Auto-Embedded   │       │ `opn worker`    │     │ Auto-Embedded   │
│  (Headless VPS) │     │  Zero-Config    │       │  (Headless VPS) │     │  Zero-Config    │
└─────────────────┘     └─────────────────┘       └─────────────────┘     └─────────────────┘
```

---

## 3. Lộ Trình Triển Khai Chi Tiết (Step-by-Step Refactoring Plan)

### Giai đoạn 1: Chuẩn Hóa Cấu Trúc Thư Viện Cốt Lõi (`crates/cli/src/lib.rs`)
- Khai báo và xuất bản (export) module `api` và `infrastructure` để các crate khác trong monorepo có thể tái sử dụng mà không cần khởi động tiến trình ngoài.
- Tách cấu hình `AppState` thành cấu trúc độc lập, không dính líu đến `clap` CLI flags.

### Giai đoạn 2: Tích Hợp Vào `src-tauri` Của Operon Workstation
1. Cập nhật `console/apps/workstation/src-tauri/Cargo.toml`:
   - Bổ sung crate nội bộ `operon = { path = "../../../../crates/cli" }`.
   - Bổ sung `tokio = { version = "1", features = ["full"] }`.
2. Sửa đổi `console/apps/workstation/src-tauri/src/lib.rs`:
   - Viết hàm `spawn_embedded_daemon(app_handle)`.
   - Trong hook `.setup(|app| { ... })`: Probe port `8765`. Nếu offline, tự động kích hoạt Axum router phục vụ ngay lập tức.
   - Bổ sung hook lắng nghe sự kiện `tauri::RunEvent::ExitRequested` để đóng server và dừng các browser sandbox đang chạy.

### Giai đoạn 3: Kiểm Thử Độc Lập & Xác Minh (Verification)
1. Kiểm tra biên dịch backend: `cargo check -p operon` và `cargo check --manifest-path console/apps/workstation/src-tauri/Cargo.toml`.
2. Kiểm thử chạy thực tế: Mở app Desktop, bấm đặt lệnh chạy Job hoặc mở Browser profile, xác nhận trạng thái phản hồi `200 OK` từ loopback port `8765`.
3. Kiểm tra dọn dẹp tiến trình: Tắt app, kiểm tra Task Manager xác nhận không còn tiến trình daemon hoặc chromium chạy ngầm.

### Giai đoạn 4: Đẩy Mã Nguồn Lên GitHub
- Kiểm tra toàn bộ pre-commit hooks của dự án qua `lefthook`.
- Commit chuẩn Conventional Commits: `feat(desktop): embed autonomous daemon api runtime into tauri workstation`.
- Đẩy trực tiếp lên GitHub nhánh chính qua proxy: `git spush origin main`.
