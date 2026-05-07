import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_API_URL || 'https://breast-cancer-detection-backend-main-p7c9cg.laravel.cloud/api'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    server: {
      proxy: {
        // Mirror exactly what the Vercel serverless proxy does in production:
        // strip /api-proxy prefix and forward to the Laravel Cloud backend.
        // This lets local dev and production behave identically.
        '/api-proxy': {
          target: backend,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-proxy/, ''),
          secure: true,
          // Forward cookies so auth_token survives login in dev too
          cookieDomainRewrite: 'localhost',
        },
      },
    },
  }
})
