# CLI commands catalog

The `opn` CLI provides commands across six functional domains, plus a Model Context Protocol (MCP) bridge for AI agents. All commands support structured JSON output with `--json`.

---

## 1. `opn auth`: Identity and workspace management

Manages operator credentials, device pairing, and active tenant contexts.

```bash
opn auth <subcommand> [options]
```

### Subcommands and options

| Command | Arguments and flags | Description |
| :--- | :--- | :--- |
| `opn auth login` | `--otp <code>`, `--token <jwt>`, `--email <addr>` | Authenticates through interactive prompt or token. |
| `opn auth logout` | `--all` | Clears stored session tokens and revokes local credentials. |
| `opn auth whoami` | `--json` | Displays current operator identity and paired tenant ID. |
| `opn auth tenant list` | `--json` | Lists all organizations accessible to the current operator. |
| `opn auth tenant switch <id>` | `<tenant-id>` | Switches the active workspace tenant context. |
| `opn auth tenant current` | `--json` | Prints the active tenant UUID. |

---

## 2. `opn worker`: Process supervision daemon

Runs the background daemon responsible for cloud fleet polling, job execution, and telemetry streaming.

```bash
opn worker <subcommand> [options]
```

### Subcommands and options

| Command | Arguments and flags | Description |
| :--- | :--- | :--- |
| `opn worker start` | `--daemon`, `--port <port>` | Starts the local worker process (default port: `9090`). |
| `opn worker worker` | `--poll-interval <sec>` | Runs an autonomous worker that polls jobs from Supabase Cloud. |
| `opn worker stop` | `--graceful` | Sends a termination signal to the running worker daemon. |
| `opn worker restart` | — | Restarts the active worker process. |
| `opn worker status` | `--json` | Inspects daemon uptime, PID, active tasks, and cloud connectivity. |
| `opn worker logs` | `-f`, `-n <lines>` | Streams worker logs in real time. |
| `opn worker probe` | `--json` | Returns the local runtime and capability manifest as JSON. |
| `opn worker config` | `--edit`, `--show` | Displays or edits worker settings (`~/.operon/worker/worker.json`). |

---

## 3. `opn automation`: Workflow execution engine

Validates and executes browser automation workflows using native Rust CDP.

```bash
opn automation <subcommand> [options]
```

### Subcommands and options

| Command | Arguments and flags | Description |
| :--- | :--- | :--- |
| `opn automation run <path/id>` | `--headless`, `--browser <id>`, `--vars <k=v>` | Executes an automation workflow by file path or stored workflow ID. |
| `opn automation workflow list` | `--json` | Lists stored workflows in the local database or cloud repository. |
| `opn automation workflow info <id>` | `<id>` | Displays metadata and execution graph for a stored workflow. |
| `opn automation inspect <file>` | `<file.json>` | Validates workflow JSON syntax and block compatibility. |
| `opn automation studio` | `--port <port>` | Launches the visual workflow editor in the default browser. |
| `opn automation probe` | `--json` | Lists available block types and engine capabilities. |
| `opn automation config` | `--edit`, `--show` | Displays or edits automation settings (`~/.operon/automation/automation.json`). |

---

## 4. `opn gateway`: Network mesh and tunnel supervisor

Controls encrypted VPS tunnels, the embedded HTTP forwarder, and WebRTC leak protection.

```bash
opn gateway <subcommand> [options]
```

### Subcommands and options

| Command | Arguments and flags | Description |
| :--- | :--- | :--- |
| `opn gateway start` | `--http`, `--ssh`, `[server-id]` | Starts SOCKS5 proxy (`1080`) and embedded HTTP forwarder (`8118`). |
| `opn gateway stop` | `[server-id]` | Stops active tunnels and forwarder processes. |
| `opn gateway status` | `--json` | Displays health status for configured VPS nodes and ports. |
| `opn gateway probe` | `--target <url>`, `--json` | Tests egress connectivity, latency, public IP, and WebRTC shield. |
| `opn gateway check` | — | Validates `~/.operon/gateway/gateway.json` schema and SSH credentials. |
| `opn gateway enable <server>` | `<server-id>` | Activates a configured server node in the mesh. |
| `opn gateway disable <server>` | `<server-id>` | Disables a server node without removing its configuration. |
| `opn gateway config` | `--edit`, `--show` | Displays or edits `~/.operon/gateway/gateway.json`. |

---

## 5. `opn browser`: Browser runtime and profile sandboxes

Controls stealth Chromium instances, deterministic hardware seeds, and profile data.

```bash
opn browser <subcommand> [options]
```

### Subcommands and options

| Command | Arguments and flags | Description |
| :--- | :--- | :--- |
| `opn browser install [engine]` | `[148]` | Provisions the verified Chromium LTS runtime. |
| `opn browser status` | `--json` | Inspects installed runtimes and active profile directories. |
| `opn browser launch <profile>` | `--headless`, `--proxy <url>`, `--url <url>` | Launches an isolated profile with assigned hardware fingerprints. |
| `opn browser ps` | `--json` | Lists running browser processes and active CDP debugging ports. |
| `opn browser stop [pid/id]` | `--force` | Terminates active browser sessions. |
| `opn browser profile list` | `--json` | Lists all local and cloud-synced browser profiles. |
| `opn browser profile create <name>` | `--proxy <url>`, `--ua <str>` | Creates a profile with a deterministic hardware fingerprint. |
| `opn browser profile delete <id>` | `<id>` | Deletes a profile directory and removes cached session data. |
| `opn browser profile test-proxy <id>` | `<id>` | Tests proxy latency and verifies IP masking for the profile. |
| `opn browser ext list` | — | Lists extensions installed in the browser runtime sandbox. |

---

## 6. AI agent MCP bridge (`opn mcp`)

Exposes Operon CLI capabilities to AI coding assistants and automation agents using the Model Context Protocol (MCP).

```bash
opn mcp
```

- **Transport**: JSON-RPC 2.0 over `stdio`.
- **Exposed tools**: `status`, `workflow_list`, `workflow_inspect`, `workflow_run`, `worker_probe`, `cloud_whoami`, `browser_status`, `faker_generate`, `inbox_otp`, `inbox_status`.

---

## 7. `opn secret`: Encrypted secret store

Stores encrypted credentials locally and syncs them to the cloud control plane. Secrets are injected at runtime into workflows as `\{\{secrets.<name>\}\}` and are never written to disk logs or job execution records.

```bash
opn secret <subcommand> [options]
```

### Subcommands and options

| Command | Arguments and flags | Description |
| :--- | :--- | :--- |
| `opn secret init` | — | Generates local store keys and device X25519 keypairs. |
| `opn secret set <name> <value>` | `<name>`, `<value>` | Encrypts and stores a secret using AES-256-GCM. |
| `opn secret list` | `--format json` | Lists secret names without displaying values. |
| `opn secret rm <name>` | `<name>` | Deletes a local secret. |
| `opn secret remote` | — | Lists secrets registered in the cloud control plane. |
| `opn secret push` | — | Uploads client-side encrypted secrets to the cloud. |
| `opn secret pull` | — | Retrieves sealed data encryption keys (DEK) and decrypts values locally. |
| `opn secret rotate` | — | Rotates the tenant encryption key and re-encrypts all stored secrets. |
| `opn secret path` | — | Prints the filesystem path to the local secret store. |

For detailed information on the envelope-encryption architecture, see the [secret store specification](/en/cloud/specs/SPEC-secret-store).
