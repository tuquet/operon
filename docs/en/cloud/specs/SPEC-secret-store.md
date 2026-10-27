# SPEC-secret-store: Encrypted Secret Store & Device-Portable Credentials

> **Status:** Implemented (v2) · **Schema:** `secrets` · **Surfaces:** `opn secret` (CLI) · `\{\{secrets.*\}\}` (engine) · `cloud/supabase/plugins/secrets`
> **Related:** [`architecture`](../architecture.md), [`terminology`](../terminology.md), [CLI commands](/en/cli/commands/)

---

## 1. Objective

A **tenant-scoped, encrypted-at-rest secret store** so that:

1. Workflow credentials never appear in plaintext in a workflow graph, a job payload, a log line, or git.
2. An **enrolled workstation obtains credentials without a human re-typing them** — a new device runs jobs right after `opn auth login` + `opn secret pull`.
3. The **server never receives a plaintext secret value** (zero-knowledge over the wire), and the DEK is **sealed to each device's public key**.
4. The design is native to Operon(multi-tenant + RLS + device enrollment + `~/.operon` SSOT).

Non-goals: hardware-backed keys, per-secret version history, audit UI.

---

## 2. Threat model & principles

| Principle | Rationale |
| :--- | :--- |
| **Reference, never inline** | Workflows hold `\{\{secrets.<name>\}\}`; values live only in the store. |
| **Envelope encryption** | Vault **KEK** wraps a per-tenant **DEK**; the DEK encrypts values. |
| **Device sealing** | The DEK is sealed to each device's **X25519 public key** (`crypto_box_seal`); the private key never leaves the device. |
| **Client-side encryption** | Values are **XChaCha20-Poly1305** encrypted in the CLI — the server stores ciphertext only. |
| **Deny by default** | `secrets.*` tables have RLS with no anon/authenticated policies; reachable only via `SECURITY DEFINER` RPCs. |
| **Device-authenticated** | A device proves identity via `workers.devices.device_token_hash` (SHA-256) before any key/value is returned. |
| **Never log secrets** | Values are registered with `SecretMasker` → `***MASKED***`. |

---

## 3. Architecture

```text
KEK   (Supabase Vault `tq_secrets_kek`)                     # server-only
  └─ wraps ─▶ DEK  (per tenant; secrets.tenant_keys, pgcrypto)
                 ├─ seals to ─▶ device A public key  (pgsodium.crypto_box_seal) ─▶ secrets.devices.wrapped_dek
                 └─ seals to ─▶ device B public key
                 └─ encrypts (client-side) ─▶ secrets.credentials.ciphertext (XChaCha20-Poly1305)

Device (CLI, Rust)                                   Server (Postgres)
  X25519 keypair  ── public key ───────────────▶  secret_register_device ─▶ sealed DEK
  unseal(sealed DEK, private key)   ◀──────────────────────────────────────┘
  encrypt(value, DEK) ── ciphertext+nonce ─────▶  secret_put        (server sees ciphertext only)
                  ◀── ciphertext+nonce ────────  secret_fetch
  local cache: ~/.operon/system/secrets.json (AES-256-GCM, per-device key)
```

**Cross-language crypto contract** (verified Rust ↔ Postgres, both directions):

| Primitive | Postgres (Supabase) | Rust (worker/CLI) |
| :--- | :--- | :--- |
| Sealed box | `pgsodium.crypto_box_seal` | `crypto_box::SalsaBox` + `blake2` |
| Nonce for seal | `BLAKE2b-192(epk ‖ recipient_pk)` | same |
| Seal layout | `epk(32) ‖ ciphertext ‖ tag(16)` | same |
| Value AEAD | *(not used server-side)* | `chacha20poly1305::XChaCha20Poly1305` |

> ⚠️ Only `pgsodium.crypto_box_seal` / `crypto_box_seal_open` are `EXECUTE`-granted to the `postgres` role on Supabase; the AEAD/secretbox functions are **not**. Hence values are encrypted **client-side** and the server never needs a symmetric primitive.

