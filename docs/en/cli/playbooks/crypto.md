# Web3, Crypto & Airdrop Farming

Decentralized finance (DeFi) protocols, Layer 2 networks (zkSync, LayerZero, Arbitrum, Starknet), and Web3 ecosystems distribute retroactive token airdrops to active community participants. To prevent abuse, protocol foundations deploy sophisticated **Anti-Sybil Detection Systems** that analyze both on-chain transaction graphs and off-chain browser telemetry.

Off-chain clustering algorithms detect Sybil farming rings by identifying shared canvas signatures, identical browser extensions, common WebRTC IP leaks, and concurrent RPC node access.

**Operon** provides Web3 operators and DeFi researchers with isolated wallet environments, independent hardware fingerprints, and dedicated proxy channels.

<HairlineFigure name="lockers" />

---

## 1. Anti-Sybil Protection Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                WEB3 SYBIL DEFENSE ARCHITECTURE              │
 │                                                             │
 │   ┌──────────────────────┐       ┌──────────────────────┐   │
 │   │ Wallet Node #01      │       │ Wallet Node #02      │   │
 │   │ • MetaMask Vault A   │       │ • MetaMask Vault B   │   │
 │   │ • IP: Singapore Resi │       │ • IP: Japan Resi     │   │
 │   │ • Seed: 849102       │       │ • Seed: 928410       │   │
 │   │ • Twitter/X Auth A   │       │ • Twitter/X Auth B   │   │
 │   └──────────┬───────────┘       └──────────┬───────────┘   │
 │              │ (No Cross-Cluster)           │ (No Cross-Cluster)
 │              ▼                              ▼               │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │           Isolated Extension & State Sandbox        │   │
 │   │  • Dedicated Wallet Keyrings (Zero Key Bleed)       │   │
 │   │  • Distinct Discord & Telegram Web Sessions         │   │
 │   │  • Dedicated SOCKS5 Proxy Routing per Wallet Node   │   │
 │   └─────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Operational Rules for Airdrop Operators

1. **Independent Wallet Extension Sandboxing**:
   - Web3 wallet extensions (MetaMask, Phantom, Rabby) store encrypted keyrings in local browser storage. completely isolates extension states per profile, ensuring that no extension can inspect or enumerate other wallets.
2. **Deterministic Fingerprint Masking**:
   - Web3 dApps (Galxe, Layer3, QuestN, Snapshot) execute canvas and WebGL fingerprint queries during signature requests. assigns a unique PRNG seed to each wallet profile, preventing off-chain cluster association.
3. **WebRTC STUN Shielding**:
   - Interacting with Web3 dApps often initiates WebRTC connections for telemetry. disables non-proxied UDP traffic (`--webrtc-mode disabled`), preventing your true ISP IP from leaking alongside wallet signatures.

---

## 3. Practical CLI Workflow

```bash
# 1. Create a dedicated profile for a Web3 wallet node
opn browser profile create "Web3-Node-01" \
  --seed 748291 \
  --proxy socks5://127.0.0.1:1080 \
  --timezone "Asia/Singapore"

# 2. Verify proxy leak protection
opn browser profile test-proxy "Web3-Node-01"

# 3. Launch the profile with Web3 wallet extension active
opn browser launch "Web3-Node-01"
```
