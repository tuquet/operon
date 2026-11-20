# AGENTS.md

## Rules

- Respect [architecture boundaries](docs/ARCHITECTURE.md): micro-apps consume host capabilities only via `useKernel()` and shared packages; never import `apps/shell` or sibling micro-apps.
- External dependencies in workspace `package.json` files must use `"catalog:"` (versions live in `pnpm-workspace.yaml`).
- Scaffold new micro-apps with `pnpm gen:app <name>`.
- Follow Conventional Commits in [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md).
- Verify before pushing: `pnpm check && pnpm lint && pnpm test:unit`.
