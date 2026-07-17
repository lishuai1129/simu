import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [vue(), cesium()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    open: false,
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://10.16.9.227:8091',
        changeOrigin: true,
      },
    },
  },
})
