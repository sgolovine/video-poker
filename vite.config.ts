import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import packageJson from './package.json' with { type: 'json' };

const appBackgroundColor = '#000099';
const engineCoverage = {
  all: true,
  include: ['src/engine/**/*.ts'],
  exclude: ['src/engine/**/*.d.ts'],
  thresholds: {
    lines: 100,
    statements: 100,
    functions: 100,
    branches: 100,
  },
};

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'icons/favicon-64.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
        'screenshots/video-poker-wide.png',
        'screenshots/video-poker-mobile.png',
      ],
      manifest: {
        name: 'Video Poker',
        short_name: 'Video Poker',
        description: 'A browser-based video poker machine.',
        theme_color: appBackgroundColor,
        background_color: appBackgroundColor,
        display: 'standalone',
        scope: './',
        start_url: './',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: 'screenshots/video-poker-wide.png',
            sizes: '1425x900',
            type: 'image/png',
            form_factor: 'wide',
          },
          {
            src: 'screenshots/video-poker-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    coverage: engineCoverage,
  },
});
