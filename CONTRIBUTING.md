# Contributing to Operon

Thank you for your interest in contributing to **Operon**! We welcome bug reports, documentation improvements, feature suggestions, and code contributions.

---

## 🛠️ Development Prerequisites

Before setting up the repository locally, ensure you have the following installed:
- **Rust & Cargo**: Latest stable toolchain (`rustup update`, edition 2024 recommended).
- **Node.js**: v20 or higher.
- **pnpm**: v9 or higher (`npm install -g pnpm`).
- **Docker & Docker Compose**: Recommended for running the control plane and containerized worker nodes.

---

## 🚀 Setting Up the Local Workspace

1. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/operon.git
   cd operon
   ```

2. **Setup environment configurations**:
   ```bash
   cp .env.example .env
   ```

3. **Install frontend dependencies**:
   ```bash
   cd console
   pnpm install
   cd ..
   ```

4. **Verify Rust build**:
   ```bash
   cargo check --workspace
   ```

5. **Run the Core Stack (Optional)**:
   ```bash
   docker compose up -d
   ```

---

## 📝 Commit Conventions

We strictly follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` Introduce a new feature (e.g. `feat(worker): add dynamic heartbeat scaling`).
- `fix:` Fix a bug or regression (e.g. `fix(browser): correct profile locking mechanism`).
- `docs:` Documentation improvements (e.g. `docs: update CLI quickstart`).
- `chore:` Maintenance tasks, dependency bumps, or config adjustments.
- `refactor:` Code refactoring without behavior change.
- `test:` Adding or updating unit/integration tests.

---

## 🔀 Pull Request Guidelines

1. Create a descriptive feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Verify all tests and type checks pass locally before opening a PR:
   ```bash
   cargo test --workspace
   cd console && pnpm --filter @operon/workstation typecheck && cd ..
   ```
3. Open a Pull Request against `main` on GitHub with a clear description of the problem solved and testing steps.
4. Maintain documentation integrity: Ensure new flags or public functions are adequately documented.

---

## 💬 Community & Questions

- For general discussions and architecture questions, use [GitHub Discussions](https://github.com/operon/operon/discussions).
- For security vulnerabilities, follow our [Security Policy](SECURITY.md).
