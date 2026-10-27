# Bridge Mesh Gateway & Protocol Tunnel Supervisor

Corporate firewalls and cloud network boundaries frequently inspect or drop outbound SSH/RPC traffic. Automation workflows that interact with restricted APIs or cloud databases risk leaking local IP addresses through unshielded sockets or DNS fallback.

**Operon Gateway** is a standalone, kernel-level network tunnel supervisor and dynamic forwarder built with pure Rust. It maintains encrypted VPS mesh connections, runs an embedded HTTP-to-SOCKS5 proxy, and provides proactive WebRTC leak shielding.

---

## 🏗️ Architecture & Port Mapping

Operon Gateway operates a dual-tier proxy routing model designed for both SOCKS5-aware binaries and standard HTTP/HTTPS CLI tooling:

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

| Workload / Port | Protocol | Purpose & Routing |
|---|---|---|
| **`127.0.0.1:1080`** | `SOCKS5` | Primary dynamic proxy tunnel to VPS via Cloudflare Access WebSocket. Used by `git spush`, headless browsers, and automation workers. |
| **`127.0.0.1:8118`** | `HTTP / CONNECT` | Pure Rust embedded HTTP-to-SOCKS5 forwarder. Translates standard HTTP/HTTPS proxy traffic for tools like `supabase CLI`, `curl`, and `npm`. |
| **`127.0.0.1:2222`** | `SSH` | Direct SSH connection to remote VPS command terminal. |

---

## ⚡ Quickstart

### 1. Launch Gateway Services
Start both SOCKS5 (`1080`) and embedded HTTP (`8118`) forwarders:

```bash
opn gateway start --http
```

### 2. Verify Tunnel Status
Inspect connection state across all configured VPS nodes:

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

### 3. Verify Egress & WebRTC Shield
Probe external egress IP, latency, and leak protection:

```bash
opn gateway probe
```

---

## ⚙️ Configuration Reference

Gateway settings are stored at `~/.operon/gateway/gateway.json` (adhering to JSON Schema Draft 2020-12):

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

### Node Lifecycle Management

- **Enable a node**: `opn gateway enable <server-id>`
- **Disable a node**: `opn gateway disable <server-id>` (disables tunnel without removing configuration)
- **Check configuration**: `opn gateway check` (validates SSH keys, open ports, and syntax)
