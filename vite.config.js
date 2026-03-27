import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/debt-tracker/',
  plugins: [vue()],
  server: {
    port: 3000,
  },
})
