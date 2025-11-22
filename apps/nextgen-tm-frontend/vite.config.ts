import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: true,
    allowedHosts: ["ap.iotsploit.org", "attackpath.iotsploit.org"],
    proxy: {
      // 代理 /api 请求到后端
      '/api': {
        target: 'http://localhost:8890',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // 代理 /analysis 请求到后端 (与 Nginx 保持一致)
      '/analysis': {
        target: 'http://localhost:8890',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 5173,
    allowedHosts: ["ap.iotsploit.org", "attackpath.iotsploit.org"],
  }
});

