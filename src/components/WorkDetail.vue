<template>
  <div class="work-detail">
    <!-- Header -->
    <header class="work-detail-header">
      <h1 class="work-detail-title" :data-title="project.title">{{ project.title }}</h1>
      <div class="designer-type">{{ project.designerType }}</div>
      <div class="company-name">{{ project.companyName }}</div>
      <div v-if="project.timeline" class="project-timeline">{{ project.timeline }}</div>
    </header>

    <!-- Hero Section -->
    <section class="work-detail-video">
      <!-- Hero Video -->
      <div v-if="project.media.heroVideo" class="hero-video-wrapper">
        <div class="hero-video-container">
      <video 
        class="project-video"
            ref="heroVideo"
            :controls="!project.media.heroVideoSilent"
        autoplay 
        muted 
        loop 
        playsinline
        preload="metadata"
        @loadstart="onVideoLoadStart"
        @canplay="onVideoCanPlay"
            @loadedmetadata="onHeroVideoLoaded"
      >
                <source :src="getVideoPath(projectId, project.media.heroVideo)" type="video/mp4">
        Your browser does not support the video tag.
      </video>
        </div>
        <div class="media-label">
          {{ project.media.heroVideoLabel || 'Demo Video' }}
        </div>
      </div>
      
      <!-- Hero Image (fallback if no video) -->
      <div v-else-if="project.media.heroImage" class="hero-image-wrapper">
        <div class="hero-image-container">
          <img 
            class="project-hero-image"
            :src="getImagePath(projectId, project.media.heroImage)" 
            :alt="`${project.title} Hero Image`"
          />
        </div>
        <div v-if="project.media.heroImageLabel" class="hero-media-label">
          {{ project.media.heroImageLabel }}
        </div>
      </div>
      
      <!-- Default fallback -->
      <div v-else class="project-placeholder">
        <h2>{{ project.title }}</h2>
      </div>
    </section>

    <!-- Content -->
    <div class="work-detail-content">
      <!-- Project Overview -->
      <section class="work-detail-section">
        <h2 class="section-heading">Project Overview</h2>
        <p class="section-text" v-html="project.description.replace(/\n/g, '<br>')"></p>
        

      </section>


      <!-- Dynamic Sections -->
      <section 
        v-for="section in project.sections" 
        :key="section.id"
        class="work-detail-section"
      >
        <!-- Media Above Title -->
        <div v-if="section.layout?.mediaPosition === 'above-title' && section.media && hasSectionMedia(section)" class="ui-screenshots" :class="{ 'branding-media': section.showColorPalette }" :style="section.showColorPalette ? 'margin-bottom: 2rem;' : ''">
          <SectionMedia :section="section" :project-id="projectId" />
        </div>

        <!-- Title -->
        <h2 class="section-heading">{{ section.title }}</h2>
        
        <!-- Media Below Title -->
        <div v-if="section.layout?.mediaPosition === 'below-title' && section.media && hasSectionMedia(section)" class="ui-screenshots" :class="{ 'branding-media': section.showColorPalette }" :style="section.showColorPalette ? 'margin-top: 1rem; margin-bottom: 2rem;' : 'margin-top: 1rem;'">
          <SectionMedia :section="section" :project-id="projectId" />
        </div>

        <!-- Text Above Media -->
        <p v-if="section.text && section.layout?.textPosition === 'above-media'" class="section-text" v-html="section.text.replace(/\n/g, '<br>')"></p>
        
        <!-- Media Above Text -->
        <div v-if="section.layout?.mediaPosition === 'above-text' && section.media && hasSectionMedia(section)" class="ui-screenshots" :class="{ 'branding-media': section.showColorPalette }" :style="section.showColorPalette ? 'margin-bottom: 2rem;' : ''">
          <SectionMedia :section="section" :project-id="projectId" />
        </div>

        <!-- Color Palette Above Media -->
        <div v-if="section.showColorPalette && section.layout?.colorPalettePosition === 'above-media'" class="color-palette">
          <div class="color-swatch blue"></div>
          <div class="color-swatch gray"></div>
          <div class="color-swatch black"></div>
        </div>

        <!-- Media Above Color Palette -->
        <div v-if="section.layout?.mediaPosition === 'above-color-palette' && section.media && hasSectionMedia(section)" class="ui-screenshots" :class="{ 'branding-media': section.showColorPalette }" :style="section.showColorPalette ? 'margin-bottom: 2rem;' : ''">
          <SectionMedia :section="section" :project-id="projectId" />
        </div>

        <!-- Color Palette Below Media -->
        <div v-if="section.showColorPalette && section.layout?.colorPalettePosition === 'below-media'" class="color-palette">
          <div class="color-swatch blue"></div>
          <div class="color-swatch gray"></div>
          <div class="color-swatch black"></div>
        </div>

        <!-- Media Below Color Palette -->
        <div v-if="section.layout?.mediaPosition === 'below-color-palette' && section.media && hasSectionMedia(section)" class="ui-screenshots" :class="{ 'branding-media': section.showColorPalette }" :style="section.showColorPalette ? 'margin-top: 2rem;' : ''">
          <!-- Videos with controls (first if not images-first) -->
          <template v-if="section.layout?.mediaOrder !== 'images-first'">
            <div 
              v-for="(video, index) in section.media.videos || []" 
              :key="`${section.id}-vid-${index}`"
              class="media-wrapper"
            >
              <div class="ui-screenshot">
                <video 
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  controls
                  @click="toggleFullscreen"
                  @loadedmetadata="onVideoLoaded"
                  :src="getVideoPath(projectId, video)"
                ></video>
              </div>
              <div class="media-label">
                {{ section.media.videoLabels?.[index] || `${section.title} Video ${index + 1}` }}
              </div>
            </div>

            <!-- Silent Videos -->
            <div 
              v-for="(video, index) in section.media.silentVideos || []" 
              :key="`${section.id}-silent-${index}`"
              class="media-wrapper"
            >
              <div class="ui-screenshot">
                <video 
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  :src="getVideoPath(projectId, video)"
                ></video>
              </div>
              <div class="media-label">
                {{ section.media.silentVideoLabels?.[index] || `${section.title} Silent Video ${index + 1}` }}
              </div>
            </div>
          </template>

          <!-- Images -->
          <div 
            v-for="(image, index) in section.media.images || []" 
            :key="`${section.id}-img-${index}`"
            class="media-wrapper"
          >
            <div class="ui-screenshot">
              <img :src="getImagePath(projectId, image)" :alt="`${section.title} Image ${index + 1}`" />
            </div>
            <div class="media-label">
              {{ section.media.imageLabels?.[index] || `${section.title} Image ${index + 1}` }}
            </div>
          </div>

          <!-- Videos with controls (after images if images-first) -->
          <template v-if="section.layout?.mediaOrder === 'images-first'">
            <div 
              v-for="(video, index) in section.media.videos || []" 
              :key="`${section.id}-vid-${index}`"
              class="media-wrapper"
            >
              <div class="ui-screenshot">
                <video 
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  controls
                  @click="toggleFullscreen"
                  @loadedmetadata="onVideoLoaded"
                  :src="getVideoPath(projectId, video)"
                ></video>
              </div>
              <div class="media-label">
                {{ section.media.videoLabels?.[index] || `${section.title} Video ${index + 1}` }}
              </div>
            </div>

            <!-- Silent Videos -->
            <div 
              v-for="(video, index) in section.media.silentVideos || []" 
              :key="`${section.id}-silent-${index}`"
              class="media-wrapper"
            >
              <div class="ui-screenshot">
                <video 
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  :src="getVideoPath(projectId, video)"
                ></video>
              </div>
              <div class="media-label">
                {{ section.media.silentVideoLabels?.[index] || `${section.title} Silent Video ${index + 1}` }}
              </div>
            </div>
          </template>
        </div>

        <!-- Text Below Media -->
        <p v-if="section.text && section.layout?.textPosition === 'below-media'" class="section-text" v-html="section.text.replace(/\n/g, '<br>')"></p>

        <!-- Text Display for Below-Text Layout (BEFORE media) -->
        <p v-if="section.text && section.layout?.mediaPosition === 'below-text' && (!section.layout?.textPosition || section.layout?.textPosition === 'below-media')" class="section-text" v-html="section.text.replace(/\n/g, '<br>')"></p>
        
        <!-- Role Bubbles for Below-Text Layout -->
        <div v-if="section.roles && section.roles.length > 0 && section.layout?.mediaPosition === 'below-text'" class="role-buttons">
          <button 
            v-for="role in section.roles" 
            :key="role" 
            class="role-button"
          >
            {{ role }}
          </button>
        </div>
        
        <!-- Color Palette for Below-Text Layout -->
        <div v-if="section.showColorPalette && section.layout?.mediaPosition === 'below-text'" class="color-palette">
          <div class="color-swatch blue"></div>
          <div class="color-swatch gray"></div>
          <div class="color-swatch black"></div>
        </div>

        <!-- Links Section -->
        <div v-if="section.links && section.links.length > 0" class="section-links">
          <a 
            v-for="(link, index) in section.links" 
            :key="`${section.id}-link-${index}`"
            :href="link.url"
            :target="link.type === 'external' ? '_blank' : '_self'"
            :download="link.type === 'download' ? link.label : undefined"
            class="section-link"
          >
            {{ link.label }}
          </a>
        </div>

        <!-- Media Below Text (default) -->
        <div v-if="section.layout?.mediaPosition === 'below-text' && section.media && hasSectionMedia(section)" class="ui-screenshots" :class="{ 'branding-media': section.showColorPalette }" :style="section.showColorPalette ? 'margin-top: 2rem;' : ''">
          <!-- Videos with controls (first if not images-first) -->
          <template v-if="section.layout?.mediaOrder !== 'images-first'">
            <div 
              v-for="(video, index) in section.media.videos || []" 
              :key="`${section.id}-vid-${index}`"
              class="media-wrapper"
            >
              <div class="ui-screenshot">
                <video 
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  controls
                  @click="toggleFullscreen"
                  @loadedmetadata="onVideoLoaded"
                  :src="getVideoPath(projectId, video)"
                ></video>
              </div>
              <div class="media-label">
                {{ section.media.videoLabels?.[index] || `${section.title} Video ${index + 1}` }}
              </div>
            </div>

            <!-- Silent Videos -->
            <div 
              v-for="(video, index) in section.media.silentVideos || []" 
              :key="`${section.id}-silent-${index}`"
              class="media-wrapper"
            >
              <div class="ui-screenshot">
                <video 
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  :src="getVideoPath(projectId, video)"
                ></video>
              </div>
              <div class="media-label">
                {{ section.media.silentVideoLabels?.[index] || `${section.title} Silent Video ${index + 1}` }}
              </div>
            </div>
          </template>

          <!-- Images -->
          <div 
            v-for="(image, index) in section.media.images || []" 
            :key="`${section.id}-img-${index}`"
            class="media-wrapper"
          >
            <div class="ui-screenshot">
              <img :src="getImagePath(projectId, image)" :alt="`${section.title} Image ${index + 1}`" />
            </div>
            <div class="media-label">
              {{ section.media.imageLabels?.[index] || `${section.title} Image ${index + 1}` }}
            </div>
          </div>

          <!-- Videos with controls (after images if images-first) -->
          <template v-if="section.layout?.mediaOrder === 'images-first'">
            <div 
              v-for="(video, index) in section.media.videos || []" 
              :key="`${section.id}-vid-${index}`"
              class="media-wrapper"
            >
              <div class="ui-screenshot">
                <video 
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  controls
                  @click="toggleFullscreen"
                  @loadedmetadata="onVideoLoaded"
                  :src="getVideoPath(projectId, video)"
                ></video>
              </div>
              <div class="media-label">
                {{ section.media.videoLabels?.[index] || `${section.title} Video ${index + 1}` }}
              </div>
            </div>

            <!-- Silent Videos -->
            <div 
              v-for="(video, index) in section.media.silentVideos || []" 
              :key="`${section.id}-silent-${index}`"
              class="media-wrapper"
            >
              <div class="ui-screenshot">
                <video 
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  :src="getVideoPath(projectId, video)"
                ></video>
              </div>
              <div class="media-label">
                {{ section.media.silentVideoLabels?.[index] || `${section.title} Silent Video ${index + 1}` }}
              </div>
            </div>
          </template>
        </div>

        <!-- Text Display for Above-Title Layout -->
        <p v-if="section.text && section.layout?.mediaPosition === 'above-title' && (!section.layout?.textPosition || section.layout?.textPosition === 'below-media')" class="section-text" v-html="section.text.replace(/\n/g, '<br>')"></p>
        
        <!-- Role Bubbles for Above-Title Layout -->
        <div v-if="section.roles && section.roles.length > 0 && section.layout?.mediaPosition === 'above-title'" class="role-buttons">
          <button 
            v-for="role in section.roles" 
            :key="role" 
            class="role-button"
          >
            {{ role }}
          </button>
        </div>
        
        <!-- Color Palette for Above-Title Layout -->
        <div v-if="section.showColorPalette && section.layout?.mediaPosition === 'above-title'" class="color-palette">
          <div class="color-swatch blue"></div>
          <div class="color-swatch gray"></div>
          <div class="color-swatch black"></div>
        </div>
        
        <!-- Text Display for Below-Title Layout -->
        <p v-if="section.text && section.layout?.mediaPosition === 'below-title' && (!section.layout?.textPosition || section.layout?.textPosition === 'below-media')" class="section-text" v-html="section.text.replace(/\n/g, '<br>')"></p>
        
        <!-- Color Palette for Below-Title Layout -->
        <div v-if="section.showColorPalette && section.layout?.mediaPosition === 'below-title'" class="color-palette">
          <div class="color-swatch blue"></div>
          <div class="color-swatch gray"></div>
          <div class="color-swatch black"></div>
        </div>
        
        <!-- Text Display for Above-Text Layout -->
        <p v-if="section.text && section.layout?.mediaPosition === 'above-text' && (!section.layout?.textPosition || section.layout?.textPosition === 'below-media')" class="section-text" v-html="section.text.replace(/\n/g, '<br>')"></p>
        
        <!-- Color Palette for Above-Text Layout -->
        <div v-if="section.showColorPalette && section.layout?.mediaPosition === 'above-text'" class="color-palette">
          <div class="color-swatch blue"></div>
          <div class="color-swatch gray"></div>
          <div class="color-swatch black"></div>
        </div>
        
        <!-- Text Display for Above-Color-Palette Layout -->
        <p v-if="section.text && section.layout?.mediaPosition === 'above-color-palette' && (!section.layout?.textPosition || section.layout?.textPosition === 'below-media')" class="section-text" v-html="section.text.replace(/\n/g, '<br>')"></p>
        
        <!-- Color Palette for Above-Color-Palette Layout -->
        <div v-if="section.showColorPalette && section.layout?.mediaPosition === 'above-color-palette'" class="color-palette">
          <div class="color-swatch blue"></div>
          <div class="color-swatch gray"></div>
          <div class="color-swatch black"></div>
        </div>
        
        <!-- Text Display for Below-Color-Palette Layout -->
        <p v-if="section.text && section.layout?.mediaPosition === 'below-color-palette' && (!section.layout?.textPosition || section.layout?.textPosition === 'below-media')" class="section-text" v-html="section.text.replace(/\n/g, '<br>')"></p>
        
        <!-- Color Palette for Below-Color-Palette Layout -->
        <div v-if="section.showColorPalette && section.layout?.mediaPosition === 'below-color-palette'" class="color-palette">
          <div class="color-swatch blue"></div>
          <div class="color-swatch gray"></div>
          <div class="color-swatch black"></div>
        </div>
        

        <!-- Default Layout (if no layout specified) -->
        <template v-if="!section.layout">
          <!-- Section Text (if provided) -->
          <p v-if="section.text" class="section-text" v-html="section.text.replace(/\n/g, '<br>')"></p>
          
          <!-- Role Bubbles (if provided) -->
          <div v-if="section.roles && section.roles.length > 0" class="role-buttons">
            <button 
              v-for="role in section.roles" 
              :key="role" 
              class="role-button"
            >
              {{ role }}
            </button>
          </div>
          
          <!-- Color Palette (if enabled) -->
          <div v-if="section.showColorPalette" class="color-palette">
            <div class="color-swatch blue"></div>
            <div class="color-swatch gray"></div>
            <div class="color-swatch black"></div>
          </div>
          
          <!-- Media Content (if available) -->
          <div v-if="section.media && hasSectionMedia(section)" class="ui-screenshots" :class="{ 'branding-media': section.showColorPalette }" :style="section.showColorPalette ? 'margin-top: 2rem;' : ''">
            <SectionMedia :section="section" :project-id="projectId" />
          </div>
        </template>
      </section>

    </div>


  </div>
      <!-- Footer/Contact Section -->
    <footer class="footer">
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
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, nextTick, ref } from 'vue'

