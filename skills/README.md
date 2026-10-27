# Skills

A curated collection of [Agent Skills](https://agentskills.io/home) reflecting Operon's engineering standards, quality benchmarks, and best practices for AI coding agents.

> [!IMPORTANT]
> Built on top of an open-source architecture for keeping agent skills synchronized with upstream sources, Skills provides enterprise-grade runbooks and autonomous workflows across Google Antigravity, Claude Code, Cursor, and Codex.

## Installation

### Install via Skills CLI (Recommended)

To install all skills from this repository into your project, use the [skills](https://github.com/vercel-labs/skills) CLI:

```bash
npx skills add operon/skills --skill='*'
```

Or install all of them globally for all projects on your workstation:

```bash
npx skills add operon/skills --skill='*' -g
```

Or install only agent

```bash
npx skills add operon/skills --agent antigravity --skill='*' -y
```

To install an individual skill:

```bash
npx skills add operon/skills --skill=vue
npx skills add operon/skills --skill=vitest
```

---

## Skills Catalog

This repository organizes skills by scope, mindset, and ecosystem.

### Hand-maintained & Preference Skills

> Opinionated

Manually maintained engineering standards, setup conventions, and workflows.

| Skill | Description | Author |
|-------|-------------|--------|
| [antfu](skills/antfu) | Anthony Fu's preferences and best practices for app/library projects (eslint, pnpm, vitest, vue, etc.) | @operon/skills |
| [antfu-create-pr](skills/antfu-create-pr) | Open reviewable PRs with Conventional Commits title, evidence-based body, before/after screenshots | @operon/skills |
| [google-cli-command](skills/google-cli-command) | Google Cloud CLI grammar, noun-verb ergonomics, POSIX/GNU flag standards | @operon/skills |
| [google-console-output](skills/google-console-output) | Google terminal output standard, Rule of Silence, clean stdout/stderr, pipeable flags | @operon/skills |
| [google-developer-docs](skills/google-developer-docs) | Google Developer Documentation Style Guide, active voice, task-based technical documentation | @operon/skills |

### Production Engineering & Reliability

Curated from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills). Production-grade engineering runbooks and verification patterns.

| Skill | Description | Author |
|-------|-------------|--------|
| [addy-code-review-and-quality](skills/addy-code-review-and-quality) | Conducts multi-axis code review before merging changes | Addy Osmani |
| [addy-spec-driven-development](skills/addy-spec-driven-development) | Write structured specifications and boundary contracts before writing code | Addy Osmani |
| [addy-planning-and-task-breakdown](skills/addy-planning-and-task-breakdown) | Break complex engineering requirements into ordered, verifiable atomic tasks | Addy Osmani |
| [addy-incremental-implementation](skills/addy-incremental-implementation) | Implement features one vertical slice at a time with test-backed commits | Addy Osmani |
| [addy-test-driven-development](skills/addy-test-driven-development) | Drive feature development and bug fixes using the red-green-refactor loop | Addy Osmani |
| [addy-constraint-driven-development](skills/addy-constraint-driven-development) | Define and enforce project-wide quality bars, security, and architectural boundaries | Addy Osmani |
| [addy-browser-testing-with-devtools](skills/addy-browser-testing-with-devtools) | Test in real browsers via Chrome DevTools protocol to inspect DOM, network, and console | Addy Osmani |
| [addy-performance-optimization](skills/addy-performance-optimization) | Optimize application performance across frontend, backend, queries, and rendering lifecycles | Addy Osmani |
| [addy-code-simplification](skills/addy-code-simplification) | Simplify code structure and remove redundancy without changing runtime behavior | Addy Osmani |
| [addy-shipping-and-launch](skills/addy-shipping-and-launch) | Automated readiness verification, checklist enforcement, and production release | Addy Osmani |
| [addy-security-and-hardening](skills/addy-security-and-hardening) | Harden code against vulnerabilities (OWASP Top 10, sanitization, zero-trust) | Addy Osmani |
| [addy-frontend-ui-engineering](skills/addy-frontend-ui-engineering) | Build accessible, responsive, production-quality user interfaces meeting WCAG standards | Addy Osmani |
| [addy-debugging-and-error-recovery](skills/addy-debugging-and-error-recovery) | Systematic root-cause debugging for unexpected runtime errors and build failures | Addy Osmani |
| [addy-api-and-interface-design](skills/addy-api-and-interface-design) | Design stable, future-proof APIs, module boundaries, and type contracts | Addy Osmani |
| [addy-context-engineering](skills/addy-context-engineering) | Optimize agent context setup, prompt engineering, and rule configurations | Addy Osmani |

### Desktop App Engineering (Tauri Ecosystem)

Curated from [full-stack-skills/tauri-skills](https://github.com/full-stack-skills/tauri-skills). Comprehensive production runbooks for Tauri v2 cross-platform apps.

| Skill | Description | Author |
|-------|-------------|--------|
| [tauri](skills/tauri) | Core Tauri architecture, commands, events, window management, and configuration | Full Stack Skills |
| [tauri-setup](skills/tauri-setup) | Environment setup, Rust/Node toolchain verification, and prerequisites checklist | Full Stack Skills |
| [tauri-scaffold](skills/tauri-scaffold) | Project initialization, frontend framework selection, and app templates | Full Stack Skills |
| [tauri-security](skills/tauri-security) | CSP configuration, IPC allowlists, capabilities, and permission scopes | Full Stack Skills |
| [tauri-build](skills/tauri-build) | Multi-platform production builds, code signing, and binary packaging | Full Stack Skills |
| [tauri-ipc](skills/tauri-ipc) | Type-safe IPC bridge patterns between Rust backend and frontend | Full Stack Skills |
| [tauri-app-updater](skills/tauri-app-updater) | Over-the-air auto-updater integration and signature verification | Full Stack Skills |
| [tauri-app-system-tray](skills/tauri-app-system-tray) | Native system tray menus, tray icons, and event handling | Full Stack Skills |
| [tauri-app-single-instance](skills/tauri-app-single-instance) | Single-instance lock and command-line payload routing | Full Stack Skills |
| [tauri-app-deep-linking](skills/tauri-app-deep-linking) | Custom URL protocol schemes and deep linking handler | Full Stack Skills |

### Backend & Database Engineering (Supabase Ecosystem)

Curated from [supabase/agent-skills](https://github.com/supabase/agent-skills). Official agent skills for Supabase services and Postgres database optimization.

| Skill | Description | Author |
|-------|-------------|--------|
| [supabase](skills/supabase) | Comprehensive Supabase development: Auth, RLS, Storage, Realtime, Edge Functions, MCP Server, CLI migrations | Supabase |
| [supabase-postgres-best-practices](skills/supabase-postgres-best-practices) | Postgres performance and schema design rules across 8 priority categories (queries, indexes, connections, RLS) | Supabase |

### Skills Generated from Official Documentation

> Unopinionated but focused on modern TypeScript, ESM, and Vue Composition API

Generated from official documentation and kept in sync with upstream changes.

| Skill | Description | Source |
|-------|-------------|--------|
| [vue](skills/vue) | Vue.js core - reactivity, components, composition API | [vuejs/docs](https://github.com/vuejs/docs) |
| [nuxt](skills/nuxt) | Nuxt framework - file-based routing, server routes, modules | [nuxt/nuxt](https://github.com/nuxt/nuxt) |
| [pinia](skills/pinia) | Pinia - intuitive, type-safe state management for Vue | [vuejs/pinia](https://github.com/vuejs/pinia) |
| [vite](skills/vite) | Vite build tool - config, plugins, SSR, library mode | [vitejs/vite](https://github.com/vitejs/vite) |
| [vitepress](skills/vitepress) | VitePress - static site generator powered by Vite | [vuejs/vitepress](https://github.com/vuejs/vitepress) |
| [vitest](skills/vitest) | Vitest - unit testing framework powered by Vite | [vitest-dev/vitest](https://github.com/vitest-dev/vitest) |
| [unocss](skills/unocss) | UnoCSS - atomic CSS engine, presets, transformers | [unocss/unocss](https://github.com/unocss/unocss) |
| [pnpm](skills/pnpm) | pnpm - fast, disk space efficient package manager | [pnpm/pnpm.io](https://github.com/pnpm/pnpm.io) |
| [nitro](skills/nitro) | Nitro - server engine powering Nuxt | [nitrojs/nitro](https://github.com/nitrojs/nitro) |

---

## Development & Maintenance

This repository utilizes Git Submodules in `sources/` to track upstream repositories directly:

```bash
# 1. Install dependencies
pnpm install

# 2. Interactive CLI for submodule management
pnpm start

# 3. Synchronize all submodules & skills non-interactively
pnpm start sync
```

---

## License

Skills and curation scripts in this repository are licensed under the [MIT](LICENSE.md) License.
