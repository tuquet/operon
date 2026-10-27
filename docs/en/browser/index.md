# Stealth Chromium Runtime & Hardware Sandbox

Commercial browsers leak machine identity at every layer. Telemetry daemons, hardware hash queries, audio context fingerprinting, and shared LevelDB caches broadcast your identity to every anti-fraud engine on the web.

**Stealth Chromium Runtime** is a decoupled antidetect browser subsystem powered by the [`browser`](https://github.com/operon/browser) crate. It uses a custom-built Chromium binary based on [`adryfish/fingerprint-chromium`](https://github.com/adryfish/fingerprint-chromium) (customized on [`ungoogled-software/ungoogled-chromium`](https://github.com/ungoogled-software/ungoogled-chromium)) with native C++ patches for Blink, V8, and Skia. It injects deterministic hardware seeds directly into C++ memory, strips WebRTC leaks at the packet level, and spoofs Bézier cursor dynamics. Anti-fraud systems (Turnstile, DataDome, Kasada, CreepJS) see a genuine consumer laptop.

::: tip Standalone Microservice & CLI
`browser` operates completely decoupled from the CLI. You can compile it as a standalone Rust crate, embed it into your custom scrapers, or launch isolated profiles directly via CLI using `opn browser` (or `opn browser`).
:::

---

## 1. Core Architectural Pillars

```text
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                  STEALTH CHROMIUM RUNTIME ENGINE                        │
 │                                                                         │
 │   ┌──────────────────────────┐       ┌──────────────────────────────┐   │
 │   │ C++ Chromium LTS Engine  │       │ Deterministic PRNG Spoofing  │   │
 │   │ (adryfish/ungoogled)     │       │ (Seed: u32)                  │   │
 │   ├──────────────────────────┤       ├──────────────────────────────┤   │
 │   │ • Zero Google Telemetry  │       │ • Canvas 2D Math Jitter      │   │
 │   │ • No Background Updates  │       │ • WebGL Vendor / GPU Model   │   │
 │   │ • DevToolsActivePort SSOT│       │ • AudioContext SNR > 99.4dB  │   │
 │   │ • C++ --fingerprint seed │       │ • Modulo-derived Cores & RAM │   │
 │   └──────────────────────────┘       └──────────────────────────────┘   │
 │                 │                                   │                   │
 │                 ▼                                   ▼                   │
 │   ┌─────────────────────────────────────────────────────────────────┐   │
 │   │                   Isolated Profile Sandboxes                    │   │
 │   │               (~/.operon/browser/profiles/<id>/)                    │   │
 │   │ • Segregated Cookies, LocalStorage, IndexedDB, LevelDB          │   │
 │   │ • Dedicated Proxy Tunnel (SOCKS5 / HTTP Adapter)                │   │
 │   │ • WebRTC STUN Protection (proxy_shielded | disabled | real)     │   │
 │   │ • Zstandard (.tar.zst) Fast Archival with Cache Exclusion       │   │
 │   │ • Supabase Cloud Sync (browsers.profiles & Storage Bucket)      │   │
 │   └─────────────────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────────────────┘
```

1. **Custom C++ Antidetect Core (`adryfish/fingerprint-chromium`)**:
   - Built on open-source `ungoogled-chromium` with native C++ patches.
   - Pinned Golden LTS build: `v148.0.7778.215` (`ungoogled-chromium_148.0.7778.215-1.1`).
   - Completely removes background Google services, crashpad reporters, and safe-browsing telemetry.
2. **Deterministic C++ PRNG Seeds (`--fingerprint=<seed>`)**:
   - Every profile is bound to an immutable 32-bit unsigned integer seed (`--seed <u32>`).
   - The Chromium C++ engine uses this single seed to deterministically perturb Canvas 2D render paths, WebGL GPU parameters, AudioContext SNR, and internal PRNG calculations with 100% cross-session consistency.
3. **Full Lifecycle Profile Sandbox**:
   - Profiles live in isolated directories under `~/.operon/browser/profiles/<id>/`.
   - Never shares cache, cookies, WebSQL, or local storage between profiles.
4. **Display Geometry & HiDPI Scaling**:
   - Configurable screen resolution (`screen_width`, `screen_height`, `device_pixel_ratio`) passed via `--window-size=W,H` and `--force-device-scale-factor=DPR`.
5. **Zstandard Session Compression & Cloud Sync**:
   - High-speed Zstandard level-3 compression (`.tar.zst`) with cache filtering for instant cloud backup to Supabase `browser-profiles` bucket.

---

## 2. End-to-End CLI User Flow

Here is the complete operational lifecycle from fresh installation to automated execution and cloud synchronization:

```mermaid
flowchart TD
    A["Stage 1: Engine Provisioning\n(opn browser search / install)"] --> B["Stage 2: Profile Creation\n(opn browser profile create / inspect)"]
    B --> C["Stage 3: Stealth Execution\n(opn browser launch <profile>)"]
    C --> D{"Execution Mode"}
    D -->|"Manual Browsing"| E["Interactive GUI\n(Nuôi nick / Account warmup)"]
    D -->|"Headless Automation"| F["CDP Port 9222\n(Automa / Playwright / Runner)"]
    E --> G["Stage 4: Stealth Verification\n(opn browser verify)"]
    F --> G
    G --> H["Stage 5: Session Archival & Cloud Sync\n(opn browser profile pack / push / pull)"]
```

### Stage 1: Engine Provisioning

Discover and download official precompiled `adryfish/fingerprint-chromium` binaries:

```bash
# 1. Search remote releases catalog on Supabase Cloud / GitHub
opn browser search --remote

# 2. Download and provision Golden LTS v148 (with SHA256 checksum verification)
opn browser install 148

# 3. List locally installed runtimes
opn browser runtimes
```
*Binaries are unpacked into `~/.operon/browser/runtimes/v148.0.7778.215/`.*

### Stage 2: Profile Creation & Hardware Sandbox

Initialize isolated profiles with deterministic hardware specifications:

```bash
# 1. Create a profile with randomized deterministic hardware
opn browser profile create "Shopee-Shop-01"

# 2. Or create a profile with explicit hardware, proxy, and timezone specs
opn browser profile create "FB-Ads-US" \
  --os windows \
  --cores 16 \
  --ram 32 \
  --proxy "socks5://user:pass@proxy-us.net:1080" \
  --timezone "America/New_York" \
  --locale "en-US"

# 3. Test proxy connectivity and latency before launch
opn browser profile test-proxy "FB-Ads-US"

# 4. List all registered profiles and disk footprint
opn browser profile list

# 5. Inspect complete hardware fingerprint details
opn browser profile inspect "FB-Ads-US"
```

### Stage 3: Stealth Execution

Launch profiles in either interactive GUI mode or automated headless mode:

```bash
# Manual Browsing: Launch with GUI into target URL
opn browser launch "Shopee-Shop-01" https://shopee.vn

# Detached Launch: Release terminal immediately
opn browser launch "FB-Ads-US" https://facebook.com --detach

# Headless Automation: Launch with CDP gateway on port 9222 for Automa / Runner
opn browser launch "FB-Ads-US" --headless --cdp --port 9222 --detach

# Monitor active browser sessions (PID, Port, WebSocket URL)
opn browser ps

# Stop running sessions
opn browser stop "Shopee-Shop-01"
opn browser stop --all
```

### Stage 4: Stealth Verification

Verify anti-detect stealth quality against industry-standard fraud detection platforms:

```bash
# Automatically launches the profile and executes test suite against CreepJS / Pixelscan
opn browser verify
```

### Stage 5: Session Archival & Cloud Sync

Preserve login cookies, localStorage, and token sessions across devices:

```bash
# 1. Pack profile into a lightweight .tar.zst archive (cache stripped, <15MB)
opn browser profile pack "Shopee-Shop-01" -o ./shopee.tar.zst

# 2. Upload session snapshot to Supabase Storage ('browser-profiles' bucket)
opn browser profile push "Shopee-Shop-01"

# 3. On a remote worker or new machine, pull the profile to resume session
opn browser profile pull "Shopee-Shop-01"
```

---

## 3. Deterministic Hardware Derivation Model

When creating a profile without manual overrides, `browser` derives hardware attributes using deterministic modulo arithmetic on the 32-bit PRNG seed:

```rust
// Core derivation logic from browser/src/profile.rs
let cores = match seed % 3 {
    0 => 8,
    1 => 12,
    _ => 16,
};

let ram = match seed % 3 {
    0 => 16,
    1 => 32,
    _ => 16,
};

let slug = slugify(&name);
let id = if slug.is_empty() {
    format!("prf_{:08x}", seed)
} else {
    format!("{}-{:06x}", slug, seed & 0xFFFFFF)
};
```

### Deterministic Spoofing Vectors

| Hardware Attribute | Emulation Mechanism | Default / Derivation |
| :--- | :--- | :--- |
| **Fingerprint Seed** | Immutable 32-bit PRNG seed | Random `u32` if omitted (`--fingerprint=<seed>`) |
| **CPU Concurrency** | Injected via Blink C++ internals | `8`, `12`, or `16` cores (`--fingerprint-hardware-concurrency`) |
| **Device Memory** | `navigator.deviceMemory` override | `16GB` or `32GB` (`seed % 3`) |
| **OS Platform** | Platform headers & user-agent | `windows` (`--fingerprint-platform=windows`) |
| **Browser Brand** | Chromium engine brand string | `Chrome` (`--fingerprint-brand=Chrome`) |
| **Display Geometry** | Window dimensions & HiDPI | `--window-size=1920,1080 --force-device-scale-factor=1.00` |
| **Timezone** | V8 Internationalization API | `Asia/Ho_Chi_Minh` (`--timezone=...`) |
| **Locale & Lang** | `navigator.languages` & `Accept-Language` | `vi-VN` (`--lang=vi-VN --accept-lang=vi-VN,vi,en-US,en`) |
| **WebRTC Mode** | UDP STUN packet filtering | `proxy_shielded` (`--disable-non-proxied-udp`) |

---

## 4. Chromium Launcher & Flag Generation

The launcher (`BrowserProfile::build_cli_args` in `browser/src/profile.rs`) dynamically generates secure command-line arguments to enforce stealth and stability:

```bash
# Core Arguments Generated by Launcher
--user-data-dir=~/.operon/browser/profiles/<id>
--no-first-run
--no-default-browser-check
--fingerprint=133742
--fingerprint-platform=windows
--fingerprint-platform-version=10.0.0
--fingerprint-brand=Chrome
--fingerprint-hardware-concurrency=8
--window-size=1920,1080
--force-device-scale-factor=1.00
--timezone=Asia/Ho_Chi_Minh
--lang=vi-VN
--accept-lang=vi-VN,vi,en-US,en
--proxy-server=socks5://127.0.0.1:1080
--disable-non-proxied-udp
```

---

## 5. Storage Layout & `profile.json` Schema

All browser files strictly adhere to SSOT under `~/.operon/browser/`:

```text
~/.operon/browser/
├── browser.json              # Active engine settings and manifest channel
├── runtimes/                 # Dedicated Chromium execution binaries
│   └── v148.0.7778.215/      # Pinned LTS Antidetect Chromium (adryfish)
├── profiles/                 # Sandboxed profile data directories
│   └── Facebook-Ad-US-01/
│       ├── profile.json      # Profile hardware fingerprint manifest
│       └── Default/          # Chromium LevelDB, cookies, storage
└── extensions/               # Registered browser extensions
    └── automation/
```

### Complete `profile.json` Schema

```json
{
  "id": "fb-ads-us-849201",
  "name": "FB-Ads-US",
  "fingerprint_seed": 849201,
  "os_platform": "windows",
  "os_version": "10.0.0",
  "browser_brand": "Chrome",
  "hardware_concurrency": 8,
  "device_memory_gb": 16,
  "screen_width": 1920,
  "screen_height": 1080,
  "device_pixel_ratio": 1.0,
  "timezone": "America/New_York",
  "lang": "en-US",
  "accept_lang": "en-US,en",
  "sec_ch_ua": "\"Chromium\";v=\"148\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"148\"",
  "sec_ch_ua_platform": "\"Windows\"",
  "sec_ch_ua_mobile": false,
  "proxy": "socks5://user:pass@proxy-us.net:1080",
  "webrtc_mode": "proxy_shielded",
  "group_name": "default",
  "tags": ["facebook", "ads"],
  "extensions": ["automation"],
  "startup_flags": [],
  "cloud_id": null,
  "cloud_synced_at": null,
  "storage_path": null,
  "storage_hash": null,
  "storage_size_bytes": null,
  "cookies_count": null,
  "created_at": "1792560000"
}
```

---

## 6. Quick Command Reference

```bash
# --- Engine Runtimes ---
opn browser search --remote                  # Discover available engine releases
opn browser install 148                      # Install Golden LTS v148
opn browser runtimes                         # List installed local engines

# --- Profiles ---
opn browser profile list                     # List all local profiles
opn browser profile create "Name" --proxy URL # Create a new profile
opn browser profile inspect "Name"           # Inspect hardware fingerprint
opn browser profile test-proxy "Name"        # Test proxy connectivity
opn browser profile pack "Name"              # Compress into .tar.zst archive
opn browser profile unpack ./backup.tar.zst  # Restore profile from archive
opn browser profile push "Name"              # Upload snapshot to Supabase Cloud
opn browser profile pull "Name"              # Download snapshot from Supabase Cloud
opn browser profile delete "Name"            # Remove profile and sandbox

# --- Launching ---
opn browser launch "Name"                    # Open GUI browser
opn browser launch "Name" URL --detach       # Open URL and detach terminal
opn browser launch "Name" --headless --cdp   # Headless with CDP gateway (port 9222)
opn browser ps                               # View running instances
opn browser stop "Name"                      # Terminate instance
opn browser verify                           # Run CreepJS/Pixelscan stealth verification
```
