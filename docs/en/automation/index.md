# Automation Engine & Native CDP Driver

Web scrapers wrapped in Python or heavy Node.js runtimes collapse under concurrent load. Selenium and Playwright introduce massive abstraction layers, chew through gigabytes of RAM, and get trapped by Shadow DOM barriers and bot shields.

**Operon Automation Engine** executes browser workflows using Chrome DevTools Protocol (CDP) over raw WebSockets in pure Rust — piercing closed Shadow DOM, handling 500+ concurrent contexts, and consuming only 15MB RAM per tab.

---

## 1. Architecture: Cloud SSOT & Pure-Rust CDP Execution Driver

Operon Automation enforces **Supabase Cloud as the Single Source of Truth (SSOT)** for workflow blueprints and catalog definitions, while leveraging local high-performance Rust execution workers:

```text
 ┌─────────────────────────────────────────────────────────────┐
 │               AUTOMATION WORKFLOW PIPELINE                  │
 │                                                             │
 │   ┌──────────────────────┐       ┌──────────────────────┐   │
 │   │ Cloud Workflow Store │ ────► │ JSON Workflow Schema │   │
 │   │(automation.workflows)│       │ (Actions / Blocks)   │   │
 │   └──────────────────────┘       └──────────┬───────────┘   │
 │                                             │               │
 │                                             ▼               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │          Rust Automation Execution Engine           │   │
 │   │                                                     │   │
 │   │  • Step-by-Step Block Dispatch                      │   │
 │   │  • Dynamic Variable Substitution (-p / KEY=VALUE)   │   │
 │   │  • Timeout & Error Recovery State Machine           │   │
 │   └─────────────────────────┬───────────────────────────┘   │
 │                             │                               │
 │                             ▼                               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │       Native CDP DevTools Protocol Bridge           │   │
 │   │  • DOM Query, Click, Type, Bézier Mouse Dispatch    │   │
 │   │  • Network Request Interception & Cookie Jar        │   │
 │   │  • Anti-Detection Patches (WebRTC / Webdriver Mask) │   │
 │   └─────────────────────────┬───────────────────────────┘   │
 │                             │                               │
 │                             ▼                               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │          Fleet Orchestration & Telemetry            │   │
 │   │        (automation.jobs / execution_logs)           │   │
 │   │  • Live Step Traces, Error Reporting, Cloud Logs    │   │
 │   └─────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────┘
```

1. **Workflow Management (`opn automation list` / `/automation/workflows`)**:
   - Workflows are authored visually via Automation Studio or Web Admin and stored directly in the central database table `automation.workflows`.
2. **Step-by-Step Execution Driver**:
   - Evaluates workflow action blocks, parameters, and variable substitutions at runtime.
3. **Pure-Rust CDP Execution Driver**:
   - Communicates directly over local WebSockets using the Chrome DevTools Protocol (CDP). Bypasses heavy Node.js runtimes and WebDriver abstraction overhead.
4. **Cloud Telemetry & Fleet Scheduling**:
   - Execution jobs and runtime telemetry stream into `automation.jobs` and `automation.execution_logs` for fleet-wide visibility.

---

## 2. Command Reference

All workflow actions can be executed via the `opn automation` command suite:

### Direct Workflow Execution

```bash
# Execute a workflow from Cloud ID via native browser worker
opn automation run <workflow_id>

# Execute a standalone local JSON workflow file directly
opn automation run ./flows/checkout.json

# Execute in headless mode with a 60-second safety timeout
opn automation run <workflow_id> --headless --timeout 60

# Pass runtime variables (key-value interpolation)
opn automation run login-flow \
  -p USERNAME="admin@enterprise.vn" \
  -p TARGET_URL="https://app.enterprise.vn"

# Execute workflow against a specific cloud browser profile
opn automation run task-flow --cloud-profile "Facebook-Ad-VN"

# Execute in safe mode (verifies SOCKS5 gateway tunnel on 127.0.0.1:1080 before launching)
opn automation run task-flow --safe
```

### Workflow Cloud Management

```bash
# List all workflows saved in Supabase Cloud
opn automation list

# Filter workflows by keyword search
opn automation list --search "shopee"

# Output workflows as JSON for pipeline automation
opn automation list --format json

# Inspect detailed block sequence, parameters, and nodes of a workflow (by Cloud ID or file path)
opn automation inspect "checkout-flow"
opn automation inspect ./flows/checkout.json

# Delete workflow from Cloud database
opn automation workflow delete "checkout-flow"
```

### Visual Studio & Diagnostics

```bash
# Launch the visual workflow studio in your default browser
opn automation studio

# Probe Automation engine manifest capabilities
opn automation probe

# Inspect or edit Automation configuration
opn automation config --show
opn automation config --edit
```

---

## 3. Workflow Data Structure

Automation workflows conform to declarative JSON graphs containing node definitions, parameter bindings, and transition edges:

```json
{
  "name": "E-Commerce Price Scraper",
  "version": "1.2.0",
  "description": "Navigates to product catalog, extracts prices, and exports table",
  "drawflow": {
    "nodes": [
      {
        "id": "trigger-1",
        "label": "Manual / CLI Trigger",
        "type": "trigger"
      },
      {
        "id": "nav-1",
        "label": "Open Target URL",
        "type": "new-tab",
        "data": {
          "url": "{{TARGET_URL}}"
        }
      },
      {
        "id": "loop-1",
        "label": "Extract Product Cards",
        "type": "loop-elements",
        "data": {
          "selector": ".product-card"
        }
      }
    ]
  }
}
```

---

## 4. SSOT Storage & Microservice Pillar 2

In strict adherence to Operon's SSOT architecture:
- **Cloud Table (`automation.workflows`)**: Stores canonical workflow documents and graph metadata.
- **Local Workstation Config (`~/.operon/automation/automation.json`)**: Configures engine runtime defaults (ports, timeouts, browser defaults).
- **Zero Intermediate Storage**: Local workflow editing does not rely on intermediate local SQLite caching; all persistence queries Cloud SSOT directly.

---

## 5. AI Agent Integration (Native MCP Protocol)

AI agents orchestrate and inspect workflows programmatically through native MCP tools:

1. **`workflow_run`**:
   - Executes a workflow from Cloud ID or JSON definition with runtime variable substitutions; returns execution status, duration, and error codes.
2. **`workflow_list`**:
   - Queries and lists all available workflows directly from `automation.workflows`.
3. **`workflow_inspect`**:
   - Validates JSON structure, required input parameters, and transition blocks of a workflow before execution.
