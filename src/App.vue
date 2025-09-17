<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import WorkDetail from './components/WorkDetail.vue'
import PageTransition from './components/PageTransition.vue'

const currentTime = ref('08:23')

// Initialize with Austin time
const getAustinTime = () => {
  const now = new Date()
  const austinTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}))
  const hours = austinTime.getHours().toString().padStart(2, '0')
  const minutes = austinTime.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// Set initial time
currentTime.value = getAustinTime()
const isMenuOpen = ref(false)
const isMenuAnimating = ref(false)
const currentView = ref('main') // 'main' or 'work-detail'
const selectedProject = ref('')
const showTransition = ref(false)
const transitionDestination = ref('')
const isPageLoaded = ref(false)
const isNameInPosition = ref(false)
const loadingProgress = ref(0)

// Scroll observer for animations
let scrollObserver: IntersectionObserver | null = null

// All work projects
const allWorkProjects = [
  { id: 'capsule-c1', title: 'Capsule C1', description: 'Teleportation Calling', hasVideo: true, videoPath: '/src/assets/capsule-c1/hero.mp4' },
  { id: 'mr-takahashi', title: 'Mr. Takahashi', description: 'AI Japanese Language Teacher', hasVideo: true, videoPath: '/src/assets/mr-takahashi/hero.mp4' },
  { id: 'slider-engine', title: 'Slider Engine', description: 'Zero Code Game Engine', hasVideo: true, videoPath: '/src/assets/slider-engine/hero.mp4' },
  { id: 'openup', title: 'OpenUp', description: 'Make New Friends', hasVideo: true, videoPath: '/src/assets/openup/hero.mp4' },
  { id: 'mecha-station', title: 'Mecha Station', description: 'Point of Sale', hasVideo: true, videoPath: '/src/assets/mecha-station/hero.mp4' },
  { id: 'stitchfam', title: 'Stitchfam', description: 'Build a Family Tree Together', hasVideo: true, videoPath: '/src/assets/stitchfam/Desktop_1.mp4' },
  { id: 'red-dead-redemption-2', title: 'Red Dead Redemption 2', description: 'Action-Adventure Game', hasVideo: true, videoPath: '/src/assets/red-dead-redemption-2/hero.mp4' },
  { id: 'wyte-card', title: 'Wyte Card', description: 'Digital Business Card', hasVideo: true, videoPath: '/src/assets/wyte-card/hero.mp4' },
  { id: 'grand-theft-auto-v', title: 'Grand Theft Auto V', description: 'Action-Adventure Game', hasVideo: true, videoPath: '/src/assets/grand-theft-auto-v/hero.mp4' },
  { id: 'block-builder', title: 'Block Builder', description: 'LEGO Style IPad Game', hasVideo: true, videoPath: '/src/assets/block-builder/hero.mp4' }
]

// Always show all projects
const visibleProjects = computed(() => {
  return allWorkProjects
})


// Update time every minute
setInterval(() => {
  currentTime.value = getAustinTime()
}, 60000)

const toggleMenu = () => {
  if (isMenuAnimating.value) return // Prevent multiple clicks during animation
  
  if (isMenuOpen.value) {
    // Closing menu - start animation out
    isMenuAnimating.value = true
    
    // After animation completes, hide the menu
    setTimeout(() => {
      isMenuOpen.value = false
      isMenuAnimating.value = false
    }, 500) // Match the CSS transition duration
  } else {
    // Opening menu - show first, then animate in
    isMenuOpen.value = true
    isMenuAnimating.value = true
    
    nextTick(() => {
      // Small delay to ensure DOM is ready, then start animation
      setTimeout(() => {
        isMenuAnimating.value = false
      }, 10)
    })
  }
}

const showWorkDetail = (projectId: string) => {
  console.log('showWorkDetail called with projectId:', projectId)
  selectedProject.value = projectId
  // Find the project title from the allWorkProjects array
  const project = allWorkProjects.find(p => p.id === projectId)
  console.log('Found project:', project)
  transitionDestination.value = project ? project.title : projectId
  showTransition.value = true
  // Switch to work detail when curtain is fully up (faster timing)
  setTimeout(() => {
    currentView.value = 'work-detail'
    console.log('Switched to work-detail view, selectedProject:', selectedProject.value)
  }, 600) // Reduced from 1200ms to 600ms to match transition speed
}

const onTransitionComplete = () => {
  showTransition.value = false
}

