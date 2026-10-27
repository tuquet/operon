// Prevent Windows EPERM unlink error on .temp directory during VitePress build
process.env.DEBUG = process.env.DEBUG || '1'

import { defineConfig } from 'vitepress'
import brand from './brand.config.json'

// 1. Standalone Microservice Sidebars (Decoupled & Isolated)
const browserSidebar = [
  {
    text: 'Stealth Browser',
    collapsed: false,
    items: [
      { text: 'Runtime & Sandbox', link: '/en/browser/' },
      { text: 'Profile Isolation', link: '/en/browser/profiles' },
      { text: 'Fingerprint Masking', link: '/en/browser/fingerprinting' },
      { text: 'Human Bézier Dynamics', link: '/en/browser/human-behavior' },
    ],
  },
]

const automationSidebar = [
  {
    text: 'Automation Engine',
    collapsed: false,
    items: [
      { text: 'Workflow Automation', link: '/en/automation/' },
      { text: 'Headless Stealth Mode', link: '/en/automation/stealth-headless' },
      { text: 'Native Rust CDP Protocol', link: '/en/automation/cdp' },
      { text: 'Block Coverage & Automa Parity', link: '/en/automation/blocks' },
      { text: 'SPEC: Execution Orchestration (Queue → Worker → Scheduler)', link: '/en/automation/SPEC-automation-execution' },
    ],
  },
]

const gatewaySidebar = [
  {
    text: 'Network Gateway',
    collapsed: false,
    items: [
      { text: 'SOCKS5 & HTTP Tunnels', link: '/en/gateway/' },
      { text: 'Priority & Roadmap', link: '/en/gateway/roadmap' },
      { text: 'Multi-Server Mesh', link: '/en/gateway/mesh' },
      { text: 'WebRTC Leak Shield', link: '/en/gateway/webrtc' },
    ],
  },
]

const workerSidebar = [
  {
    text: 'Distributed Worker',
    collapsed: false,
    items: [
      { text: 'Workstation Daemon & HTTP API', link: '/en/worker/' },
    ],
  },
]

const cloudSidebar = [
  {
    text: 'Cloud & Desktop Control Plane',
    collapsed: false,
    items: [
      { text: 'Universal Control Plane & Multi-Tenancy', link: '/en/cloud/' },
      { text: 'Database & Plugin Architecture', link: '/en/cloud/architecture' },
      { text: 'Domain & Terminology Dictionary', link: '/en/cloud/terminology' },
      { text: 'Test Presets & Verification Guide', link: '/en/cloud/test-presets' },
      { text: 'Encrypted Secret Store (SPEC)', link: '/en/cloud/specs/SPEC-secret-store' },
    ],
  },
]

