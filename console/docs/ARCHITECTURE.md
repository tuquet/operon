# Architecture

`console` is a pnpm monorepo. The shell and micro-apps compile and release together; dynamic imports split bundles rather than deploying apps independently.

## Workspace layout

| Path | Owns |
| --- | --- |
| `apps/shell` | Auth, session, layout, top-level routes, access guards, desktop adapters, `@operon/kernel` host |
| `apps/{automation,system,tenants,playground}` | Domain screens, `app:*` Pinia stores, child route manifests (`src/manifest.ts`) |
| `packages/kernel` | Typed host contract (`useKernel()`, `KERNEL_INJECTION_KEY`), mock host, `KernelApiError` |
| `packages/@core` | Base types, UI primitives, `shadcn-ui` |
| `packages/effects` | Shared layouts, hooks, higher-level UI |
| `packages/local-db` | Local SQLite schemas, migrations, sync |
| `internal` / `scripts` | Build, TypeScript, lint, scaffold (`pnpm gen:app`), release tooling |

## Dependency boundaries

Enforced by `pnpm check:architecture`, `pnpm check:circular`, and ESLint:

- `apps/shell` may import micro-app manifests (`@operon/<app>`).
- Micro-apps consume host services via `useKernel()` and shared packages; never import `apps/shell` or another micro-app.
- `packages/*` must not import `apps/*`; `@operon-core/*` must not depend on `@operon/*`.
- Every source package must expose a `typecheck` script (`pnpm check:type-coverage`).

## Desktop shell layout

Tauri mounts `DesktopShell` once in `App` across all routes (including auth and errors); web renders `RouterView` directly:

- **`window-titlebar`** (`DesktopTitlebar` + `WindowControls`): app identity, `data-tauri-drag-region`, update button, window buttons (excluded from drag region).
- **`desktop-viewport`**: `min-height: 0` + `contain: layout` isolates fixed headers/sidebars/masks inside `vben-layout.vue` without titlebar offset math. `useElementSize` sets `--vben-viewport-height` for sub-titlebar overlays; `body`-teleported dialogs remain full-window.

## Adding a screen or micro-app

- **New micro-app**: run `pnpm gen:app <name>`.
- **New screen**: add view + store under `apps/<name>/src`, register a lazy named route in `src/manifest.ts`, and navigate by route name so standalone (`createMockKernel()`) and shell prefixes both work.

## Pre-PR checks

```sh
pnpm check && pnpm lint && pnpm test:unit
```
