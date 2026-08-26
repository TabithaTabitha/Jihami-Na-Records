// Jihami Extraordinary Website JavaScript

// Initialize AOS (Animate On Scroll)
AOS.init({
    duration: 1000,
    easing: 'ease-in-out-cubic',
    once: true,
    offset: 100,
    delay: 0
});

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeWebsite();
});

// Initialize all website functionality
function initializeWebsite() {
    // Hide loading indicator immediately
    hideLoadingIndicator();
    
    setupNavigation();
    setupScrollEffects();
    setupAnimations();
    setupInteractions();
    setupPerformanceOptimizations();
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
        setTimeout(() => {
            loadingIndicator.style.display = 'none';
        }, 300);
    }
}

// Fallback: Hide loading indicator after 3 seconds regardless
setTimeout(() => {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}, 3000);

// ===== Navigation Setup =====
function setupNavigation() {
    const navbar = document.getElementById('mainNav');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Smooth scrolling for navigation links (only for anchor links)
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (!targetId || !targetId.startsWith('#')) return;
            e.preventDefault();
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                smoothScrollTo(offsetTop, 800);
            }
        });
    });
    
    // Active navigation highlighting
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.navbar-nav .nav-link[href="#${sectionId}"]`);
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(link => link.classList.remove('active'));
                if (navLink) navLink.classList.add('active');
            }
        });
    });
}

// ===== Scroll Effects =====
function setupScrollEffects() {
    // Parallax effect for floating shapes
    const shapes = document.querySelectorAll('.shape');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        shapes.forEach((shape, index) => {
            const speed = 0.5 + (index * 0.1);
            shape.style.transform = `translateY(${rate * speed}px) rotate(${rate * 0.1}deg)`;
        });
    });
    
    // Reveal animations on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, observerOptions);
    
    // Observe elements for reveal animation
    document.querySelectorAll('.feature-card, .stat-card, .contact-item').forEach(el => {
        observer.observe(el);
    });
}

// ===== Animations =====
function setupAnimations() {
    // Typing animation for hero title
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        typeWriter(heroTitle, heroTitle.textContent, 50);
    }
    
    // Counter animation for stats
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        animateCounter(stat);
    });
    
    // Floating animation for phone mockup
    const phoneMockup = document.querySelector('.phone-mockup');
    if (phoneMockup) {
        animateFloat(phoneMockup);
    }
    
    // Pulse animation for CTA buttons
    const ctaButtons = document.querySelectorAll('.btn-primary');
    ctaButtons.forEach(button => {
        animatePulse(button);
    });
}

// ===== Interactions =====
function setupInteractions() {
    // Feature card interactions
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-15px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Button hover effects
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', createRipple);
    });
    
    // Download button functionality
    const downloadBtn = document.querySelector('a[download]');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }
    
    // Social media links
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Add your social media URLs here
            console.log('Social link clicked:', link.querySelector('i').className);
        });
    });
}

// ===== Performance Optimizations =====
function setupPerformanceOptimizations() {
    // Comprehensive lazy loading system
    setupLazyLoading();
    setupNetworkOptimization();
    setupProgressiveLoading();
    setupResourcePreloading();
}

// Lazy loading for all content
function setupLazyLoading() {
    // Lazy load images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    }, { rootMargin: '50px' });
    
    images.forEach(img => imageObserver.observe(img));
    
    // Lazy load sections - but ensure they're visible immediately
const sections = document.querySelectorAll('[data-lazy-load]');
sections.forEach(section => {
    // Make sections immediately visible
    section.style.opacity = '1';
    section.style.transform = 'translateY(0)';
    section.classList.add('lazy-loaded');
});

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const section = entry.target;
            section.classList.add('lazy-loaded');
            sectionObserver.unobserve(section);
            
            // Trigger AOS animations for lazy-loaded sections
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
        }
    });
}, { rootMargin: '100px' });

sections.forEach(section => sectionObserver.observe(section));
    
    // Lazy load icons and heavy content
    const heavyElements = document.querySelectorAll('.feature-icon, .showcase-icon, .contact-icon');
    const heavyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                element.classList.add('animate-in');
                heavyObserver.unobserve(element);
            }
        });
    }, { rootMargin: '50px' });
    
    heavyElements.forEach(element => heavyObserver.observe(element));
}

// Network optimization for slow connections
function setupNetworkOptimization() {
    // Check connection speed
    if ('connection' in navigator) {
        const connection = navigator.connection;
        
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            // Disable animations for very slow connections
            document.body.classList.add('slow-connection');
            disableHeavyAnimations();
        }
        
        if (connection.saveData) {
            // Disable non-essential features for data saver mode
            document.body.classList.add('data-saver');
            disableNonEssentialFeatures();
        }
    }
    
    // Show network status indicator
    showNetworkStatus();
}

// Progressive loading for better perceived performance
function setupProgressiveLoading() {
    // Load critical content first
    loadCriticalContent();
    
    // Load non-critical content progressively
    setTimeout(() => {
        loadNonCriticalContent();
    }, 1000);
    
    // Load decorative content last
    setTimeout(() => {
        loadDecorativeContent();
    }, 2000);
}

// Resource preloading for better performance
function setupResourcePreloading() {
    // Preload critical resources
    const criticalResources = [
        'assets/css/style.css',
        'assets/js/main.js'
    ];
    
    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = resource.endsWith('.css') ? 'style' : 'script';
        document.head.appendChild(link);
    });
    
    // Prefetch non-critical resources
    const nonCriticalResources = [
        'assets/downloads/jihami.apk'
    ];
    
    nonCriticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = resource;
        document.head.appendChild(link);
    });
}

// Load critical content first
function loadCriticalContent() {
    // Hero section is already loaded
    console.log('Critical content loaded');
}

// Load non-critical content
function loadNonCriticalContent() {
    const nonCriticalSections = document.querySelectorAll('[data-lazy-load]');
    nonCriticalSections.forEach(section => {
        // Ensure sections are visible immediately
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
    });
}

// Load decorative content
function loadDecorativeContent() {
    const decorativeElements = document.querySelectorAll('.floating-shapes, .shape');
    decorativeElements.forEach(element => {
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.opacity = '1';
        }, 500);
    });
}

// Disable heavy animations for slow connections
function disableHeavyAnimations() {
    const heavyAnimations = document.querySelectorAll('.floating-shapes, .shape, .phone-mockup');
    heavyAnimations.forEach(element => {
        element.style.animation = 'none';
    });
}

// Disable non-essential features for data saver
function disableNonEssentialFeatures() {
    // Disable AOS animations
    if (typeof AOS !== 'undefined') {
        AOS.disable();
    }
    
    // Disable decorative animations
    const decorativeElements = document.querySelectorAll('.floating-shapes, .shape');
    decorativeElements.forEach(element => {
        element.style.display = 'none';
    });
}

// Show network status indicator
function showNetworkStatus() {
    const networkStatus = document.getElementById('network-status');
    if (networkStatus) {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                networkStatus.querySelector('span').textContent = 'Slow connection detected - Optimizing...';
                networkStatus.style.display = 'block';
                
                setTimeout(() => {
                    networkStatus.style.display = 'none';
                }, 3000);
            }
        }
    }
}

// Debounced scroll events for better performance
let scrollTimeout;
window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        // Perform scroll-based operations here
    }, 100);
});

// ===== Utility Functions =====

// Smooth scroll to position
function smoothScrollTo(targetPosition, duration) {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;
    
    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }
    
    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }
    
    requestAnimationFrame(animation);
}

// Typewriter effect
function typeWriter(element, text, speed) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Counter animation
function animateCounter(element) {
    const target = parseInt(element.textContent.replace(/\D/g, ''));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        const suffix = element.textContent.replace(/\d/g, '');
        element.textContent = Math.floor(current) + suffix;
    }, 16);
}

// Floating animation
function animateFloat(element) {
    let direction = 1;
    let position = 0;
    
    function float() {
        position += direction * 0.5;
        
        if (position > 10) direction = -1;
        if (position < -10) direction = 1;
        
        element.style.transform = `translateY(${position}px)`;
        requestAnimationFrame(float);
    }
    
    float();
}

// Pulse animation
function animatePulse(element) {
    element.addEventListener('mouseenter', () => {
        element.style.animation = 'pulse 0.6s ease-in-out';
    });
    
    element.addEventListener('animationend', () => {
        element.style.animation = '';
    });
}

// Ripple effect for buttons
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Download handler
function handleDownload(event) {
    const button = event.currentTarget;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<span class="loading"></span> Downloading...';
    button.disabled = true;
    
    // Simulate download delay
    setTimeout(() => {
        button.innerHTML = '<i class="bi bi-check-circle"></i> Downloaded!';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    }, 1500);
}

// ===== Advanced Animations =====

// Magnetic effect for interactive elements
function setupMagneticEffect() {
    const magneticElements = document.querySelectorAll('.feature-card, .btn');
    
    magneticElements.forEach(element => {
        element.addEventListener('mousemove', (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            element.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'translate(0, 0)';
        });
    });
}

// Text scramble effect
function scrambleText(element, finalText) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let iterations = 0;
    const maxIterations = 20;
    
    const interval = setInterval(() => {
        element.textContent = finalText
            .split('')
            .map((char, index) => {
                if (index < iterations) {
                    return finalText[index];
                }
                return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('');
        
        iterations += 1 / 3;
        
        if (iterations >= finalText.length) {
            clearInterval(interval);
            element.textContent = finalText;
        }
    }, 50);
}

// ===== CSS-in-JS for dynamic styles =====

// Add dynamic styles
const dynamicStyles = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .revealed {
        animation: reveal 0.8s ease-out forwards;
    }
    
    @keyframes reveal {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .lazy {
        opacity: 0;
        transition: opacity 0.3s;
    }
    
    .lazy.loaded {
        opacity: 1;
    }
    
    .nav-link.active {
        color: var(--primary) !important;
        background: rgba(37, 99, 235, 0.1);
    }
    
    .nav-link.active::after {
        width: 80% !important;
    }
`;

// Inject dynamic styles
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);

// ===== Error Handling =====
window.addEventListener('error', (e) => {
    console.error('Website error:', e.error);
});

// ===== Performance Monitoring =====
if ('performance' in window) {
    window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
    });
}

// ===== Accessibility Enhancements =====
function setupAccessibility() {
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-navigation');
    });
    
    // Focus indicators
    const focusableElements = document.querySelectorAll('a, button, input, textarea, select');
    focusableElements.forEach(element => {
        element.addEventListener('focus', () => {
            element.style.outline = '2px solid var(--primary)';
            element.style.outlineOffset = '2px';
        });
        
        element.addEventListener('blur', () => {
            element.style.outline = '';
            element.style.outlineOffset = '';
        });
    });
}

// Initialize accessibility features
setupAccessibility();

// Export functions for potential external use
window.JihamiWebsite = {
    smoothScrollTo,
    typeWriter,
    animateCounter,
    scrambleText,
    setupMagneticEffect
};
