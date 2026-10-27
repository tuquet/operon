# E-Commerce & Multi-Storefront Management

Online merchants scaling cross-border e-commerce, dropshipping, and brand portfolios across Amazon Seller Central, eBay, Etsy, Walmart Marketplace, Shopee, and Lazada face strict platform policies prohibiting multi-accounting without prior approval.

Retail platforms employ advanced device-fingerprinting and behavioral heuristics. If two seller dashboards share an IP address, WebGL signature, or browser session token, security algorithms execute an immediate account linkage. An intellectual property complaint or customer dispute on Store A results in all related stores being suspended simultaneously, freezing payouts and paralyzing your business.

**Operon** enables e-commerce agencies and multi-store operators to scale independent storefronts with complete operational security.

<HairlineFigure name="basket" />

---

## 1. Multi-Storefront Isolation Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │               MERCHANT STOREFRONT SEGREGATION               │
 │                                                             │
 │   ┌──────────────────────┐       ┌──────────────────────┐   │
 │   │ Amazon US Store #01  │       │ Etsy Vintage Shop #02│   │
 │   │ • IP: 203.0.113.10   │       │ • IP: 198.51.100.42  │   │
 │   │ • Device: Win 11 RTX │       │ • Device: macOS M2   │   │
 │   │ • Timezone: New_York │       │ • Timezone: Chicago  │   │
 │   └──────────┬───────────┘       └──────────┬───────────┘   │
 │              │ (Zero Storage Bleed)         │ (Zero Storage Bleed)
 │              ▼                              ▼               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │             Sandboxed Storage               │   │
 │   │  • Persistent Session Cookies (Zero 2FA Logouts)    │   │
 │   │  • Isolated IndexedDB Orders & Listing Caches       │   │
 │   │  • Dedicated SOCKS5 Residential Tunnel Per Store    │   │
 │   └─────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Key Safeguards for Merchants

1. **Persistent Session Continuity (Eliminate 2FA Fatigue)**:
   - Repeatedly logging into seller accounts triggers aggressive two-factor authentication (SMS/Email OTP) and automated review flags. persists authenticated cookie jars and session storage indefinitely in `~/.operon/browser/profiles/<id>/`, allowing you to reopen stores seamlessly with zero login challenges.
2. **Strict Geographic Continuity**:
   - Pair US storefronts with dedicated, static residential proxies in the exact state where the company is registered. Operon's pre-flight proxy healthcheck (`test-proxy`) verifies connectivity before launching, preventing accidental unmasked connections.
3. **Safe Team Handoff & Virtual Assistant Delegation**:
   - Export store profiles into encrypted archives (`opn browser profile pack`) to delegate customer support or order fulfillment to remote virtual assistants without sharing raw master passwords.

---

## 3. Practical CLI Workflow

```bash
# 1. Create a dedicated profile for an Amazon US store
opn browser profile create "Amazon-US-Store" \
  --os windows \
  --proxy socks5://127.0.0.1:1080 \
  --timezone "America/Los_Angeles"

# 2. Verify proxy health before launch
opn browser profile test-proxy "Amazon-US-Store"

# 3. Launch the store management session
opn browser launch "Amazon-US-Store"

# 4. Pack profile for backup or team member handoff
opn browser profile pack "Amazon-US-Store" -o ./amazon_us_backup.tar.zst
```
