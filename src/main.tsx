import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import App from './App'
// Self-hosted so the type renders identically with no network — see README.
import '@fontsource-variable/inter'
import './style.css'
// Last, deliberately: the tuner's rules have to land after the component
// stylesheets to win a specificity tie against the mobile rules they replace.
import './mobile-tweaks.css'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

// Dev-only layout tuner. `import.meta.env.DEV` folds to false in a build, so
// neither the overlay nor its dynamic import survives into production.
if (import.meta.env.DEV) {
  const wanted = () =>
    window.innerWidth <= 700 || new URLSearchParams(window.location.search).has('tune')
  if (wanted()) {
    import('./dev/mobileTuner').then((m) => m.mountMobileTuner())
  } else {
    // Narrowing the window mid-session should bring it up without a reload.
    const onResize = () => {
      if (!wanted()) return
      window.removeEventListener('resize', onResize)
      import('./dev/mobileTuner').then((m) => m.mountMobileTuner())
    }
    window.addEventListener('resize', onResize)
  }
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
