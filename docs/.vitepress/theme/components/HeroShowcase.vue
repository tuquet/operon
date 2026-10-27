<script setup lang="ts">
import { ref } from 'vue'
import { Terminal, ShieldCheck, Zap, Network, ArrowRight, Copy, Check, CheckCircle2 } from 'lucide-vue-next'

const activeTab = ref<'browser' | 'verify' | 'automation' | 'proxy'>('browser')
const copied = ref(false)

function copyCode(text: string) {
  navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <div class="hero-showcase-container">
    <!-- Announcement Pill -->
    <a href="#install" class="announcement-pill">
      <span class="pulsing-dot"></span>
      <span class="pill-category">TQ CLI</span>
      <span class="pill-divider">/</span>
      <span class="pill-text">100% Free &amp; Local-First • Pure Rust Core • Zero Zombie</span>
      <ArrowRight :size="12" class="pill-arrow" aria-hidden="true" />
    </a>

    <!-- Interactive Window Showcase -->
    <div class="showcase-card">
      <!-- Window Titlebar -->
      <div class="card-header">
        <div class="window-controls">
          <span class="control-dot close"></span>
          <span class="control-dot minimize"></span>
          <span class="control-dot expand"></span>
        </div>

        <div class="tab-switcher">
          <button 
            :class="['tab-btn', { active: activeTab === 'browser' }]" 
            @click="activeTab = 'browser'"
          >
            <Terminal :size="12" class="tab-icon" aria-hidden="true" />
            Browser
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'verify' }]" 
            @click="activeTab = 'verify'"
          >
            <ShieldCheck :size="12" class="tab-icon" aria-hidden="true" />
            Anti-Bot Verify
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'automation' }]"
            @click="activeTab = 'automation'"
          >
            <Zap :size="12" class="tab-icon" aria-hidden="true" />
            Headless Automa
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'proxy' }]" 
            @click="activeTab = 'proxy'"
          >
            <Network :size="12" class="tab-icon" aria-hidden="true" />
            Proxy Tunnel
          </button>
        </div>

        <div class="status-indicator">
          <CheckCircle2 :size="11" class="status-icon" aria-hidden="true" />
          <span class="status-label">100% STEALTH</span>
        </div>
      </div>

      <!-- Tab Content 1: Browser -->
      <div v-if="activeTab === 'browser'" class="card-body terminal-view">
        <div class="code-line prompt">
          <span class="prompt-symbol">$</span>
          <span class="command-text">operon browser launch "Store-US-01" --proxy socks5://127.0.0.1:1080</span>
          <button 
            class="copy-btn" 
            @click="copyCode('operon browser launch &quot;Store-US-01&quot; --proxy socks5://127.0.0.1:1080')"
          >
            <span v-if="!copied" class="copy-inner"><Copy :size="11" /> Copy</span>
            <span v-else class="copied-text"><Check :size="11" /> Copied</span>
          </button>
        </div>
        <div class="log-stream">
          <div class="log-row info">
            <span class="log-prefix">[init]</span>
            <span class="log-msg">Mounting isolated sandbox: ~/.operon/browser/profiles/Store-US-01</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[hardware]</span>
            <span class="log-msg">Injecting WebGL: NVIDIA GeForce RTX 4090 (Direct3D11 vs_5_0 ps_5_0)</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[audio]</span>
            <span class="log-msg">AudioContext noise seed #849201 generated (SNR &gt; 99.4dB)</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[network]</span>
            <span class="log-msg">Routing via SOCKS5 127.0.0.1:1080 | WebRTC host adapters disabled</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[motion]</span>
            <span class="log-msg">Cubic Bézier trajectory algorithm initialized (curvature: 0.42)</span>
          </div>
          <div class="log-row highlight">
            <span class="log-prefix">[ready]</span>
            <span class="log-msg">Chromium sandbox live ● Zero fingerprint linkage detected</span>
          </div>
        </div>
      </div>

      <!-- Tab Content 2: Anti-Bot Verify -->
      <div v-if="activeTab === 'verify'" class="card-body terminal-view">
        <div class="code-line prompt">
          <span class="prompt-symbol">$</span>
          <span class="command-text">operon browser verify --url "https://turnstile.zerocdn.com"</span>
          <button 
            class="copy-btn" 
            @click="copyCode('operon browser verify --url &quot;https://turnstile.zerocdn.com&quot;')"
          >
            <span v-if="!copied" class="copy-inner"><Copy :size="11" /> Copy</span>
            <span v-else class="copied-text"><Check :size="11" /> Copied</span>
          </button>
        </div>
        <div class="log-stream">
          <div class="log-row info">
            <span class="log-prefix">[spawn]</span>
            <span class="log-msg">Spawning Golden LTS v148 with --remote-debugging-port=0 (DevToolsActivePort SSOT)</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[cdp]</span>
            <span class="log-msg">Native Pure Rust CDP Session attached to Isolated World execution context</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[stealth]</span>
            <span class="log-msg">navigator.webdriver = false | Biological Bézier cursor trajectory injected</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[shadow-dom]</span>
            <span class="log-msg">Piercing closed shadow root container #cf-turnstile-wrapper</span>
          </div>
          <div class="log-row highlight">
            <span class="log-prefix">[bypass]</span>
            <span class="log-msg">Cloudflare Turnstile token acquired in 1,240ms ● Score: 0.99 (HUMAN_VERIFIED)</span>
          </div>
          <div class="log-row info">
            <span class="log-prefix">[perf]</span>
            <span class="log-msg">Memory RSS: 48.2 MB | CPU: 0.6% | 0 Zombie processes detected</span>
          </div>
        </div>
      </div>

      <!-- Tab Content 3: Headless Automa -->
      <div v-if="activeTab === 'automation'" class="card-body terminal-view">
        <div class="code-line prompt">
          <span class="prompt-symbol">$</span>
          <span class="command-text">operon automation run ./workflows/scrape-catalog.json --headless</span>
          <button 
            class="copy-btn" 
            @click="copyCode('operon automation run ./workflows/scrape-catalog.json --headless')"
          >
            <span v-if="!copied" class="copy-inner"><Copy :size="11" /> Copy</span>
            <span v-else class="copied-text"><Check :size="11" /> Copied</span>
          </button>
        </div>
        <div class="log-stream">
          <div class="log-row info">
            <span class="log-prefix">[dag]</span>
            <span class="log-msg">Loading DAG workflow: ./workflows/scrape-catalog.json (14 atomic tasks)</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[engine]</span>
            <span class="log-msg">Spawning isolated headless stealth browser instance (Native process sandbox)</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[scroll]</span>
            <span class="log-msg">Simulating human deceleration momentum scroll down (450px)</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[extract]</span>
            <span class="log-msg">Batch 4,102 ok (20,510 items extracted) | Checkpoint committed to SQLite</span>
          </div>
          <div class="log-row success">
            <span class="log-prefix">[lease]</span>
            <span class="log-msg">Cloud Center lease heartbeat sent (worker node-vps-frankfurt)</span>
          </div>
          <div class="log-row highlight">
            <span class="log-prefix">[done]</span>
            <span class="log-msg">Scrape pipeline completed in 8.4s ● Output saved to catalog-2026.json</span>
          </div>
        </div>
      </div>

      <!-- Tab Content 4: Proxy Tunnel -->
      <div v-if="activeTab === 'proxy'" class="card-body tunnel-view">
        <div class="code-line prompt">
          <span class="prompt-symbol">$</span>
          <span class="command-text">operon proxy probe socks5://127.0.0.1:1080</span>
          <button 
            class="copy-btn" 
            @click="copyCode('operon proxy probe socks5://127.0.0.1:1080')"
          >
            <span v-if="!copied" class="copy-inner"><Copy :size="11" /> Copy</span>
            <span v-else class="copied-text"><Check :size="11" /> Copied</span>
          </button>
        </div>
        <div class="tunnel-mesh-grid">
          <div class="mesh-card active">
            <div class="mesh-card-header">
              <span class="mesh-name"><span class="country-pill">US</span> US-East (Virginia)</span>
              <span class="mesh-badge live">ONLINE</span>
            </div>
            <div class="mesh-stat">
              <span class="stat-lbl">Protocol:</span>
              <span class="stat-val">SOCKS5 (127.0.0.1:1080)</span>
            </div>
            <div class="mesh-stat">
              <span class="stat-lbl">Latency:</span>
              <span class="stat-val text-green">18ms</span>
            </div>
            <div class="mesh-stat">
              <span class="stat-lbl">WebRTC:</span>
              <span class="stat-val text-green">Host Blocked (0 Leaks)</span>
            </div>
          </div>

          <div class="mesh-card active">
            <div class="mesh-card-header">
              <span class="mesh-name"><span class="country-pill">DE</span> EU-Central (Frankfurt)</span>
              <span class="mesh-badge live">ONLINE</span>
            </div>
            <div class="mesh-stat">
              <span class="stat-lbl">Protocol:</span>
              <span class="stat-val">HTTP (127.0.0.1:8118)</span>
            </div>
            <div class="mesh-stat">
              <span class="stat-lbl">Latency:</span>
              <span class="stat-val text-green">24ms</span>
            </div>
            <div class="mesh-stat">
              <span class="stat-lbl">DNS Leak:</span>
              <span class="stat-val text-green">Encrypted Cloudflare</span>
            </div>
          </div>

          <div class="mesh-card active">
            <div class="mesh-card-header">
              <span class="mesh-name"><span class="country-pill">SG</span> SG-Asia (Singapore)</span>
              <span class="mesh-badge live">ONLINE</span>
            </div>
            <div class="mesh-stat">
              <span class="stat-lbl">Protocol:</span>
              <span class="stat-val">SOCKS5 (127.0.0.1:1081)</span>
            </div>
            <div class="mesh-stat">
              <span class="stat-lbl">Latency:</span>
              <span class="stat-val text-green">12ms</span>
            </div>
            <div class="mesh-stat">
              <span class="stat-lbl">IP Isolation:</span>
              <span class="stat-val text-green">Dedicated Static Res</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-showcase-container {
  max-width: 1040px;
  margin: 28px auto 0 auto;
  padding: 0 16px;
  position: relative;
  z-index: 1;
}

