# True Stealth Headless Architecture

Running automated browser workloads with full graphical user interfaces (GUI windows) is computationally expensive, consuming substantial CPU cycles and GPU VRAM on rendering window managers, compositor frames, and visual layout trees. In distributed scraping clusters or continuous integration pipelines, headless execution is mandatory.

However, standard Chromium running in `--headless` or `--headless=new` mode is detected instantly by anti-bot platforms due to dozens of default telemetry flags.

**Operon** provides **True Stealth Headless Mode**, combining lightweight zero-display performance with the identical C++ hardware fingerprint masking of full desktop browser releases.

<HairlineFigure name="exploded" />

---

## 1. Why Standard Headless Chromium Gets Detected

Websites run automated JavaScript diagnostics that distinguish default headless browsers within milliseconds:

| Detection Vector | Standard Headless Chromium | True Stealth Headless |
| :--- | :--- | :--- |
| **`navigator.webdriver`** | Evaluates to `true` by default. | Evaluates natively to `false` via internal V8 C++ patches. |
| **User-Agent String** | Contains `HeadlessChrome/128.0.0.0`. | Strips `Headless` tokens, matching retail desktop Chrome releases. |
| **WebGL GPU Renderer** | Falls back to software rasterizers (`Google SwiftShader`, `Mesa LLVMpipe`). | Injects authentic discrete GPU strings (NVIDIA GeForce, Apple Silicon, Intel Iris). |
| **Plugin Architecture** | `navigator.plugins.length` is `0` (empty array). | Populates complete desktop plugin tables (`Chrome PDF Viewer`, `PDF Viewer`). |
| **Permissions API** | Querying `Notification.permission` returns inconsistent states. | Emulates genuine desktop permission states (`default` or `prompt`). |
| **Window Geometry** | `window.outerWidth` / `outerHeight` often evaluate to `0`. | Emulates standard 1080p / 1440p monitor bounds and device pixel ratios. |

---

## 2. Workstation Density & Hardware Resource Savings

By eliminating the overhead of desktop window compositing, screen refresh loops, and physical frame rendering:

```text
 GUI Window Rendering Mode                 True Stealth Headless Mode
 ─────────────────────────                 ──────────────────────────
 • 350MB - 600MB RAM per tab               • 120MB - 180MB RAM per tab
 • High GPU VRAM & compositor load         • Zero GPU display overhead
 • Max Density: ~6 to 10 instances/VPS     • Max Density: ~25 to 50 instances/VPS
```

Organizations running data collection pipelines achieve **3x to 5x higher concurrency density** on standard cloud VPS instances without triggering bot detection thresholds.

---

## 3. Command Reference

### Launching Headless Profiles via CLI

```bash
# Launch profile in true stealth headless mode
opn browser launch "Scraper-Node-01" --headless

# Launch headless profile with dedicated residential proxy
opn browser launch "Scraper-Node-01" --headless --proxy socks5://127.0.0.1:1080

# Launch headless with CDP gateway for Playwright / Puppeteer script attachment
opn browser launch "Scraper-Node-01" --headless --port 9222 --detach
```

### Executing Headless Automa Workflows

```bash
# Execute workflow in headless mode with timeout safety
opn automation run scrape-catalog --headless --timeout 90

# Execute headless workflow with runtime variable overrides
opn automation run scrape-catalog \
  --headless \
  -p TARGET_CATEGORY="electronics" \
  -p MAX_PAGES="10"
```
