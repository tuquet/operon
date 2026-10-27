# Digital Fingerprint Masking & Hardware Emulation

Modern anti-bot security systems (Cloudflare Turnstile, DataDome, Kasada, Akamai, PerimeterX) no longer rely solely on IP addresses and HTTP cookies to identify users. They interrogate hardware attributes, browser engine internals, and audio/video rendering sub-systems to construct a persistent **Digital Browser Fingerprint**.

**Operon** provides comprehensive, mathematically consistent hardware and software fingerprint masking implemented directly inside the C++ Chromium engine.

<HairlineFigure name="padlock" />

---

## 1. Why JavaScript Extension Shims Fail

Standard browser extensions (like user-agent switchers or simple canvas noise extensions) and headless automation patches (such as `puppeteer-extra-plugin-stealth`) attempt to mask fingerprints by overriding JavaScript prototypes in the global window object.

Modern anti-fraud scripts detect these overrides within milliseconds through:

1. **Native Function Verification**:
   - Calling `Function.prototype.toString.call(window.navigator.permissions.query)` detects wrapped or proxied functions because they lack native C++ binary handles (`[native code]`).
2. **Property Descriptor Interrogation**:
   - Inspecting `Object.getOwnPropertyDescriptor(navigator, 'webdriver')` reveals prototype tampering, redefined getter functions, and suspicious enumeration flags.
3. **Execution Timing & Stack Trace Leaks**:
   - Accessing overridden properties generates measurable execution delay or leaks external extension script URLs in error stack traces.

### The Native C++ Advantage

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                OPN C++ CHROMIUM ENGINE                  │
 │                                                             │
 │   ┌──────────────────────┐       ┌──────────────────────┐   │
 │   │  Blink Rendering &   │       │  V8 JavaScript VM    │   │
 │   │  GPU Pipeline Hooks  │       │  Internal C++ Bindings│  │
 │   └──────────┬───────────┘       └──────────┬───────────┘   │
 │              │                              │               │
 │              ▼                              ▼               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │          Native C++ PRNG Hardware Seed              │   │
 │   │      • Canvas RGB Buffer Modification               │   │
 │   │      • Direct WebGL Extensions Return               │   │
 │   │      • AudioBuffer DSP Micro-Decay Noise            │   │
 │   └─────────────────────────┬───────────────────────────┘   │
 │                             │                               │
 │                             ▼                               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │            Website Execution Environment            │   │
 │   │  • Zero JavaScript Prototype Pollution              │   │
 │   │  • 100% Native V8 Function Signatures               │   │
 │   │  • Passes Object.getOwnPropertyDescriptor Checks    │   │
 │   └─────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────┘
```

modifies the Chromium source code directly at the C++ level. Hardware parameters are altered inside Blink and V8 before any webpage JavaScript begins execution. To the anti-bot script, the reported values are genuine native properties of the browser engine.

---

## 2. Core Detection Vectors & Mitigations

| Detection Vector | Attack Methodology | C++ Defense Mechanism |
| :--- | :--- | :--- |
| **WebGL & GPU Vendor** | Renders 3D scenes to extract GPU vendor, renderer strings (`WEBGL_debug_renderer_info`), and shader precision limits. | Returns authentic GPU profiles (e.g. NVIDIA GeForce RTX 4080, Apple M2 Max, Intel Iris Xe) with matching OpenGL extension lists. |
| **Canvas 2D Hash** | Draws off-screen shapes and typography to measure sub-pixel font rendering variations via `toDataURL` and `getImageData`. | Injects deterministic mathematical micro-noise derived from the profile seed into the raw pixel buffer, preserving visual fidelity while producing a unique hash. |
| **AudioContext Oscillator** | Measures audio frequency decay and FFT processing buffers through an off-screen `AudioContext` node. | Introduces seed-based micro-frequency deviation in the audio synthesis buffer without degrading human-audible audio. |
| **WebRTC STUN Leak** | Sends STUN requests to public STUN servers via `RTCPeerConnection`, leaking the true residential IP behind the proxy. | Intercepts all WebRTC candidate queries and forces them strictly through the assigned SOCKS5 tunnel or disables ICE gathering completely. |
| **Navigator & Client Hints** | Queries `navigator.userAgentData`, platform strings, and `sec-ch-ua` headers. | Enforces 100% parity across User-Agent, Client Hints, OS build architecture, CPU core counts, and system RAM specs. |
| **Screen Geometry** | Compares `window.innerWidth`, `outerWidth`, `screen.availWidth`, and `devicePixelRatio`. | Derives consistent window geometry matching the virtual monitor resolution, avoiding impossible aspect ratios. |

---

## 3. Deterministic Seed-Based Derivation

Each profile is anchored to an immutable 32-bit random integer (`fingerprint_seed`):

$$\text{Profile Seed} \longrightarrow \text{PRNG Engine} \longrightarrow \{\text{Canvas Hash, Audio Signature, WebGL Context, Fonts}\}$$

Because derivation is mathematical and deterministic:
- A profile launched on Monday produces the exact same canvas hash and WebGL signature when launched on Friday.
- Anti-bot systems observe an authentic physical device maintaining an identical hardware fingerprint over months of continuous sessions.

---

## 4. Live Verification & Stealth Testing

includes a built-in automated test command to verify stealth capabilities against live managed challenge pages:

```bash
# Execute live Turnstile and anti-bot verification in a visual browser window
opn browser verify --url "https://turnstile.zeroclick.io"

# Verify with custom challenge timeout
opn browser verify --timeout 45
```

Terminal output:

```text
╭─ STEALTH ENGINE VERIFICATION ────────────────────────────── ● CHALLENGE PASSED ─╮
│  Target URL:        https://turnstile.zeroclick.io                             │
│  Resolution Time:   1.84s                                                      │
│  Turnstile Token:   0.49182a9f1b0284e...                                       │
│  Fingerprint State: 100% Consistent • Zero Prototype Contamination            │
╰────────────────────────────────────────────────────────────────────────────────╯
```
