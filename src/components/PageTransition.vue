<template>
  <div v-if="isVisible" class="page-transition" :class="{ 'transitioning-out': isTransitioningOut }">
    <!-- Simple curtain that slides from bottom -->
    <div class="curtain"></div>
    
    <!-- Clean name reveal -->
    <div class="name-reveal">
      <span class="name-text">{{ destination }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  isVisible: boolean
  destination: string
}>()

const emit = defineEmits<{
  complete: []
}>()

const isTransitioningOut = ref(false)

onMounted(() => {
  if (props.isVisible) {
    startTransition()
  }
})

const startTransition = () => {
  // Prevent scrolling during transition
  document.body.style.overflow = 'hidden'
  
  // Simple fade sequence
  setTimeout(() => {
    // Curtain slides up from bottom immediately
    document.querySelector('.curtain')?.classList.add('active')
    
    setTimeout(() => {
      // Name fades in
      document.querySelector('.name-reveal')?.classList.add('active')
      
      // Start exit after name is visible
      setTimeout(() => {
        startTransitionOut()
      }, 800) // Simple timing for fade in/out
    }, 400)
  }, 50)
}

const startTransitionOut = () => {
  isTransitioningOut.value = true
  
  // Ensure page starts at top BEFORE any exit animations
  window.scrollTo({ top: 0, behavior: 'instant' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  
  // Much faster completion to avoid glitches
  setTimeout(() => {
    // Re-enable scrolling and complete immediately
    document.body.style.overflow = ''
    emit('complete')
  }, 600) // Faster completion
}
</script>

<style scoped>
.page-transition {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
  will-change: transform, opacity;
}

/* Faster, smoother curtain */
.curtain {
  position: absolute;
  bottom: -100%;
  left: 0;
  width: 100%;
  height: 100%;
  background: #ffffff !important;
  transition: bottom 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  backface-visibility: hidden;
}

.curtain.active {
  bottom: 0;
}

.transitioning-out .curtain {
  bottom: 100%;
  transition: bottom 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Smoother name reveal */
.name-reveal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity;
  backface-visibility: hidden;
  padding: 1rem;
}

.name-reveal.active {
  opacity: 1;
}

.transitioning-out .name-reveal {
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 0.3s ease;
}

.name-text {
  display: block;
  color: #000000;
  font-size: 3rem;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.06em;
  font-family: 'ITC Avant Garde Gothic Std', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transform: translateY(0);
  transition: none;
  white-space: normal;
  text-align: center;
  text-transform: none;
  max-width: 90vw;
  word-wrap: break-word;
}

.name-reveal.active .name-text {
  transform: translateY(0);
}

.transitioning-out .name-text {
  transform: translateY(0);
  transition: none;
}

/* Mobile adjustments for long titles */
@media (max-width: 767px) {
  .name-text {
    font-size: 2.5rem;
    line-height: 1.1;
    max-width: 95vw;
  }
}

@media (min-width: 768px) {
  .name-text {
    font-size: 4rem;
    white-space: nowrap;
    max-width: none;
  }
}

/* Smoother animations for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .curtain, .name-reveal, .name-text {
    transition-duration: 0.2s !important;
  }
}
</style>