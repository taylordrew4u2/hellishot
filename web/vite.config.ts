import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': 'http://localhost:8787',
            '/pay': 'http://localhost:8787',
            '/webhooks': 'http://localhost:8787'
        }
    },
    preview: {
        port: 5173
    }
})