---

## 4. Cloud schema (plugin `secrets` v2)

`cloud/supabase/plugins/secrets/{install.sql,plugin.json}` · deps: `workers`, `core-iam` · also registered in `supabase/seed.sql` → `public.system_plugins`.

### 4.1 `secrets.credentials`
`id, tenant_id, name, ciphertext (bytea), nonce (bytea, 24B), key_version, created_by, created_at, updated_at` · `UNIQUE (tenant_id, name)`.

### 4.2 `secrets.tenant_keys`
`tenant_id (PK), dek_enc (bytea, KEK-wrapped via pgcrypto), key_version, rotated_at, created_at`.

### 4.3 `secrets.devices`
`device_id (PK, FK workers.devices), tenant_id, public_key (bytea, 32B X25519), wrapped_dek (bytea, sealed), key_version, created_at, rotated_at`.

### 4.4 RPCs (device-authenticated; base64 bytea, newline-free)

| RPC | Args | Returns |
| :--- | :--- | :--- |
| `public.secret_register_device` | `p_device_id, p_device_token, p_public_key(b64)` | sealed DEK (b64) |
| `public.secret_deliver_dek` | `p_device_id, p_device_token` | sealed DEK (b64) |
| `public.secret_put` | `…, p_name, p_ciphertext(b64), p_nonce(b64)` | void |
| `public.secret_fetch` | `p_device_id, p_device_token` | `(name, ciphertext b64, nonce b64, key_version)` |
| `public.secret_list` | `p_device_id, p_device_token` | `(name, updated_at, key_version)` |
| `public.secret_rotate` | `p_device_id, p_device_token` | int (re-encrypted count) |

`secrets._verify_device(id, token)` raises `Invalid or unknown device credentials` on SHA-256 mismatch.

### 4.5 RLS
Both tables `ENABLE ROW LEVEL SECURITY`; **no** anon/authenticated policies; `REVOKE ALL`. Access only through the RPCs.

### 4.6 Permissions (registered by the plugin into `public.permissions`)

| Permission code | Module | Grants |
| :--- | :--- | :--- |
| `secrets:credentials:read` | `secrets` | View credential names/metadata (never values) |
| `secrets:credentials:manage` | `secrets` | Create / update / delete credentials and push–pull with Cloud |
| `secrets:store:rotate` | `secrets` | Rotate the tenant DEK and re-seal it for every registered device |

Granted to system roles: `owner`/`admin` → all three; `member` → `secrets:credentials:read` only.

---

## 5. Device flow (portability)

```text
New workstation
  1. opn auth login                 # operator auth -> enrolls device (device_token)
  2. opn secret init                # generates local X25519 keypair (~/.operon/system/.device_key)
  3. opn secret pull                # registers public key -> unseals DEK -> decrypts values
  4. opn automation run …           # engine resolves \{\{secrets.*\}\} from the local store
```

Verified E2E: device A pushed 2 secrets; device B (separate keypair, no re-entry) pulled and ran the job.

---

## 6. CLI reference — `opn secret`

| Command | Description |
| :--- | :--- |
| `opn secret init` | Create the local store key + device X25519 keypair. |
| `opn secret set <name> <value>` | Store a secret locally (AES-256-GCM). |
| `opn secret list [--format json]` | List names (values never printed). |
| `opn secret rm <name>` | Remove a secret. |
| `opn secret remote` | List Cloud secrets (names + key_version). |
| `opn secret push` | Register device key, then upload **client-side encrypted** values. |
| `opn secret pull` | Register/receive the sealed DEK, fetch ciphertext, decrypt locally. |
| `opn secret rotate` | Rotate the tenant DEK (server re-encrypts values, re-seals for all devices). |
| `opn secret path` | Print the local store path. |

---

## 7. Engine integration

- `ExecutionState.secrets: HashMap<String, Value>` — seeded at job start from the local store.
- `resolve_expression` supports `secrets.<name>` (alongside `variables.*`, `loopData.*`, `prevBlockData.*`, `globalData.*`).
- Seeded in both paths: `worker/src/drivers/automation.rs` (`execute_native_cdp`) **and** `cli/src/core/engine/job_coordinator.rs` (`run_native_job`).
- `SecretMasker::add_custom_secret` scrubs values from logs.

