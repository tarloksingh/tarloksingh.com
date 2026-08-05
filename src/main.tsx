import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import App from './App'
// Self-hosted so the type renders identically with no network — see README.
import '@fontsource-variable/inter'
import './style.css'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
