# Affiliate Marketing & Media Buying

Affiliate media buyers, performance marketing agencies, and traffic arbiters manage dozens to hundreds of advertising accounts across Facebook Ads Manager, Google Ads, TikTok Ads, and Bing Ads. 

Advertising platforms deploy sophisticated identity graph analysis: if two ad accounts share subtle hardware fingerprint signatures, identical browser extensions, or common canvas hashes, security algorithms link the accounts. A single payment dispute or policy strike on Account A triggers an automated domino-effect ban across your entire agency portfolio.

**Operon** provides multi-account media buyers with total profile segregation, deterministic hardware spoofing, and clean residential network routing.

<HairlineFigure name="plot" />

---

## 1. Agency Protection Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                MEDIA BUYER WORKSTATION SETUP                │
 │                                                             │
 │   ┌──────────────────────┐       ┌──────────────────────┐   │
 │   │ Facebook Agency #01  │       │ Google Ads Node #02  │   │
 │   │ • Seed: 849102       │       │ • Seed: 194028       │   │
 │   │ • OS: Windows 11     │       │ • OS: macOS M2       │   │
 │   │ • Proxy: US Resi #01 │       │ • Proxy: UK Resi #02 │   │
 │   │ • VCC: US Debit BIN  │       │ • VCC: UK Debit BIN  │   │
 │   └──────────┬───────────┘       └──────────┬───────────┘   │
 │              │ (No Cross-Leak)              │ (No Cross-Leak)
 │              ▼                              ▼               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │            C++ Chromium Isolation           │   │
 │   │  • Distinct IndexedDB, Cookies, LocalStorage        │   │
 │   │  • Unique Canvas & WebGL Hash Matrix                │   │
 │   │  • Biometric Bézier Mouse Trajectories             │   │
 │   └─────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Operational SOP for Media Buyers

1. **Deterministic Fingerprints Per Account**:
   - Every profile derives its WebGL vendor, Canvas noise, and AudioContext decay from an independent PRNG seed (`--seed <u32>`), creating an authentic digital footprint that remains consistent over months of campaign scaling.
2. **Matching Network Geography & VCC BINs**:
   - Pair each ad account profile with a dedicated residential SOCKS5 proxy matching the issuing country and postal code of your virtual credit card (VCC).
3. **Cookie Warming & Aging**:
   - Avoid launching ad campaigns on sterile browser profiles. Import authenticated session cookies or execute automated warmup browsing workflows via `opn automation run warmup-flow`.
4. **Biometric Bézier Cursor Dynamics**:
   - Ad platform checkout and campaign creation pages analyze cursor movement. Operon's cubic Bézier trajectory engine simulates natural human acceleration and micro-corrections during ad setup.

---

## 3. Practical CLI Workflow

```bash
# 1. Create a dedicated Facebook Ad agency profile
opn browser profile create "FB-Agency-US-01" \
  --seed 849201 \
  --os windows \
  --proxy socks5://127.0.0.1:1080 \
  --timezone "America/New_York"

# 2. Verify proxy latency and egress IP before opening
opn browser profile test-proxy "FB-Agency-US-01"

# 3. Generate compliant persona details for registration
opn faker card --nat US

# 4. Launch profile with dedicated proxy
opn browser launch "FB-Agency-US-01"
```
