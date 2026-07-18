import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  server: {
    proxy: {
      '/api/auth': {
        target: process.env.VITE_REACT_APP_AUTH_BASE_URL || 'http://localhost:5050',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/auth/, ''),
      },
      '/api/wallet': {
        target: process.env.VITE_REACT_APP_WALLET_BASE_URL || 'http://localhost:5051',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/wallet/, ''),
      },
      '/api/base': {
        target: process.env.VITE_REACT_APP_BASE_URL || 'http://localhost:5052',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/base/, ''),
      },
    },
  },
})

export default config
