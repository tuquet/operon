# Quick Installation (15 Seconds)

**Operon** is distributed as a standalone native binary for Windows, macOS, and Linux. You do **not** need to install external runtimes, Node.js, compilers, or heavy developer dependencies.

<HairlineFigure name="slow" />

---

## One-Liner Web Installer (Khuyến nghị / Recommended)

Run the appropriate command in your terminal:

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

## What Happens During Installation

In approximately 15 seconds, the automated installer completes:

1. **Client Deployment**: Installs `opn` into user-space (`~/.operon/bin/`) without requiring administrator or root privileges.
2. **PATH Configuration**: Registers the command globally so you can run `operon` from any terminal or shell.
3. **Dedicated Antidetect Engine**: Provisions the optimized Antidetect Chromium LTS runtime.
4. **Environment Check**: Validates network tunnels and local storage directories.

---

## Verifying Your Installation

Open a fresh terminal window and run:

```bash
opn doctor
```

When all systems are ready, you will see:

```text
╭─ DIAGNOSTIC VERDICT ────────────────────────────── ● ALL SYSTEMS OPERATIONAL ─╮
│  All required ecosystem dependencies and runtimes are properly provisioned.    │
│  Your workstation is 100% ready for autonomous browser workflows.             │
╰────────────────────────────────────────────────────────────────────────────────╯
```

