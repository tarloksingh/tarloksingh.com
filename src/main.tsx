import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

/* No webfont import here any more. Inter was v2's UI face and the display
   serif came with it from `src/site/tokens.css`; v3 uses Clash Display,
   Audiowide and the system sans, and declares both of its own faces as
   `@font-face` in `Mech.css` against files in `public/fonts/`. Importing
   `@fontsource-variable/inter` shipped seven woff2 subsets and a stylesheet
   that nothing on the page asked for — and `primed` in `Mech.tsx` waits on
   `document.fonts.ready`, so a face nobody uses was holding the boot. */

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
