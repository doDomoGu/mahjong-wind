import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), 'VITE_');

  return {
    root: path.resolve(__dirname),
    base: env.VITE_BASE_PATH || '/',
    plugins: [vue()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': 'http://127.0.0.1:3000',
        '/socket.io': {
          target: 'http://127.0.0.1:3000',
          ws: true,
        },
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
  };
});
