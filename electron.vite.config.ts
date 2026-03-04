import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';

export default defineConfig(({ mode }) => ({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, './electron/main/index.ts'),
        formats: ['cjs'],
      },
      rollupOptions: {
        output: {
          entryFileNames: '[name].cjs',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, './electron/preload/index.ts'),
          external: resolve(__dirname, './electron/preload/external.ts'),
        },
        output: {
          entryFileNames: '[name].mjs',
        },
      },
    },
  },
  renderer: {
    root: '.',
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    plugins: [react(), mode === 'development' && componentTagger()].filter(Boolean),
    server: {
      host: '::',
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, './index.html'),
      },
    },
  },
}));
