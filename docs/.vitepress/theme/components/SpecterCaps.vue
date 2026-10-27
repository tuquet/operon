<script setup lang="ts">
import { Cpu, ShieldCheck, Cloud, Network, Bot, ArrowRight } from 'lucide-vue-next'
</script>

<template>
  <div class="caps-container">
    <div class="caps-header">
      <div class="caps-eyebrow">CORE CAPABILITIES</div>
      <h2 class="caps-heading">Production-Grade Architecture Engineered for Real-World Longevity</h2>
      <p class="caps-sub">Zero fluff, zero speculative abstractions. Every single design decision directly addresses account survival, stealth longevity, and process reliability.</p>
    </div>

    <div class="caps">
      <!-- 01: Always Running -->
      <div class="cap">
        <div class="n"><span>01</span></div>
        <div class="cap-in">
          <h3>
            <Cpu :size="16" class="cap-ic" aria-hidden="true" />
            <span>Always Running. Zero Zombie.</span>
            <ArrowRight :size="14" class="arw" aria-hidden="true" />
          </h3>
          <p>
            is not an Electron bloatware hogging gigabytes of RAM. As an ultra-lightweight native application written in pure Rust, processes run smoothly even on $5/mo VPS instances, automatically reaping child trees (Zero Zombie) for 24/7 uninterrupted uptime.
          </p>
        </div>
        <div class="ev" aria-hidden="true">
          <div class="ev-cmd"><b>$</b> opn worker probe</div>
          <div class="ev-row"><span>worker</span><b class="text-green"><i class="beat"></i>running (PID 4821)</b></div>
          <div class="ev-row"><span>active browsers</span><b>12 profiles · RSS 284MB</b></div>
          <div class="ev-row"><span>orphan processes</span><b class="text-green">0 zombie detected</b></div>
          <div class="ev-note">Native process sandbox limits enforced · Zero memory leak</div>
        </div>
      </div>

      <!-- 02: Native Stealth -->
      <div class="cap">
        <div class="n"><span>02</span></div>
        <div class="cap-in">
          <h3>
            <ShieldCheck :size="16" class="cap-ic" aria-hidden="true" />
            <span>Native Stealth Engine. Beyond User-Agent Switching.</span>
            <ArrowRight :size="14" class="arw" aria-hidden="true" />
          </h3>
          <p>
            Superficial tools merely alter the navigator.userAgent string while leaking CDP debug ports or physical WebRTC host adapters. delivers native C++ stealth: zero-port extension execution, biological Bézier mouse curvature, AudioContext frequency noise, and closed Shadow DOM piercing.
          </p>
        </div>
        <div class="ev" aria-hidden="true">
          <div class="ev-cmd"><b>$</b> opn browser verify --url "https://turnstile.zerocdn.com"</div>
          <div class="ev-row"><span>CDP debug port</span><b>--remote-debugging-port=0</b></div>
          <div class="ev-row"><span>navigator.webdriver</span><b class="text-green">false (Clean)</b></div>
          <div class="ev-row"><span>Cloudflare Turnstile</span><b class="text-green">Bypassed (1,240ms)</b></div>
          <div class="ev-note">Biometric Bézier velocity: 742px/s · Closed Shadow DOM pierced</div>
        </div>
      </div>

      <!-- 03: Cloud Fleet -->
      <div class="cap">
        <div class="n"><span>03</span></div>
        <div class="cap-in">
          <h3>
            <Cloud :size="16" class="cap-ic" aria-hidden="true" />
            <span>Cloud Center Fleet. Distributed Multi-Node Leases.</span>
            <ArrowRight :size="14" class="arw" aria-hidden="true" />
          </h3>
          <p>
            Eliminate expensive centralized proxy databases or brittle sync brokers. connects directly to Cloud Center (PostgreSQL 15+ with strict RLS). Distributed lease locks (acquire/release) distribute profiles seamlessly across workstations and VPS nodes without account collisions.
          </p>
        </div>
        <div class="ev" aria-hidden="true">
          <div class="ev-cmd"><b>$</b> opn browser profile cloud acquire "scraper-node-01"</div>
          <div class="ev-row"><span>control plane</span><b>PostgreSQL 15+ & RLS</b></div>
          <div class="ev-row"><span>lease lock</span><b class="text-green">ACQUIRED (TTL 1800s)</b></div>
          <div class="ev-row"><span>distributed fleet</span><b>1 Local Station + 3 Cloud VPS</b></div>
          <div class="ev-note">Zero account collision · Automated session unlock on crash</div>
        </div>
      </div>

      <!-- 04: Proxy Probe -->
      <div class="cap">
        <div class="n"><span>04</span></div>
        <div class="cap-in">
          <h3>
            <Network :size="16" class="cap-ic" aria-hidden="true" />
            <span>Pre-Flight Proxy Probing Before Opening Tabs.</span>
            <ArrowRight :size="14" class="arw" aria-hidden="true" />
          </h3>
          <p>
            Launching browsers through dead proxies or leaked physical IPs is the primary cause of account bans. automatically probes latency, verifies clean IP reputation, and freezes WebRTC host adapters before the first browser window is spawned.
          </p>
        </div>
        <div class="ev" aria-hidden="true">
          <div class="ev-cmd"><b>$</b> opn proxy probe socks5://user:pass@127.0.0.1:1080</div>
          <div class="ev-row"><span>exit IP</span><b>198.51.100.42 (US - Comcast)</b></div>
          <div class="ev-row"><span>latency</span><b class="text-green">18ms (Fast)</b></div>
          <div class="ev-row"><span>WebRTC shield</span><b class="text-green">0 Host Leaks (Disabled)</b></div>
          <div class="ev-note">DNS: Encrypted DoH · Fraud Score: 0/100 (Safe)</div>
        </div>
      </div>

      <!-- 05: Agent-Native -->
      <div class="cap">
        <div class="n"><span>05</span></div>
        <div class="cap-in">
          <h3>
            <Bot :size="16" class="cap-ic" aria-hidden="true" />
            <span>Agent-Native. Built for Autonomous AI.</span>
            <ArrowRight :size="14" class="arw" aria-hidden="true" />
          </h3>
          <p>
            includes a built-in Model Context Protocol (MCP) server. Autonomous AI agents such as Claude Code, Cursor, and Antigravity can directly orchestrate profiles, solve challenges, and extract structured data without custom glue code.
          </p>
        </div>
        <div class="ev" aria-hidden="true">
          <div class="ev-cmd"><b>$</b> opn mcp serve --stdio</div>
          <div class="ev-row"><span>protocol</span><b>Model Context Protocol v1.0</b></div>
          <div class="ev-row"><span>exported tools</span><b>9 Native Tools</b></div>
          <div class="ev-row"><span>connected AI</span><b class="text-green">Claude Code · Cursor · AGY</b></div>
          <div class="ev-note">Direct headless execution · JSON-RPC 2.0 streaming</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.caps-container {
  max-width: 1040px;
  margin: 48px auto 0 auto;
  padding: 0 16px;
}

