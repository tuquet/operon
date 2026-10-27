# Creating your first profile

Each Operon profile represents an isolated browser environment with a dedicated digital fingerprint, independent cookie jar, separate cache, and optional proxy binding.

---

## 1. Create a profile

Run `opn browser profile create` followed by a profile identifier:

```bash
opn browser profile create "Store-US-01"
```

The CLI automatically provisions:
- An authentic hardware fingerprint (WebGL parameters, AudioContext signature, and Canvas noise).
- Realistic screen geometry and CPU core counts.
- An isolated sandbox directory at `~/.operon/browser/profiles/Store-US-01`.

---

## 2. Launch the profile

To open the profile in an interactive window:

```bash
opn browser launch "Store-US-01"
```

To route the profile through a proxy:

```bash
opn browser launch "Store-US-01" --proxy socks5://127.0.0.1:1080
```

To launch headlessly for automated tasks:

```bash
opn browser launch "Store-US-01" --headless
```

---

## 3. Verify the profile fingerprint

When the browser window opens, verify detection resistance using any public fingerprint test suite:

- [Browserleaks](https://browserleaks.com)
- [Pixelscan](https://pixelscan.net)
- [CreepJS](https://abrahamjuliot.github.io/creepjs/)

Expected behavior:
- **WebGL**: Reports standard discrete graphics hardware without revealing host hardware specs.
- **WebRTC**: Preserves proxy isolation without exposing local IP addresses.
- **Canvas**: Generates realistic entropy passing statistical bot-detection thresholds.
