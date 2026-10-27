# Network gateway and tunnel supervisor

Operon Gateway (`opn gateway`) is a network tunnel supervisor and dynamic forwarder written in Rust. It manages encrypted VPS mesh connections, runs an embedded HTTP-to-SOCKS5 proxy, and provides proactive WebRTC leak protection for browser automation.

---

## Architecture and port mapping

The gateway maintains a dual-tier proxy routing model designed for both SOCKS5-aware binaries and standard HTTP/HTTPS CLI tools:

```
┌────────────────────────────────────────────────────────┐
│                   Workstation (Local)                  │
│                                                        │
│  [HTTP Tools]          [Git / SOCKS5 Tools]            │
│  (Supabase, curl)      (git spush, Chromium, Workers)  │
│         │                             │                │
│         ▼                             │                │
│  ┌──────────────┐                     │                │
│  │ HTTP Proxy   │                     │                │
│  │  127.0.0.1   │                     │                │
│  │  port 8118   │                     │                │
│  └──────┬───────┘                     │                │
│         │ (Internal forward)          ▼                │
│         └──────────────► ┌──────────────────────────┐  │
│                          │ SOCKS5 Dynamic Tunnel    │  │
│                          │ 127.0.0.1:1080 (my-vps)  │  │
│                          └────────────┬─────────────┘  │
└───────────────────────────────────────┼────────────────┘
                                        │ (Cloudflare Access WS Tunnel)
                                        ▼
                           ┌──────────────────────────┐
                           │      Remote Linux VPS    │
                           │   (Public Static Egress) │
                           └──────────────────────────┘
```

| Local endpoint | Protocol | Purpose and routing |
|---|---|---|
| `127.0.0.1:1080` | `SOCKS5` | Primary dynamic proxy tunnel to VPS via Cloudflare Access WebSocket. Used by `git spush`, headless browsers, and automation workers. |
| `127.0.0.1:8118` | `HTTP / CONNECT` | Pure Rust embedded HTTP-to-SOCKS5 forwarder. Translates standard HTTP/HTTPS proxy traffic for tools like Supabase CLI, `curl`, and `npm`. |
| `127.0.0.1:2222` | `SSH` | Direct SSH connection to the remote VPS shell terminal. |

---

## Quickstart

### 1. Launch gateway services

Start both the SOCKS5 (`1080`) and embedded HTTP (`8118`) forwarders:

```bash
opn gateway start --http
```

### 2. Verify tunnel status

Inspect the connection state across configured VPS nodes:

```bash
opn gateway status
```

Example output:

```json
{
  "ready": true,
  "default_server": "my-vps",
  "workloads": {
    "git": { "online": true, "port": 1080 },
    "supabase_http": { "online": true, "port": 8118 },
    "ssh": { "online": true, "port": 2222 }
  }
}
```

### 3. Verify egress and WebRTC protection

Probe the external egress IP, latency, and leak protection:

```bash
opn gateway probe
```

---

## Configuration reference

Gateway configuration is stored in `~/.operon/gateway/gateway.json`:

```json
{
  "$schema": "https://operon.com/schema/config/gateway.schema.json",
  "default_user": "root",
  "http_proxy_port": 8118,
  "auto_reconnect": true,
  "servers": [
    {
      "id": "my-vps",
      "name": "Primary Production VPS",
      "endpoint": "cdn.example.com",
      "server_type": "cloudflare",
      "socks_port": 1080,
      "ssh_port": 2222,
      "status": "ONLINE",
      "tags": ["primary", "git"]
    },
    {
      "id": "backup-node",
      "name": "Standby Node",
      "endpoint": "backup.example.com",
      "server_type": "direct",
      "socks_port": 1082,
      "status": "DISABLED",
      "tags": ["backup"]
    }
  ]
}
```

### Node lifecycle management

| Task | Command | Description |
|---|---|---|
| **Enable a node** | `opn gateway enable <server-id>` | Activates the specified server tunnel. |
| **Disable a node** | `opn gateway disable <server-id>` | Disables the tunnel without deleting configuration. |
| **Validate configuration** | `opn gateway check` | Verifies SSH keys, open ports, and configuration syntax. |
