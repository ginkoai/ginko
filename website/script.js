/**
 * Ginko Marketing Site - Interactive Features
 * Modern ES6+ implementation with accessibility and performance in mind
 */

// ============================================================================
// THEME - Dark mode only
// ============================================================================

const initTheme = () => {
  const html = document.documentElement;
  // Always use dark mode
  html.setAttribute('data-theme', 'dark');
};

// ============================================================================
// MOBILE MENU
// ============================================================================

const initMobileMenu = () => {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-menu a');
  const body = document.body;

  if (!hamburger || !navMenu) return;

  // Toggle menu open/closed
  const toggleMenu = () => {
    const isActive = navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', isActive);

    // Prevent body scroll when menu is open
    body.style.overflow = isActive ? 'hidden' : '';
  };

  // Close menu
  const closeMenu = () => {
    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    body.style.overflow = '';
  };

  // Hamburger click
  hamburger.addEventListener('click', toggleMenu);

  // Close menu when nav link clicked
  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (navMenu.classList.contains('active') &&
        !navMenu.contains(e.target) &&
        !hamburger.contains(e.target)) {
      closeMenu();
    }
  });

  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
      closeMenu();
    }
  });
};

// ============================================================================
// SMOOTH SCROLL
// ============================================================================

const initSmoothScroll = () => {
  const navHeight = document.querySelector('.navbar')?.offsetHeight || 80;

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');

      // Skip if href is just "#"
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        e.preventDefault();

        const targetPosition = targetElement.getBoundingClientRect().top +
                              window.pageYOffset -
                              navHeight - 20; // Extra 20px breathing room

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Update URL without jumping
        history.pushState(null, '', targetId);
      }
    });
  });
};

// ============================================================================
// SCROLL EFFECTS - NAVBAR SHADOW
// ============================================================================

const initScrollEffects = () => {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  const updateNavbar = () => {
    const scrollY = window.scrollY;

    if (scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    lastScrollY = scrollY;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateNavbar);
      ticking = true;
    }
  });

  // Initial check
  updateNavbar();
};

// ============================================================================
// INTERSECTION OBSERVER - FADE IN ANIMATIONS
// ============================================================================

const initScrollAnimations = () => {
  // Respect user's motion preferences
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) return;

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-visible');
        observer.unobserve(entry.target); // Only animate once
      }
    });
  }, observerOptions);

  // Observe all sections and feature cards
  document.querySelectorAll('section, .feature-card, .cta-section').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });
};

// ============================================================================
// TERMINAL ANIMATION
// ============================================================================

const initTerminalAnimation = () => {
  const terminal = document.querySelector('.terminal-demo');
  if (!terminal) return;

  // Respect user's motion preferences
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    // Show all lines immediately
    terminal.querySelectorAll('.terminal-line').forEach(line => {
      line.style.opacity = '1';
    });
    return;
  }

  const lines = terminal.querySelectorAll('.terminal-line');
  let hasAnimated = false;

  const animateTerminal = () => {
    if (hasAnimated) return;
    hasAnimated = true;

    lines.forEach((line, index) => {
      setTimeout(() => {
        line.style.opacity = '0';
        line.style.transform = 'translateY(10px)';

        requestAnimationFrame(() => {
          line.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          line.style.opacity = '1';
          line.style.transform = 'translateY(0)';
        });
      }, index * 200); // Stagger by 200ms
    });
  };

  // Trigger animation when terminal comes into view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateTerminal();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(terminal);
};

// ============================================================================
// COPY TO CLIPBOARD
// ============================================================================

const initCopyButtons = () => {
  const copyables = document.querySelectorAll('.terminal-copyable');
  const toast = document.getElementById('toast');
  let toastTimeout;

  const showToast = (element) => {
    if (!toast) {
      console.error('Toast element not found');
      return;
    }

    // Clear any existing animation
    toast.classList.remove('show');

    // Force reflow to restart animation
    void toast.offsetWidth;

    // Position toast above the element
    if (element) {
      var rect = element.getBoundingClientRect();
      var centerX = Math.round(rect.left + (rect.width / 2));
      var topPos = Math.round(rect.top - 44);

      toast.style.left = centerX + 'px';
      toast.style.top = topPos + 'px';
    }

    // Trigger slide-up animation
    toast.classList.add('show');
  };

  // Fallback copy method for Safari/non-HTTPS contexts
  const fallbackCopy = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  };

  // Copy to clipboard with fallback
  const copyToClipboard = async (text) => {
    // Try modern Clipboard API first (requires HTTPS in Safari)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Fall through to fallback
      }
    }

    // Fallback for Safari on HTTP or older browsers
    return fallbackCopy(text);
  };

  copyables.forEach(function(element) {
    var copyText = element.dataset.copy;
    if (!copyText) return;

    // Click handler for entire element
    element.addEventListener('click', function(e) {
      // Prevent if clicking a link inside
      if (e.target.tagName === 'A') return;

      console.log('Copy clicked');

      // Use fallback directly for better Safari compatibility
      var success = fallbackCopy(copyText);
      console.log('Copy result:', success);

      if (success) {
        // Show success state on element
        element.classList.add('copied');

        // Show toast positioned above the element
        console.log('Calling showToast');
        showToast(element);

        // Reset element after 2 seconds
        setTimeout(function() {
          element.classList.remove('copied');
        }, 2000);
      }
    });
  });
};