const adminSidebar = [
  {
    text: 'Admin Portal',
    items: [
      { text: 'Overview & SSOT', link: '/en/admin/' },
    ],
  },
  {
    text: 'Architecture',
    collapsed: false,
    items: [
      { text: 'System Architecture', link: '/en/admin/architecture/overview' },
      { text: 'Design Tokens & Styling', link: '/en/admin/architecture/styling-guide' },
    ],
  },
  {
    text: 'Architecture Decisions (ADRs)',
    collapsed: false,
    items: [
    ],
  },
  {
    text: 'Route Modules',
    collapsed: false,
    items: [
      { text: 'Overview & Matrix', link: '/en/admin/routes/' },
      { text: 'Authentication (Auth)', link: '/en/admin/routes/auth' },
      { text: 'Analytics Dashboard', link: '/en/admin/routes/dashboard' },
      { text: 'Tenants & Workspaces', link: '/en/admin/routes/tenants' },
      { text: 'Automation Subsystem', link: '/en/admin/routes/automation' },
      { text: 'Digital Commerce', link: '/en/admin/routes/commerce' },
      { text: 'System & Governance', link: '/en/admin/routes/system' },
    ],
  },
  {
    text: 'Milestones & Phases',
    collapsed: true,
    items: [
    ],
  },
  {
    text: 'Technical Specifications (SPECs)',
    collapsed: true,
    items: [
      { text: 'Capability Map (Admin Web)', link: '/en/admin/specs/CAPABILITY-map-web-admin' },
      { text: 'Capability Map (Tauri Desktop)', link: '/en/admin/specs/CAPABILITY-map-web-admin-tauri-desktop' },
      { text: 'SPEC: Platform Foundation', link: '/en/admin/specs/SPEC-core-platform-foundation' },
      { text: 'SPEC: Route Foundation', link: '/en/admin/specs/SPEC-core-route-foundation' },
      { text: 'SPEC: Data Access Layer', link: '/en/admin/specs/SPEC-core-data-access' },
      { text: 'SPEC: Superadmin Routes', link: '/en/admin/specs/SPEC-system-superadmin-routes' },
      { text: 'SPEC: Tenants Source of Truth', link: '/en/admin/specs/SPEC-tenants-management-truth' },
      { text: 'SPEC: UI Information Deduplication', link: '/en/admin/specs/SPEC-ui-info-deduplication' },
      { text: 'SPEC: System Dashboard', link: '/en/admin/specs/SPEC-system-dashboard' },
      { text: 'SPEC: System Catalog', link: '/en/admin/specs/SPEC-system-catalog' },
      { text: 'SPEC: Automation Dashboard', link: '/en/admin/specs/SPEC-automation-dashboard' },
      { text: 'SPEC: Automation Jobs', link: '/en/admin/specs/SPEC-automation-jobs' },
      { text: 'SPEC: Automation Browsers', link: '/en/admin/specs/SPEC-automation-browsers' },
      { text: 'SPEC: Automation Devices', link: '/en/admin/specs/SPEC-automation-devices' },
      { text: 'SPEC: Automation Proxies', link: '/en/admin/specs/SPEC-automation-proxies' },
      { text: 'SPEC: Workflow Mobile First', link: '/en/admin/specs/SPEC-automation-workflow-mobile-first' },
      { text: 'SPEC: Digital Commerce', link: '/en/admin/specs/SPEC-commerce-digital-store' },
      { text: 'SPEC: Payment Gateway', link: '/en/admin/specs/SPEC-commerce-payment-gateway' },
      { text: 'SPEC: Public Storefront', link: '/en/admin/specs/SPEC-commerce-public-storefront' },
      { text: 'SPEC: Admin Commerce Portal', link: '/en/admin/specs/SPEC-commerce-admin-portal' },
      { text: 'SPEC: Layout Preferences Coherence', link: '/en/admin/specs/SPEC-ui-layout-preferences' },
      { text: 'SPEC: Vxe Cell Renderers', link: '/en/admin/specs/SPEC-ui-vxe-cell-renderers' },
      { text: 'SPEC: Mobile Vxe Detail Sheet', link: '/en/admin/specs/SPEC-ui-mobile-vxe-detail-sheet' },
      { text: 'SPEC: Browser Error Observability', link: '/en/admin/specs/SPEC-cross-error-observability' },
      { text: 'SPEC: Enum Constants SSOT', link: '/en/admin/specs/SPEC-core-enum-constants-ssot' },
      { text: 'SPEC: i18n EN/VI Localization', link: '/en/admin/specs/SPEC-cross-i18n-en-vi' },
      { text: 'SPEC: Tauri Desktop Integration', link: '/en/admin/specs/SPEC-cross-tauri-desktop' },
      { text: 'SPEC: CI/CD Public Release', link: '/en/admin/specs/SPEC-ops-cicd-public-release' },
    ],
  },
]

// 2. CLI Sidebars
const cliSidebar = [
  {
    text: 'Getting Started',
    collapsed: false,
    items: [
      { text: 'Platform Overview', link: '/en/cli/' },
      { text: 'Quickstart (15s)', link: '/en/cli/start/quickstart' },
      { text: 'Installation Guide', link: '/en/cli/start/installation' },
      { text: 'First Profile Setup', link: '/en/cli/start/first-profile' },
      { text: 'System Diagnostics', link: '/en/cli/start/diagnostics' },
    ],
  },
  {
    text: 'Command Reference',
    collapsed: false,
    items: [
      { text: 'Commands Catalog', link: '/en/cli/commands/' },
    ],
  },
  {
    text: 'Combat Playbooks',
    collapsed: false,
    items: [
      { text: 'Affiliate & Media Buying', link: '/en/cli/playbooks/affiliate' },
      { text: 'E-commerce & Dropshipping', link: '/en/cli/playbooks/ecommerce' },
      { text: 'Web Scraping & Data Mining', link: '/en/cli/playbooks/scraping' },
      { text: 'Social Media Management', link: '/en/cli/playbooks/smm' },
      { text: 'Crypto & Airdrop Farming', link: '/en/cli/playbooks/crypto' },
    ],
  },
  {
    text: 'Identity & AI Protocol',
    collapsed: false,
    items: [
      { text: 'Personas & CCCD Generator', link: '/en/cli/faker/' },
      { text: 'AI Agent & MCP Protocol', link: '/en/cli/skills/' },
      { text: 'Agent Rules & Strict SSOT', link: '/en/cli/skills/agent-rules' },
    ],
  },
]