const props = defineProps<{
  projectId: string
}>()

// All work projects for footer navigation
const allWorkProjects = [
  { id: 'capsule-c1', title: 'Capsule C1' },
  { id: 'mr-takahashi', title: 'Mr. Takahashi' },
  { id: 'slider-engine', title: 'Slider Engine' },
  { id: 'openup', title: 'OpenUp' },
  { id: 'mecha-station', title: 'Mecha Station' },
  { id: 'stitchfam', title: 'Stitchfam' },
  { id: 'red-dead-redemption-2', title: 'Red Dead Redemption 2' },
  { id: 'wyte-card', title: 'Wyte Card' },
  { id: 'grand-theft-auto-v', title: 'Grand Theft Auto V' },
  { id: 'block-builder', title: 'Block Builder' }
]

const showWorkDetail = (projectId: string) => {
  // Navigate to the selected project
  window.location.href = `#${projectId}`
}

let observer: IntersectionObserver | null = null
let isScrollSetup = false

// Hero video controls
const heroVideo = ref<HTMLVideoElement | null>(null)
const originalVideoHeight = ref<number | null>(null)

// Video event handlers
const onVideoLoadStart = () => {
  console.log('Video loading started')
}

const onVideoCanPlay = () => {
  console.log('Video can play')
  // Setup animations when video is ready
  if (!isScrollSetup) {
    setTimeout(() => {
      setupScrollAnimations()
    }, 100)
  }
}

