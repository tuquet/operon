import process from 'node:process';

import { defineConfig } from '@operon/vite-config';

import { loadEnv } from 'vite';

const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM);

export default defineConfig(async ({ mode }) => {
  const appTitle =
    loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_TITLE ?? 'Tuquet Console';

  return {
    application: {
      pwa: !isTauri,
      pwaOptions: isTauri
        ? undefined
        : {
            registerType: 'autoUpdate',
            workbox: {
              clientsClaim: true,
              skipWaiting: true,
            },
            manifest: {
              background_color: '#09090b',
              description:
                'Admin - Unified Management & Operations Console (console.operon.com)',
              display: 'standalone',
              icons: [
                {
                  sizes: '192x192',
                  src: '/pwa-192x192.png',
                  type: 'image/png',
                },
                {
                  sizes: '512x512',
                  src: '/pwa-512x512.png',
                  type: 'image/png',
                },
                {
                  purpose: 'any maskable',
                  sizes: '512x512',
                  src: '/pwa-512x512.png',
                  type: 'image/png',
                },
              ],
              name: 'Admin',
              short_name: 'Admin',
              theme_color: '#09090b',
            },
          },
    },
    vite: {
      clearScreen: false,
      plugins: [
        {
          name: 'shell-app-title',
          transformIndexHtml: {
            order: 'pre',
            handler(html) {
              return html.replaceAll('%VITE_APP_TITLE%', appTitle);
            },
          },
        },
      ],
      resolve: {
        dedupe: ['vue', 'vue-router', 'pinia'],
      },
      server: {
        strictPort: true,
        port: 5320,
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // Mock proxy target URL
            target: 'http://localhost:5320/api',
            ws: true,
          },
        },
      },
      envPrefix: ['VITE_', 'TAURI_ENV_*'],
    },
  };
});
