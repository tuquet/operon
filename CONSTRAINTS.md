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
