import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/hr-management-portal/',

  plugins: [
    react(),
    {
      name: 'serve-root-assets-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/assets/') && !req.url.startsWith('/hr-management-portal/assets/')) {
            req.url = '/hr-management-portal' + req.url;
          }
          next();
        });
      }
    }
  ],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
