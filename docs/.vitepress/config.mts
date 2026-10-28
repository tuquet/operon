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

const consoleSidebar = [
  {
    text: 'Console Portal',
    items: [
      { text: 'Overview & SSOT', link: '/en/console/' },
    ],
  },
  {
    text: 'Architecture',
    collapsed: false,
    items: [
      { text: 'System Architecture', link: '/en/console/architecture/overview' },
      { text: 'Design Tokens & Styling', link: '/en/console/architecture/styling-guide' },
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
      { text: 'Overview & Matrix', link: '/en/console/routes/' },
      { text: 'Authentication (Auth)', link: '/en/console/routes/auth' },
      { text: 'Analytics Dashboard', link: '/en/console/routes/dashboard' },
      { text: 'Automation Subsystem', link: '/en/console/routes/automation' },
      { text: 'System & Governance', link: '/en/console/routes/system' },
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
      { text: 'Capability Map (Admin Web)', link: '/en/console/specs/CAPABILITY-map-web-admin' },
      { text: 'Capability Map (Tauri Desktop)', link: '/en/console/specs/CAPABILITY-map-web-admin-tauri-desktop' },
      { text: 'SPEC: Platform Foundation', link: '/en/console/specs/SPEC-core-platform-foundation' },
      { text: 'SPEC: Route Foundation', link: '/en/console/specs/SPEC-core-route-foundation' },
      { text: 'SPEC: Data Access Layer', link: '/en/console/specs/SPEC-core-data-access' },
      { text: 'SPEC: Superadmin Routes', link: '/en/console/specs/SPEC-system-superadmin-routes' },
      { text: 'SPEC: UI Information Deduplication', link: '/en/console/specs/SPEC-ui-info-deduplication' },
      { text: 'SPEC: System Dashboard', link: '/en/console/specs/SPEC-system-dashboard' },
      { text: 'SPEC: System Catalog', link: '/en/console/specs/SPEC-system-catalog' },
      { text: 'SPEC: Automation Dashboard', link: '/en/console/specs/SPEC-automation-dashboard' },
      { text: 'SPEC: Automation Jobs', link: '/en/console/specs/SPEC-automation-jobs' },
      { text: 'SPEC: Automation Browsers', link: '/en/console/specs/SPEC-automation-browsers' },
      { text: 'SPEC: Automation Devices', link: '/en/console/specs/SPEC-automation-devices' },
      { text: 'SPEC: Automation Proxies', link: '/en/console/specs/SPEC-automation-proxies' },
      { text: 'SPEC: Workflow Mobile First', link: '/en/console/specs/SPEC-automation-workflow-mobile-first' },
      { text: 'SPEC: Layout Preferences Coherence', link: '/en/console/specs/SPEC-ui-layout-preferences' },
      { text: 'SPEC: Vxe Cell Renderers', link: '/en/console/specs/SPEC-ui-vxe-cell-renderers' },
      { text: 'SPEC: Mobile Vxe Detail Sheet', link: '/en/console/specs/SPEC-ui-mobile-vxe-detail-sheet' },
      { text: 'SPEC: Browser Error Observability', link: '/en/console/specs/SPEC-cross-error-observability' },
      { text: 'SPEC: Enum Constants SSOT', link: '/en/console/specs/SPEC-core-enum-constants-ssot' },
      { text: 'SPEC: i18n EN/VI Localization', link: '/en/console/specs/SPEC-cross-i18n-en-vi' },
      { text: 'SPEC: Tauri Desktop Integration', link: '/en/console/specs/SPEC-cross-tauri-desktop' },
      { text: 'SPEC: CI/CD Public Release', link: '/en/console/specs/SPEC-ops-cicd-public-release' },
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
    text: 'Identity & AI Protocol',
    collapsed: false,
    items: [
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
      { text: '7. opn secret (Secret Store)', link: '/en/cli/commands/#_7-opn-secret-encrypted-secret-store' },
    ],
  },
]

// 3. Combat Playbooks Sidebar
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
          { text: 'Distributed Worker', link: '/en/worker/' },
          { text: 'Cloud Control Plane', link: '/en/cloud/' },
          { text: 'Console Portal & Control Center', link: '/en/console/' },
        ],
        activeMatch: '^/en/(browser|automation|worker|cloud|console)/',
      },
      {
        text: 'CLI Tooling',
        items: [
          { text: 'Platform Overview', link: '/en/cli/' },
          { text: 'Quickstart (15s)', link: '/en/cli/start/quickstart' },
          { text: 'Installation Guide', link: '/en/cli/start/installation' },
          { text: 'Commands Reference', link: '/en/cli/commands/' },
          { text: 'AI Agent & MCP Protocol', link: '/en/cli/skills/' },
        ],
        activeMatch: '^/en/cli/',
      },
    ],

        sidebar: {
      '/en/browser/': browserSidebar,
      '/en/automation/': automationSidebar,
      '/en/worker/': workerSidebar,
      '/en/cloud/': cloudSidebar,
      '/en/console/': consoleSidebar,
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