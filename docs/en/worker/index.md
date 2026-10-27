# Distributed Worker Engine

The **Operon Worker** (`opn worker`) is a high-performance background daemon, process supervisor, and cloud execution node written in pure Rust. It connects workstations and cloud VPS instances into an autonomous, distributed compute fleet.

---

## ⚡ Core Capabilities

1. **Kernel-Level Process Tree Supervision**: Tracks and manages child browser and automation processes. Terminates orphaned Chromium instances with zero socket leakage.
2. **Cloud Fleet Polling**: Subscribes to Supabase Realtime and executes queued automation workflows asynchronously.
3. **Telemetry & Log Streaming**: Streams execution logs and resource metrics over Server-Sent Events (SSE) and WebSocket channels.
4. **Resilient Local HTTP API**: Binds locally on `127.0.0.1:9090` to handle commands from the CLI, Web Admin, or AI Agent MCP tools.

---

## 🚀 Worker Operations

### Start the Worker Daemon
To run the worker in the background:

```bash
opn worker start --daemon
```

### Run as Cloud Fleet Worker
To listen for remote jobs dispatched from Supabase Cloud:

```bash
opn worker worker --poll-interval 5
```

### Inspect Status & Health
Check the daemon PID, uptime, memory footprint, and cloud pairing state:

```bash
opn worker status
```

Example JSON response (`opn worker status --json`):
```json
{
  "status": "ONLINE",
  "version": "1.2.1",
  "pid": 48210,
  "uptime_seconds": 18240,
  "active_jobs": 2,
  "cloud_connected": true,
  "paired_tenant_id": "00000000-0000-0000-0000-000000000001"
}
```

### Stream Real-Time Logs
Tail the worker's execution events:

```bash
opn worker logs -f
```

---

## ⚙️ Configuration Reference

Worker configuration is located at `~/.operon/worker/worker.json`:

```json
{
  "$schema": "https://operon.com/schema/config/runner.schema.json",
  "server_port": 9090,
  "max_concurrent_jobs": 4,
  "poll_interval_secs": 5,
  "log_level": "info",
  "enable_cloud_telemetry": true
}
```

Edit worker settings easily:

```bash
opn worker config --edit
```
