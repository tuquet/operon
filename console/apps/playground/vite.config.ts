import { defineConfig } from '@operon/vite-config';

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
        port: 5324,
      },
    },
  };
});
