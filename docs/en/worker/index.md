# Distributed worker engine

The Operon Worker (`opn worker`) is a background process supervisor and cloud execution node written in Rust. It coordinates workstations and cloud virtual private servers (VPS) into an autonomous execution fleet.

---

## Core capabilities

1. **Process tree supervision**: Monitors child browser processes and automation jobs. Terminates orphaned Chromium processes cleanly without dangling socket descriptors.
2. **Cloud fleet polling**: Subscribes to Supabase Realtime queues to execute dispatched workflows asynchronously.
3. **Telemetry streaming**: Emits execution logs and system resource metrics over Server-Sent Events (SSE) and WebSocket connections.
4. **Local HTTP API**: Listens locally on `127.0.0.1:9090` to serve commands from the CLI, Web Admin, or AI Agent MCP tools.

---

## Worker operations

### Start the worker daemon

To launch the worker supervisor in the background:

```bash
opn worker start --daemon
```

### Run as a cloud fleet worker

To poll and execute jobs dispatched from a central Supabase control plane:

```bash
opn worker worker --poll-interval 5
```

### Inspect status and health

To query the daemon process ID, uptime, active jobs, and cloud connection status:

```bash
opn worker status
```

For machine-readable JSON output:

```bash
opn worker status --json
```

Example JSON response:

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

### Stream logs in real time

To tail the worker log stream:

```bash
opn worker logs -f
```

---

## Configuration reference

Worker settings reside in `~/.operon/worker/worker.json`:

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

To open the configuration in your default editor:

```bash
opn worker config --edit
```
