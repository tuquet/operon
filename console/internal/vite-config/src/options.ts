import type { Options as PwaPluginOptions } from 'vite-plugin-pwa';

const isDevelopment = process.env.NODE_ENV === 'development';

const getDefaultPwaOptions = (name: string): Partial<PwaPluginOptions> => ({
  manifest: {
    description: 'Admin is the unified administration portal for Platform.',
    icons: [
      {
        sizes: '192x192',
        src: 'https://unpkg.com/@vbenjs/static-source@0.1.7/source/pwa-icon-192.png',
        type: 'image/png',
      },
      {
        sizes: '512x512',
        src: 'https://unpkg.com/@vbenjs/static-source@0.1.7/source/pwa-icon-512.png',
        type: 'image/png',
      },
    ],
    name: `${name}${isDevelopment ? ' dev' : ''}`,
    short_name: `${name}${isDevelopment ? ' dev' : ''}`,
  },
});

export { getDefaultPwaOptions };
