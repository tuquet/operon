# Isolated browser profiles

Running multiple browser personas requires strict data segregation. Commercial browsers share cached storage, DNS caches, and GPU contexts across windows, which exposes identifying information to anti-bot systems.

Operon isolates filesystem storage, memory state, and network sockets for every profile through the `browser` subsystem.

---

## 1. Filesystem isolation

Every profile lives in an isolated directory under `~/.operon/browser/profiles/<profile_id>/`:

```text
~/.operon/browser/profiles/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/
├── profile.json              # Hardware parameters and metadata
├── Default/                  # Isolated Chromium user data
│   ├── Cookies               # SQLite session cookie store
│   ├── Local Storage/        # LevelDB persistent web storage
│   ├── IndexedDB/            # Client-side document database
│   └── Network/              # Network credentials and token cache
└── extensions/               # Dedicated extension directory
```

- **Separated storage**: Cookies, `localStorage`, `IndexedDB`, and session tokens are strictly isolated per profile.
- **Dedicated proxy sockets**: Proxy configurations apply per browser process, preventing network traffic leakage across profiles.

---

## 2. Hardware profile specification (`profile.json`)

When you create a profile, the runtime derives hardware attributes from a 32-bit pseudorandom seed (`--seed <u32>`). Once generated, the attributes remain deterministic:

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "name": "Production-Profile-01",
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
  "tags": ["production", "social"],
  "extensions": ["automation"],
  "startup_flags": [],
  "cloud_id": null,
  "cloud_synced_at": null,
  "created_at": "2026-10-07T12:00:00.000Z"
}
```

---

## 3. Profile management tasks

Use `opn browser profile` commands to manage profile lifecycles:

### Create and inspect profiles

To create a profile with a direct connection:

```bash
opn browser profile create "Acceptance-Clean" \
  --os windows \
  --cores 8 \
  --ram 16
```

To create a profile routed through a SOCKS5 proxy:

```bash
opn browser profile create "Target-Campaign-01" \
  --seed 94102 \
  --os windows \
  --cores 8 \
  --ram 16 \
  --proxy socks5://127.0.0.1:1080 \
  --timezone "Asia/Ho_Chi_Minh" \
  --locale "vi-VN"
```

To view profile hardware settings:

```bash
opn browser profile inspect "Target-Campaign-01"
```

To list all local profiles:

```bash
opn browser profile list
```

### Pre-flight proxy checks

When a profile includes a `--proxy` configuration, `opn browser launch` probes the proxy before starting Chromium:

- **Automatic abort**: If the proxy is unreachable, the launch aborts to avoid leaking your public IP address.
- **Bypass check**: Use `--skip-proxy-check` to bypass connectivity checks for offline testing.
- **Direct connection override**: Pass `--proxy ""` to run the profile without a proxy for a single session.

```bash
# Test proxy latency and connectivity
opn browser profile test-proxy "Target-Campaign-01" --timeout 5

# Override configured proxy with direct mode
opn browser launch "Target-Campaign-01" --proxy "" --cdp

# Skip pre-flight check
opn browser launch "Target-Campaign-01" --skip-proxy-check
```

### Export and import profiles

Operon uses Zstandard (`.tar.zst`) compression to archive profiles. The archiver automatically strips temporary caches (`Cache`, `Code Cache`, `GPUCache`), reducing storage from hundreds of megabytes to approximately 15MB:

```bash
# Pack profile into an archive
opn browser profile pack "Target-Campaign-01" -o ./profile-backup.tar.zst

# Restore profile on another machine
opn browser profile unpack ./profile-backup.tar.zst
```

### Delete profiles

To delete a profile and remove all associated local files:

```bash
opn browser profile delete "Target-Campaign-01" --force
```

---

## 4. Cloud synchronization

To synchronize profiles across distributed workstations and workers using Supabase Cloud:

```bash
# Upload session data (cookies and storage) to cloud storage
opn browser profile push "Target-Campaign-01"

# Download profile to current workstation
opn browser profile pull "Target-Campaign-01"

# List profiles registered in cloud organization
opn browser profile cloud list

# Acquire lease lock before launching
opn browser profile cloud acquire "Target-Campaign-01"

# Launch session and execute tasks
opn browser launch "Target-Campaign-01"

# Release lock and push updated session state
opn browser profile cloud release "Target-Campaign-01"
```
