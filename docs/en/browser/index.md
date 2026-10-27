# Stealth Chromium runtime and hardware sandbox

Commercial browsers expose machine identifiers through telemetry daemons, hardware queries, audio context profiling, and shared cache stores.

The Stealth Chromium Runtime is a browser subsystem powered by the `browser` crate. It runs a custom Chromium binary based on `adryfish/fingerprint-chromium` (derived from `ungoogled-chromium`) with native patches in Blink, V8, and Skia. The engine injects deterministic hardware seeds into memory, eliminates WebRTC IP leaks, and generates realistic cursor trajectories.

---

## 1. Architectural overview

```text
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                  STEALTH CHROMIUM RUNTIME ENGINE                        │
 │                                                                         │
 │   ┌──────────────────────────┐       ┌──────────────────────────────┐   │
 │   │ C++ Chromium LTS Engine  │       │ Deterministic PRNG Spoofing  │   │
 │   │ (ungoogled-chromium)     │       │ (Seed: u32)                  │   │
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
 │   │               (~/.operon/browser/profiles/<id>/)                │   │
 │   │ • Segregated Cookies, LocalStorage, IndexedDB, LevelDB          │   │
 │   │ • Dedicated Proxy Tunnel (SOCKS5 / HTTP Adapter)                │   │
 │   │ • WebRTC STUN Protection (proxy_shielded | disabled | real)     │   │
 │   │ • Zstandard (.tar.zst) Fast Archival with Cache Exclusion       │   │
 │   │ • Supabase Cloud Sync (browsers.profiles & Storage Bucket)      │   │
 │   └─────────────────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────────────────┘
```

1. **Custom antidetect core**: Built on open-source `ungoogled-chromium` with native C++ patches. Removes background telemetry services, crash reporters, and automatic updater processes.
2. **Deterministic PRNG seeds (`--fingerprint=<seed>`)**: Each profile binds to a 32-bit unsigned integer seed (`--seed <u32>`). The engine applies this seed to jitter Canvas 2D render paths, WebGL parameters, and AudioContext audio processing consistently across sessions.
3. **Profile sandbox**: Profiles run in isolated directories under `~/.operon/browser/profiles/<id>/` without shared storage or socket pools.
4. **Display geometry**: Screen dimensions and pixel ratios map directly to `--window-size=W,H` and `--force-device-scale-factor=DPR`.
5. **Zstandard compression**: Profiles compress to `.tar.zst` archives with temporary cache directories excluded.

---

## 2. End-to-end CLI workflow

```mermaid
flowchart TD
    A["Stage 1: Engine Provisioning\n(opn browser search / install)"] --> B["Stage 2: Profile Creation\n(opn browser profile create / inspect)"]
    B --> C["Stage 3: Stealth Execution\n(opn browser launch <profile>)"]
    C --> D{"Execution Mode"}
    D -->|"Interactive GUI"| E["Manual Operations\n(Account verification)"]
    D -->|"Headless Automation"| F["CDP Port 9222\n(Automa / Playwright / Runner)"]
    E --> G["Stage 4: Stealth Verification\n(opn browser verify)"]
    F --> G
    G --> H["Stage 5: Session Archival & Cloud Sync\n(opn browser profile pack / push / pull)"]
```

### Stage 1: Engine provisioning

Search for available Chromium LTS runtime builds and download the pinned release:

```bash
# Search available remote builds
opn browser search --remote

# Download and verify the Golden LTS runtime (v148)
opn browser install 148

# List installed runtimes
opn browser runtimes
```

Runtimes unpack into `~/.operon/browser/runtimes/v148.0.7778.215/`.

### Stage 2: Profile creation

Create an isolated profile:

```bash
# Create profile with default randomized seed
opn browser profile create "Shop-US-01"

# Create profile with explicit hardware and proxy settings
opn browser profile create "Marketing-US" \
  --os windows \
  --cores 16 \
  --ram 32 \
  --proxy "socks5://user:pass@proxy-us.net:1080" \
  --timezone "America/New_York" \
  --locale "en-US"

# Test proxy connectivity before launching
opn browser profile test-proxy "Marketing-US"

# List all profiles
opn browser profile list

# Inspect hardware fingerprint parameters
opn browser profile inspect "Marketing-US"
```

### Stage 3: Profile execution

Launch profiles in interactive GUI mode or automated headless mode:

```bash
# Launch interactive browser window
opn browser launch "Shop-US-01" https://example.com

# Launch detached process and release terminal
opn browser launch "Marketing-US" https://example.com --detach

# Launch headless browser with CDP debugging enabled on port 9222
opn browser launch "Marketing-US" --headless --cdp --port 9222 --detach

# List running browser sessions
opn browser ps

# Stop browser sessions
opn browser stop "Shop-US-01"
opn browser stop --all
```

### Stage 4: Fingerprint verification

Verify detection resistance using anti-bot test suites:

```bash
# Launch profile against fingerprint verification suites
opn browser verify
```

### Stage 5: Session archival and cloud sync

Preserve session cookies, storage state, and credentials:

```bash
# Pack profile into a lightweight .tar.zst archive
opn browser profile pack "Shop-US-01" -o ./shop.tar.zst

# Upload profile archive to Supabase Storage
opn browser profile push "Shop-US-01"

# Download profile to resume session on a remote worker
opn browser profile pull "Shop-US-01"
```

---

## 3. Hardware derivation parameters

When creating a profile without manual hardware flags, the engine derives hardware configurations deterministically from the seed:

| Hardware attribute | Configuration flag | Emulation mechanism |
| :--- | :--- | :--- |
| **Fingerprint seed** | `--fingerprint=<seed>` | 32-bit unsigned PRNG seed |
| **CPU concurrency** | `--fingerprint-hardware-concurrency=<n>` | Injected into Blink C++ internals (`8`, `12`, or `16`) |
| **Device memory** | `navigator.deviceMemory` | Memory size (`16GB` or `32GB`) |
| **Platform** | `--fingerprint-platform=windows` | User-agent client hints and platform headers |
| **Browser brand** | `--fingerprint-brand=Chrome` | Client hints brand list |
| **Display geometry** | `--window-size=1920,1080` | Viewport dimensions and device scale factor |
| **Timezone** | `--timezone=America/New_York` | V8 internationalization API override |
| **Language** | `--lang=en-US --accept-lang=en-US,en` | HTTP request headers and `navigator.languages` |
| **WebRTC mode** | `--disable-non-proxied-udp` | Prevents non-proxied UDP packet leaks |
