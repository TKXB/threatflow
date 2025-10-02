import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: true,
    allowedHosts: ["ap.iotsploit.org", "attackpath.iotsploit.org"],
  },
  preview: {
    port: 5173,
    allowedHosts: ["ap.iotsploit.org", "attackpath.iotsploit.org"],
  }
});

