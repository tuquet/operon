# Quality and Architectural Constraints Contract

This document codifies the non-negotiable architectural boundaries and quality gates for `operon`. All agents and contributors must respect these invariants.

---

## 1. Concurrency and Process Ownership Contract (Workstation UI vs. CLI Daemon)

### Context
Operon features two entry points for automation workloads:
1. **CLI Daemon (`opn worker start` / `opn runner start`)**: Standalone, headless automation engine running as a background service.
2. **Workstation Desktop (`src-tauri`)**: Visual control center embedding the worker engine in-process for single-click operation, but capable of controlling a standalone daemon.

Both interface over the local loopback port `127.0.0.1:8765` and filesystem state in `~/.operon/`.

---

### Invariant C1: Single Instance & Port Arbitration
- **Rule:** Exactly one daemon server may bind to `127.0.0.1:8765` at any given time.
- **Enforcement:**
  - `src-tauri` must pre-flight probe `http://127.0.0.1:8765/api/v1/health` prior to binding.
  - If a daemon responds with HTTP `200 OK`, `src-tauri` must transition to **Client View Mode** and forfeit spawning an in-process server.
  - If no daemon responds, `src-tauri` spawns the embedded server with an explicit ownership flag `is_embedded = true`.

---

### Invariant C2: Asymmetric Shutdown Ownership
- **Rule:** A visual client exit must never terminate an external standalone daemon.
- **Enforcement:**
  - `src-tauri` tracks daemon ownership in runtime state (`tauri::State<DaemonOwnership>`).
  - Upon window close (`RunEvent::ExitRequested`):
    - If `is_embedded == true`: Tauri gracefully reaps its child browser instances and terminates the in-process server.
    - If `is_embedded == false` (attached to external CLI daemon): Tauri gracefully disconnects without signaling SIGTERM / process termination to the daemon.
  - The CLI standalone daemon continues executing queued batch jobs uninterrupted.

---

### Invariant C3: PID File Isolation and Mutual Exclusion
- **Rule:** The primary PID file `~/.operon/worker/worker.pid` is reserved exclusively for the standalone CLI daemon.
- **Enforcement:**
  - When running in-process via Tauri (`is_embedded`), the process must not overwrite `worker.pid` with the GUI PID.
  - CLI `opn worker stop` must only terminate processes listed in `worker.pid` if their executable matches `opn` or `worker` (preventing accidental GUI termination).
  - Stale PID files must be validated via OS process tables (`sysinfo`) before sending termination signals.

---

## 2. Network & Egress Routing Guardrails

### Invariant N1: Asymmetric Git Routing (Corporate Workstation Policy)
- **Direct Fetch/Clone:** All inbound git operations (`fetch`, `pull`, `clone`) must connect directly to remotes without proxying.
- **Proxied Push:** Outbound git operations (`push`) are blocked by corporate DPI firewalls (HTTP 403 / RPC failed) and must be routed via Gateway SOCKS5 proxy (`127.0.0.1:1080`) using `git spush`.
- **HTTP Forwarder:** Non-SOCKS5 tools (Supabase CLI, curl) must use embedded HTTP forwarder `127.0.0.1:8118` with `$env:HTTP_PROXY="http://127.0.0.1:8118"`.

---

## 3. Database & Credential SSOT

### Invariant D1: Unified Device Identity
- Cloud registration credentials reside strictly at `~/.operon/system/.identity.json`.
- In-process claim loops and detached cloud workers must query the same single-source-of-truth credential store.

---

## 4. Authentication & Access Gate Contract (Zero Unauthorized Bypass)

### Context
Operon features two interactive user surfaces: the GUI Workstation and the CLI (`opn`). Both interface with Cloud fleet execution, remote browser automation, and tenant-scoped resources.

---

### Invariant A1: Workstation UI Hard Route Guard (Zero Unauthorized View Leak)
- **Rule:** Unauthenticated users must never access internal application views or trigger authenticated API requests.
- **Enforcement:**
  - Route navigation interceptor (`guard.ts`) must evaluate `accessToken` on all routes outside `coreRouteNames` (`/auth/login`, `/auth/callback`).
  - Unauthenticated requests must redirect immediately to `/auth/login?redirect=<target>` with `replace: true`.
  - HTTP 401 responses from background API requests must trigger immediate token refresh or session eviction, redirecting to login.

---

### Invariant A2: CLI Centralized Auth Guard (The "AGY Gate")
- **Rule:** Protected CLI commands must verify an active cloud session or workstation identity before execution, failing fast with Google-standard guidance when unauthenticated.
- **Enforcement:**
  - **Exempt Subcommands (Allowlist):**
    - `opn auth login`, `opn auth status`, `opn auth logout`
    - `opn gateway *` (workstation network manager)
    - `opn env *` (local environment audit)
    - `opn faker *` (local test data generator)
    - `opn --version`, `opn --help`
  - **Protected Subcommands (Guard Required):**
    - `opn automation *` (workflow execution & sync)
    - `opn tenant *` (multi-tenant workspace switching)
    - `opn worker start --cloud`, `opn worker claim`, `opn worker enroll`
    - `opn browser cloud *` (remote cloud browser automation)
  - **Failure Mechanics:** If no valid credentials exist in `~/.operon/system/.identity.json`, abort immediately with exit code `1`, presenting an authenticated prompt card directing the user to `opn auth login`.

---

### Invariant A3: Shared Session Single-Source-of-Truth
- **Rule:** Authentication performed in either UI or CLI must be mutually recognized.
- **Enforcement:**
  - `opn auth login` populates `~/.operon/system/.identity.json`.
  - Workstation GUI reads device identity and token on boot to bootstrap authentication state.
  - Logging out on either surface revokes local session tokens.

---

## 5. Frontend & UI Architecture Constraints

### Invariant F1: Compound UI Primitives Only (Zero Monolithic Wrapper Sprawl)
- **Rule:** Tất cả các thành phần giao diện (Dialog, Sheet, Select, DropdownMenu, Card) phải sử dụng cấu trúc Compound Component chuẩn Reka UI / Radix.
- **Enforcement:**
  - Tuyệt đối không truyền prop nguyên khối (`isOpen`, `content`, `actions`, `footer`) vào Root Component.
  - Phải tách bạch các sub-component con: `<DialogHeader>`, `<DialogTitle>`, `<DialogDescription>`, `<DialogFooter>`, `<DialogClose>`.
  - Cấm tạo wrapper lặp lại hoặc tự chế props trái chuẩn trong `@operon-core/shadcn-ui`.

### Invariant F2: Reka UI Standard Event Contracts
- **Rule:** Tất cả sự kiện tương tác trên headless primitives phải tuân thủ hợp đồng Reka UI.
- **Enforcement:**
  - Sự kiện đóng/mở: `v-model:open="isOpen"` hoặc `@update:open="(val: boolean) => ..."`.
  - Sự kiện chọn giá trị: `v-model="modelValue"` hoặc `@update:model-value="(val: string) => ..."`.
  - Giữ vững tính trợ năng (a11y) với `as-child` khi bọc Custom Button/IconButton trong Trigger/Close.
  - Ưu tiên biến thể CVA (`variant`, `size`) thay vì đè class CSS màu sắc/kích thước thủ công.


