# WebRTC STUN Protection & Zero-Leak DNS Architecture

Web Real-Time Communication (WebRTC) is an essential browser technology enabling peer-to-peer audio, video, and data communication without plugins. However, WebRTC poses an existential threat to multi-account operations and antidetect browsing because it was designed to discover the fastest direct network path between peers—even when operating behind network proxies or VPNs.

**Operon** eliminates this vulnerability through **Native WebRTC STUN Suppression** and remote DNS resolution built directly into the C++ Chromium engine.

<HairlineFigure name="dish" />

---

## 1. Anatomy of a WebRTC IP Leak

When a website initializes an `RTCPeerConnection` object in JavaScript, the browser initiates the **Interactive Connectivity Establishment (ICE)** process to discover network endpoints:

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                STANDARD BROWSER WITH PROXY                  │
 │                                                             │
 │   ┌──────────────────────┐       ┌──────────────────────┐   │
 │   │ Web Browsing Traffic │ ────► │ SOCKS5 Proxy Gateway │   │
 │   │ (HTTP / HTTPS / TCP) │       │ (Masked IP Observed) │   │
 │   └──────────────────────┘       └──────────────────────┘   │
 │                                                             │
 │   ┌──────────────────────┐       ┌──────────────────────┐   │
 │   │ WebRTC STUN Packets  │ ────► │ Local Network NIC    │ ──► Public STUN Server
 │   │ (UDP ICE Candidates) │       │ (TRUE RESIDENTIAL IP)│     (LEAK OCCURRED!)
 │   └──────────────────────┘       └──────────────────────┘   │
 └─────────────────────────────────────────────────────────────┘
```

1. **UDP Packet Bypass**:
   - WebRTC transmits Session Traversal Utilities for NAT (STUN) binding requests over UDP. Standard proxy extensions only redirect TCP traffic, allowing raw UDP packets to bypass the proxy entirely and exit through your physical network card.
2. **Private LAN IP Discovery**:
   - WebRTC queries local network adapters to extract host private IPs (e.g. `192.168.1.104`, `10.0.0.15`). If multiple supposedly independent profiles report the exact same private IP on the same subnet, anti-fraud systems correlate the accounts immediately.
3. **Dual-Stack IPv6 Exposure**:
   - Many commercial residential proxies only support IPv4. If your home or office ISP provides IPv6, WebRTC will query the local IPv6 adapter, exposing your unmasked public IPv6 address to the target site.

---

## 2. 3-Tier WebRTC Protection Modes

replaces fragile JavaScript shims with native Chromium C++ flags configured per profile in `profile.json`:

```text
 Mode 1: disabled        Mode 2: proxy_only               Mode 3: public
 ────────────────       ──────────────────               ──────────────
 RTCPeerConnection       Enforces ICE gathering           Standard WebRTC
 completely stripped     strictly via SOCKS5 proxy        enabled for real
 from DOM window.        tunnel. Zero UDP local leak.     communications.
```

### Protection Level Breakdown

| WebRTC Mode | Configuration Flag | Behavioral Characteristics | Best Use Case |
| :--- | :--- | :--- | :--- |
| **`disabled` (Default)** | `--webrtc-mode disabled` | Strips `RTCPeerConnection`, `RTCDataChannel`, and `navigator.mediaDevices` from the window context. 100% leak-proof. | Automated scraping, e-commerce checkouts, and high-risk ad account management. |
| **`proxy_only`** | `--webrtc-mode proxy_only` | Disables non-proxied UDP traffic (`--enforce-webrtc-ip-permission-check`). Routes all ICE candidates through the proxy tunnel. | Portals that mandate active WebRTC presence (e.g. video verification). |
| **`public`** | `--webrtc-mode public` | Standard browser WebRTC behavior without interception. | Internal team calls, Google Meet, or personal browsing profiles. |

---

## 3. Remote DNS Resolution (RFC 1928 SOCKS5 Handshake)

Even when IP traffic is routed through a proxy, poorly configured clients often perform DNS queries through the local workstation's operating system resolver, exposing your true ISP and geographic location to DNS logging servers.

guarantees **Zero DNS Leakage**:
1. **Remote Hostname Resolution**:
   - All domain lookups are serialized inside the SOCKS5 handshake (RFC 1928 SOCKS5 Address Type `0x03` - Domain Name). The local machine never initiates DNS queries; resolution occurs entirely on the remote VPS or residential proxy server.
2. **DNS-over-HTTPS (DoH) Fallback**:
   - When HTTP tunneling is active, routes secure DNS queries over Cloudflare or Google DoH endpoints through the encrypted tunnel.

---

## 4. Verification & Testing

Verify that your workstation is 100% leak-proof across independent audit platforms:

```bash
# Launch test profile with proxy and open WebRTC leak verification tool
opn browser launch "Test-Profile" \
  --proxy socks5://127.0.0.1:1080 \
  --url "https://browserleaks.com/webrtc"
```

### Expected Audit Results

- **Public IP Address**: Matches target proxy egress IP exactly.
- **Local (Private) IP Address**: `Disabled` or `n/a` (Zero private subnet discovery).
- **IPv6 Address**: `Not Detected` or matches remote proxy IPv6.
- **WebRTC Status**: Clean, zero leaks detected.