// ============================================================================
// CURSOR EASTER EGG MODAL
// ============================================================================

const initCursorEasterEgg = () => {
  const inputLines = document.querySelectorAll('.terminal-input-line');
  const modal = document.getElementById('cursor-modal');

  if (!inputLines.length || !modal) return;

  const closeBtn = modal.querySelector('.cursor-modal-close');

  const openModal = () => {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    closeBtn?.focus();
  };

  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  };

  // Click on terminal input line to open modal
  inputLines.forEach(line => {
    line.addEventListener('click', openModal);
    line.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });
  });

  // Close button
  closeBtn?.addEventListener('click', closeModal);

  // Click outside modal content to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
};

// ============================================================================
// TEXT SCRAMBLE ANIMATION
// ============================================================================

const initTextScramble = () => {
  const element = document.querySelector('.text-scramble');
  if (!element) return;

  // Respect user's motion preferences
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const words = JSON.parse(element.dataset.words || '[]');
  if (words.length === 0) return;

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let currentIndex = 0;
  let isAnimating = false;

  // If reduced motion, just cycle words without scramble
  if (prefersReducedMotion) {
    setInterval(() => {
      currentIndex = (currentIndex + 1) % words.length;
      element.textContent = words[currentIndex];
    }, 3000);
    return;
  }

  const scrambleText = (targetWord, callback) => {
    if (isAnimating) return;
    isAnimating = true;

    const currentWord = element.textContent;
    const maxLength = Math.max(currentWord.length, targetWord.length);
    const duration = 600; // Total scramble duration in ms
    const frameRate = 30; // ms per frame
    const totalFrames = duration / frameRate;

    let frame = 0;

    const animate = () => {
      frame++;
      const progress = frame / totalFrames;

      let result = '';
      for (let i = 0; i < maxLength; i++) {
        // Calculate when this character should "lock in"
        const charProgress = i / maxLength;

        if (progress > charProgress + 0.3) {
          // Character is locked - show target
          result += targetWord[i] || '';
        } else if (i < targetWord.length) {
          // Still scrambling
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }

      element.textContent = result;

      if (frame < totalFrames) {
        setTimeout(animate, frameRate);
      } else {
        // Ensure final word is correct
        element.textContent = targetWord;
        isAnimating = false;
        if (callback) callback();
      }
    };

    animate();
  };

  const cycleWords = () => {
    const nextIndex = (currentIndex + 1) % words.length;
    const nextWord = words[nextIndex];

    scrambleText(nextWord, () => {
      currentIndex = nextIndex;
      setTimeout(cycleWords, 2500); // Wait before next cycle
    });
  };

  // Start cycling after initial delay
  setTimeout(cycleWords, 2500);
};

// ============================================================================
// HERO BUTTON TYPEWRITER ANIMATION
// ============================================================================

const initHeroButtonAnimation = () => {
  const heroButtons = document.querySelectorAll('.btn-hero');

  if (!heroButtons.length) return;

  heroButtons.forEach(button => {
    const textSpan = button.querySelector('.btn-hero-text');
    if (!textSpan) return;

    const originalText = textSpan.textContent;
    let animationInterval = null;

    button.addEventListener('mouseenter', () => {
      const text = originalText;
      const len = text.length;
      const mid = Math.floor(len / 2);
      let left = mid;
      let right = mid;

      // Start with non-breaking spaces
      textSpan.textContent = '\u00A0'.repeat(len);

      animationInterval = setInterval(() => {
        if (left >= 0 || right < len) {
          let result = '';
          for (let i = 0; i < len; i++) {
            if (i >= left && i <= right) {
              result += text[i];
            } else {
              result += '\u00A0';
            }
          }
          textSpan.textContent = result;

          if (left > 0) left--;
          if (right < len - 1) right++;
        } else {
          clearInterval(animationInterval);
        }
      }, 30);
    });

    button.addEventListener('mouseleave', () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
      textSpan.textContent = originalText;
    });
  });
};

// ============================================================================
// INITIALIZATION
// ============================================================================
// FAQ ACCORDION
// ============================================================================

const initFaqAccordion = () => {
  const faqItems = document.querySelectorAll('.faq-item');

  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other items
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      // Toggle current item
      if (!isActive) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });
};

// ============================================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  initTheme();
  initMobileMenu();
  initSmoothScroll();
  initScrollEffects();
  initScrollAnimations();
  initTextScramble();
  initHeroButtonAnimation();
  initTerminalAnimation();
  initCopyButtons();
  initCursorEasterEgg();
  initFaqAccordion();

  // Log initialization in development
  if (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') {
    console.log('✅ Ginko site initialized');
  }
}

// ============================================================================
// UTILITY - Handle external links
// ============================================================================

// Add security attributes to external links
document.querySelectorAll('a[href^="http"]').forEach(link => {
  if (!link.hostname.includes(window.location.hostname)) {
    link.setAttribute('rel', 'noopener noreferrer');
  }
});