/* Shadcn Announcement Pill */
.announcement-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  border-radius: 20px;
  margin-bottom: 20px;
  font-size: 12px;
  transition: all 0.15s ease;
  text-decoration: none;
  max-width: 100%;
}

.announcement-pill:hover {
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-elv);
}

.pulsing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 6px #10b981;
  flex-shrink: 0;
}

.pill-category {
  font-weight: 700;
  font-size: 10.5px;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-1);
  flex-shrink: 0;
}

.pill-divider {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.pill-text {
  color: var(--vp-c-text-2);
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pill-arrow {
  width: 12px;
  height: 12px;
  color: var(--vp-c-text-3);
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.announcement-pill:hover .pill-arrow {
  transform: translateX(2px);
  color: var(--vp-c-text-1);
}

/* Glass Showcase Card (Shadcn Zinc Panel) */
.showcase-card {
  position: relative;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--vp-shadow-2);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--vp-c-bg-elv);
  border-bottom: 1px solid var(--vp-c-border);
  flex-wrap: wrap;
  gap: 8px;
}

.window-controls {
  display: flex;
  gap: 6px;
}

.control-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  opacity: 0.7;
}

.control-dot.close { background: #ef4444; }
.control-dot.minimize { background: #eab308; }
.control-dot.expand { background: #22c55e; }

.tab-switcher {
  display: flex;
  gap: 2px;
  background: var(--vp-c-bg-soft);
  padding: 2px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-border);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--vp-c-text-1);
}

.tab-btn.active {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-weight: 600;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #10b981;
}

.status-icon {
  flex-shrink: 0;
}

/* Card Body */
.card-body {
  padding: 14px 16px;
  font-family: var(--vp-font-family-mono);
}

.code-line.prompt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--vp-c-bg);
  border-radius: 6px;
  border: 1px solid var(--vp-c-border);
  margin-bottom: 12px;
}

