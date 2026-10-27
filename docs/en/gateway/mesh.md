# Multi-Server Mesh Bridge & Tunnel Topology

Operating high-concurrency browser automation, affiliate advertising accounts, and e-commerce stores across multiple countries requires an organized, distributed egress network. Routing all traffic through a single proxy endpoint creates a single point of failure and increases the risk of correlated account bans.

**Bridge Mesh** enables you to orchestrate and multiplex an entire fleet of remote Virtual Private Servers (VPS) and residential proxies from a single workstation using the pure-Rust [`gateway`](https://github.com/operon/cli) engine.

<HairlineFigure name="patch" />

---

## 1. Mesh Topology & Port Mapping Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │               WORKSTATION CONTROLLER (PORT MAP)             │
 │                                                             │
 │   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐ │
 │   │ SOCKS5: 1080  │   │ SOCKS5: 1081  │   │ SOCKS5: 1082  │ │
 │   │ SSH:    2222  │   │ SSH:    2223  │   │ SSH:    2224  │ │
 │   ├───────────────┤   ├───────────────┤   ├───────────────┤ │
 │   │ Tag: clean-us │   │ Tag: mmo-sg   │   │ Tag: ads-eu   │ │
 │   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘ │
 └───────────┼───────────────────┼───────────────────┼─────────┘
             │                   │                   │
             ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  US West VPS    │ │  Singapore VPS  │ │  Frankfurt VPS  │
    │  198.51.100.24  │ │  203.0.113.88   │ │  192.0.2.140    │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

Each configured server endpoint in `gateway.json` is mapped to deterministic local ports:
- **Dedicated SOCKS5 Listener**: Workstation browsers bind directly to `socks5://127.0.0.1:<port>`.
- **Direct SSH Pipe**: Secure terminal access without opening SSH port 22 to the public internet (`ssh -p 2222 root@127.0.0.1`).
- **Embedded HTTP Translation Adapter (Port 8118)**: Converts standard HTTP proxy requests to upstream SOCKS5 connections.

---

## 2. Auto-Healing Supervisor Mechanics

Network tunnels across the public internet frequently experience silent connection drops, TCP resets, or ISP renegotiations. Standard SSH tunnels detach or become zombie sockets, silently halting automation tasks or causing traffic to fail over to insecure direct routes.

Operon's supervisor mode (`--foreground` / `-f`) eliminates this vulnerability:

```text
  Supervisor Ping Loop (Every 5s)
       │
       ▼
  Active SOCKS5 Tunnel Healthy?
       ├── YES ──► Continue Routine Monitoring
       │
       └── NO (Socket Dropped / Timeout)
             │
             ├── 1. Terminate Stale PID (~/.operon/gateway/pids/<server>.json)
             ├── 2. Calculate Exponential Backoff (1s, 2s, 4s...)
             ├── 3. Re-establish Encrypted Tunnel Handshake
             └── 4. Re-bind Local Listeners & Signal Controller Ready
```

---

## 3. Configuration & Multi-Server Mesh (`gateway.json`)

All mesh server definitions are declared in SSOT Pillar 4 (`~/.operon/gateway/gateway.json`):

```json
{
  "$schema": "https://operon.com/schema/config/gateway.schema.json",
  "workstation": {
    "name": "WORKSTATION-MAIN",
    "default_server": "vps-us-01"
  },
  "http_proxy_port": 8118,
  "auto_reconnect": true,
  "servers": {
    "vps-us-01": {
      "host": "198.51.100.24",
      "user": "root",
      "ssh_port": 22,
      "local_socks_port": 1080,
      "local_ssh_port": 2222,
      "enabled": true,
      "tags": ["clean-ip", "us", "e-commerce"]
    },
    "vps-sg-02": {
      "host": "203.0.113.88",
      "user": "root",
      "ssh_port": 22,
      "local_socks_port": 1081,
      "local_ssh_port": 2223,
      "enabled": true,
      "tags": ["mmo-farm", "sg", "tiktok"]
    },
    "vps-de-03": {
      "host": "192.0.2.140",
      "user": "root",
      "ssh_port": 22,
      "local_socks_port": 1082,
      "local_ssh_port": 2224,
      "enabled": false,
      "tags": ["backup", "eu"]
    }
  }
}
```

---

## 4. Command Reference

### Starting the Mesh & Tag-Based Routing

```bash
# Start all enabled gateway servers in background
opn gateway start

# Start bridges and launch embedded HTTP-to-SOCKS5 adapter (port 8118)
opn gateway start --http

# Start gateway with direct local SSH port forwarding (port 2222, 2223...)
opn gateway start --ssh

# Start only servers matching a specific tag (e.g. all US nodes)
opn gateway start -t us

# Run supervisor in foreground with auto-healing and live telemetry
opn gateway start -f
```

### Inspecting Mesh Health & Managing Nodes

```bash
# Display live interactive health check dashboard
opn gateway status

# Enable or disable servers without editing JSON manually
opn gateway enable vps-de-03
opn gateway disable vps-sg-02

# Terminate all active gateway tunnel processes
opn gateway stop all
```
