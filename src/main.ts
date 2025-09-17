import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

// GSAP
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

// Make GSAP available globally for debugging
declare global {
  interface Window {
    gsap: typeof gsap
  }
}

window.gsap = gsap

// Create and mount the Vue app
const app = createApp(App)
app.mount('#app')
