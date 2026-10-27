<script setup lang="ts">
import { computed } from 'vue'
import { withBase, useData } from 'vitepress'
import { useSidebar } from 'vitepress/theme'
import { ShieldCheck, ExternalLink, Globe } from 'lucide-vue-next'

const { hasSidebar } = useSidebar()
const { lang, page } = useData()

const isVi = computed(() => {
  return (
    lang.value === 'vi-VN' ||
    (page.value?.relativePath && page.value.relativePath.startsWith('vi'))
  )
})
</script>

<template>
  <footer class="site-footer" :class="{ 'has-sidebar': hasSidebar }">
    <div class="footer-divider"></div>

    <div class="footer-content">
      <!-- Brand & Mission Column -->
      <div class="footer-brand-col">
        <div class="brand-title-row">
          <div class="brand-symbol">TQ</div>
          <span class="brand-name">{{ isVi ? 'Tài Liệu Operon' : 'Docs' }}</span>
        </div>
        <p class="brand-tagline">
          {{
            isVi
              ? 'Cổng tài liệu kỹ thuật tập trung và hướng dẫn phát triển cho hệ sinh thái phần mềm mã nguồn mở Operon, tự động hóa và công cụ lập trình.'
              : 'Central documentation portal and developer guides across the open-source ecosystem, stealth automation, and developer tooling.'
          }}
        </p>

        <!-- Live Operational Health Chip -->
        <div class="health-chip">
          <ShieldCheck :size="12" class="text-green" aria-hidden="true" />
          <span class="health-text">
            {{ isVi ? '100% Mã Nguồn Mở · Không Thu Thập Dữ Liệu' : '100% Free & Open-Source · Zero Telemetry' }}
          </span>
        </div>

        <!-- Ecosystem Home Portal Link -->
        <a href="https://operon.com" target="_blank" rel="noopener" class="home-chip">
          <Globe :size="12" aria-hidden="true" />
          <span>{{ isVi ? 'Trang chủ hệ sinh thái operon.com' : 'Ecosystem portal operon.com' }}</span>
          <ExternalLink :size="10" aria-hidden="true" />
        </a>
      </div>

      <!-- Navigation Columns -->
      <div class="footer-nav-grid">
        <!-- Col 1: Ecosystem Products -->
        <div class="nav-col">
          <div class="nav-heading">{{ isVi ? 'SẢN PHẨM HỆ SINH THÁI' : 'ECOSYSTEM PRODUCTS' }}</div>
          <ul class="nav-list">
            <li>
              <a :href="withBase('/en/cli/')">CLI</a>
            </li>
            <li>
              <a :href="withBase('/en/chatops/')">Telegram ChatOps</a>
            </li>
            <li>
              <a :href="withBase('/en/storage/')">Storage Hub</a>
            </li>
            <li>
              <a :href="withBase('/en/yak-map/')">Yak Map Graph</a>
            </li>
            <li>
              <a :href="withBase('/en/library/')">UI Library</a>
            </li>
            <li>
              <a :href="withBase('/en/claude-agy/')">Claude-Agy Accelerator</a>
            </li>
          </ul>
        </div>

        <!-- Col 2: Standalone Microservices & Features -->
        <div class="nav-col">
          <div class="nav-heading">{{ isVi ? 'TỰ ĐỘNG HÓA & DỊCH VỤ' : 'STANDALONE SERVICES' }}</div>
          <ul class="nav-list">
            <li><a :href="withBase('/en/browser/')">Stealth Chromium Runtime</a></li>
            <li><a :href="withBase('/en/browser/fingerprinting')">Fingerprint Masking</a></li>
            <li><a :href="withBase('/en/automation/')">Automation Engine</a></li>
            <li><a :href="withBase('/en/worker/')">Workstation Worker</a></li>
            <li><a :href="withBase('/en/gateway/')">Mesh Gateway</a></li>
            <li><a :href="withBase('/en/cloud/')">Cloud Center & RBAC</a></li>
          </ul>
        </div>

        <!-- Col 3: Reference & Guides -->
        <div class="nav-col">
          <div class="nav-heading">{{ isVi ? 'HƯỚNG DẪN & TRA CỨU' : 'GUIDES & REFERENCE' }}</div>
          <ul class="nav-list">
            <li>
              <a :href="withBase('/en/cli/start/quickstart')">{{ isVi ? 'Bắt Đầu Nhanh (15s)' : 'Quickstart (15s)' }}</a>
            </li>
            <li>
              <a :href="withBase('/en/cli/commands/')">{{ isVi ? 'Tra Cứu 68 Lệnh CLI' : '68 CLI Commands' }}</a>
            </li>
            <li>
              <a :href="withBase('/en/cli/start/diagnostics')">{{ isVi ? 'Chẩn Đoán (Doctor)' : 'Diagnostics (Doctor)' }}</a>
            </li>
            <li>
              <a :href="withBase('/en/cli/figures/')">{{ isVi ? '30 Sơ Đồ Động (Figures)' : 'Interactive Figures (30)' }}</a>
            </li>
            <li>
              <a :href="withBase('/en/cli/start/first-profile')">{{ isVi ? 'Khởi Tạo Profile' : 'First Profile Setup' }}</a>
            </li>
          </ul>
        </div>

        <!-- Col 4: Community & Repos -->
        <div class="nav-col">
          <div class="nav-heading">{{ isVi ? 'CỘNG ĐỒNG & MÃ NGUỒN' : 'COMMUNITY & SOURCE' }}</div>
          <ul class="nav-list">
            <li>
              <a href="https://operon.com" target="_blank" rel="noopener" class="ext-link">
                {{ isVi ? 'Trang Chủ Operon' : 'Home' }}
                <ExternalLink :size="10" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a href="https://github.com/operon" target="_blank" rel="noopener" class="ext-link">
                GitHub: operon
                <ExternalLink :size="10" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a href="https://github.com/operon/scoop-bucket" target="_blank" rel="noopener" class="ext-link">
                Scoop Package Bucket
                <ExternalLink :size="10" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a href="https://github.com/operon/docs" target="_blank" rel="noopener" class="ext-link">
                Documentation Repo
                <ExternalLink :size="10" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a href="https://github.com/operon/cli" target="_blank" rel="noopener" class="ext-link">
                CLI Repo
                <ExternalLink :size="10" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Bottom Legal / GitHub Bar -->
    <div class="footer-bottom">
      <div class="bottom-inner">
        <p class="copyright-text">
          &copy; 2026 Ecosystem. 100% Free &amp; Open-Source.
        </p>

        <div class="bottom-links">
          <a href="https://operon.com" target="_blank" rel="noopener" class="ext-link">
            operon.com
            <ExternalLink :size="10" aria-hidden="true" />
          </a>
          <span class="link-sep">&bull;</span>
          <a href="https://github.com/operon" target="_blank" rel="noopener" class="ext-link">
            GitHub
            <ExternalLink :size="10" aria-hidden="true" />
          </a>
          <span class="link-sep">&bull;</span>
          <a :href="withBase('/en/')">English</a>
          <span class="link-sep">&bull;</span>
          <a :href="withBase('/vi/')">Tiếng Việt</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: var(--vp-c-bg-alt);
  border-top: 1px solid var(--vp-c-border);
  position: relative;
  z-index: 10;
  margin-top: 48px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-sizing: border-box;
  transition: padding-left 0.25s ease, padding-right 0.25s ease;
}

