# SPEC-002: Live Mission Control Terminal Dashboard (`opn tui`)

## 1. Bối cảnh & Mục tiêu

### 1.1 Vấn đề
Hiện nay các thành phần trong hệ sinh thái `operon` bao gồm:
- **Network Bridge Mesh:** Proxy SOCKS5 (`1080`), HTTP Forwarder (`8118`), OpenSSH Tunnel (`2222`), Cloudflare Access.
- **Antidetect Browser Fleet:** Chromium Stealth runtime, các isolated profile sandbox (`~/.operon/browser/profiles`).
- **Workstation Worker & Automation Engine:** Worker Daemon RPC, database SQLite (`automation.sqlite`), workflow execution.
- **Cloud Mesh:** Trạng thái kết nối với Supabase Control Plane & Multi-Tenancy.

Người dùng phải chạy các lệnh đơn lẻ (`opn status`, `opn gateway status`, `opn browser ps`, `opn worker logs`) để theo dõi tình trạng hệ thống. Không có góc nhìn tổng thể thời gian thực (real-time live monitoring) tương tự như các công cụ kỹ sư chuyên nghiệp (`k9s`, `lazygit`, `btop`).

### 1.2 Mục tiêu kiến trúc
Xây dựng lệnh `opn tui` — **Live Mission Control Terminal Dashboard** toàn màn hình (fullscreen interactive TUI) bằng Rust thuần dựa trên `crossterm` đã có sẵn trong dự án:
1. **Zero New External Dependencies:** Sử dụng trực tiếp `crossterm = "0.29.0"` có sẵn trong `cli/Cargo.toml` với Double-Buffering & Box-Drawing symbols (`clack` unicode palette) để đảm bảo biên dịch offline siêu tốc, không bị phụ thuộc tải thêm crate mới.
2. **Real-Time Polling & Live FPS:** Tick loop bất đồng bộ 1000ms/render cập nhật trạng thái sống/chết của các port (1080, 8118, 2222), CPU/RAM của tiến trình browser, và worker jobs.
3. **Interactive Control Hotkeys:**
   - `b` / `B`: Bật / tắt Gateway tunnel ngay trong dashboard (`gateway start` / `gateway stop`).
   - `r` / `R`: Refresh lại toàn bộ metrics ngay lập tức.
   - `k` / `K`: Kill toàn bộ browser profile đang chạy mồ côi (orphaned Chrome instances).
   - `Tab` / `Left` / `Right`: Chuyển đổi tab chi tiết: `Overview` -> `Bridge Mesh` -> `Browser Fleet` -> `Workflows`.
   - `q` / `Esc` / `Ctrl+C`: Thoát sạch sẽ, khôi phục lại màn hình terminal (AlternateScreen / Cursor restore).

---

## 2. Thiết kế Giao diện Mission Control (TUI Layout)

Màn hình chia làm 4 khu vực chính theo chuẩn Terminal Grid 80-120 cột:

```text
┌─ [opn tui] OPN MISSION CONTROL v1.2.1 ────────────────────── [● LIVE 1s] ── [q: Quit] ─┐
│                                                                                           │
│  [1] OVERVIEW           [2] BRIDGE MESH         [3] BROWSER FLEET       [4] WORKFLOWS     │
├───────────────────────────────────┬───────────────────────────────────────────────────────┤
│ ● NETWORK BRIDGE                  │ ● BROWSER RUNTIME FLEET                               │
│   • SOCKS5 Proxy  : 1080  [ONLINE]│   • Engine     : Chromium 134.0 (Windows)             │
│   • HTTP Proxy    : 8118  [ONLINE]│   • Active PIDs: 2 instances (RAM: 142 MB)            │
│   • SSH Tunnel    : 2222  [ONLINE]│   • Sandboxes  : 3 isolated profiles                      │
│   • Gateway VPS   : my-vps        │                                                       │
├───────────────────────────────────┼───────────────────────────────────────────────────────┤
│ ● RUNNER & AUTOMA                 │ ● CLOUD & IDENTITY                                    │
│   • Runner RPC    : 127.0.0.1:8765│   • Node Host  : HNDW-NDTU6                           │
│   • Daemon Status : [READY]       │   • Cloud Mesh : cdn.flowup.io.vn                     │
│   • Workflows DB  : 12.5 KB       │   • Tenant     : Personal Workspace                   │
│   • Active Jobs   : 0 pending     │   • Storage    : ~/.operon                                │
├───────────────────────────────────┴───────────────────────────────────────────────────────┤
│ [HOTKEYS]  (b) Toggle Bridge  │  (k) Kill Browsers  │  (r) Force Refresh  │  (Tab) Switch │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Kiến trúc Module Code trong `cli/src`

```text
cli/src/
├── commands/
│   ├── mod.rs             # pub mod tui;
│   └── tui/
│       ├── mod.rs         # TUI entry point & event loop runner
│       ├── state.rs       # AppState (Bridge, Browser, Runner, Cloud data models)
│       ├── view.rs        # Renderer (Header, Tabs, 4 Grid Cards, Hotkey footer)
│       └── actions.rs     # Hotkey dispatch handlers (toggle gateway, kill browsers)
├── cli.rs                 # Commands::Tui { ... }
```

### 3.1 Vòng lặp Event Loop (`tui/mod.rs`)
- Bật `crossterm::terminal::enable_raw_mode()` và `EnterAlternateScreen`.
- Tạo channel `tokio::sync::mpsc` cho Background Metrics Collector.
- Lắng nghe phím bấm non-blocking với `crossterm::event::poll(Duration::from_millis(100))`.
- Xử lý signal Graceful Exit để luôn luôn gọi `DisableRawMode` và `LeaveAlternateScreen` tránh vỡ layout terminal của người dùng.