---

## 7b. Workstation UI — credential management

The workstation console (`apps/workstation`, Vue + Tauri, launched via `opn desktop`) exposes a
credential management page so operators never need the CLI. It talks to the **local CLI daemon**
(`127.0.0.1:8765`) because the local keypair and encrypted store live on the workstation.

### Daemon API (`/api/v1/secrets*`)

Paths mirror the **schema / table names** (`secrets`, `secrets.credentials`, `secrets.tenant_keys`):

| Endpoint | Method | Table | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/secrets` | GET | schema `secrets` | Store status (`store_path`, `device_public_key`, `enrolled`, counts) |
| `/api/v1/secrets/credentials` | GET | `secrets.credentials` | List local + cloud credential names |
| `/api/v1/secrets/credentials` | POST | `secrets.credentials` | `{name, value}` → store a credential locally (encrypted) |
| `/api/v1/secrets/credentials/{name}` | DELETE | `secrets.credentials` | Remove a local credential |
| `/api/v1/secrets/credentials/push` | POST | `secrets.credentials` | Register device key + upload client-side-encrypted values |
| `/api/v1/secrets/credentials/pull` | POST | `secrets.credentials` | Receive sealed DEK, fetch ciphertext, decrypt locally |
| `/api/v1/secrets/tenant-keys/rotate` | POST | `secrets.tenant_keys` | Rotate the tenant DEK |

**Invariant:** the API never returns a plaintext value — only names and metadata (zero-knowledge).

### Console page

- Route module: `router/routes/modules/secrets.ts`; `name: 'SecretsCredentials'`, `path: '/secrets/credentials'`, `plugin: 'secrets'`,
  `authority: ['superadmin', 'secrets:credentials:read']`.
- View: `src/views/secrets/credentials/index.vue` · client: `src/api/core/secrets.ts`.
- Labels come from the term SSOT (`packages/locales/…/term.json`: `secretStore`, `credential`) and
  `page.system.secrets*`; never invent bespoke wording (see `terminology.md` §3.7).

## 8. Local storage

- `~/.operon/system/secrets.json` — AES-256-GCM envelope `{version,alg,nonce,ciphertext}`; key from `TQ_SECRET_KEY` or `~/.operon/system/.secret_key` (0600).
- `~/.operon/system/.device_key` — X25519 secret (0600); `~/.operon/system/.device_pub`.
- `~/.operon/system/.identity.json` — **encrypted at rest** (AES-256-GCM, key `~/.operon/system/.identity_key`, 0600); legacy plaintext is still readable.

---

## 9. Rotation & revocation

- **Rotate DEK**: `opn secret rotate` (or the UI **Rotate DEK** button) → `public.secret_rotate` generates a new DEK, re-encrypts all credentials, re-seals for every registered device (`key_version++`).
- **Revoke device**: delete/disable the `workers.devices` row → `_verify_device` fails → no DEK, no values. Other devices unaffected.
- **Rotate a credential**: `opn secret set <name> <new>` + `opn secret push`.

---

## 10. Security properties & remaining hardening

**Guaranteed:** no plaintext credential in workflow graph / payload / logs / git · cloud values are ciphertext · server never receives plaintext values · DEK transmitted only as a sealed box · wrong-token access refused · local store, device key and identity file encrypted at rest.

**Remaining (v3):** move the local keys into the OS keyring / TPM; optional per-environment key versions; audit trail of secret access.

---

## 11. Verification

```bash
opn secret init && opn secret set hrms_password '***'
grep -c '<plaintext>' ~/.operon/system/secrets.json      # 0
opn secret push && opn secret remote
# on another machine (same tenant): opn auth login && opn secret pull
opn automation run <file>.workflow.json --headless --browser-id <id>   # resolves \{\{secrets.*\}\}
```
