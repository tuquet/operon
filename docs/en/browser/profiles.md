# Isolated Browser Profiles & Lifecycle Management

Managing multi-account operations requires total data segregation. Commercial browsers share cached storage, DNS tables, and GPU contexts across tabs and windows, allowing anti-fraud trackers to correlate identities and execute portfolio-wide bans.

**Operon** provides strict filesystem, memory, and network isolation through its **Isolated Browser Profile Sandbox**, managed natively by the [`browser`](https://github.com/operon/browser) microservice.

---

## 1. Sandbox Filesystem Isolation

Every browser profile resides in its own sandboxed directory under SSOT identified by its unique ID/UUID (`~/.operon/browser/profiles/<profile_id>/`).

```text
~/.operon/browser/profiles/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/
├── profile.json              # Deterministic hardware seeds & metadata
├── Default/                  # Isolated Chromium user data
│   ├── Cookies               # SQLite session cookie jar
│   ├── Local Storage/        # LevelDB persistent web storage
│   ├── IndexedDB/            # Client-side document databases
│   └── Network/              # HTTP credentials, token caches
└── extensions/               # Dedicated profile extension sandbox
```

- **Zero Cache Cross-Pollination**: Profile cookies, `localStorage`, `IndexedDB`, and session tokens are 100% physically separated.
- **Dedicated Network Sockets**: SOCKS5 and HTTP proxy configurations bind directly to individual profile launch flags, guaranteeing that no traffic from Profile B leaks through the proxy of Profile A.

---

## 2. Deterministic PRNG Hardware Specification (`profile.json`)

When creating a profile, `browser` uses a 32-bit pseudorandom seed (`--seed <u32>`) to derive all hardware and environment attributes deterministically. Once generated, this digital signature remains immutable across reboots:

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "name": "Facebook-Ad-VN-01",
  "fingerprint_seed": 849201,
  "os_platform": "windows",
  "os_version": "10.0.0",
  "browser_brand": "Chrome",
  "hardware_concurrency": 8,
  "device_memory_gb": 16,
  "screen_width": 1920,
  "screen_height": 1080,
  "device_pixel_ratio": 1.0,
  "timezone": "Asia/Ho_Chi_Minh",
  "lang": "vi-VN",
  "accept_lang": "vi-VN,vi,en-US,en",
  "sec_ch_ua": "\"Chromium\";v=\"148\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"148\"",
  "sec_ch_ua_platform": "\"Windows\"",
  "sec_ch_ua_mobile": false,
  "webrtc_mode": "proxy_shielded",
  "proxy": "socks5://127.0.0.1:1080",
  "group_name": "default",
  "tags": ["facebook", "ads"],
  "extensions": ["automation"],
  "startup_flags": [],
  "cloud_id": null,
  "cloud_synced_at": null,
  "created_at": "2026-10-07T12:00:00.000Z"
}
```

---


### 2.1. Smart Proxy & Geo Alignment (GoLogin / AdsPower Architecture)

In commercial anti-detect browser operations, having an IP address from one region while the system clock or locale reflects a different geographical location is an immediate red flag for fraud engines (Cloudflare Turnstile, DataDome, Google, Facebook).

Operon provides automated network and geography synchronization:
- **`auto_timezone: true`**: When launching with a proxy, the worker probes the exit IP and queries local GeoIP tables to dynamically inject `--timezone=<Region/City>` into Chromium, matching the browser clock 100% to the proxy's physical location.
- **`auto_locale: true`**: Automatically synchronizes the `Intl`, `navigator.languages`, and `Accept-Language` HTTP headers with the proxy's country code.
- **`change_ip_url`**: Supports rotation webhooks for dynamic residential and mobile 4G/5G proxies. When specified, worker nodes can trigger an on-demand IP refresh prior to workflow execution.
- **`webrtc_mode: "proxy_shielded"`**: Forces `--disable-non-proxied-udp` and sets the WebRTC IP handling policy to `disable_non_proxied_udp`, completely eliminating public STUN/TURN IP leaks.

---

## 3. Command Reference

All profile operations are exposed via `opn browser profile` (or `opn browser profile`):

### Creating and Inspecting Profiles

By default, profiles are created with a **Direct Connection** (`proxy = null`). To route traffic through a residential or SOCKS5 proxy, provide `--proxy <url>` explicitly:

```bash
# 1. Create a clean profile (Direct connection by default - recommended for local testing)
opn browser profile create "Acceptance-Clean" \
  --os windows \
  --cores 8 \
  --ram 16

