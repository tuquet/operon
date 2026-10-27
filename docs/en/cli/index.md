---
layout: home

hero:
  name: "CLI"
  text: "Run hundreds of stealth browsers. Zero lag. Zero fingerprint leaks."
  tagline: "The master operational rig assembling the ecosystem's independent engines — Chromium stealth, workflow automation, mesh bridges, and cloud sync into a single operational unit. 100% Free & Open-Source."
  image:
    src: /logo.svg
    alt: "Isometric Elevator"
  actions:
    - theme: brand
      text: Install in 15s (One-Liner)
      link: "#install"
    - theme: alt
      text: Explore CLI Commands →
      link: "/en/cli/commands/"
---

<ProofStrip />

<HeroShowcase />

<SpecterCaps />

<div id="install" class="main-content-wrapper">

## Quick Installation (One-Liner)

A single command for any workstation, VPS, or CI/CD environment:

::: code-group

```powershell [Windows (PowerShell)]
powershell -c "irm https://raw.githubusercontent.com/operon/cli/main/install.ps1 | iex"
```

```bash [Linux / VPS / macOS]
curl -fsSL https://raw.githubusercontent.com/operon/cli/main/install.sh | sh
```

```bash [Rust Cargo (Source)]
cargo install --git https://github.com/operon/cli operon
```

:::

---

## Core Operational Commands

The entire operational workflow condensed into straightforward, intuitive commands:

```bash
# 1. Initialize SSOT environment (~/.operon/) and check system readiness
opn doctor

# 2. Launch browser profile bound to residential proxy
opn browser launch "Store-US-01" --proxy socks5://user:pass@ip:port

# 3. Probe latency and verify public egress IP
opn gateway probe socks5://user:pass@ip:port

# 4. Execute headless automation workflow via pure-Rust CDP driver
opn automation run scrape-flow --headless

# 5. Start background worker node for distributed tasks
opn worker start --headless
```

---

## Core Capabilities Matrix

| Domain | Canonical Command | Technology & Value Delivered |
| :--- | :--- | :--- |
| **Dropship & E-Com** | `opn browser launch` | Complete isolation of Canvas, WebGL, AudioContext, and Fonts. Each profile behaves as an independent physical device. |
| **Web Scraping** | `opn automation run` | Pierces closed Shadow DOM, bypasses Turnstile, inertial deceleration scroll. Ultra-low RAM footprint. |
| **Cloud Center** | `opn auth tenant` | Syncs profiles via Cloud Center (PostgreSQL 15+ & RLS). Distributed lease locks prevent account collisions. |
| **Proxy Gateway** | `opn gateway probe` | Automated pre-flight probe verifies clean IP, country location, and eliminates WebRTC leaks before opening tabs. |
| **Synthetic Personas** | `opn faker generate` | Generates authentic test identities (names, birthdays, addresses, valid CCCDs) for instant automated form filling. |

---

## Frequently Asked Questions (FAQ)

::: details 1. Is CLI truly free and open-source?
100% free and open-source under the MIT license. No licensing keys, no monthly SaaS tiers, and no profile limits (bounded only by your local disk storage).
:::

::: details 2. Where is my profile data stored?
100% Local-First. All profiles, session cookies, and execution histories reside under `~/.operon/` on your local workstation, or inside your self-hosted Cloud Center database. Zero data is ever sent to third-party telemetry servers.
:::

::: details 3. How do I coordinate browser fleets across multiple VPS instances?
Use `opn browser profile cloud acquire/release` combined with the Cloud Center control plane. Headless worker nodes on VPS instances poll tasks, checkout profiles via lease locks, and synchronize session state automatically.
:::

</div>
