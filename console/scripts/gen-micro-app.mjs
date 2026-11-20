#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.env.OPERON_ROOT
  ? resolve(process.env.OPERON_ROOT)
  : process.cwd();
const rawName = process.argv[2]?.trim();

if (!rawName) {
  console.error('[Error] Please provide a micro-app name:');
  console.error('  pnpm gen:app <app-name>');
  console.error('Example: pnpm gen:app workflows');
  process.exit(1);
}

const name = rawName
  .toLowerCase()
  .replaceAll(/[^a-z0-9-]/g, '-')
  .replaceAll(/^-+|-+$/g, '');

const camelName = name.replaceAll(/-([a-z0-9])/g, (_, char) =>
  char.toUpperCase(),
);
const pascalName = camelName.charAt(0).toUpperCase() + camelName.slice(1);
const titleName = name
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const appDir = join(root, 'apps', name);

if (existsSync(appDir)) {
  console.error(`[Error] App directory "apps/${name}" already exists!`);
  process.exit(1);
}

// 1. Calculate next port
const appsDir = join(root, 'apps');
const existingApps = readdirSync(appsDir);
let maxPort = 5320;

for (const app of existingApps) {
  const viteConfigPath = join(appsDir, app, 'vite.config.ts');
  if (existsSync(viteConfigPath)) {
    const content = readFileSync(viteConfigPath, 'utf8');
    const match = content.match(/port:\s*(\d+)/);
    if (match) {
      const port = Number.parseInt(match[1], 10);
      if (port > maxPort) maxPort = port;
    }
  }
}

const nextPort = maxPort + 1;
console.log(
  `[Scaffold] Creating micro-app "@operon/${name}" on dev port ${nextPort}...`,
);

// Helper to create directory & file
function makeFile(relPath, content) {
  const fullPath = join(appDir, relPath);
  const dir = resolve(fullPath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content.trimStart(), 'utf8');
}

// 2. Generate Files in apps/<name>
makeFile(
  'package.json',
  `${JSON.stringify(
    {
      name: `@operon/${name}`,
      version: '0.1.0',
      homepage: 'https://operon.com',
      repository: {
        type: 'git',
        url: 'git+https://github.com/operon/console.git',
        directory: `apps/${name}`,
      },
      license: 'MIT',
      author: 'operon',
      type: 'module',
      scripts: {
        build: 'vite build',
        dev: `vite --port ${nextPort} --host`,
        preview: 'vite preview',
        typecheck: 'vue-tsc --noEmit --skipLibCheck',
      },
      imports: {
        '#/*': './src/*',
      },
      exports: {
        '.': './src/remote-entry.ts',
        './remote-entry': './src/remote-entry.ts',
        './views/*': './src/views/*',
      },
      dependencies: {
        '@lucide/vue': 'catalog:',
        '@operon-core/shadcn-ui': 'workspace:*',
        '@operon/kernel': 'workspace:*',
        '@operon/locales': 'workspace:*',
        '@operon/preferences': 'workspace:*',
        '@operon/styles': 'workspace:*',
        '@operon/types': 'workspace:*',
        pinia: 'catalog:',
        vue: 'catalog:',
        'vue-router': 'catalog:',
      },
      devDependencies: {
        '@operon/vite-config': 'workspace:*',
        vite: 'catalog:',
        'vue-tsc': 'catalog:',
      },
    },
    null,
    2,
  )}\n`,
);

makeFile(
  'tsconfig.json',
  `${JSON.stringify(
    {
      extends: '@operon/tsconfig/vue-app.json',
      include: ['src/**/*', 'src/**/*.vue'],
      compilerOptions: {
        composite: true,
        baseUrl: '.',
        paths: {
          '#/*': ['./src/*'],
        },
      },
    },
    null,
    2,
  )}\n`,
);

makeFile(
  'tsconfig.node.json',
  `${JSON.stringify(
    {
      extends: '@operon/tsconfig/node.json',
      include: ['vite.config.ts'],
    },
    null,
    2,
  )}\n`,
);

makeFile(
  'vite.config.ts',
  `import { defineConfig } from '@operon/vite-config';

export default defineConfig(async () => {
  return {
    application: {
      html: true,
      pwa: false,
    },
    vite: {
      server: {
        cors: true,
        host: true,
        port: ${nextPort},
      },
    },
  };
});
`,
);

