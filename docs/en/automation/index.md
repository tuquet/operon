# Automation Engine & Native CDP Driver

Web scrapers wrapped in Python or heavy Node.js runtimes collapse under concurrent load. Selenium and Playwright introduce massive abstraction layers, chew through gigabytes of RAM, and get trapped by Shadow DOM barriers and bot shields.

**Operon Automation Engine** executes browser workflows using Chrome DevTools Protocol (CDP) over raw WebSockets in pure Rust — piercing closed Shadow DOM, handling 500+ concurrent contexts, and consuming only 15MB RAM per tab.

---

## 1. Architecture: Declarative Workflow & Headless Rust Engine

Operon Automation resolves the tradeoff between simplicity and raw automation performance through a lightweight pipeline:

```text
 ┌─────────────────────────────────────────────────────────────┐
 │               AUTOMATION WORKFLOW PIPELINE                  │
 │                                                             │
 │   ┌──────────────────────┐       ┌──────────────────────┐   │
 │   │ Workflow Record (DB) │ ────► │ JSON Workflow Schema │   │
 │   │ (automation.sqlite)  │       │ (Actions / Blocks)   │   │
 │   └──────────────────────┘       └──────────┬───────────┘   │
 │                                             │               │
 │                                             ▼               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │          Rust Automation Execution Engine           │   │
 │   │                                                     │   │
 │   │  • Step-by-Step Block Dispatch                      │   │
 │   │  • Dynamic Runtime Variable Substitution (-p / -var)│   │
 │   │  • Timeout & Error Recovery State Machine           │   │
 │   └─────────────────────────┬───────────────────────────┘   │
 │                             │                               │
 │                             ▼                               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │       Native CDP DevTools Protocol Bridge           │   │
 │   │  • DOM Query, Click, Type, Bézier Mouse Dispatch    │   │
 │   │  • Network Request Interception & Cookie Jar        │   │
 │   └─────────────────────────┬───────────────────────────┘   │
 │                             │                               │
 │                             ▼                               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │              Local SQLite Persistence               │   │
 │   │        (~/.operon/automation/automation.sqlite)         │   │
 │   │  • Execution Logs, Step Traces, Workflow Records    │   │
 │   └─────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────┘
```

1. **Workflow Management (`opn automation list` / `/automation/workflows`)**:
   - Manage and trigger automation workflows via CLI or Web Admin.
2. **Step-by-Step Execution Driver**:
   - Evaluates workflow action blocks, parameters, and variable substitutions.
3. **Pure-Rust CDP Execution Driver**:
   - Communicates directly over local WebSockets using the Chrome DevTools Protocol (CDP). Bypasses heavy Node.js runtimes and WebDriver abstraction overhead.
4. **Local SQLite Store & Cloud Telemetry**:
   - Workflows and execution logs are stored locally in `~/.operon/automation/automation.sqlite` and synchronized to `/automation/jobs` when enrolled with a tenant.

---

## 2. Command Reference

All workflow actions can be executed via the `opn automation` command suite:

### Direct Workflow Execution

```bash
# Execute a workflow from SQLite database via native browser worker
opn automation run <workflow_id>

# Execute in headless mode with a 60-second safety timeout
opn automation run <workflow_id> --headless --timeout 60

# Pass runtime variables (key-value interpolation)
opn automation run login-flow \
  -p USERNAME="admin@enterprise.vn" \
  -p TARGET_URL="https://app.enterprise.vn"

# Execute workflow against a specific cloud browser profile
opn automation run task-flow --cloud-profile "Facebook-Ad-VN"
```

### Workflow Database Management

```bash
# List all workflows saved in SQLite database
opn automation list

# Filter workflows by keyword search
opn automation list --search "shopee"

# Import a workflow JSON file into SQLite database
opn automation import ./flows/checkout.json --id "checkout-flow" --name "E-commerce Checkout"

# Inspect detailed block sequence, parameters, and triggers
opn automation inspect "checkout-flow"

# Export workflow from database to a standalone JSON file
opn automation export "checkout-flow" -o ./exported.json

# Delete workflow from SQLite database
opn automation delete "checkout-flow"
```

### Diagnostics & Engine Settings

```bash
# Probe Automation engine manifest capabilities
opn automation probe

# Inspect or edit Automation configuration (~/.operon/automation/automation.json)
opn automation config --show
opn automation config --edit
```

---

## 3. Workflow Data Structure

Automation workflows are stored in SQLite (`automation.sqlite`) as declarative JSON containing node definitions, parameter bindings, and actions:

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
          "url": "\{\{TARGET_URL\}\}"
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

In strict adherence to Operon's SSOT architecture, all Automation files resolve exclusively to `~/.operon/automation/`:

```text
~/.operon/automation/
├── automation.json           # Engine configuration settings
└── automation.sqlite         # Execution history, step logs, workflow records
```

---

## 5. AI Agent Integration (Native MCP Protocol)

AI agents orchestrate and inspect workflows programmatically through native MCP tools:

1. **`workflow_run`**:
   - Executes a workflow from database ID with variable substitutions and returns execution status, duration, and error codes.
2. **`workflow_list`**:
   - Lists all available workflows stored in the SQLite database.
3. **`workflow_inspect`**:
   - Validates JSON structure, required input parameters, and transition blocks of a workflow before execution.