// Scroll-triggered animations for work detail sections
const setupScrollAnimations = () => {
  if (isScrollSetup) return
  
  // Clean up existing observer
  if (observer) {
    observer.disconnect()
  }

  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -30px 0px'
  }
  
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in')
      }
    })
  }, observerOptions)
  
  // Observe all work detail sections
  const sections = document.querySelectorAll('.work-detail-section')
  sections.forEach((section) => {
    observer?.observe(section)
  })
  
  // Also observe the footer
  const footer = document.querySelector('.footer')
  if (footer) {
    observer?.observe(footer)
  }
  
  // Fallback: Add fade-in class to all sections immediately on desktop
  if (window.innerWidth >= 768) {
    sections.forEach((section) => {
      section.classList.add('fade-in')
    })
  }
  
  isScrollSetup = true
  console.log('Scroll animations setup complete')
}

const ensureScrollable = () => {
  // Force browser to recalculate layout and ensure scrolling works
  const body = document.body
  const html = document.documentElement
  
  // Temporarily disable overflow, then re-enable
  body.style.overflow = 'hidden'
  html.style.overflow = 'hidden'
  
  requestAnimationFrame(() => {
    body.style.overflow = ''
    html.style.overflow = ''
    
    // Force layout recalculation
    body.offsetHeight
    
    console.log('Scroll ensured')
  })
}

onMounted(async () => {
  console.log('Component mounted')
  
  // Wait for Vue to finish rendering
  await nextTick()
  
  // Ensure scroll is enabled immediately
  ensureScrollable()
  
  // Multiple approaches to ensure animations work properly
  
  // 1. Immediate setup with requestAnimationFrame
  requestAnimationFrame(() => {
    setupScrollAnimations()
  })
  
  // 2. After page fully loads
  const handleLoad = () => {
    setupScrollAnimations()
    window.removeEventListener('load', handleLoad)
  }
  window.addEventListener('load', handleLoad)
  
  // 3. Fallback timer
  setTimeout(() => {
    setupScrollAnimations()
  }, 300)
  
  // 4. On first scroll attempt (final fallback)
  const handleFirstScroll = () => {
    setupScrollAnimations()
    window.removeEventListener('scroll', handleFirstScroll)
  }
  window.addEventListener('scroll', handleFirstScroll, { once: true })
  
  // 5. Additional fallback for stubborn cases
  setTimeout(() => {
    if (!isScrollSetup) {
      console.log('Forcing scroll setup')
      setupScrollAnimations()
    }
  }, 1000)
})

// Clean up on unmount
onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  isScrollSetup = false
})