makeFile(
  'index.html',
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@operon/${name} Dev Sandbox</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
);

makeFile(
  'README.md',
  `# @operon/${name}

${titleName} micro-app (\`${name}:*\` Pinia stores, \`src/manifest.ts\` routes, \`useKernel()\` host bridge).

\`\`\`sh
pnpm dev:${name}   # Standalone mock-host sandbox (port ${nextPort})
pnpm dev:shell    # Embedded at /${name}
\`\`\`
`,
);

makeFile(
  'src/main.ts',
  `import { bootstrap } from './bootstrap';

void bootstrap();
`,
);

makeFile(
  'src/locales/index.ts',
  `import type { App } from 'vue';

import type { SupportedLanguagesType } from '@operon/locales';

import {
  $t,
  setupI18n as coreSetup,
  loadLocalesMapFromDir,
  registerLocaleMessages,
} from '@operon/locales';
import { preferences } from '@operon/preferences';

const APP_LOCALE_ID = '${name}';

const modules = import.meta.glob('./langs/**/*.json');

const localesMap = loadLocalesMapFromDir(
  /\\.\\/langs\\/([^/]+)\\/(.*)\\.json$/,
  modules,
);

async function loadMessages(lang: SupportedLanguagesType) {
  const appLocaleMessages = await localesMap[lang]?.();
  return appLocaleMessages?.default;
}

export async function setupAppLocales() {
  await registerLocaleMessages(APP_LOCALE_ID, loadMessages);
}

export async function setupStandaloneI18n(app: App) {
  await coreSetup(app, {
    defaultLocale: preferences.app.locale,
    loadMessages,
    missingWarn: !import.meta.env.PROD,
  });
}

export { $t };
`,
);

makeFile(
  `src/locales/langs/en-US/${name}.json`,
  `${JSON.stringify(
    {
      title: `${titleName} Micro-App`,
      description: `Scaffolded autonomous micro-frontend running on port ${nextPort}.`,
      test_toast_btn: 'Test Shell Toast',
    },
    null,
    2,
  )}\n`,
);

makeFile(
  `src/locales/langs/vi-VN/${name}.json`,
  `${JSON.stringify(
    {
      title: `Phân hệ ${titleName}`,
      description: `Micro-frontend độc lập khởi chạy trên cổng ${nextPort}.`,
      test_toast_btn: 'Kiểm tra thông báo Shell',
    },
    null,
    2,
  )}\n`,
);

makeFile(
  'src/bootstrap.ts',
  `import { createApp, h } from 'vue';
import { createRouter, createWebHistory, RouterView } from 'vue-router';

import { createMockKernel, KERNEL_INJECTION_KEY } from '@operon/kernel';
import { initPreferences } from '@operon/preferences';
import '@operon/styles';

import { createPinia } from 'pinia';

import { $t, setupStandaloneI18n } from './locales';
import { ${camelName}Manifest } from './manifest';

export async function bootstrap(namespace = 'operon-${name}-dev') {
  await initPreferences({
    namespace,
  });

  const app = createApp({ render: () => h(RouterView) });
  await setupStandaloneI18n(app);

  const pinia = createPinia();
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        component: { render: () => h(RouterView) },
        redirect: \`/\${${camelName}Manifest.defaultPath}\`,
        children: ${camelName}Manifest.routes($t),
      },
    ],
  });

  const mockKernel = createMockKernel();
  app.provide(KERNEL_INJECTION_KEY, mockKernel);

  app.use(pinia);
  app.use(router);
  await router.isReady();
  app.mount('#app');
}
`,
);

makeFile(
  'src/manifest.ts',
  `import type { RouteRecordRaw } from 'vue-router';

import { setupAppLocales } from './locales';

/**
 * Manifest definitions for @operon/${name}
 */
export const ${camelName}Manifest = {
  id: '${name}',
  name: '${titleName}',
  defaultPath: 'overview',
  setupLocales: setupAppLocales,
  routes(t: (key: string) => string): RouteRecordRaw[] {
    return [
      {
        name: '${pascalName}Overview',
        path: 'overview',
        component: () => import('./views/index.vue'),
        meta: {
          authority: ['superadmin', 'local_operator'],
          icon: 'lucide:layers',
          plugin: 'operon',
          title: t('page.${name}.overview'),
        },
      },
    ];
  },
};
`,
);

