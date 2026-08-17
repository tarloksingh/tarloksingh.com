import { gsap } from 'gsap'

// Types for animation options
export interface LetterAnimationOptions {
  duration?: number
  delay?: number
  ease?: string
  startY?: number
  highlightColor?: string
  returnColor?: string
}

// Default animation options
const defaultLetterOptions: LetterAnimationOptions = {
  duration: 0.4,
  delay: 0.08,
  ease: "power2.out",
  startY: 20,
  highlightColor: '#32CD32',
  returnColor: '#000000'
}

/**
 * Letter-by-letter animation for text elements
 * @param element - The HTML element containing the text
 * @param options - Animation configuration options
 * @returns Promise that resolves when animation completes
 */
export const letterByLetterAnimation = (
  element: HTMLElement, 
  options: LetterAnimationOptions = {}
): Promise<void> => {
  return new Promise((resolve) => {
    const opts = { ...defaultLetterOptions, ...options }
    
    // Split text into individual characters
    const text = element.textContent || ''
    const chars = text.split('')
    
    // Clear and create individual character spans
    element.innerHTML = ''
    const spans: HTMLElement[] = []
    
    chars.forEach(char => {
      const span = document.createElement('span')
      span.textContent = char
      span.className = 'inline-block opacity-0'
      span.style.transform = `translateY(${opts.startY}px)`
      element.appendChild(span)
      spans.push(span)
    })
    
    // Create timeline for smooth animation
    const tl = gsap.timeline({
      ease: opts.ease,
      onComplete: resolve
    })
    
    // Animate each letter
    spans.forEach((span, index) => {
      const delay = opts.delay || 0.08
      tl.to(span, {
        opacity: 1,
        y: 0,
        duration: opts.duration,
        ease: opts.ease
      }, index * delay)
      
      // Add highlight effect
      const highlightTime = index * delay
      tl.to(span, {
        color: opts.highlightColor,
        duration: 0.2,
        ease: opts.ease
      }, highlightTime)
      
      // Return to original color
      tl.to(span, {
        color: opts.returnColor,
        duration: 0.3,
        ease: opts.ease
      }, highlightTime + 0.1)
    })
  })
}
