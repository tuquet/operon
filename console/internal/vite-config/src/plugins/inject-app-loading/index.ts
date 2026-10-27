import type { PluginOption } from 'vite';

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readPackageJSON } from '@operon/node-utils';

/**
 * Inject loading styles into project
 * Provide loading styles for multiple apps without requiring manual inclusion in each app's index.html
 */
async function viteInjectAppLoadingPlugin(
  isBuild: boolean,
  env: Record<string, any> = {},
  loadingTemplate = 'loading.html',
): Promise<PluginOption | undefined> {
  const loadingHtml = await getLoadingRawByHtmlTemplate(loadingTemplate);
  const { version } = await readPackageJSON(process.cwd());
  const envRaw = isBuild ? 'prod' : 'dev';
  const cacheName = `'${env.VITE_APP_NAMESPACE}-${version}-${envRaw}-preferences-theme'`;

  // Get cached theme
  // Ensure loading screen respects dark theme on page refresh in dark mode
  const injectScript = `
  <script data-app-loading="inject-js">
  var theme = localStorage.getItem(${cacheName});
  document.documentElement.classList.toggle('dark', theme ? /dark/.test(theme) : true);
</script>
`;

  if (!loadingHtml) {
    return;
  }

  return {
    enforce: 'pre',
    name: 'vite:inject-app-loading',
    transformIndexHtml: {
      handler(html) {
        const re = /<body\s*>/;
        html = html.replace(re, `<body>${injectScript}${loadingHtml}`);
        return html;
      },
      order: 'pre',
    },
  };
}

/**
 * Get HTML template for loading screen
 */
async function getLoadingRawByHtmlTemplate(loadingTemplate: string) {
  // Supports custom loading templates inside apps; see default-loading.html as reference
  let appLoadingPath = join(process.cwd(), loadingTemplate);

  if (!fs.existsSync(appLoadingPath)) {
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    appLoadingPath = join(__dirname, './default-loading.html');
  }

  return await fsp.readFile(appLoadingPath, 'utf8');
}

export { viteInjectAppLoadingPlugin };