@media (min-width: 960px) {
  .site-footer.has-sidebar {
    padding-left: var(--vp-sidebar-width);
  }
}

@media (min-width: 1440px) {
  .site-footer.has-sidebar {
    padding-left: calc((100vw - var(--vp-layout-max-width)) / 2 + var(--vp-sidebar-width));
    padding-right: calc((100vw - var(--vp-layout-max-width)) / 2);
  }
}

@media (max-width: 1240px) {
  .site-footer.has-sidebar .footer-content {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .site-footer.has-sidebar .footer-nav-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

.footer-divider {
  width: 100%;
  height: 1px;
  background: var(--vp-c-border);
}

.footer-content {
  max-width: 1140px;
  margin: 0 auto;
  padding: 40px 16px;
  display: grid;
  grid-template-columns: 290px 1fr;
  gap: 36px;
}

.footer-brand-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-symbol {
  width: 28px;
  height: 28px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  color: var(--vp-c-brand-1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 11px;
  letter-spacing: -0.5px;
}

.brand-name {
  font-weight: 700;
  font-size: 16px;
  color: var(--vp-c-text-1);
  letter-spacing: -0.02em;
}

.brand-tagline {
  color: var(--vp-c-text-2);
  font-size: 12.5px;
  line-height: 1.55;
  margin: 0;
}

.health-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 5px;
  width: fit-content;
}

.text-green {
  color: #10b981;
}

.health-text {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.home-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 5px;
  width: fit-content;
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.home-chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.footer-nav-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.nav-heading {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-list a {
  color: var(--vp-c-text-2);
  font-size: 12.5px;
  text-decoration: none;
  transition: color 0.15s ease;
}

.nav-list a:hover {
  color: var(--vp-c-text-1);
}

.footer-bottom {
  border-top: 1px solid var(--vp-c-border);
  padding: 16px;
}

.bottom-inner {
  max-width: 1140px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.copyright-text {
  color: var(--vp-c-text-3);
  font-size: 11.5px;
  margin: 0;
}

.bottom-links {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11.5px;
}

.bottom-links a {
  color: var(--vp-c-text-2);
  text-decoration: none;
}

.ext-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.bottom-links a:hover {
  color: var(--vp-c-text-1);
}

.link-sep {
  color: var(--vp-c-border);
}

@media (max-width: 900px) {
  .footer-content {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 32px 16px;
  }
  .footer-nav-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (max-width: 640px) {
  .site-footer {
    margin-top: 32px;
  }
  .footer-content {
    padding: 24px 12px;
    gap: 20px;
  }
  .footer-nav-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .footer-bottom {
    padding: 12px;
  }
  .bottom-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
