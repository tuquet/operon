---
id: CLI-002
title: CLI-Centric Install, Desk Auto-Install & Self-Update
status: approved
created: 2026-11-25
updated: 2026-11-25
depends_on: [CLI-001]
---

# CLI-002: CLI-Centric Install, `desk` Launcher & `update`

## Goal
Standardize end-user installation and launch around the CLI (`operon` primary binary, `opn` CLI alias, `~/.operon` SSOT directory), ensuring the local `daemon` runs before any `host shell` surface (Web or Tauri Desktop) and enabling automatic install/update from `tuquet/operon` releases.

---

## 1. Binary Names & SSOT Storage (`CONSTRAINTS.md` S1)

| Component | Path under SSOT (`~/.operon` / `$OPERON_HOME`) | Notes |
| :--- | :--- | :--- |
| **Primary CLI** | `bin/operon.exe` (Windows), `bin/operon` (Unix) | Canonical executable (`[[bin]] name = "operon"`). |
| **CLI Alias** | `bin/opn.exe` (hardlink/copy), `bin/opn` (symlink → `operon`) | Short CLI alias; identical behavior. |
| **Desktop App** | `apps/desk/` (`Operon.exe`, `version.json`) | Tauri-wrapped `host shell` installed on demand by `opn desk`. |
| **Daemon & Data** | `logs/`, `system/`, `profiles/`, `secrets/`, `data/` | Strict SSOT runtime directories; zero legacy `automation/` or `desktop` labels. |

---

## 2. Release Assets & Tag Mapping (`tuquet/operon`)

- **CLI (`core-v*`, marks GitHub `/releases/latest`):**
  - Assets: `operon-<os>-<arch>[.exe]`, `install.ps1`, `install.sh`, `SHA256SUMS.txt`.
- **Desktop (`console-v*`, `make_latest: false`):**
  - Channel feeds on branch `release-state`: `updates/<channel>/latest.json` (`stable`, `beta`, `nightly`), `release-manifest.json`, signed NSIS installer & portable zip.

---

## 3. Initial CLI Installation (`install.ps1` / `install.sh`)

1. Download `operon-<os>-<arch>[.exe]` and `SHA256SUMS.txt` from `tuquet/operon/releases/latest/download`.
2. **Integrity (Fail-Fast):** Compute SHA256 and abort immediately on hash mismatch; never fall through with a warning when `SHA256SUMS.txt` is present.
3. **Safe Replace:** Stop any active `daemon`, wait for process exit / file unlock, install `operon` and `opn` alias into `~/.operon/bin`, and add `~/.operon/bin` to user `PATH` idempotently.
4. **Daemon Autostart & Readiness:** Because `daemon` (`127.0.0.1:8765`) is required before opening the Web or Desktop `host shell`:
   - Register user-level autostart without `.vbs` Startup scripts (Windows: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` or user Scheduled Task; macOS: LaunchAgent; Linux: `systemd --user`).
   - Start `daemon`, poll `/api/v1/health`, and print `operon --version`.
   - Support opt-out flag (`--no-daemon`) for CI / dev machines.

---

## 4. `operon desk` / `opn desk` Lifecycle

Unifies and replaces legacy `desktop` (`desktop` becomes `desk`; Tauri Desktop is simply the packaged `host shell`).

1. **Ensure `daemon` Online:** Probe `http://127.0.0.1:${DAEMON_PORT:-8765}/api/v1/health`; if offline, spawn detached `daemon` and wait for health check (`CONSTRAINTS.md` P1/P2).
2. **`--web` Mode:** Skip native binary lookup and open the Web `host shell` in the system browser.
3. **Native Desktop Launch / Auto-Install:**
   - If `~/.operon/apps/desk/Operon.exe` exists, launch it (forwarding optional route flags such as `--page`).
   - If missing on a supported desktop platform (`windows-x86_64`): fetch `release-state/updates/<channel>/latest.json` (default `stable`; override with `--channel beta|nightly`), download and verify signature/checksum into `~/.operon/apps/desk/`, write install metadata, then launch.
   - **Unsupported OS Fallback (macOS / Linux until native builds ship):** Keep `daemon` running, notify cleanly that native Desktop assets are not yet published for this OS, and open the Web `host shell` in the default browser.

---

## 5. Self-Update (`operon update` / `opn update`)

Canonical command is **`opn update`** (replaces all `opn upgrade` strings in CLI messages/banners).

1. **Background Check:** Non-blocking 24h check queries `tuquet/operon/releases/latest` (normalizing `core-v` and `v` tags) and caches update availability.
2. **Interactive / Explicit `opn update` (`--desk`, `--all`, `--yes`):**
   - Fetch target manifest/assets (CLI from `core-v*`, Desktop from `release-state/updates/<channel>/latest.json`), verify SHA256 / Ed25519 signature, and replace binaries safely (stopping active `daemon` / Desktop processes first).
   - **Restart Confirmation:** If `daemon` was running before update, prompt to confirm restarting `daemon` (`Restart daemon now? [Y/n]`; auto-confirm with `--yes`).

---

## 6. Terminology Alignment (`GLOSSARY.json`)

All installer messages, CLI `--help`, and `daemon` status output use canonical terms: **`daemon`** (not `Local Bridge` / `[WORKER]`), **`host shell`** (not `Web-UI` / `desktop`), and **`Operon Desktop`**.
