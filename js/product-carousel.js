// PRODUCT CAROUSEL FUNCTIONALITY

class ProductCarousel {
    constructor() {
        this.carousels = new Map();
        this.init();
    }

    init() {
        // Initialize all carousels
        this.setupCarousels();
        // Setup fullscreen functionality
        this.setupFullscreen();
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
    }

    setupCarousels() {
        const carouselContainers = document.querySelectorAll('[data-carousel]');
        
        carouselContainers.forEach(container => {
            const carouselId = container.dataset.carousel;
            const images = container.querySelectorAll('.carousel-image');
            const card = container.closest('.product-card');
            const progressDots = card.querySelectorAll('.progress-dot');
            
            if (images.length <= 1) return; // Skip single image carousels
            
            const carousel = {
                container,
                images: Array.from(images),
                progressDots: Array.from(progressDots),
                currentIndex: 0,
                autoplayTimer: null,
                autoplayDelay: 4000
            };
            
            this.carousels.set(carouselId, carousel);
            this.setupCarouselEvents(carousel);
            this.startAutoplay(carousel);
        });
    }

    setupCarouselEvents(carousel) {
        const { container, progressDots } = carousel;
        
        // Progress dot clicks
        progressDots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                this.goToSlide(carousel, index);
            });
        });
        
        // Container click for fullscreen
        container.addEventListener('click', () => {
            this.openFullscreen(carousel);
        });
        
        // Pause autoplay on hover
        container.addEventListener('mouseenter', () => {
            this.pauseAutoplay(carousel);
        });
        
        container.addEventListener('mouseleave', () => {
            this.startAutoplay(carousel);
        });
        
        // Touch support for mobile
        this.setupTouchEvents(carousel);
    }

    setupTouchEvents(carousel) {
        const { container } = carousel;
        let startX = 0;
        let startY = 0;
        let isScrolling = null;
        
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX;
            startY = e.touches[0].pageY;
            isScrolling = null;
            this.pauseAutoplay(carousel);
        });
        
        container.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            const deltaX = e.touches[0].pageX - startX;
            const deltaY = e.touches[0].pageY - startY;
            
            if (isScrolling === null) {
                isScrolling = Math.abs(deltaX) < Math.abs(deltaY);
            }
            
            if (!isScrolling) {
                e.preventDefault();
            }
        });
        
        container.addEventListener('touchend', (e) => {
            if (!startX || !startY || isScrolling) {
                this.startAutoplay(carousel);
                return;
            }
            
            const deltaX = e.changedTouches[0].pageX - startX;
            const threshold = 50;
            
            if (Math.abs(deltaX) > threshold) {
                if (deltaX > 0) {
                    this.previousSlide(carousel);
                } else {
                    this.nextSlide(carousel);
                }
            }
            
            startX = 0;
            startY = 0;
            this.startAutoplay(carousel);
        });
    }

    goToSlide(carousel, index) {
        const { images, progressDots } = carousel;
        
        // Update current index
        carousel.currentIndex = index;
        
        // Update images
        images.forEach((img, i) => {
            img.classList.toggle('active', i === index);
        });
        
        // Update progress dots
        progressDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        
        // Reset autoplay
        this.restartAutoplay(carousel);
    }

    nextSlide(carousel) {
        const { images } = carousel;
        const nextIndex = (carousel.currentIndex + 1) % images.length;
        this.goToSlide(carousel, nextIndex);
    }

    previousSlide(carousel) {
        const { images } = carousel;
        const prevIndex = (carousel.currentIndex - 1 + images.length) % images.length;
        this.goToSlide(carousel, prevIndex);
    }

    startAutoplay(carousel) {
        if (carousel.images.length <= 1) return;
        
        this.pauseAutoplay(carousel);
        carousel.autoplayTimer = setInterval(() => {
            this.nextSlide(carousel);
        }, carousel.autoplayDelay);
    }

    pauseAutoplay(carousel) {
        if (carousel.autoplayTimer) {
            clearInterval(carousel.autoplayTimer);
            carousel.autoplayTimer = null;
        }
    }

    restartAutoplay(carousel) {
        this.pauseAutoplay(carousel);
        setTimeout(() => {
            this.startAutoplay(carousel);
        }, 1000); // Pause for 1 second after manual navigation
    }

    // FULLSCREEN FUNCTIONALITY
    setupFullscreen() {
        const overlay = document.getElementById('fullscreen-overlay');
        const image = document.getElementById('fullscreen-image');
        const closeBtn = document.getElementById('fullscreen-close');
        
        if (!overlay || !image || !closeBtn) return;
        
        // Close button
        closeBtn.addEventListener('click', () => {
            this.closeFullscreen();
        });
        
        // Click outside image to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeFullscreen();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.style.display !== 'none') {
                this.closeFullscreen();
            }
        });
    }

    openFullscreen(carousel) {
        const overlay = document.getElementById('fullscreen-overlay');
        const image = document.getElementById('fullscreen-image');
        
        if (!overlay || !image) return;
        
        const currentImage = carousel.images[carousel.currentIndex];
        
        // Pause autoplay while in fullscreen
        this.pauseAutoplay(carousel);
        
        // Set image source
        image.src = currentImage.src;
        image.alt = currentImage.alt;
        
        // Show overlay
        overlay.style.display = 'flex';
        
        // Add active class after a frame for smooth animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    closeFullscreen() {
        const overlay = document.getElementById('fullscreen-overlay');
        
        if (!overlay) return;
        
        // Remove active class
        overlay.classList.remove('active');
        
        // Hide overlay after animation
        setTimeout(() => {
            overlay.style.display = 'none';
            // Restore body scroll
            document.body.style.overflow = '';
            
            // Resume autoplay for all carousels
            this.carousels.forEach(carousel => {
                this.startAutoplay(carousel);
            });
        }, 300);
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            const overlay = document.getElementById('fullscreen-overlay');
            
            // Only handle keys when not in fullscreen
            if (overlay && overlay.style.display !== 'none') return;
            
            // Find focused carousel
            const focusedElement = document.activeElement;
            const carouselContainer = focusedElement.closest('[data-carousel]');
            
            if (!carouselContainer) return;
            
            const carouselId = carouselContainer.dataset.carousel;
            const carousel = this.carousels.get(carouselId);
            
            if (!carousel) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousSlide(carousel);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextSlide(carousel);
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.openFullscreen(carousel);
                    break;
            }
        });
    }

    // Public API
    getCarousel(id) {
        return this.carousels.get(id);
    }

    pauseAll() {
        this.carousels.forEach(carousel => {
            this.pauseAutoplay(carousel);
        });
    }

    resumeAll() {
        this.carousels.forEach(carousel => {
            this.startAutoplay(carousel);
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productCarousel = new ProductCarousel();
});

// Pause carousels when page becomes hidden
document.addEventListener('visibilitychange', () => {
    if (window.productCarousel) {
        if (document.hidden) {
            window.productCarousel.pauseAll();
        } else {
            window.productCarousel.resumeAll();
        }
    }
});