.prompt-symbol {
  color: var(--vp-c-text-3);
  font-weight: bold;
}

.command-text {
  color: var(--vp-c-text-1);
  font-size: 12px;
  flex: 1;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.copy-btn {
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  color: var(--vp-c-text-2);
  font-size: 10.5px;
  padding: 3px 7px;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

.copy-inner,
.copied-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.copied-text {
  color: #10b981;
}

.log-stream {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11.5px;
}

.log-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.log-prefix {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  min-width: 68px;
  flex-shrink: 0;
}

.log-row.info .log-prefix { color: var(--vp-c-text-3); }
.log-row.success .log-prefix { color: #10b981; }
.log-row.highlight .log-prefix { color: var(--vp-c-brand-1); }

.log-row.highlight {
  background: var(--vp-c-bg-soft);
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 2px solid var(--vp-c-brand-1);
}

.log-msg {
  color: var(--vp-c-text-1);
  word-break: break-word;
}

/* Tunnel View */
.tunnel-mesh-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.mesh-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 10px 12px;
}

.mesh-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mesh-name {
  font-weight: 600;
  font-size: 12px;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
}

.country-pill {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-border);
  margin-right: 6px;
  line-height: 1.2;
}

.mesh-badge.live {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
}

.mesh-stat {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  margin-bottom: 4px;
}

.stat-lbl {
  color: var(--vp-c-text-3);
}

.stat-val {
  color: var(--vp-c-text-2);
}

.text-green {
  color: #10b981;
}

@media (max-width: 640px) {
  .hero-showcase-container {
    padding: 0 10px;
    margin: 16px auto 0 auto;
  }
  .card-header {
    padding: 6px 8px;
    flex-direction: column;
    align-items: stretch;
  }
  .window-controls {
    display: none;
  }
  .tab-switcher {
    width: 100%;
  }
  .status-indicator {
    align-self: flex-end;
    font-size: 9px;
  }
  .card-body {
    padding: 10px;
  }
  .code-line.prompt {
    padding: 6px 8px;
  }
  .command-text {
    font-size: 11px;
  }
  .log-stream {
    font-size: 10.5px;
    gap: 5px;
  }
  .log-prefix {
    min-width: 58px;
    font-size: 9px;
  }
  .tunnel-mesh-grid {
    grid-template-columns: 1fr;
  }
}
</style>