.caps-header {
  margin-bottom: 28px;
}

.caps-eyebrow {
  color: var(--vp-c-text-3);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 6px;
}

.caps-heading {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-size: clamp(20px, 2.4vw, 30px);
  color: var(--vp-c-text-1);
  margin: 0 0 8px 0;
}

.caps-sub {
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.6;
  max-width: 680px;
  margin: 0;
}

.caps {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--vp-c-border);
  border-bottom: 1px solid var(--vp-c-border);
}

.cap {
  display: grid;
  grid-template-columns: 60px minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 0 28px;
  align-items: start;
  padding: 24px 0;
  border-bottom: 1px solid var(--vp-c-border);
  transition: background 0.15s ease;
}

.cap:last-child {
  border-bottom: none;
}

.cap:hover {
  background: var(--vp-c-bg-soft);
}

.n {
  display: flex;
  align-items: flex-start;
  line-height: 1;
}

.n > span {
  font-family: var(--vp-font-family-mono);
  font-weight: 900;
  font-size: 30px;
  letter-spacing: -0.05em;
  color: var(--vp-c-text-3);
  transition: color 0.15s ease;
}

.cap:hover .n > span {
  color: var(--vp-c-text-1);
}

.cap-in h3 {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-size: 17px;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.15s ease;
}

.cap-ic {
  flex-shrink: 0;
  color: var(--vp-c-text-3);
  transition: color 0.15s ease;
}

.cap:hover .cap-ic {
  color: var(--vp-c-text-1);
}

.cap:hover .cap-in h3 {
  color: var(--vp-c-brand-1);
}

.arw {
  margin-left: 6px;
  font-size: 14px;
  color: var(--vp-c-text-3);
  transition: transform 0.15s ease, color 0.15s ease;
}

.cap:hover .arw {
  color: var(--vp-c-text-1);
  transform: translateX(4px);
}

.cap-in p {
  margin: 6px 0 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.6;
}

.ev {
  width: 100%;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-alt);
  border-radius: 6px;
  padding: 10px 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.ev-cmd {
  color: var(--vp-c-text-1);
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--vp-c-border);
  font-weight: 600;
}

.ev-cmd b {
  color: var(--vp-c-text-3);
  margin-right: 5px;
}

.ev-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2.5px 0;
  font-size: 10.5px;
}

.ev-row > span {
  color: var(--vp-c-text-3);
}

.ev-row b {
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--vp-c-text-1);
}

.ev-note {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--vp-c-border);
  font-size: 9.5px;
  color: var(--vp-c-text-3);
}

.text-green { color: #10b981 !important; }

.beat {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
  display: inline-block;
  animation: beat-pulse 2s infinite ease-in-out;
}

@keyframes beat-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@media (max-width: 860px) {
  .cap {
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 10px 16px;
    padding: 20px 0;
  }
  .ev {
    grid-column: 1 / -1;
    margin-top: 8px;
  }
}

@media (max-width: 640px) {
  .caps-container {
    padding: 0 10px;
    margin: 24px auto 0 auto;
  }
  .caps-header {
    margin-bottom: 16px;
  }
  .caps-heading {
    font-size: 18px;
  }
  .caps-sub {
    font-size: 12.5px;
    line-height: 1.5;
  }
  .cap {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 16px 0;
  }
  .n {
    margin-bottom: -2px;
  }
  .n > span {
    font-size: 18px;
    color: var(--vp-c-text-3);
  }
  .cap-in h3 {
    font-size: 15.5px;
  }
  .cap-in p {
    font-size: 12.5px;
    line-height: 1.55;
    margin-top: 4px;
  }
  .ev {
    margin-top: 8px;
    padding: 8px 10px;
  }
}
</style>