// ========================================
// PROJECT DATA STRUCTURE GUIDE
// ========================================
// 
// HOW TO ADD A NEW PROJECT:
// 1. Copy the structure below
// 2. Fill in your project details
// 3. Add sections as needed (see examples below)
// 4. Add media only for sections that have content
//
// SECTION TYPES:
// - Regular section: { id: 'section-name', title: 'Section Title', text: 'Optional description' }
// - Branding section: { id: 'branding', title: 'Branding', showColorPalette: true }
// - Custom section: { id: 'custom', title: 'Custom Title', text: 'Description' }
//
// MEDIA ORGANIZATION:
// - Only add media arrays for sections that have content
// - Use: videos[], silentVideos[], images[] with matching labels[]
// - Example: brandingVideos: ['video1.mp4'], brandingVideoLabels: ['Video 1 Label']
//
// ========================================

const projectData: Record<string, {
  title: string
  designerType: string
  companyName: string
  description: string
  sections: Array<{
  id: string
  title: string
  text?: string
  showColorPalette?: boolean
  roles?: string[]
    layout?: {
      mediaPosition?: 'above-title' | 'below-title' | 'above-text' | 'below-text' | 'above-color-palette' | 'below-color-palette'
      textPosition?: 'above-media' | 'below-media'
      colorPalettePosition?: 'above-media' | 'below-media'
      mediaOrder?: 'videos-first' | 'images-first' | 'mixed' // Control order of videos vs images
    }
    media?: {
      videos?: string[]
      videoLabels?: string[]
      silentVideos?: string[]
      silentVideoLabels?: string[]
      images?: string[]
      imageLabels?: string[]
    }
    links?: Array<{
      type: 'download' | 'external' | 'github' | 'demo'
      label: string
      url: string
      icon?: string // Optional icon (📁, 🔗, 🐙, 🎮, etc.)
    }>
  }>
  media: {
    heroVideo?: string
    heroImage?: string
    heroVideoLabel?: string
    heroImageLabel?: string
    heroVideoSilent?: boolean
  }
  timeline?: string
}> = {
  // ========================================
  // EXAMPLE PROJECT: CAPSULE C1
  // ========================================
  'capsule-c1': {
    title: 'Capsule C1',
    designerType: 'Founder & Product Designer',
    companyName: 'Openup Technologies Inc.',
    description: 'Capsule C1 is a hardware and software product that turned the largest screen (your TV) into a window to your loved ones. This project was personal to us. My cofounder and I live far away from our families and video or phone calls were never good enough.\n\nI wanted my mother to feel as if she was sitting in the same room with her grandchildren and I. Capsule was our attempt to make distance feel like teleportation.',
    
      sections: [
        {
          id: 'roles',
          title: 'Roles',
          roles: [
              'Hardware Designer',
              'Software Designer',
              'Web Designer & Developer',
              '3D Printing & Assembly',
              'Marketing & Branding',
              'Visual Designer',
              'User Testing '
            ],
          },
        { 
          id: 'design',
          title: 'Design',
          text: 'The design process spanned many dimensions. I designed a 3D-printed casing for the Raspberry Pi 5 and your phone in Blender and I made sure it was durable and aesthetically pleasing. On the software side, I built both the mobile app and the TV app designs using Figma. The website was designed and developed by me in Framer and the assets were made in Blender.',
          layout: {
            mediaPosition: 'below-text' // Media appears above the title
          },
          media: {
            silentVideos: [ 'DT_Mobile_Call.mp4', 'DT_Signup.mp4', 'Design_5.mp4'],
            silentVideoLabels: [
              'Home Page & Calling',
              'Mobile Sign Up Screen',
              'TV App Design',
            ],
            images: [ 'Top_View.png', 'Phone_Insert.png', 'Side_View.jpg'],
            imageLabels: [
              'Top View of the C1',
              'Final Product Design & Assembly',
              'Side View of the C1'
            ]
          }
        },
        {
          id: 'prototyping',
          title: 'Prototyping',
          text: 'I went through many iterations of the Capsule C1 casing. The goal was to design a stand that securely held the phone, allowed for slight tilt adjustments, housed the Raspberry Pi 5 while keeping it cool, used minimal material, and all while being aesthetically pleasing.\n\nThe TV and mobile app priority was clarity first, beauty second. If a person couldn’t immediately understand what to do, the design failed. Too much on screen created confusion, and I knew from experience that most people won’t stop to read instructions, the interface had to guide them effortlessly.',
          layout: {
            mediaPosition: 'below-text' // Media appears below the text (default)
          },
          media: {
            images: ['Challenges_1.jpeg', 'Challenges_2.jpeg', 'Challenges_3.png'],
            imageLabels: [
              'Testing Designs',
              'Many iterations in The Trash', 
              'First Design in Figma'
            ],
            silentVideos: ['printing.mp4'],
            silentVideoLabels: ['3D Printing a Capsule C1']
          }

        },
        {
          id: 'roles',
          title: 'Tools',
          roles: ['Blender', '3D Printer', 'Figma', 'Adobe Suite', 'Blackmagic Camera', 'Framer'],

        },
        
        
        {
          id: 'branding',
          title: 'Branding',
          text: 'The Capsule brand was designed to feel simple, modern, and trustworthy. The visual language leaned on whites, greys, and blacks, with subtle blue accents. Typography was approachable, optimized for living room distance.\n\nMarketing materials and promotional content mirrored this simplicity, always focusing on clarity rather than jargon. These elements created a cohesive experience across hardware, apps, and brand touchpoints.',
          showColorPalette: true,
          layout: {
            mediaPosition: 'below-text' // Media appears above the title
          },
          media: {
            silentVideos: ['Branding_1.mp4', 'Branding_3.mp4', 'Branding_4.mp4', 'Branding_5.mp4'],
            silentVideoLabels: [
              'Promotional Content 1',
              'Promotional Content 2', 
              'Promotional Content 3',
              'Promotional Content 4'
            ]
          }
        },
        {
          id: 'challenges',
          title: 'Challenges',
          text: 'The biggest hurdle was technical: achieving reliable H.265 video calls over real networks. We pivoted to H.264 for stability, which worked better but had loss of quality. Beyond the technical, we learned that tests that worked for me and my cofounder often broke down for families in their own living rooms during testing. \n\nRunning in-home tests revealed usability gaps and shaped key design changes. Ultimately, Capsule was paused due to time and funding constraints, but it proved invaluable in teaching me how to design holistically across hardware, software, and brand. I will be back to this project in the near future.'
        }
    ],
    media: {
      heroVideo: 'Demo_Video.mp4',
      heroVideoLabel: 'Demo | Filmed and Edited By Tarlok Singh',
      heroVideoSilent: false
    },
    timeline: '2024 - 2025'
  },
  'mr-takahashi': {
    title: 'Mr.Takahashi',
    designerType: 'Founder & Product Designer',
    companyName: 'Openup Technologies inc.',
    description: 'Mr. Takahashi is an AI Japanese language tutor designed to make learning feel like a conversation with a friendly teacher rather than a textbook. The project began as a pivot from our earlier conversational friend AI, Adam, which told the news and answered questions, but was not much more useful.\n\n My cofounder and I  had struggled with staying motivated on language learning apps, and we believed a more human, entertaining tutor could change that. Instead of flashcards or static lessons, learners could talk directly to Mr. Takahashi, a 3D-animated teacher who responded with personality and humor.',

    sections: [
      {
        id: 'roles',
        title: 'Roles',
    roles: ['AI System Prompt Design', 'App UX/UI Design', 'Web Designer & Developer', 'Marketing & Sales', '3D Character Design & Animation', 'User Testing'],
      },
      {

        id: 'design',
        title: 'Design',
        text: 'The design process combined conversational AI with expressive animation. I built the Takahashi character in Blender 3D, designing a wide range of facial expressions to reflect emotion and context during lessons to keep users entertained and engaged. In Figma, I designed lesson flows that evolved from free-form conversation into structured guidance, after user testing revealed the need for clearer learning paths.\n\n We iterated continuously with a small set of learners, cutting unnecessary steps and making flows more direct. I also tested multiple LLM models and system prompt designs to balance accuracy, speed, and entertainment value. Every design choice was made to keep learners engaged day after day, which is a critical challenge in language learning.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: [ 'Design_10.mp4', 'Signed_In.mp4',],
          silentVideoLabels: ['Lesson One', 'Welcome Screen', 'Sign up Design'],
          images: ['Menu.png',],
          imageLabels: ['Lesson Menu']
        }
      },
        {
          id: 'tools',
          title: 'Tools',
          roles: ['Blender', 'Figma', 'Adobe Suite', 'Blackmagic Camera', 'Framer', 'LLM Models', '3D Printing'],
        },
        {

          id: 'process',
          title: 'Process',
          text: 'We began with Adam, a conversational AI paired with a behind-the-ear “headphone” meant for all-day questions. After struggling to build a great earpiece and rarely using it ourselves, we pivoted. Takahashi followed, inspired by my cofounder’s frustration with language apps and his desire to learn Japanese.\n\n Our idea: people learn best when curiosity drives them, not when content is pushed at them. In practice, this approach was good but failed since users didn’t know what to ask, engagement dropped, and unlike a real tutor, an unstructured AI felt directionless. We shifted to clear, lesson-based guidance while still allowing users to ask questions anytime.',
          layout: {
            mediaPosition: 'below-text',
            mediaOrder: 'images-first' // Images will appear before videos
          },
          media: {
            silentVideos: ['Process_1.mp4','Adam_Speaking.mp4'],
            silentVideoLabels: ['Animating Mr. Takahashi', 'Conversating with Adam'],
            images: ['Process_00.webp', 'Process_0.webp','Process_2.webp','Process_3.webp'],
            imageLabels: ['Building Adam Ear Headphone', 'Designing Takahashi in Blender', 'Wearing Version 5 Adam', 'Wearing Version 1 Adam']
          }
        },
      {
        id: 'branding',
        title: 'Branding',
        text: 'We positioned Mr. Takahashi as both trustworthy and entertaining. His 3D persona was designed to feel approachable and playful, someone who could encourage you without feeling robotic or academic. I tested different voices until we found one that struck the right balance of warmth and entertaining.\n\n The visual identity leaned toward clean layouts and vibrant accents, signaling energy and fun rather than the dry seriousness. Marketing materials emphasized Takahashi not as an app, but as a friend from Japan teaching you to speak Japanese.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {

          images: ['Marketing_6.jpg'   ],
          imageLabels: ['• App intro', '• Lesson view']
        }
      },

    {
      id: 'challenges',
      title: 'Challenges',
      text: 'Two main challenges defined this project. First, retention: early users enjoyed conversations but churned quickly without structure, which led us to add lessons. Second, cost: heavy users drove high expenses due to LLM usage, which made it difficult without capital.\n\n While the product built a small base of enthusiastic learners, we could not find a sustainable path forward without capital. Still, the project strengthened my 3D and animation skills, taught me how to shape AI outputs through prompt design, and reinforced the importance of iterating quickly with users to uncover what keeps them engaged.'
    }
  ],
    media: {
      heroVideo: 'MrTakahashi_Demo.mp4',
      heroImage: '',
      heroVideoLabel: 'Demo | Filmed and Edited By Tarlok Singh',
      heroVideoSilent: false
    },
    timeline: '2024'
  },
  'mecha-station': {
    title: 'Mecha Station',
    designerType: 'Founder & Product Designer',
    companyName: 'Openup Technologies inc.',
    description: 'Mecha Station was a point-of-sale (POS) designed for small grocery stores. My parents were store owners for over 20 years, so I understood the problems grocers faced daily. Also after many years focused on consumer products, we wanted to try solving problems in B2B. \n\n These businesses needed speed, clarity, and reliability catered to their unique workflows. Mecha Station set out to give them something that would save them hundreds of hours monthly.',

    sections: [
      {
        id: 'roles',
        title: 'Roles',
    roles: ['Product Design', 'UX/UI Design','Web Designer & Developer', 'Branding', 'Sales & Marketing', 'User Testing', 'Customer Support'],
        layout: {
          mediaPosition: 'below-text'
        },       
         media: {
          silentVideos: ['MobileApp_1.mp4','MobileApp_2.mp4','MobileApp_3.mp4','MobileApp_4.mp4','MobileApp_5.mp4',],
          silentVideoLabels: ['Mobile Checkout', 'Mobile Reports', 'Updating Item Information', 'Checking Reciepts', 'Creating an Order'],
        }
      },

      {
        id: 'desktop-design',
        title: 'Design',
        text: ' I designed Mecha Station around two priorities: speed (no customer should wait because the interface slows down the cashier) and clarity (new employees should understand the system within seconds). The interface was stripped down to essentials so that actions could be performed instantly, even under pressure, with a line of customers waiting.\n\n I personally tested prototypes in-store, running mock checkout sessions and refining flows based on real-world usage with our first customer. Every adjustment aimed to reduce steps, cut hesitation, and make the system feel invisible in the middle of a busy shift.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: ['Desktop_1.mp4','Desktop_2.mp4','Desktop_3.mp4'],
          silentVideoLabels: ['Desktop Payments', 'Updating Staff Information', 'Updating an Item'],
        }
      },
      {
        id: 'tools',
        title: 'Tools',
        roles: ['Figma', 'NI Maschine', 'LLM Models', 'Framer', 'Adobe Creative Suite'],
      },
       {
         id: 'branding',
         title: 'Branding',
         text: 'Most point-of-sale systems have little to no brand presence, which allowed us to stand out. I designed the branding around simplicity and clarity, and with sound effects that provided audio feedback so users could instantly understand interactions without even looking, a subtle form of optimization. \n\nThe visual identity centered on white as the canvas, green for highlights, and black for text, creating a clean and functional palette. We named it Mecha Station to evoke a product that felt futuristic and forward-looking.',
         layout: {
           mediaPosition: 'below-text'
         },
         media: {
           images: ['Process.png', 'shelflabel0.png', 'shelf_label.jpg'],
           imageLabels: ['Making Multiple Ads', 'Shelf Label', 'Shelf Label in Use']
         }
       },
       {
        id: 'challenges',
        title: 'Challenges',
        text: ' The biggest challenge wasn’t design, it was adoption. Many store owners were locked into existing systems and reluctant to switch, feeling it would take too much time to learn no matter how simple we made Mecha Station to be. Over three months, I pitched the product to more than 70 store owners in person, landing just one customer.\n\n It became clear that the changes we made felt incremental to many customers and it wasnt enough to drive a switch in this market. While traction was limited, the project taught me how to design and fix under the pressures of real-world retail, and to focus more on a real big pain points in B2B markets.'
      }
      
    ],
    media: {
      heroImage: 'Hero.jpg',
      heroImageLabel: 'Showcasing the entire product together',
      heroVideoSilent: true
    },
    timeline: '2023 - 2024'

  },
  'slider-engine': {
    title: 'Slider Engine',
    designerType: 'Founder & Product Designer',
    companyName: 'Openup Technologies inc.',
    description: ' Slider Engine was our attempt to reimagine how games could be built without code. The project began when my cofounder and I considered making a game for fun, but after our experiences with Unity and other engines, we saw a bigger opportunity to design a new engine that was simpler, more intuitive, and AI-assisted.\n\n  Our vision was to allow anyone to create games using logical building blocks instead of scripts, enabling millions of people to become game developers. The business opportunity and mission seemed grand, so we began in March 2025. ',

    sections: [
       {
        id: 'roles',
        title: 'Roles',
        roles: ['Product Design', 'UX/UI Design', 'Game Design', 'Branding', 'User Research', 'Prototyping', 'Marketing']
      },
      {
         id: 'design',
         title: 'Design',
         text: 'My cofounder and I spent a month mapping game logic into a UI-first system, breaking programming into four visual mechanics: triggers, conditions, actions, and properties. By connecting these building blocks, users could create behaviors like jumping or collisions without writing code. Designing even basic actions (like a character jump) revealed how much complexity programmers manage under the hood to me, and pushed me to create clear, visual flows that beginners could understand.\n\n As a musician, I’ve always valued the immediacy of knobs and dials, you twist something and hear instant feedback. I wanted that same responsiveness in game design. Most existing tools force constant back-and-forth, make a change, hit play, then wait to see results. Our goal was to remove that friction, giving creators instant feedback as they built their games.',
         layout: {
           mediaPosition: 'below-text'
         },
         media: {
           silentVideos: ['Design_1.mp4','Design_5.mp4','Design_3.mp4','Design_4.mp4'],
           silentVideoLabels: ['Adjusting The Speed of a Character', 'Creating a New Game', 'Adding Game Objects', 'Reversing & Object Trails'],
         }
       },
       {
        id: 'tools',
        title: 'Tools',
        roles: ['Figma', 'Adobe After Effects', 'Adobe Premiere Pro', 'LLM Models', 'Framer', 'Unity'],
       },
       {
        id: 'branding',
        title: 'Process & Branding',
        text: 'The design for Slider Engine was inspired by what Figma did for designers, making professional creation tools easy to understand and to use. We wanted to do the same for game development. The visual identity leaned on a black, green, and grey palette to convey focus and sophistication, while still feeling creative.\n\n The modular design language echoed the engine’s “building block” philosophy, reinforcing the idea that complex games could be built piece by piece. Our goal was for new creators to feel empowered the moment they opened the engine, not intimidated.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: ['Game_1.mp4','Game_2.mp4','marketing2.mp4'],
          silentVideoLabels: ['Dodge Game Test', 'Frogman vs the Giant Toad', 'Unfinished Marketing Video '],
        }
       },
       {
        id: 'challenges',
        title: 'Challenges',
        text: ' The main challenge was designing an engine that could do everything a normal game engine could do (focusing on indie game developers). We underestimated how long it would take to develop a working engine, even a simplified one too.\n\n After months, we still had a prototype riddled with bugs, and something that was still too difficult to understand, and our limited resources forced us to pause. Despite this, the project was a breakthrough for me as a designer. I learned how to translate complex, abstract systems into usable tools by non technical humans.'
      },
      {
        id: 'links',
        title: '',
        links: [
          {
            type: 'demo',
            label: 'Try Slider Engine',
            url: 'https://sliderengine.com/'
          }
          ,
          {
            type: 'download',
            label: 'Download the Pitch Deck',
            url: '/downloads/Slider_Engine_ Pitch_Deck.pdf'
          }
        ]
      }
    ],
    media: {
      heroVideo: 'hero.mp4',
      heroVideoLabel: 'Demo | Created By Tarlok Singh',
      heroVideoSilent: true
    },
    timeline: '2025'
  },
  'stitchfam': {
    title: 'Stitchfam',
    designerType: 'Founder & Product Designer',
    companyName: 'Openup Technologies inc.',
    description: ' StitchFam is a collaborative family tree designed to grow organically through shared contributions. The idea came from how I wanted to map out my family history but I didnt know everyones name, didnt have photos and had no idea how to reach my extended members in India and their extended members.\n\n So I searched for a way to simply “stitch” it together digitally, where each family member could add their piece, their members and pass it on. It didnt seem to exist, so that is how StitchFam was born.',

    sections: [
      {
        id: 'roles',
        title: 'Roles',
        roles: ['Product Design', 'UX/UI Design', 'Branding', 'Research'],
      },
    
      {
        id: 'design',
        title: 'Design',
        text: '  I built invitation flows where a single link could be passed from one family member to the next, hoping to create a natural chain of participation.\n\n Visualization layouts were designed to emphasize relationships as living connections, not just data points. The challenge was making the input process quick and engaging so relatives wouldn’t lose interest after a few steps.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: ['Design_3.mp4', 'Design_1.mp4', 'Design_2.mp4'],
          silentVideoLabels: ['Mobile View Family Tree', 'Adding a Family Member', 'Inviting a Family Member'],
        }
      },
      {
        id: 'branding',
        title: 'Branding',
        text: ' The brand was built around warmth and desire to be distinct from the sterile or transactional feel of existing genealogy tools. Where Ancestry and others lean formality, StitchFam’s identity centers on family connection.\n\n The name itself reinforced the metaphor, stitching pieces of a family together into something whole. The visual design favored softer tones and friendly typography to make the experience feel less like software and more like a family project on a quilt.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: [ 'Desktop_2.mp4'],
          silentVideoLabels: [ 'Desktop Adding a Member'],
          images: ['Test_1.jpg', 'Invited.jpg'],
          imageLabels: ['Design Exploration', 'Invite in iMessage'],
        }
      },

      {
        id: 'challenges',
        title: 'Challenges',
        text: ' The biggest challenge was distribution. Many relatives didn’t pass the link along, which stalled growth. I realized the invitation flow should have leaned on family group chats, as they proved far more effective than one-to-one invitations oddly for this project.\n\n Adoption remained low, and we eventually moved on to other projects but have a neat family tree to show for it.',
      }

    ],
    media: {
      heroVideo: 'Desktop_1.mp4',
      heroVideoLabel: 'Traveling through the family tree',
      heroVideoSilent: true
    },
    timeline: '2024'
  },
  'wyte-card': {
    title: 'Wyte Card',
    designerType: 'Product Designer',
    companyName: 'Openup Technologies inc.',
    description: ' Wyte Card was our attempt to build a premium digital buisiness card, designed for speed of contact sharing, elegance, and data insights. The idea stemmed directly from an earlier experiment, Gala-Reel, where we used NFC cards and app clips at weddings to share the reception gallery. Participants could also take photos and videos and upload them instantly.\n\n While Gala-Reel taught us how seamless NFC interactions could feel, we struggled to find customers in general. We did a three day project called By The People" as well that used the same technology to share photos and videos but for college campuses to test out the technology. From all that experience, we pivoted the core technology into a more practical, everyday product, digital business cards.',  
    timeline: '2025',

    sections: [
      {
        id: 'roles',
        title: 'Roles',
        roles: ['Product Design', 'UX/UI Design', 'Branding', 'User Research', 'Product Research', 'Marketing & Sales']
      },
      {
        id: 'design',
        title: 'Design',
        text: ' The physical card was intentionally minimalist, plain white to reduce costs. On the digital side, the experience was simple, tap the card, an app clip opens and contact information opened instantly, no apps required. People who were "tapped" could also purchase their own card right from the app clip. The design philosophy was elegance and speed as we saw the market shows how a great card builds trust.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          images: ['Wyte_1.png', 'Wyte_2.png', 'Wyte_3.png'],
          imageLabels: ['Main view when opened', 'Social Media Links', 'Updated view'],
        }
      },
      {
        id: 'branding',
        title: 'Branding',
        text: ' The brand identity leaned into professionalism and minimalism. We named it Wyte to reflect the clean, all-white design of the card. Visuals were sleek, neutral, and premium to signal trust and sophistication for professionals like real estate agents.\n\n Marketing emphasized speed, and long-term cost savings compared to printing traditional cards. Where Gala-Reel was festive and celebratory, Wyte Card was designed to feel sharp, focused, and professional.',
        layout: {
          mediaPosition: 'below-text',
          mediaOrder: 'images-first'
        },

        media: {
          images: ['Gala_Reel.jpg'],
          imageLabels: ['Gala Reel Gallery View'],
          silentVideos: ['Video1.mp4','Demo_3.mp4' ],
          silentVideoLabels: ['NFC Card & App Clip', 'By The People App Clip Test'],
        }
      },
      
      {
        id: 'challenges',
        title: 'Challenges',
        text: ' The biggest challenge wasn’t  or technical as it took us only days to build the product, but timing. Just as Wyte Card was approved for TikTok Shop and we began testing with real estate agents, my mother required triple bypass surgery. I stepped away from startup life to focus on family. ',
      }
    ],
    media: {
      heroVideo: 'hero.mp4',
      heroVideoLabel: 'Promotional Video',
      heroVideoSilent: true
    }
  },
  'openup': {
    title: 'OpenUp',
    designerType: 'Product Designer',
    companyName: 'Openup Technologies inc.',
    description: ' OpenUp began with a problem I had while living in New York City. Making great friends in a city with 8 million people is extremely hard (I thought at the time, not anymore). I asked myself in 2015 while working at Rockstar Games in New York: Why isn’t there a product for making friends the way there are for making relationships? \n\n I wanted to design a product that solved that loneliness. In 2017, I started teaching myself how I could bring the idea to life. Over the years, OpenUp went through four major redesigns as I searched for the right way to help people build real friendships online.',
    timeline: '2020 - 2023',
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        roles: ['Founder','Product Design', 'Marketing', 'User Testing & Research', 'Recruiting My Co-Founder'],
      },
      {
        id: 'design',
        title: 'Design',
        text: ' The design evolved through multiple iterations, from the first concept to later versions that explored voice-first interaction and lightweight posting. Through user conversations, personal testing, and experince I discovered that friendships don’t form from casual encounters alone, they emerge from shared suffering (whether self inflicted or by others like school, sports, or companies).\n\n This insight reshaped the design direction, though it proved difficult to replicate that dynamic online. I continuously prototyped in Figma, simplifying flows and experimenting with ways to create authentic bonds rather than surface-level connections.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: ['One.mp4', 'Two.mp4'],
          silentVideoLabels: ['Home Page', 'Messages Page'],

        }
      },
      {
        id: 'tools',
        title: 'Tools',
        roles: ['Figma', 'Adobe Creative Suite', 'HTML & CSS', ],
      },
      {
        id: 'branding',
        title: 'Branding',
        text: 'OpenUp needed to feel trustworthy at all times. I leaned into a softer visual language and copy that emphasized vulnerability and openness.\n\n OpenUp’s branding aimed to create emotional permission, to let people feel safe putting themselves out there to meet others. The branding changed a lot over the years, but the core message was always the same. Eventually focused on a more creative and playful design while maintaining trust.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: ['Three.mp4', 'Four.mp4', 'Five.mp4'],
          silentVideoLabels: ['Openup : Version 3', 'Openup: Version 2', 'Openup: Version 2 Demo']
      },
      },
      {
        id: 'challenges',
        title: 'Challenges',
        text: ' The biggest challenge was finding true product-market fit. On one hand, we proved we could generate traction. I once threw a fraternity party where over 1,000 people signed up on the spot to get in. But those signups didn’t stick: the app offered too little for them to actually do, and profiles remained half-finished.\n\n Over time, I also realized the deeper design challenge: creating authentic “common suffering” online was far harder than replicating it in real life. Despite pivots and experiments, I couldn’t solve that core issue. Still, the project taught me critical lessons in distribution strategy, community psychology, and the gap between acquisition and retention.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: ['Six.mp4', 'Seven.mp4'],
          silentVideoLabels: ['OpenUp Custom Animations', 'OpenUp: Version 1']
        }
      },

    ],
    media: {
      heroVideo: 'hero.mp4',
      heroVideoLabel: 'Demo | Created By Tarlok Singh',
      heroVideoSilent: true
    }
  },
  'red-dead-redemption-2': {
    title: 'Red Dead Redemption 2',
    designerType: 'Game Designer',
    companyName: 'Rockstar Games',
    description: 'My job at Rockstar was focusing on storytelling through camera work and editing. Red Dead Redemption 2 went on to generate $725M in its opening weekend, and my role gave me a front-row seat to what it takes to craft experiences at that scale.',
    timeline: '2015 - 2016',
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        roles: ['Cinematography', 'Editing', 'Training', 'Collaboration'],
      },
      {
        id: 'design',
        title: 'The Work',
        text: 'I worked closely with the game’s director, 3D artists, and technical programmers who built internal tools. Motion capture data would come in from the set, and my responsibility was to place cameras, block action, and design the cutscene’s flow, essentially 3D cinematography and editing.\n\n I used Autodesk MotionBuilder to create dynamic, cinematic camera movements and Avid Media Composer for editing and pacing. If I thought of something to make things more effecient in our workflow, I would share it with our technical artists',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: ['Guns Out.mp4','Darkness.mp4', 'Knifetoneck.mp4', 'Saved_Micah.mp4'],
          silentVideoLabels: ['Scene From Red Dead Redemption 2', 'Scene From Red Dead Redemption 2', 'Scene From Red Dead Redemption 2', 'Scene From Red Dead Redemption 2'],
        }
      },
      {
        id: 'tools',
        title: 'Tools',
        roles: ['Autodesk MotionBuilder', 'Avid Media Composer', 'Internal Tools'],
      },
      {
        id: 'craft',
        title: 'Iteration & Craft',
        text: 'Each scene went through rounds of review. I would establish the first pass of camera work, then refine based on my team members feedback and the director\'s feedback, iterating until the narrative felt seamless and emotionally compelling.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: ['Mansionburning.mp4', 'Shootout.mp4', 'talking.mp4'],
          silentVideoLabels: ['Scene From Red Dead Redemption 2', 'Scene From Red Dead Redemption 2', 'Scene From Red Dead Redemption 2'],
        }
      },
      { 
        id: 'challenges',
        title: 'Collaboration',
        text: '  I worked with a team of 8 people daily, sometimes up to 50 on set. I also trained new team members on workflows and Rockstar’s production pipeline.',
      },
          ],
    media: {
      heroVideo: 'Explosion.mp4',
      heroVideoLabel: 'Scene | Created By Tarlok Singh',
      heroVideoSilent: false
    }
  },
  'grand-theft-auto-v': {
    title: 'Grand Theft Auto V',
    designerType: 'Game Designer',
    companyName: 'Rockstar Games',
    description: ' I worked on the storytelling of Rockstar’s GTA V DLC, focusing on camera work and editing. Unlike Red Dead Redemption 2, which demanded slow, deliberate craft, GTA DLC required fast turnarounds to meet release schedules.',
    timeline: '2015 - 2016',

    sections: [
    {
        id: 'roles',
        title: 'Roles',
        roles: ['Cinematography', 'Editing', 'Training', 'Collaboration'],
      },
      {
        id: 'work',
        title: 'The Work',
        text: 'I worked closely with the game’s director, 3D artists, and technical programmers who built internal tools. Motion capture data would come in from the set, and my responsibility was to place cameras, block action, and design the cutscene’s flow, essentially 3D cinematography and editing.\n\n I used Autodesk MotionBuilder to create dynamic, cinematic camera movements and Avid Media Composer for editing and pacing. If I thought of something to make things more effecient in our workflow, I would share it with our technical artists',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: ['1.2.mp4','3.mp4','4.mp4'],
          silentVideoLabels: ['• Open World Freedom', '• Heist Missions', '• Character Switching'],
  
        }
      },
      {
        id: 'tools',
        title: 'Tools',
        roles: ['Autodesk MotionBuilder', 'Avid Media Composer', 'Internal Tools'],
      },
      {
        id:  'learning',
        title: 'Learning',
        text: 'This work taught me adaptability. Red Dead was about patience and perfecting scenes for an unreleased game, while GTA was about speed and consistency within an established style. I had to quickly adjust to GTA’s camera language and editing rhythm while still delivering scenes that felt cinematic.',
        layout: {
          mediaPosition: 'below-text'
        },
      }
    ],
    media: {
      heroVideo: '5.2.mp4',
      heroVideoLabel: 'GTA DLC Scene',
      heroVideoSilent: false
    }
  },
  'block-builder': {
    title: 'Block Builder',
    designerType: 'Product Designer',
    companyName: 'Openup Technologies inc.',
    description: ' Block Builder was a simple iPad game we created for my son, inspired by the idea of bringing a LEGO-style building experience into a digital form. At the time, we noticed there wasn’t a block-building game designed for young children on tablets, so we built one in under a week. The goal was something fun for my son and as a quick experiment in game development for us in Unity.',
    timeline: '2025',
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        roles: ['Product Design', 'UX/UI Design', '3D Design','User Research & Testing'],
      },
      {
        id: 'design',
        title: 'Design',
        text: ' The design process was guided almost entirely by observing how my four-year-old interacted with the prototype and other games. We tested basic mechanics together, and I adjusted the interface based on where he struggled.\n\n Camera controls proved confusing for him, and he wanted pre-made structures as starting points instead of building from scratch, an insight that highlighted the importance of scaffolding for engagement at his age. Initial user testing was done by me and my cofounder to validate core flows before handing it off to him.',
        layout: {
          mediaPosition: 'below-text'
        },
        media: {
          silentVideos: ['1.mp4', '2.mp4','3.mp4'],
          silentVideoLabels: ['Starting a build', 'Building a car', 'Building a duckbug'],
        }
      },
      {
        id: 'branding',
        title: 'Branding & Insights',
        text: ' Block Builder didn’t have a formal brand system, but its identity came from its colorful blocks, playful interactions, and a child-friendly tone. It was less about creating a polished product and more about creating a sandbox that felt inviting and easy to explore.\n\n Block Builder showed us how quckly we could develop and ship a working game, its much easier than I thought it would be for a designer and a engineer. ',

      },

    ],
    media: {
      heroVideo: 'hero.mp4',
      heroVideoLabel: 'Modular system demonstration',
      heroVideoSilent: true
    }
  },
}