# 2. Create a proxy-routed profile with deterministic PRNG seed and custom location
opn browser profile create "TikTok-Agency-01" \
  --seed 94102 \
  --os windows \
  --cores 8 \
  --ram 16 \
  --proxy socks5://127.0.0.1:1080 \
  --timezone "Asia/Ho_Chi_Minh" \
  --locale "vi-VN"

# Inspect detailed hardware parameters and disk footprint
opn browser profile inspect "TikTok-Agency-01"

# List all local profiles with fingerprint summary table
opn browser profile list
```

### Pre-Flight Proxy Fail-Safe Guardrail

When a profile is configured with a `--proxy`, `opn browser launch` automatically executes an active pre-flight connectivity probe before starting Chromium:
- **Fail-Safe Abort**: If the proxy server is offline, down, or refused, launch is aborted immediately (`[PRE-FLIGHT CHECK FAILED: PROXY UNREACHABLE]`) to prevent accidental real IP leaks or dead automation sessions.
- **Bypass Flag**: To test offline pages or launch without waiting for proxy health checks, supply `--skip-proxy-check`.
- **Runtime Override**: To run a proxied profile in direct mode without editing `profile.json`, supply an empty string `--proxy ""`:

```bash
# Verify proxy health, latency, and public egress IP independently
opn browser profile test-proxy "TikTok-Agency-01" --timeout 5

# Override a profile's stored proxy with a direct connection
opn browser launch "TikTok-Agency-01" --proxy "" --cdp

# Bypass pre-flight probe guardrail
opn browser launch "TikTok-Agency-01" --skip-proxy-check
```

### Exporting & Archiving Profiles (Pack / Unpack)

Operon incorporates a high-efficiency archive engine powered by **Zstandard (zstd)** with intelligent cache filtering. When archiving a profile, it strips disposable disk bloat (`Cache`, `Code Cache`, `GPUCache`, `Service Worker/CacheStorage`), reducing 500MB+ user directories to lightweight ~15MB portable snapshots:

```bash
# Pack profile into a lightweight .tar.zst archive (Zstd level 3)
opn browser profile pack "TikTok-Agency-01" -o ./TikTok-Agency-01.tar.zst

# Restore profile from archive on another workstation or VPS
opn browser profile unpack ./TikTok-Agency-01.tar.zst
```

### Deleting Profiles

```bash
# Permanently delete profile and purge all sandboxed data
opn browser profile delete "TikTok-Agency-01" --force
```

---

## 4. Distributed Cloud Profile Synchronization (Supabase Cloud)

In multi-node teams, profiles are stored centrally in Supabase Cloud (`browsers.profiles` table and `browser-profiles` storage bucket) and synchronized across workstations with distributed lease locks:

```bash
# Upload session snapshot (cookies, localStorage) to Supabase Storage
opn browser profile push "TikTok-Agency-01"

# Download profile and session snapshot on a remote worker or workstation
opn browser profile pull "TikTok-Agency-01"

# List central cloud browser profiles available to your organization
opn browser profile cloud list

# Acquire exclusive lease lock (prevents team members from opening simultaneously)
opn browser profile cloud acquire "TikTok-Agency-01"

# Launch session, execute automation, or perform manual work
opn browser launch "TikTok-Agency-01"

# Release distributed lease lock and synchronize cookie delta back to cloud
opn browser profile cloud release "TikTok-Agency-01"
```
