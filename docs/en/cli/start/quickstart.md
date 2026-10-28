# Quickstart

Operon is an antidetect browser and automation engine designed for AI agents and automation engineers to run isolated browser sessions without cross-profile detection or fingerprint leaks.

> [!NOTE]
> The canonical CLI executable is `opn`. All commands follow microservice domains (such as `opn browser launch` and `opn automation run`).

---

## What is an antidetect browser?

When you access a website, browsers expose identifying characteristics:
- **Hardware signatures**: WebGL renderer parameters, Canvas noise, and AudioContext frequencies.
- **Network signatures**: Public IP address, DNS resolvers, and WebRTC candidate addresses.
- **Software attributes**: Operating system, browser build version, fonts, timezone, and screen resolution.

When multiple browser sessions share identical hardware fingerprints or unshielded network routes, security systems correlate the sessions and flag automated activity.

Operon generates an authentic, independent digital fingerprint for every profile you create. To target websites, each profile appears as a distinct physical machine.

---

## Onboarding path

1. [Install the CLI](/en/cli/start/installation): Install the standalone native binary.
2. [Create your first profile](/en/cli/start/first-profile): Launch an isolated profile with dedicated fingerprint masking and proxy routing.
3. [Run workflow automation](/en/automation/): Execute automated jobs using native Rust CDP.
4. Configure network gateways (tunnel via 127.0.0.1:1080 / 8118): Route traffic through encrypted SOCKS5 and HTTP tunnels.
5. [Connect AI agents](/en/cli/skills/): Connect Claude, Cursor, or custom agents through the Model Context Protocol (MCP).

---

## Essential commands

| Task | Command | Description |
| :--- | :--- | :--- |
| **Check environment health** | `opn doctor` | Validates runtime dependencies, storage pillars, and network access. |
| **Create new profile** | `opn browser profile create "US-Profile"` | Generates a deterministic fingerprint and isolated storage sandbox. |
| **Launch profile** | `opn browser launch "US-Profile"` | Launches the browser profile in normal interactive mode. |
| **Launch with proxy** | `opn browser launch "US-Profile" --proxy socks5://127.0.0.1:1080` | Routes profile network traffic through a local or remote proxy. |
| **Launch in headless mode** | `opn browser launch "US-Profile" --headless` | Runs the profile in the background for automated tasks. |
| **List profiles** | `opn browser profile list` | Displays all local profiles and current execution status. |
| **Verify fingerprint** | `opn browser verify --url "https://pixelscan.net"` | Tests bot score and anti-detection metrics. |
| **Start network gateway** | `tunnel on` | Starts both SOCKS5 (`1080`) and HTTP (`8118`) tunnel forwarders. |
| **Start worker daemon** | `opn worker start --daemon` | Runs the process supervision daemon in the background. |
