# Contributing to Operon

## Setup

```bash
git clone --recurse-submodules https://github.com/<your-username>/operon.git
cd operon
cp .env.example .env
pnpm --dir console install
cargo check --manifest-path core/Cargo.toml --workspace
```

Requires **Git**, **Rust** (edition 2024), **Node 20+**, **pnpm 9+**, and optionally **Docker**.

## Commits & PRs

- Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- Use canonical domain terms from [docs/GLOSSARY.md](docs/GLOSSARY.md).
- Verify locally before opening a PR against `main`:
  ```bash
  cargo fmt --manifest-path core/Cargo.toml --all -- --check
  cargo clippy --manifest-path core/Cargo.toml --workspace --all-targets -- -D warnings
  cargo test --manifest-path core/Cargo.toml --workspace --lib --bins --tests
  pnpm --dir console check:type
  ```

## Links

- **Discussions:** [tuquet/operon/discussions](https://github.com/tuquet/operon/discussions)
- **Security:** [core/SECURITY.md](core/SECURITY.md)
