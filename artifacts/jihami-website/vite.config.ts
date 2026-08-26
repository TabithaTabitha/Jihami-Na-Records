import path from 'path';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  root: path.resolve(import.meta.dirname),
  publicDir: path.resolve(import.meta.dirname, 'public'),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        login: path.resolve(import.meta.dirname, 'login.html'),
        register: path.resolve(import.meta.dirname, 'register.html'),
        dashboard: path.resolve(import.meta.dirname, 'dashboard.html'),
        'privacy-policy': path.resolve(import.meta.dirname, 'privacy-policy.html'),
        'terms-of-service': path.resolve(import.meta.dirname, 'terms-of-service.html'),
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      // Forward all Jihami API paths to the production backend.
      // This runs server-side so there are no browser CORS issues.
      '/login':           { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/signup':          { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/authenticate':    { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/auth':            { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/user':            { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/transactions':    { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/categories':      { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/invoices':        { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/quotations':      { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/credit-notes':    { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/payments':        { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/hr':              { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/reports':         { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/subscription':    { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/uploads':         { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/api/pos':         { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/api/business':    { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/api/customers':   { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/api/receipts':    { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/api/payments':    { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/api/suppliers':   { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/api/stock':       { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/api/hotel':       { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
      '/api/wasteCol':    { target: 'https://jihami.co.ke', changeOrigin: true, secure: false },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
