# System health and diagnostics

Operating browser fleets, network tunnels, and automated DAG workflows requires verified dependencies, intact SQLite databases, and properly permissioned storage directories.

`opn doctor` is the built-in diagnostic and self-healing command that checks system readiness across all components.

---

## 1. Run diagnostic checks

Execute the health check command:

```bash
opn doctor
```

`opn doctor` verifies five subsystems:

1. **System dependencies**: Validates availability of `ssh` (OpenSSH for tunnels), `cloudflared` (optional mesh bridge), and `git`.
2. **Chromium runtime**: Verifies executable permissions and file hashes in `~/.operon/browser/runtimes/`.
3. **Storage pillars**: Checks directory permissions in `~/.operon/` (`system/`, `automation/`, `worker/`, `browser/`, `gateway/`, and `faker/`).
4. **Automation database**: Verifies read/write access and migration state of `~/.operon/automation/automation.sqlite`.
5. **AI agent MCP protocol**: Tests JSON-RPC stdio responsiveness for Model Context Protocol integrations.

---

## 2. Review diagnostic output

When all dependencies are operational, `opn doctor` returns an operational verdict:

```text
╭─ DIAGNOSTIC VERDICT ────────────────────────────── ● ALL SYSTEMS OPERATIONAL ─╮
│  All required ecosystem dependencies and runtimes are properly provisioned.    │
│  Your workstation is 100% ready for autonomous browser workflows.             │
╰────────────────────────────────────────────────────────────────────────────────╯
```

If a dependency is missing, `opn doctor` outputs actionable recovery commands:

```text
  Tool / Runtime       Status        Action Needed
  ──────────────────────────────────────────────────────────────────────────
  ssh (OpenSSH)        ● MISSING     sudo apt install openssh-client
  Chromium LTS         ○ NOT FOUND   Run 'opn doctor --fix' to auto-download
```

---

## 3. Automatically remediate issues (`--fix`)

To resolve missing runtimes, rebuild corrupted databases, or repair directory permissions automatically, run:

```bash
opn doctor --fix
```