const goBackToMain = () => {
  transitionDestination.value = 'Tarlok Singh'
  showTransition.value = true
  // Switch back to main view when curtain is up, not after full transition
  setTimeout(() => {
    currentView.value = 'main'
    selectedProject.value = ''
    
    // Reset scroll animations when returning to main
    setTimeout(() => {
      setupScrollAnimations()
    }, 100)
  }, 600) // Changed from 4000ms to 600ms - switch during curtain coverage
}

// Scroll-triggered animations
const setupScrollAnimations = () => {
  // Clean up existing observer
  if (scrollObserver) {
    scrollObserver.disconnect()
  }
  
  const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
  }
  
  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in')
      }
    })
  }, observerOptions)
  
  // Observe all sections except the first one (video section)
  const sections = document.querySelectorAll('.section')
  sections.forEach((section, index) => {
    if (index > 0 && scrollObserver) { // Skip first section (video) and check observer exists
      // Reset the section to invisible state first
      section.classList.remove('fade-in')
      scrollObserver.observe(section)
    }
  })
  
  // Ensure work section is visible immediately (fallback)
  const workSection = document.querySelector('#work')
  if (workSection) {
    workSection.classList.add('fade-in')
  }
}


// Handle window resize
const handleResize = () => {
  // Basic resize handling
}

// Initial page load animation
onMounted(() => {
  // Start the initial animation sequence
  setTimeout(() => {
    isPageLoaded.value = true
    
    // Animate loading progress
    const animateProgress = () => {
      const startTime = Date.now()
      const duration = 2000 // 2 seconds
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min((elapsed / duration) * 100, 100)
        loadingProgress.value = progress
        
        if (progress < 100) {
          requestAnimationFrame(updateProgress)
        } else {
          // Loading complete, hide loading bar first
          setTimeout(() => {
            // Hide the loading bar
            const initialName = document.querySelector('.initial-name') as HTMLElement
            if (initialName) {
              initialName.style.opacity = '0'
            }
            
            // Wait for loading bar to fade out, then show header
            setTimeout(() => {
              // Show header first
              const header = document.querySelector('.header')
              if (header) {
                header.classList.add('fade-in')
              }
              
              // Then show content after header animation
              setTimeout(() => {
                isNameInPosition.value = true
                // Setup scroll animations after main content is visible
                setTimeout(() => {
                  setupScrollAnimations()
                }, 100)
              }, 700) // Wait for header to finish animating (1.2s duration)
            }, 300) // Wait for loading bar to fade out
          }, 500) // Wait 500ms after loading completes
        }
      }
      
      requestAnimationFrame(updateProgress)
    }
    
    animateProgress()
  }, 500)
  
  // Add resize listener
  window.addEventListener('resize', handleResize)
})

