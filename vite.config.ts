import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mobileTweaks } from './vite-plugins/mobile-tweaks'

// https://vite.dev/config/
export default defineConfig({
  // mobileTweaks is dev-only (apply: 'serve') — it writes the tuner's values
  // into src/mobile-tweaks.css and never runs during a build.
  plugins: [react(), mobileTweaks()],
  server: {
    host: '0.0.0.0', // Bind to all network interfaces
    port: 5173,
    // Vite blocks requests whose Host header it doesn't recognise. Raw IPs are
    // allowed by default, but Tailscale MagicDNS names are not — without this,
    // opening the tailnet hostname on a phone returns "Blocked request".
    // A leading dot matches the domain and any subdomain of it.
    allowedHosts: ['.ts.net']
  }
})
