# System Health & Ecosystem Diagnostics

Operating antidetect browser clusters, proxy mesh tunnels, and automated DAG workflows requires verified system dependencies, intact SQLite databases, and properly permissioned storage pillars.

**Doctor** is a built-in automated diagnostic and self-healing engine (`opn doctor`) that verifies workstation readiness across all microservice pillars.

<HairlineFigure name="query" />

---

## 1. Running Comprehensive System Diagnostics

Execute the diagnostic scanner at any time:

```bash
# Run complete ecosystem health check
opn doctor
```

The diagnostic scanner inspects 5 critical subsystems:

```text
 1. System Tool Dependencies:
    • OpenSSH (ssh)       - Required for SOCKS5 tunneling and remote VPS access
    • cloudflared         - Optional portable binary for Cloudflare Tunnel mesh
    • Git                 - Version control for local workflow repositories

 2. Dedicated Browser Runtime:
    • C++ Chromium LTS    - Checks binary presence in ~/.operon/browser/runtimes/
    • Executable Bit      - Verifies launch permissions and integrity hash

 3. SSOT Storage Pillars (~/.operon/):
    • ~/.operon/system/       - Machine identity (.machine_id) and credentials
    • ~/.operon/automation/   - Workflow execution database (automation.sqlite)
    • ~/.operon/worker/       - Worker supervisor daemon config and logs
    • ~/.operon/browser/      - Profile sandboxes and antidetect runtimes
    • ~/.operon/gateway/      - Mesh configuration and daemon PIDs
    • ~/.operon/faker/        - Synthetic persona schemas and templates

 4. Automation SQLite Database:
    • automation.sqlite   - Verifies schema migrations and read/write access

 5. AI Agent MCP Protocol:
    • Native MCP Server   - Confirms JSON-RPC stdio responsiveness
```

---

## 2. Diagnostic Output & Verdict Card

When all dependencies are operational, displays a clean diagnostic verdict:

```text
╭─ DIAGNOSTIC VERDICT ────────────────────────────── ● ALL SYSTEMS OPERATIONAL ─╮
│  All required ecosystem dependencies and runtimes are properly provisioned.    │
│  Your workstation is 100% ready for autonomous browser workflows, antidetect   │
│  spoofing, and gateway meshes.                                                  │
╰────────────────────────────────────────────────────────────────────────────────╯
```

If a dependency is missing, Doctor highlights the specific missing component and displays actionable remediation instructions:

```text
  Tool / Runtime       Status        Action Needed
  ──────────────────────────────────────────────────────────────────────────
  ssh (OpenSSH)        ● MISSING     sudo apt install openssh-client
  Chromium LTS         ○ NOT FOUND   Run 'opn doctor --fix' to auto-download
```

---

## 3. Automated Self-Healing (`--fix`)

When run with the `--fix` flag, automatically resolves configuration drift, missing runtimes, and storage inconsistencies:

```bash
# Automatically remediate environment issues and download missing runtimes
opn doctor --fix
```

The remediation pipeline executes in sequence:
1. **Initializes SSOT Pillars**: Creates all missing canonical storage directories under `~/.operon/`.
2. **Initializes SQLite Store**: Runs schema migrations for `~/.operon/automation/automation.sqlite`.
3. **Provisions Antidetect Chromium**: Downloads and unpacks the verified C++ Antidetect Chromium LTS release.
4. **Validates Proxy Gateway**: Verifies SSH tunnel dependencies and default configurations.
