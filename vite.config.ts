import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],

  resolve: {
    // Leva is a development tool and every one of its ten importers is a
    // tuning hook that runs on a visitor's screen, so it was 72 kB gzipped of
    // panel chrome sitting in front of first paint for a panel nobody can
    // open. In a build it resolves to a stub that returns the same values and
    // draws nothing; `npm run dev` gets the real package. Read the note at the
    // top of `src/v3/leva-prod.tsx` before adding a leva API to a hook — this
    // alias is the one place on the site where dev and prod differ, and a
    // divergence shows up only in a build.
    //
    // Root-relative rather than resolved off `import.meta.url`: this file is
    // type-checked by `tsconfig.node.json`, which has neither the DOM lib nor
    // `@types/node`, so `URL` and `fileURLToPath` are both out of reach and
    // pulling either in for one path would be the larger change.
    //
    // `hls.js` is the second alias and it works the other way round: it is
    // applied in *both* dev and build, because nothing here ever wants the
    // real thing. drei's `useVideoTexture` imports one enum member from it
    // statically, which drags 500 KB of HTTP Live Streaming into the chunk
    // that every piece with a clip on it lands in — and that chunk is the one
    // the bank imports, so it was on home's boot. See the note at the top of
    // `src/v3/hls-stub.ts`; every clip on this site is a local mp4.
    alias: {
      ...(command === 'build' ? { leva: '/src/v3/leva-prod.tsx' } : {}),
      'hls.js': '/src/v3/hls-stub.ts'
    } as Record<string, string>
  },

  server: {
    host: '0.0.0.0', // Bind to all network interfaces
    port: 5173,
    // Vite blocks requests whose Host header it doesn't recognise. Raw IPs are
    // allowed by default, but Tailscale MagicDNS names are not — without this,
    // opening the tailnet hostname on a phone returns "Blocked request".
    // A leading dot matches the domain and any subdomain of it.
    allowedHosts: ['.ts.net']
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.ts.net']
  }
}))