makeFile(
  'src/remote-entry.ts',
  `export { ${camelName}Manifest } from './manifest';
`,
);

makeFile(
  'src/stores/sample.ts',
  `import { ref } from 'vue';

import { definePersistedState } from '@operon/kernel';

import { defineStore } from 'pinia';

export const use${pascalName}Store = defineStore(
  'operon-${name}-sample',
  () => {
    const counter = ref(0);
    function increment() {
      counter.value += 1;
    }
    return { counter, increment };
  },
  {
    persist: definePersistedState({
      namespace: '${name}',
      storage: 'localStorage',
    }),
  },
);
`,
);

makeFile(
  'src/views/index.vue',
  `<script lang="ts" setup>
import { computed } from 'vue';

import { useKernel } from '@operon/kernel';

import { Badge, Button, Card } from '@operon-core/shadcn-ui';

import { CheckCircle2, Cloud, Cpu, Layers, Sparkles } from '@lucide/vue';

import { $t } from '../locales';
import { use${pascalName}Store } from '../stores/sample';

defineOptions({ name: '${pascalName}OverviewView' });

const kernel = useKernel();
const store = use${pascalName}Store();

const isCloud = computed(() => kernel.auth.hasCloudAuth);

function handleNotify() {
  const msg = \`Notification from @operon/${name}! Counter: \${store.counter}\`;
  kernel.events.notify('success', msg);
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5"
    >
      <div>
        <div class="flex items-center gap-2.5">
          <Layers class="size-6 text-primary" />
          <h2 class="text-xl font-semibold tracking-tight">
            {{ $t('${name}.title') }}
          </h2>
          <Badge
            variant="outline"
            class="text-xs px-2 py-0.5"
            :class="
              isCloud
                ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                : 'border-zinc-500/30 text-zinc-400 bg-zinc-500/10'
            "
          >
            <Cloud v-if="isCloud" class="size-3 mr-1" />
            <Cpu v-else class="size-3 mr-1" />
            {{ isCloud ? 'Cloud Synced' : 'Local / Standalone Mode' }}
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground mt-1">
          {{ $t('${name}.description') }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button size="sm" variant="outline" @click="handleNotify">
          <Sparkles class="size-3.5 mr-1.5" />
          {{ $t('${name}.test_toast_btn') }}
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div class="flex items-center justify-between pb-3">
          <h3 class="text-sm font-semibold text-foreground">Kernel Context</h3>
          <CheckCircle2 class="size-4 text-emerald-500" />
        </div>
        <div class="flex flex-col gap-2 text-xs text-muted-foreground">
          <div class="flex justify-between py-1 border-b border-border/30">
            <span>User ID:</span>
            <span class="font-mono text-foreground">{{ kernel.auth.userId || 'N/A' }}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-border/30">
            <span>Tenant ID:</span>
            <span class="font-mono text-foreground">{{ kernel.auth.tenantId || 'N/A' }}</span>
          </div>
          <div class="flex justify-between py-1">
            <span>Roles:</span>
            <span class="font-mono text-foreground">{{ kernel.auth.roles.join(', ') }}</span>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div class="flex items-center justify-between pb-3">
          <h3 class="text-sm font-semibold text-foreground">Scoped Store</h3>
          <Badge variant="secondary" class="text-xs">
            Namespace: ${name}
          </Badge>
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Counter value:</span>
            <span class="text-xl font-bold font-mono">{{ store.counter }}</span>
          </div>
          <Button size="sm" @click="store.increment">
            Increment Counter
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
`,
);

// 3. Register in Host Shell (apps/shell/package.json)
const shellPkgPath = join(root, 'apps', 'shell', 'package.json');
const shellPkg = JSON.parse(readFileSync(shellPkgPath, 'utf8'));
shellPkg.dependencies[`@operon/${name}`] = 'workspace:*';
writeFileSync(shellPkgPath, `${JSON.stringify(shellPkg, null, 2)}\n`, 'utf8');

