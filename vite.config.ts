import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load all env vars (VITE_*) without touching `process`
  const env = loadEnv(mode, '', '');

  // Use VITE_API_URL if set in Render / .env, otherwise default to local backend
  const BACKEND_URL = env.VITE_API_URL || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: true,
        },
        '/socket.io': {
          target: BACKEND_URL,
          ws: true,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});