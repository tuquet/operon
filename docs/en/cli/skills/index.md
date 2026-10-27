# AI Agent & MCP Protocol Gateway

Autonomous coding agents like Claude Code, Cursor, and Google Antigravity excel at code generation, but when tasked with live web execution, they rely on naive headless browsers that trigger Cloudflare Turnstile and Akamai instantly.

**AI Agent & MCP Protocol Gateway** equips autonomous agents with stealth combat tools via the open Model Context Protocol (MCP) over JSON-RPC 2.0 stdio. Standalone MCP server or launched via `opn mcp`. Agents inspect browser profiles, dispatch stealth CDP scrapers, generate mathematically valid personas, and monitor VPS node health without needing raw shell privileges.

::: tip Standalone Microservice
Run `opn mcp` or pipe the JSON-RPC stream directly into any MCP client. AI agents get direct programmatic control over profiles, proxies, and scrapers without root or elevated bash access.
:::

---

## 1. What is the Model Context Protocol (MCP)?

The **Model Context Protocol (MCP)** is an open industry standard that allows Large Language Models (LLMs) to securely inspect and control local operating system tools over standard input/output (`stdio`) without needing bash execution permissions or custom wrapper scripts.

```text
 ┌─────────────────────────┐                ┌─────────────────────────┐
 │   Autonomous AI Agent   │                │     MCP Host    │
 │ (Claude Code, Cursor,   │ ── JSON-RPC ─► │     (opn mcp)       │
 │  Google Antigravity)    │ ◄── stdio ───  │                         │
 └─────────────────────────┘                └───────────┬─────────────┘
                                                        │
                      ┌─────────────────────────────────┼─────────────────────────────────┐
                      ▼                                 ▼                                 ▼
             faker_generate            workflow_run               browser_status
             (Generate 100% compliant         (Execute complex headless         (Verify dedicated runtime
              Vietnamese CCCD & Personas)      scraping DAG workflows)           health and active profiles)
```

---

## 2. Complete MCP Tools Catalog

When launched via `opn mcp`, registers native tools into the AI agent's tool registry:

| Tool Name | Arguments | Capabilities & Agent Action |
| :--- | :--- | :--- |
| **`status`** | `{}` | Returns unified JSON status across Cloud pairing, local Worker daemon, and dedicated Browser engine. |
| **`workflow_run`** | `workflow` (string), `variables` (object), `headless` (boolean), `timeout` (number) | Executes an automation workflow by stored database ID, interpolates dynamic runtime variables, and returns execution status. |
| **`workflow_list`** | `search` (string) | Lists all workflows stored in the SQLite database. |
| **`workflow_inspect`** | `workflow` (string) | Validates workflow JSON syntax, inputs, parameters, and step actions before execution. |
| **`faker_generate`** | `count` (number), `gender` (string), `nat` (string), `domain` (string) | Generates mathematically verified synthetic identities (CCCD Modulo 11, addresses, credentials) for form-filling. |
| **`browser_status`** | `{}` | Returns installation path, Chromium version, profile list, and disk footprint. |
| **`worker_probe`** | `{}` | Negotiates hardware capabilities and active concurrent worker slots on the local worker daemon. |
| **`cloud_whoami`** | `{}` | Inspects active workstation enrollment GUID, tenant ID, and cloud authentication state. |
| **`tree`** | `path` (string), `depth` (number) | Structured filesystem inspection respecting gitignore boundaries. |

---

## 3. Configuring MCP in Leading AI Agents

### Google Antigravity & Gemini CLI
Add the server definition to `~/.gemini/antigravity-cli/mcp_config.json`:

```json
{
  "mcpServers": {
    "operon": {
      "command": "operon",
      "args": ["mcp"]
    }
  }
}
```

### Claude Desktop
Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "operon": {
      "command": "operon",
      "args": ["mcp"]
    }
  }
}
```

### Cursor IDE
Add to `.cursor/mcp.json` or Workspace Settings:

```json
{
  "mcpServers": {
    "operon": {
      "command": "operon",
      "args": ["mcp"]
    }
  }
}
```

---

## 4. End-to-End Autonomous Agent Execution Flow

Here is how an autonomous agent uses to complete complex operational requests:

```text
 1. User Prompt:
    "Generate 3 verified Vietnamese users and register them on the test staging portal."

 2. Agent Decision 1: Call faker_generate
    Tool Arguments: { "count": 3, "nat": "VN" }
    Result: Returns 3 compliant identities with valid CCCD, phone, and diacritic-free emails.

 3. Agent Decision 2: Call workflow_run
    Tool Arguments: { 
      "workflow": "staging_register", 
      "variables": { "USERS": [...] },
      "headless": true 
    }
    Result: Workflow executes via native CDP driver, resolves Turnstile, submits data, and returns success tokens.

 4. Agent Final Response:
    "Successfully provisioned and registered 3 verified test accounts on staging."
```

