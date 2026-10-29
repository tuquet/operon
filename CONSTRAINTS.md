# Quality and Architectural Constraints Contract

This document codifies the non-negotiable architectural boundaries, system invariants, and quality gates for the `operon` ecosystem. All contributors, automated tools, and AI agents must strictly uphold these contracts without weakening assertions or introducing shims.

---

## 1. Process Lifecycle & State Ownership

### Invariant P1: Single-Instance Engine Arbitration
- **Principle:** Exactly one automation runtime engine may bind to the local loopback management interface (`127.0.0.1:8765`) and manipulate browser hardware drivers at any given moment.
- **Enforcement:**
  - Any auxiliary surface (Workstation Desktop GUI / CLI client) must perform pre-flight health discovery prior to binding.
  - If an active daemon responds, the secondary surface must forfeit spawning an internal engine and seamlessly attach in **Client View Mode**.
  - Embedded engine instances must be explicitly flagged to prevent background state collisions.

### Invariant P2: Asymmetric Lifecycle Isolation
- **Principle:** Presentation surfaces (UI/Tauri) are decoupled consumer views; their termination, reload, or crash must never interrupt background execution workloads.
- **Enforcement:**
  - Standalone daemon processes manage their own lifecycle and continuous job queues independently of client connections.
  - Client exit hooks must only clean up client-owned resources without propagating SIGTERM or kill signals to detached worker engines.

### Invariant P3: Supervisor PID Integrity
- **Principle:** Process ID ownership files in `~/.operon/` are exclusive leases reserved for standalone supervisors.
- **Enforcement:**
  - Process termination signals must cross-verify executable identities against OS kernel tables before execution to prevent accidental termination of unrelated processes.

---

## 2. Single Source of Truth (SSOT) & Fail-Fast Doctrine

### Invariant S1: Strict SSOT Storage Hierarchy
- **Principle:** All system identities, daemon runtimes, browser profiles, databases, and logs must resolve exclusively to `~/.operon/<pillar>/` (or `$DATA_DIR/<pillar>/`).
- **Enforcement:**
  - Storing state in flat root paths (`~/.operon/workflows`), legacy directories (`~/.tq`, `~/.specter`, `~/.automa`), or scattered temp files is strictly prohibited.

### Invariant S2: Zero-Shim & No-Fallback Invariant
- **Principle:** No backward-compatibility shims, union types, or fallback chains may be used to mask schema drift or missing configurations.
- **Enforcement:**
  - If a mandatory configuration or environment variable is missing, the system must fail fast with actionable diagnostics rather than silently defaulting to dangerous assumptions.
  - Canonical terminology must be applied uniformly across all interfaces; legacy aliases must be ripped and replaced at the source.

---

## 3. Distributed Mesh & Concurrency Arbitration

### Invariant M1: Lease-Bounded Autonomous Job Claiming
- **Principle:** Task distribution across distributed worker nodes operates via non-blocking, lease-bounded database transactions.
- **Enforcement:**
  - Workers acquire jobs atomically using row-level locking (`FOR UPDATE SKIP LOCKED`).
  - Every running job holds a strictly bounded lease (`lease_expires_at`). If a node disconnects, crashes, or stalls, the orchestrator automatically reaps and releases the job back to the fleet without orphan states or double-execution.

### Invariant M2: Deterministic Antidetect Sandbox Isolation
- **Principle:** Browser profiles running automation must guarantee zero mutual interference and zero hardware fingerprint leaks.
- **Enforcement:**
  - PRNG fingerprint seeds, screen geometries, client hints, and proxy forwarders are deterministically derived and isolated per profile directory.
  - Multiple concurrent browser profiles must run with dedicated debugging ports and isolated user-data directories.

---

## 4. Cloud Control Plane & Storage Governance (Supabase / Postgres)

### Invariant D1: Public RPC Encapsulation (Private Schema Perimeter)
- **Principle:** External clients, edge workers, and client-facing frontends must never directly query or mutate internal domain schemas (`automation`, `secrets`, `workers`, `billing`, `media`).
- **Enforcement:**
  - All public mutations and workflow dispatches must route through dedicated `public.<domain>_*` RPC wrappers.
  - RPC wrappers must execute under `SECURITY INVOKER` semantics to enforce Row-Level Security (RLS) rules against the caller's JWT identity.

### Invariant D2: Dual-Plane Connection Multiplexing
- **Principle:** High-frequency edge worker nodes must not exhaust relational database connection limits.
- **Enforcement:**
  - Distributed fleet workers must connect exclusively via the Transaction Pooler (Port 6543 / Supavisor).
  - Direct Session access (Port 5432) is restricted exclusively to DDL schema migrations, database seeding, and administrative operators.

### Invariant D3: Immutable Migration Discipline
- **Principle:** Database schemas are immutable code artifacts. Manual schema alterations via visual dashboards are prohibited.
- **Enforcement:**
  - 100% of schema definitions, RLS policies, and triggers must be committed as reproducible SQL migrations under `cloud/supabase/migrations/` or `cloud/supabase/plugins/`.
  - All database changes must pass the automated test suites (`cloud/scripts/test_db.sh` or `cloud/scripts/test_db.ps1`) prior to Staging/Production promotion.

---

## 5. Zero-Trust Security Perimeter & Credential Isolation

### Invariant Z1: Zero-Knowledge Secret Governance
- **Principle:** Sensitive credentials (account passwords, proxy credentials, OTP keys) must never reside in plaintext on disk, in git commits, or in raw database columns.
- **Enforcement:**
  - Cloud-stored secrets are encrypted using Supabase Vault Key-Encryption-Keys (KEK) and per-tenant Data-Encryption-Keys (DEK).
  - Workstation secrets are decrypted only within device-enrolled memory spaces holding valid asymmetric keys (`.device_key`).

### Invariant Z2: Unified Mutual Identity & Session Revocation
- **Principle:** Device identity and operator access tokens must maintain synchronized authentication state across all operational surfaces.
- **Enforcement:**
  - Workstation GUI and CLI share the verified identity state (`~/.operon/system/.identity.json`).
  - Revocation of a session on any surface immediately invalidates authentication tokens across all local tools.

---

## 6. Resource Protection & Quality Verification Gates

### Invariant Q1: Environment Resource Boundaries
- **Principle:** Development and staging host environments (VPS / local nodes) must prioritize stability and remain responsive.
- **Enforcement:**
  - **Never run `cargo build --release` on resource-constrained host machines (VPS).** Heavy release compilation is reserved exclusively for GitHub Actions CI/CD runners.
  - Local verification relies on incremental compilation (`cargo check --workspace`). Build artifacts must be pruned to maintain disk usage safely $\le 85\%$.

### Invariant Q2: Zero-Bypass Pre-Push Gates
- **Principle:** Code merged into the primary branch (`main`) must be verified by automated quality gates.
- **Enforcement:**
  - **Rust Toolchain:** Must pass `cargo fmt --all --check`, `cargo check --workspace --all-targets`, and `cargo clippy --workspace --all-targets -- -D warnings`.
  - **Console Frontend:** Must satisfy `pnpm check:type` (0 errors) and dependency catalog constraints (`"catalog:"`).
  - **Security Gate:** Must pass automated Gitleaks secret verification with zero detected credential leaks.