// 4. Create Route Module in Host Shell
const shellRoutePath = join(
  root,
  'apps',
  'shell',
  'src',
  'router',
  'routes',
  'modules',
  `${name}.ts`,
);
writeFileSync(
  shellRoutePath,
  `import type { RouteRecordRaw } from 'vue-router';

import { createRemoteRoute } from '@operon/kernel';
import { ${camelName}Manifest } from '@operon/${name}';

import { $t } from '#/locales';
import { APP_REGISTRY } from '#/registry/apps';

const appMeta = APP_REGISTRY['${name}'];

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: appMeta?.icon || 'lucide:layers',
      order: appMeta?.order || 50,
      platform: 'all',
      plugin: 'operon',
      title: $t(appMeta?.titleKey || 'page.${name}.title'),
    },
    name: '${pascalName}',
    path: '/${name}',
    redirect: '/${name}/' + ${camelName}Manifest.defaultPath,
    children: createRemoteRoute({
      appId: '${name}',
      devPort: appMeta?.devPort || ${nextPort},
      manifest: ${camelName}Manifest,
      t: $t,
    }),
  },
];

export default routes;
`,
  'utf8',
);

// 5. Update apps.manifest.json & apps.ts in Host Shell
const manifestJsonPath = join(
  root,
  'apps',
  'shell',
  'public',
  'apps.manifest.json',
);
if (existsSync(manifestJsonPath)) {
  const manifestData = JSON.parse(readFileSync(manifestJsonPath, 'utf8'));
  manifestData.apps[name] = {
    id: name,
    name: titleName,
    version: '0.1.0',
    devPort: nextPort,
    defaultPath: 'overview',
    icon: 'lucide:layers',
    titleKey: `page.${name}.title`,
    order: 50,
  };
  writeFileSync(
    manifestJsonPath,
    `${JSON.stringify(manifestData, null, 2)}\n`,
    'utf8',
  );
}

const appsRegistryPath = join(
  root,
  'apps',
  'shell',
  'src',
  'registry',
  'apps.ts',
);
if (existsSync(appsRegistryPath)) {
  let content = readFileSync(appsRegistryPath, 'utf8');
  const insertMarker = '};';
  const newEntry = `  '${name}': {
    id: '${name}',
    name: '${titleName}',
    version: '0.1.0',
    devPort: ${nextPort},
    defaultPath: 'overview',
    icon: 'lucide:layers',
    titleKey: 'page.${name}.title',
    order: 50,
  },\n`;
  content = content.replace(insertMarker, `${newEntry}${insertMarker}`);
  writeFileSync(appsRegistryPath, content, 'utf8');
}

// 6. Register i18n keys
for (const [lang, titleTranslation] of [
  ['en-US', titleName],
  ['vi-VN', titleName],
]) {
  const i18nPath = join(
    root,
    'apps',
    'shell',
    'src',
    'locales',
    'langs',
    lang,
    'page.json',
  );
  if (existsSync(i18nPath)) {
    const data = JSON.parse(readFileSync(i18nPath, 'utf8'));
    data[name] = {
      title: titleTranslation,
      overview: lang === 'vi-VN' ? 'Tổng quan' : 'Overview',
    };
    writeFileSync(i18nPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }
}

// 7. Add npm scripts in root package.json
const rootPkgPath = join(root, 'package.json');
const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
rootPkg.scripts[`build:${name}`] = `pnpm -F @operon/${name} run build`;
rootPkg.scripts[`dev:${name}`] = `pnpm -F @operon/${name} run dev`;
writeFileSync(rootPkgPath, `${JSON.stringify(rootPkg, null, 2)}\n`, 'utf8');

console.log(`\n✨ Micro-app "@operon/${name}" created successfully!`);
console.log(`  📂 Location: apps/${name}`);
console.log(`  🌐 Dev Port: ${nextPort}`);
console.log(`\nCommands to run:`);
console.log(
  `  👉 Standalone Dev:    pnpm dev:${name} (http://localhost:${nextPort})`,
);
console.log(
  `  👉 Shell Integrated:  pnpm dev:shell (http://localhost:5320/${name})`,
);