const cliCommandsSidebar = [
  {
    text: 'CLI',
    items: [
      { text: '← Back to CLI Docs', link: '/en/cli/' },
    ],
  },
  {
    text: 'Commands Catalog',
    items: [
      { text: 'Core Commands Overview', link: '/en/cli/commands/' },
      { text: '1. opn auth (IAM & Context)', link: '/en/cli/commands/#_1-opn-auth-authentication-session-context' },
      { text: '2. opn worker (Fleet Worker)', link: '/en/cli/commands/#_2-opn-worker-execution-node-fleet-worker' },
      { text: '3. opn automation (Workflows)', link: '/en/cli/commands/#_3-opn-automation-workflow-automation-orchestration' },
      { text: '4. opn gateway (Network Mesh)', link: '/en/cli/commands/#_4-opn-gateway-secure-network-vps-mesh' },
      { text: '7. opn secret (Secret Store)', link: '/en/cli/commands/#_7-opn-secret-encrypted-secret-store' },
    ],
  },
]

// 3. Combat Playbooks Sidebar
const playbooksSidebar = [
  {
    text: 'Combat Playbooks',
    collapsed: false,
    items: [
      { text: 'Affiliate & Media Buying', link: '/en/cli/playbooks/affiliate' },
      { text: 'E-commerce & Dropshipping', link: '/en/cli/playbooks/ecommerce' },
      { text: 'Web Scraping & Data Mining', link: '/en/cli/playbooks/scraping' },
      { text: 'Social Media Management', link: '/en/cli/playbooks/smm' },
      { text: 'Crypto & Airdrop Farming', link: '/en/cli/playbooks/crypto' },
    ],
  },
  {
    text: 'CLI',
    items: [
      { text: '← Back to CLI Docs', link: '/en/cli/' },
    ],
  },
]

export default defineConfig({
  base: '/',
  lastUpdated: true,
  cleanUrls: true,
  appearance: 'dark',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#09090b' }],
    [
      'script',
      { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-WR1GB6XR29' },
    ],
    [
      'script',
      {},
      `window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'G-WR1GB6XR29');`,
    ],
  ],

  lang: 'en-US',
  title: 'Docs',
  description: 'Central documentation portal across open-source software, automation, and developer tooling.',

  themeConfig: {
    siteTitle: 'Docs',
    logo: '/logo.svg',

        nav: [
      {
        text: 'Core Services',
        items: [
          { text: 'Stealth Chromium Browser', link: '/en/browser/' },
          { text: 'Automation Engine', link: '/en/automation/' },
          { text: 'Network Gateway', link: '/en/gateway/' },
          { text: 'Distributed Worker', link: '/en/worker/' },
          { text: 'Cloud Control Plane', link: '/en/cloud/' },
          { text: 'Admin Portal & Control Center', link: '/en/admin/' },
        ],
        activeMatch: '^/en/(browser|automation|worker|gateway|cloud|admin)/',
      },
      {
        text: 'CLI Tooling',
        items: [
          { text: 'Platform Overview', link: '/en/cli/' },
          { text: 'Quickstart (15s)', link: '/en/cli/start/quickstart' },
          { text: 'Installation Guide', link: '/en/cli/start/installation' },
          { text: 'Commands Reference', link: '/en/cli/commands/' },
          { text: 'Combat Playbooks', link: '/en/cli/playbooks/affiliate' },
          { text: 'AI Agent & MCP Protocol', link: '/en/cli/skills/' },
        ],
        activeMatch: '^/en/cli/',
      },
    ],

        sidebar: {
      '/en/browser/': browserSidebar,
      '/en/automation/': automationSidebar,
      '/en/gateway/': gatewaySidebar,
      '/en/worker/': workerSidebar,
      '/en/cloud/': cloudSidebar,
      '/en/admin/': adminSidebar,
      '/en/cli/': cliSidebar,
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/operon' },
    ],
  },

  vite: {
    plugins: [
      {
        name: 'vitepress-brand-macro',
        enforce: 'pre',
        transform(code: string, id: string) {
          if (id.endsWith('.md')) {
            return code
              .replace(/\{\{\s*PRODUCT_NAME\s*\}\}/g, brand.productName)
              .replace(/\{\{\s*CLI_CMD\s*\}\}/g, brand.cliAlias)
              .replace(/\{\{\s*CORE_CMD\s*\}\}/g, brand.canonicalRoot)
              .replace(/\{\{\s*TAGLINE\s*\}\}/g, brand.tagline)
              .replace(/\{\{\s*ORG_NAME\s*\}\}/g, brand.organization)
              .replace(/__PRODUCT__/g, brand.productName)
              .replace(/__CLI__/g, brand.cliAlias)
              .replace(/__CORE__/g, brand.canonicalRoot)
              .replace(/__TAGLINE__/g, brand.tagline)
              .replace(/__ORG__/g, brand.organization);
          }
        },
      },
    ],
  },
})