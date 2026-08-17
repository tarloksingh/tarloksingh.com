import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// Self-hosted so the type renders identically with no network — see README.
// The display serif is loaded the same way, from `src/site/tokens.css`.
import '@fontsource-variable/inter'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
