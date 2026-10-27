# Chrome DevTools Protocol (CDP) & Driver Architecture

Modern automated testing and web scraping frameworks (Playwright, Puppeteer, Selenium, SeleniumBase) rely on the **Chrome DevTools Protocol (CDP)** to communicate with browser instances over bi-directional WebSockets.

**Operon** provides direct, native CDP DevTools integration, enabling software engineers and AI agents to attach standard automation code directly to isolated, fingerprint-protected browser profiles without modifying their existing automation test suites.

<HairlineFigure name="phosphor" />

---

## 1. Dual Automation Modes: Driver vs Extension Stealth

Anti-bot systems (Cloudflare, DataDome) increasingly probe local loopback ports (scanning ports `9222`, `9229`, `9333`) to detect open DevTools debugging endpoints. 

provides two distinct automation modes to navigate this tradeoff:

```text
 Mode 1: Driver Mode (--mode driver)        Mode 2: Extension Stealth (--mode extension / --no-cdp)
 ───────────────────────────────────        ───────────────────────────────────────────────────────
 Exposes local CDP WebSocket endpoint       Closes all debugging ports completely (Zero-Port).
 (port 9222) for standard Playwright /      Automations execute via MV3 background service workers
 Puppeteer script attachment.               with zero network port footprint.
```

| Operating Mode | Port Open | Detection Risk | Recommended Use Case |
| :--- | :---: | :---: | :--- |
| **Driver Mode (`driver`)** | `9222` (Configurable) | Low on ordinary sites, Medium on port-scanning challenges | Large-scale Playwright / Puppeteer script suites, complex multi-tab scraping. |
| **Extension Mode (`extension`)** | **None (Zero Port)** | **Zero Port Footprint** | Cloudflare Turnstile managed challenges, high-security banking, KYC portals. |

---

## 2. Launching Profiles in Driver Mode

To launch a profile and expose the CDP debugging gateway:

```bash
# Launch profile with default remote debugging port 9222
opn browser launch "Scraper-Node-01" --port 9222

# Launch in headless mode with dedicated proxy
opn browser launch "Scraper-Node-01" --port 9222 --headless --proxy socks5://127.0.0.1:1080

# Detach process to run continuously in background
opn browser launch "Scraper-Node-01" --port 9222 --detach
```

---

## 3. Connecting Automation Frameworks

Once the profile is active on port `9222`, standard automation code connects seamlessly:

### TypeScript / Node.js (Playwright)

```typescript
import { chromium } from 'playwright';

// Connect over native CDP WebSocket gateway
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const defaultContext = browser.contexts()[0];
const page = defaultContext.pages()[0] || await defaultContext.newPage();

// Navigate with full fingerprint masking & proxy active
await page.goto('https://nowsecure.nl');
console.log('Page Title:', await page.title());

// Perform automation steps...
await browser.close();
```

### TypeScript / Node.js (Puppeteer)

```typescript
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9222',
  defaultViewport: null
});

const pages = await browser.pages();
const page = pages[0] || await browser.newPage();

await page.goto('https://turnstile.zeroclick.io');
```

### Python (Playwright Sync & Async)

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    # Connect directly to running antidetect session
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    context = browser.contexts[0]
    page = context.pages[0] if context.pages else context.new_page()

    page.goto("https://browserleaks.com/canvas")
    print("Canvas Signature Verified:", page.title())
    
    browser.close()
```

---

## 4. Advanced CDP Capabilities

Connecting via CDP unlocks raw low-level browser primitives:

1. **Network Interception & Header Injection**:
   - Intercept raw HTTP requests (`Network.setRequestInterception`) to attach custom authorization tokens or block heavy media assets (`.png`, `.mp4`) to reduce proxy bandwidth consumption.
2. **Cookie Jar Synchronization**:
   - Programmatically read and dump authenticated session cookies (`Network.getCookies`) directly to JSON files for backup or cloud lease check-in.
3. **Synthetic Input Events**:
   - Dispatch hardware-accurate input events (`Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`) with natural millisecond timing.
