# Roadmap: 000 — CI/CD & DevOps

**Level:** 1 (Foundation)

## Scope
- **GitHub Repository:** Branch protection, conventional commits, CODEOWNERS, PR checks.
- **GitHub Actions (CI/CD):** Automated lint, typecheck, unit tests, and build/deploy pipelines.
- **Cloudflare:** Pages/Workers deployment and DNS/edge routing.
- **Environment & Secrets:** Non-sensitive config in GitHub Variables (`vars.*`); sensitive tokens/keys in GitHub Secrets (`secrets.*`).

## Milestones
1. Repository governance & branch rules configured.
2. CI pipeline running on PRs (`check`, `lint`, `test`).
3. CD pipeline deploying to Cloudflare using GitHub Variables & Secrets.
