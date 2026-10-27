# Cloud Control Plane

The **Operon Cloud** architecture provides multi-tenant database isolation, real-time job dispatching, proxy management, and fleet coordination built on top of Supabase and PostgreSQL 15+.

---

## 🏛️ Architecture Overview

The Cloud Control Plane orchestrates distributed compute workers and anti-detect browser operations through specialized database schemas:

| Schema | Domain | Responsibilities |
|---|---|---|
| **`core`** | Platform & Tenancy | Multi-tenant organization boundaries (`tenants`), role-based access (`memberships`), and operator accounts. |
| **`browsers`** | Profile Inventory | Isolated browser profiles (`profiles`), storage keys, deterministic fingerprint seeds, and proxy binding. |
| **`workers`** | Fleet Management | Compute worker registration (`workers`), heartbeats, proxies pool (`proxies`), and task dispatching. |
| **`automation`** | Workflows & Jobs | Stored automation workflows (`workflows`), execution runs (`runs`), and task logs. |
| **`secrets`** | Credential Vault | Tenant-scoped encrypted credentials (`credentials`), per-tenant DEKs wrapped by a Vault KEK (`tenant_keys`). |

---

## 🌐 Smart Proxy Architecture & IP Rotation

Modern web automation requires tight alignment between browser hardware parameters (timezone, language) and the proxy egress IP. Mismatches (e.g. proxy IP in Frankfurt but browser timezone in Tokyo) immediately trigger bot detection.

Operon Cloud models proxies and browser profiles with automated alignment flags:

### Profile Schema Alignment (`browsers.profiles`)

```sql
-- Profile proxy configuration
ALTER TABLE browsers.profiles
  ADD COLUMN auto_timezone boolean DEFAULT true,
  ADD COLUMN auto_locale boolean DEFAULT true,
  ADD COLUMN change_ip_url text;
```

- **`auto_timezone`**: When enabled, the browser engine probes the proxy's IP geolocation on startup and overrides the browser `Intl.DateTimeFormat` and JavaScript timezone to match the egress point.
- **`auto_locale`**: Automatically overrides `navigator.language` and `Accept-Language` headers to match the proxy's country code.
- **`change_ip_url`**: Rotation webhook URL for dynamic residential/mobile proxies. Invoked via `opn browser profile test-proxy` or before running an automation workflow to acquire a fresh clean IP.

### Proxy Fleet Schema (`workers.proxies`)

The centralized proxy pool supports health status, rotation endpoints, and multi-tenant tagging:

| Column | Type | Description |
|---|---|---|
| `proxy_url` | `text` | Connection string (`http://user:pass@host:port` or `socks5://...`) |
| `auto_timezone` | `boolean` | Inherited default for profiles binding this proxy |
| `auto_locale` | `boolean` | Inherited default for profiles binding this proxy |
| `change_ip_url` | `text` | API webhook to trigger external IP rotation |
| `status` | `text` | Proxy health state (`active`, `degraded`, `banned`, `testing`) |
| `tenant_id` | `uuid` | Strict organization tenant isolation |

---

## 🔒 Multi-Tenant Storage Isolation

All binary storage assets (profile tarball packs, workflow recordings, screenshot artifacts) are isolated using UUID-scoped storage paths:

```
s3://operon-profiles/tenants/<tenant_id>/profiles/<profile_id>.tar.gz
```

Database Row-Level Security (RLS) policies enforce that workers and CLI operators cannot acquire or inspect profiles outside their active authenticated `tenant_id`.

---

## 🛠️ CLI Cloud Management

Cloud operations are managed directly from the CLI via `opn auth`:

```bash
# Check authenticated identity & active tenant
opn auth whoami

# List accessible organization workspaces
opn auth tenant list

# Switch active tenant context
opn auth tenant switch <tenant-uuid>
```
