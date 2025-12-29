
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Declare process to fix TS2580: Cannot find name 'process'
declare const process: any;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
    ],
    // API_KEY is now handled securely on the backend
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false, 
        },
        '/socket.io': {
          target: 'http://localhost:3000',
          ws: true,
          secure: false,
        }
      }
    }
  }
})
