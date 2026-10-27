# High-Scale Web Scraping & Data Extraction

Modern data collection, competitive intelligence, and price monitoring pipelines face sophisticated anti-bot countermeasures. Target websites deploy Cloudflare Turnstile, DataDome, PerimeterX, and Akamai to block generic HTTP requests (curl, Python Requests) and flag standard headless browsers within milliseconds.

**Operon** provides a high-throughput, undetectable web extraction engine that combines true stealth headless execution with native Chrome DevTools Protocol (CDP) and distributed worker orchestration.

<HairlineFigure name="sieve" />

---

## 1. The Scraping Architecture Matrix

```text
 ┌─────────────────────────────────────────────────────────────┐
 │            DISTRIBUTED HIGH-VOLUME SCRAPING STACK           │
 │                                                             │
 │   ┌──────────────────────┐       ┌──────────────────────┐   │
 │   │ Cron / Airflow / CI  │ ────► │ opn automation run   │   │
 │   │ Orchestration Trigger│       │ (or worker daemon)   │   │
 │   └──────────────────────┘       └──────────┬───────────┘   │
 │                                             │               │
 │                                             ▼               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │         Headless Antidetect Engine          │   │
 │   │                                                     │   │
 │   │ • C++ Hardware Fingerprint Emulation (No JS Shims)  │   │
 │   │ • Biometric Bézier Mouse Trajectories & Scroll      │   │
 │   │ • Automatic Cloudflare Turnstile Resolution         │   │
 │   │ • Memory-Efficient Headless Mode (120MB / Worker)   │   │
 │   └─────────────────────────┬───────────────────────────┘   │
 │                             │                               │
 │                             ▼                               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │                 Egress Network (Bridge)                │   │
 │   │ • Residential SOCKS5 Proxy Rotation                 │   │
 │   │ • Zero WebRTC / DNS Leakage                         │   │
 │   └─────────────────────────┬───────────────────────────┘   │
 │                             │                               │
 │                             ▼                               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │      Extracted Data Payload (JSON / CSV / SQLite)   │   │
 │   └─────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Key Technical Advantages

1. **Native Turnstile Challenge Resolution**:
   - Rather than paying third-party CAPTCHA solving APIs ($1–$3 per 1,000 solves) that introduce 15–30s latency, renders real JavaScript contexts with biometric mouse physics, resolving Turnstile managed challenges in under 2 seconds.
2. **Maximum Workstation Density**:
   - Operating in True Stealth Headless mode (`--headless`) bypasses desktop window compositing, saving 90% of GPU VRAM. Run 25–50 concurrent worker instances on an 8-core, 16GB RAM VPS.
3. **Turnkey CLI Pipeline Integration**:
   - Trigger scraping workflows from bash scripts, Docker containers, or Python scripts without managing complex WebDriver binaries.

---

## 3. Practical Scraping Workflows

### Running Headless Scraper via CLI

```bash
# Launch a headless scraper profile through residential proxy
opn browser launch "Scraper-Node-01" \
  --headless \
  --proxy socks5://127.0.0.1:1080 \
  --port 9222 \
  --detach
```

### Executing Declarative Extraction Workflow

```bash
# Run automated extraction workflow by stored ID with runtime parameter substitution
opn automation run ecommerce-catalog \
  --headless \
  --timeout 120 \
  -p TARGET_URL="https://example-store.com/products" \
  -p MAX_PAGES="50"
```

### Autonomous Cloud Fleet Worker Mode

In distributed scraping fleets, worker nodes continuously poll tasks from the central queue:

```bash
# Start background worker daemon polling extraction jobs every 10s
opn worker start --headless
```