// Cleanup on unmount
onUnmounted(() => {
  if (scrollObserver) {
    scrollObserver.disconnect()
  }
  
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="min-h-screen bg-white text-black" style="background-color: #ffffff !important; color: #000000 !important;">
    <!-- Initial Name Display -->
    <div v-if="!isNameInPosition" class="initial-name" :class="{ 'fade-in': isPageLoaded }">
      <h1>Tarlok Singh</h1>
      <div class="loading-bar-container">
        <div class="loading-bar" :style="{ width: loadingProgress + '%' }"></div>
      </div>
    </div>

    <!-- Header -->
    <header class="header">
      <div class="header-container">
        <!-- Name - Takes up left space -->
        <div class="header-name" @click="goBackToMain" style="cursor: pointer;">
          <div>Tarlok</div>
          <div>Singh</div>
        </div>
        
        <!-- Divider -->
        <div class="header-divider"></div>
        
        <!-- Time -->
        <div class="header-time">
          <div>{{ currentTime }}</div>
        </div>
        
        <!-- Menu Button -->
        <button 
          @click="toggleMenu"
          class="header-menu"
        >
          <div class="header-menu-dot"></div>
          <span>menu</span>
        </button>
      </div>
    </header>

    <!-- Page Container to prevent layout shifts -->
    <div class="page-container">
      <!-- Main Content -->
      <main v-if="currentView === 'main'" class="main-content" :class="{ 'fade-in': isNameInPosition }">
        <!-- Hero Section - Name, Title, and Video -->
        <section class="section">
          <h1 class="main-name-title">Tarlok Singh</h1>
          <div class="designer-text">Multi-Disciplinary Designer</div>
          <div class="hero-video-container">
            <video 
              class="hero-video"
              autoplay 
              muted 
              loop 
              playsinline
            >
              <source src="/src/assets/capsule-c1/Header2.mp4" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
        </section>

        <!-- Intro Section -->
        <section class="section">
          <div class="intro-content">
            <h2 class="section-title">Intro</h2>
            <p class="section-text">
              I’ve designed over 17 products in under 2 years, led creative teams of 20+, and scaled a business from $800K to $1.5M+ by putting design at the center of growth. My passion is building multi-sensory experiences and turning ideas into products. I’m in love with the craft of building and designing.
            </p>
          </div>
        </section>

        <!-- Design Categories Section -->
        <section id="categories" class="section">
          <h2 class="section-title">I Design</h2>
          <div class="button-grid">
            <button>Apps</button>
            <button>Websites</button>
            <button>Hardware</button>
            <button>Visuals</button>
            <button>Brands</button>
            <button>Games</button>
            <button>Businesses</button>
            <button>Music</button>
          </div>
        </section>

        <!-- Selected Work Section -->
        <section id="work" class="section">
          <h2 class="section-title">Selected Work</h2>
          <div class="work-grid">
            <div 
              v-for="project in visibleProjects" 
              :key="project.id" 
              class="work-item"
            >
              <div 
                v-if="!project.hasVideo"
                class="work-image" 
                @click="showWorkDetail(project.id)" 
                style="cursor: pointer;"
              ></div>
              <video 
                v-else
                class="work-image" 
                @click="showWorkDetail(project.id)" 
                style="cursor: pointer;"
                autoplay 
                muted 
                loop 
                playsinline
              >
                <source :src="project.videoPath" type="video/mp4">
                Your browser does not support the video tag.
              </video>
              <h3 class="work-title">{{ project.title }}</h3>
              <p class="work-description">{{ project.description }}</p>
            </div>
          </div>
        </section>

        <!-- Skills Section -->
        <section id="skills" class="section">
          <h2 class="section-title">Skills</h2>
          <div class="button-grid">
            <button>Product Design</button>
            <button>AI Assisted Software Development</button>
            <button>3D Design & Printing</button>
            <button>Adobe Creative Suite</button>
            <button>Cinematography</button>
            <button>Editing</button>
            <button>Music Creation</button>
            <button>Leadership</button>
          </div>
        </section>

        <!-- Contact Section -->
        <section class="section">
          <div class="intro-content">
            <h2 class="section-title">...and a little more about me</h2>
            <p class="section-text" v-html="`I've been designing since childhood, around the age of 4. It began with painting, then expanded into film, photography, and graphic design, before branching into games, music, and eventually software. I've always been driven by a vision of how things should work and feel.<br><br>

I throughly enjoy the process of creation, making tools intuitive, reducing steps, and ensuring every detail feels both functional and beautiful. Right now, my focus is on software, hardware, and product design. Recently, AI tools have enabled me to step into software development, which has been really really fun. I spend most of my days working on projects and spending time with my family. `"></p>
          </div>
        </section>
      </main>

      <!-- Work Detail View -->
      <WorkDetail v-else-if="currentView === 'work-detail'" :key="selectedProject" :project-id="selectedProject" @go-back="goBackToMain" />
    </div>
    
    <!-- Page Transition -->
    <PageTransition 
      v-if="showTransition" 
      :is-visible="showTransition" 
      :destination="transitionDestination"
      @complete="onTransitionComplete"
    />

    <!-- Footer/Contact Section -->
    <footer v-if="currentView === 'main'" id="contact" class="footer">
      <div class="footer-container">
        <div class="footer-column">
          <h3 class="footer-section-title">Contact</h3>
          <p class="footer-email">me@tarloksingh.com</p>
          <p class="footer-description">
            Interested in seeing more film, music, art, software, web, business work? 
            Contact me anytime!
          </p>
        </div>
      </div>
    </footer>

    <!-- Mobile Menu Overlay -->
    <div 
      v-show="isMenuOpen || isMenuAnimating" 
      class="mobile-menu-overlay"
      :class="{ 'show': isMenuOpen }"
      @click="toggleMenu"
    ></div>
    
    <!-- Mobile Menu -->
    <div 
      v-show="isMenuOpen || isMenuAnimating"
      class="mobile-menu"
      :class="{ 'menu-open': isMenuOpen && !isMenuAnimating }"
    >
      <div class="mobile-menu-content">
        <div class="mobile-menu-header">
          <h2 class="mobile-menu-title">menu</h2>
          <button 
            @click="toggleMenu"
            class="mobile-menu-close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        
        <nav class="mobile-menu-nav">
          <div class="nav-section">
            <button @click="goBackToMain(); toggleMenu()" class="nav-link project-link">Home</button>
            <button 
              v-for="project in allWorkProjects" 
              :key="project.id"
              @click="showWorkDetail(project.id); toggleMenu()"
              class="nav-link project-link"
            >
              {{ project.title }}
            </button>
          </div>
        </nav>
      </div>
    </div>
  </div>
</template>