const project = projectData[props.projectId] || projectData['capsule-c1']

// Helper function to check if a section has media
const hasSectionMedia = (section: any) => {
  if (!section.media) return false
  const { videos = [], silentVideos = [], images = [] } = section.media
  return videos.length > 0 || silentVideos.length > 0 || images.length > 0
}

// Helper function to get video path
const getVideoPath = (projectId: string, filename: string) => {
  return new URL(`/src/assets/${projectId}/${filename}`, import.meta.url).href
}

// Helper function to get image path
const getImagePath = (projectId: string, filename: string) => {
  return new URL(`/src/assets/${projectId}/${filename}`, import.meta.url).href
}

// Video interaction functions
const toggleFullscreen = (event: Event) => {
  const video = event.target as HTMLVideoElement
  if (video.requestFullscreen) {
    video.requestFullscreen()
  } else if ((video as any).webkitRequestFullscreen) {
    (video as any).webkitRequestFullscreen()
  } else if ((video as any).msRequestFullscreen) {
    (video as any).msRequestFullscreen()
  }
}

const onVideoLoaded = (event: Event) => {
  const video = event.target as HTMLVideoElement
  video.volume = 0.5
}




// Hero video methods
const onHeroVideoLoaded = (event: Event) => {
  const video = event.target as HTMLVideoElement
  
  // Store original video height before controls are added
  if (!originalVideoHeight.value) {
    originalVideoHeight.value = video.videoHeight
  }
  
  // Try to detect if video has audio by checking if it can be unmuted
  const originalVolume = video.volume
  video.volume = 0.1
  
  // Check if volume actually changed (indicates audio capability)
  const hasAudio = video.volume > 0
  
  // Restore original volume
  video.volume = originalVolume
  
  // Store audio capability in dataset
  video.dataset.hasAudio = hasAudio.toString()
  
  // If no audio, keep muted
  if (!hasAudio) {
    video.muted = true
  }
}


</script>
<style scoped>
/* Import the work detail styles */
@import '../work-detail.css';
</style>
