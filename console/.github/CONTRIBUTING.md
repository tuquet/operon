# Contributing

1. Branch from `main`, keep changes focused, and respect [architecture boundaries](../docs/ARCHITECTURE.md).
2. Verify locally before opening a PR:
   ```sh
   pnpm check && pnpm lint && pnpm test:unit
   ```
3. Respect all contributors; harassment or unprofessional conduct is not tolerated.

## Commit convention

Validated by `commitlint` via Lefthook (`pnpm commit` runs interactive `czg`):

```text
<type>(<scope>): <subject>

[optional body]
[optional footer: BREAKING CHANGE: ... / close #123]
```

- **Types**: `feat` | `fix` | `perf` | `refactor` | `docs` | `style` | `test` | `build` | `ci` | `chore` | `types` | `revert`
- **Scopes**: workspace package name (`@operon/shell`, `@operon/playground`, `@operon-core/shadcn-ui`, ...) or `project`, `style`, `lint`, `ci`, `dev`, `deploy`, `other`.
- **Subject**: imperative, lowercase, no trailing period (`feat(@operon/shell): add update button`).
