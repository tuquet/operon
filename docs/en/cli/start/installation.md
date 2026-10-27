# Installation

Operon is distributed as a standalone native binary for Windows, macOS, and Linux. It has no dependencies on Node.js, external interpreters, or system-level compilers.

---

## Standalone installation (Recommended)

Run the installation script for your operating system:

::: code-group

```powershell [Windows (PowerShell)]
powershell -c "irm https://raw.githubusercontent.com/operon/cli/main/install.ps1 | iex"
```

```bash [macOS & Linux (curl)]
curl -fsSL https://raw.githubusercontent.com/operon/cli/main/install.sh | sh
```

```bash [Linux (wget)]
wget -qO- https://raw.githubusercontent.com/operon/cli/main/install.sh | sh
```

:::

---

## What the installer does

The automated installer performs four tasks:

1. **Deploys binary**: Copies `opn` into your user home directory (`~/.operon/bin/`) without requiring root or administrator privileges.
2. **Updates system PATH**: Configures the shell PATH environment variable to expose `opn` globally.
3. **Provisions Chromium runtime**: Downloads the verified, patch-compatible Chromium LTS engine to `~/.operon/browser/runtimes/`.
4. **Initializes storage pillars**: Creates configuration directories and the SQLite database in `~/.operon/`.

---

## Verify the installation

Open a new shell session and verify the installation:

```bash
opn doctor
```

When all components are provisioned, `opn doctor` outputs:

```text
╭─ DIAGNOSTIC VERDICT ────────────────────────────── ● ALL SYSTEMS OPERATIONAL ─╮
│  All required ecosystem dependencies and runtimes are properly provisioned.    │
│  Your workstation is 100% ready for autonomous browser workflows.             │
╰────────────────────────────────────────────────────────────────────────────────╯
```
