// Optimized mobile menu toggle functionality for ServerTopNavigation
// Uses requestAnimationFrame for smooth animations and better performance
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuToggle = document.querySelector('[data-mobile-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  
  if (mobileMenuToggle && mobileMenu) {
    // Debounce function to prevent rapid clicking
    let isAnimating = false;
    
    // Performance monitoring
    const performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          console.log('Navigation performance:', entry);
        }
      }
    });
    
    try {
      performanceObserver.observe({ entryTypes: ['navigation'] });
    } catch (e) {
      // PerformanceObserver not supported in all browsers
    }
    
    mobileMenuToggle.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Prevent rapid clicking during animation
      if (isAnimating) return;
      
      isAnimating = true;
      
      // Use requestAnimationFrame for smooth animations
      requestAnimationFrame(() => {
        const isHidden = mobileMenu.classList.contains('hidden');
        
        if (isHidden) {
          // Show menu with smooth animation
          mobileMenu.classList.remove('hidden');
          mobileMenu.style.opacity = '0';
          mobileMenu.style.transform = 'translateY(-10px)';
          
          requestAnimationFrame(() => {
            mobileMenu.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
            mobileMenu.style.opacity = '1';
            mobileMenu.style.transform = 'translateY(0)';
          });
          
          // Change icon to X
          mobileMenuToggle.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        } else {
          // Hide menu with smooth animation
          mobileMenu.style.transition = 'opacity 150ms ease-in, transform 150ms ease-in';
          mobileMenu.style.opacity = '0';
          mobileMenu.style.transform = 'translateY(-10px)';
          
          // Wait for animation to complete before hiding
          setTimeout(() => {
            mobileMenu.classList.add('hidden');
            mobileMenu.style.transition = '';
            mobileMenu.style.opacity = '';
            mobileMenu.style.transform = '';
          }, 150);
          
          // Change icon back to menu
          mobileMenuToggle.innerHTML = '<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>';
        }
        
        // Reset animation flag after animation completes
        setTimeout(() => {
          isAnimating = false;
        }, 200);
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!mobileMenuToggle.contains(e.target) && !mobileMenu.contains(e.target)) {
        if (!mobileMenu.classList.contains('hidden')) {
          mobileMenuToggle.click();
        }
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
        mobileMenuToggle.click();
      }
    });
    
    // Preload critical navigation pages for better performance
    const preloadCriticalPages = () => {
      const criticalPages = ['/dashboard', '/products', '/customers', '/orders'];
      criticalPages.forEach(page => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = page;
        document.head.appendChild(link);
      });
    };
    
    // Preload after a short delay to not block initial page load
    setTimeout(preloadCriticalPages, 2000);
  }
  
  // Optimize all navigation links for better performance
  const navLinks = document.querySelectorAll('a[href^="/"]');
  navLinks.forEach(link => {
    // Add loading state for better UX
    link.addEventListener('click', function() {
      // Add a subtle loading indicator
      this.style.opacity = '0.7';
      this.style.pointerEvents = 'none';
      
      // Close mobile menu if it's open
      const mobileMenu = document.querySelector('[data-mobile-menu]');
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        // Close the mobile menu
        const mobileMenuToggle = document.querySelector('[data-mobile-menu-toggle]');
        if (mobileMenuToggle) {
          mobileMenuToggle.click();
        }
      }
      
      // Reset after navigation
      setTimeout(() => {
        this.style.opacity = '';
        this.style.pointerEvents = '';
      }, 100);
    });
  });
});
