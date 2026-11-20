# Development

Use the Node version in `.node-version` and the `packageManager` pnpm version in `package.json`.

## Web & standalone micro-apps

Web mode needs neither Rust nor the private desktop subsystem. Configure `apps/shell/.env` (never commit secrets).

```sh
pnpm install --frozen-lockfile
pnpm dev:web          # Full shell (port 5320)
pnpm dev:automation   # Standalone mock-host apps (ports 5321..5324)
pnpm dev:system
pnpm dev:tenants
pnpm dev:playground
```

## Desktop (Windows)

Requires Rust MSVC, C++ build tools, WebView2, and a sibling checkout of `tuquet/operon` (`../operon`) at the commit pinned in `subsystem.json`:

```powershell
$s = Get-Content subsystem.json -Raw | ConvertFrom-Json
git clone "git@github.com:$($s.repository).git" $s.path
git -C $s.path checkout --detach $s.revision
pnpm desktop:check
pnpm dev:desktop
```

When bumping `subsystem.json`, verify a clean checkout at the new commit with `pnpm desktop:check` and commit `subsystem.json` alongside the console changes.

## Local updater simulation

```sh
pnpm updater:simulate                                # Self-contained CLI test
pnpm updater:simulate --server-only --apply-config   # Live server for pnpm dev:desktop (Ctrl+C restores tauri.conf.json)
```

See [Releasing](RELEASING.md#local-updater-simulation) for flags and signing details.
