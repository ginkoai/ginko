/**
 * Ginko Marketing Site - Interactive Features
 * Modern ES6+ implementation with accessibility and performance in mind
 */

// ============================================================================
// THEME - Respect HTML data-theme attribute
// ============================================================================

const initTheme = () => {
  // Theme is set via data-theme attribute in HTML
  // No override needed - respects the page's declared theme
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
  const copyables = document.querySelectorAll('.terminal-copyable, .npm-compact-btn');
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
// DISCORD BUTTON HOVER SCRAMBLE
// ============================================================================

const initDiscordButtonScramble = () => {
  const btn = document.querySelector('.discord-btn');
  if (!btn) return;

  const textEl = btn.querySelector('.discord-btn-text');
  if (!textEl) return;

  const originalText = btn.dataset.text || textEl.textContent;
  const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let animationId = null;
  let isAnimating = false;

  // Respect reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const scramble = (targetText, onComplete) => {
    if (isAnimating) return;
    isAnimating = true;

    const duration = 400;
    const frameRate = 30;
    const totalFrames = duration / frameRate;
    let frame = 0;

    const animate = () => {
      frame++;
      const progress = frame / totalFrames;

      let result = '';
      for (let i = 0; i < targetText.length; i++) {
        const charProgress = i / targetText.length;

        if (progress > charProgress + 0.2) {
          result += targetText[i];
        } else if (targetText[i] === ' ') {
          result += ' ';
        } else {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }

      textEl.textContent = result;

      if (frame < totalFrames) {
        animationId = setTimeout(animate, frameRate);
      } else {
        textEl.textContent = targetText;
        isAnimating = false;
        if (onComplete) onComplete();
      }
    };

    animate();
  };

  btn.addEventListener('mouseenter', () => {
    if (animationId) clearTimeout(animationId);
    scramble(originalText);
  });

  btn.addEventListener('mouseleave', () => {
    if (animationId) clearTimeout(animationId);
    isAnimating = false;
    textEl.textContent = originalText;
  });
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

// ============================================================================
// FEATURES CAROUSEL
// ============================================================================

let currentCarouselSlide = 0;
const totalCarouselSlides = 7;

function updateCarouselSlide() {
  const slides = document.querySelectorAll('.carousel-slide');
  if (!slides.length) return;

  slides.forEach((slide, index) => {
    slide.classList.remove('active');
    if (index === currentCarouselSlide) {
      slide.classList.add('active');
    }
  });

  // Update ALL dots across ALL slides (7 slides x 7 dots = 49 total)
  const allDots = document.querySelectorAll('.carousel-dot');
  allDots.forEach((dot, i) => {
    const dotPosition = i % totalCarouselSlides;
    dot.classList.remove('active');
    if (dotPosition === currentCarouselSlide) {
      dot.classList.add('active');
    }
  });
}

function nextCarouselSlide() {
  currentCarouselSlide = (currentCarouselSlide + 1) % totalCarouselSlides;
  updateCarouselSlide();
}

function prevCarouselSlide() {
  currentCarouselSlide = (currentCarouselSlide - 1 + totalCarouselSlides) % totalCarouselSlides;
  updateCarouselSlide();
}

function goToCarouselSlide(index) {
  currentCarouselSlide = index;
  updateCarouselSlide();
}

function initFeaturesCarousel() {
  // Initialize dots on page load
  updateCarouselSlide();
}

function init() {
  initTheme();
  initMobileMenu();
  initSmoothScroll();
  initScrollEffects();
  initScrollAnimations();
  initTextScramble();
  initDiscordButtonScramble();
  initHeroButtonAnimation();
  initTerminalAnimation();
  initCopyButtons();
  initCursorEasterEgg();
  initFaqAccordion();
  initFeaturesCarousel();

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

// Wiggly FAQ Accordion
const initWigglyFaq = () => {
  const faqItems = document.querySelectorAll('.faq-wiggly__item');

  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-wiggly__question');

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other items
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        otherItem.querySelector('.faq-wiggly__question').setAttribute('aria-expanded', 'false');
      });

      // Toggle current item
      if (!isActive) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });
};

// Guitar String Physics for FAQ lines
const initGuitarStrings = () => {
  const strings = document.querySelectorAll('[data-guitar-string]');
  if (!strings.length) return;

  // Physics constants
  const TENSION = 0.25;        // How quickly string returns (higher = faster snap)
  const DAMPING = 0.88;        // Energy loss per frame (higher = more oscillation)
  const MAX_DEFLECTION = 30;   // Maximum pixels the string can deflect
  const INFLUENCE_RADIUS = 60; // How close cursor needs to be to affect string

  // Audio context for pluck sounds (lazy init on first interaction)
  let audioCtx = null;

  // Different frequencies for each string (like guitar strings)
  const stringFrequencies = [196, 247, 330, 392, 494, 659]; // G3, B3, E4, G4, B4, E5

  // Ginko rainbow colors
  const stringColors = [
    '#FDC400', // 01: yellow
    '#FC9500', // 02: orange
    '#FE4500', // 03: dark orange
    '#E50000', // 04: true red
    '#E00256', // 05: magenta
    '#A70086', // 06: purple
  ];

  const playPluck = (stringIndex, intensity) => {
    // Skip if intensity too low
    if (Math.abs(intensity) < 0.1) return;

    try {
      // Initialize audio context on first use
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Resume if suspended (browser autoplay policy)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          actuallyPlaySound(stringIndex, intensity);
        });
      } else {
        actuallyPlaySound(stringIndex, intensity);
      }
    } catch (e) {
      // Audio failed silently - not critical
    }
  };

  const actuallyPlaySound = (stringIndex, intensity) => {
    const freq = stringFrequencies[stringIndex % stringFrequencies.length];
    const volume = Math.min(0.5, Math.abs(intensity) * 0.6 + 0.1);

    // Create oscillator for the fundamental
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // Use triangle wave for softer guitar-like tone
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // Quick pluck envelope - fast attack, quick decay
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    // Add slight pitch bend down (like a real string)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.98, audioCtx.currentTime + 0.15);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
  };

  strings.forEach((wrapper, index) => {
    const svg = wrapper.querySelector('svg');
    const path = wrapper.querySelector('path');
    if (!svg || !path) return;

    // This string's color
    const stringColor = stringColors[index % stringColors.length];

    // State for this string
    let currentDeflection = 0;
    let velocity = 0;
    let targetDeflection = 0;
    let mouseX = 0.5; // Normalized position along string (0-1)
    let isHovering = false;
    let animationId = null;
    let colorIntensity = 0; // 0 = black, 1 = full color
    let peakColor = 0; // Tracks the max color reached, fades slowly

    // Generate path with deflection at a specific point
    const generatePath = (deflection, xPos) => {
      // xPos is 0-1, deflection is in viewBox units
      const x = xPos * 1000;
      const y = 20 + deflection;
      // Quadratic bezier: start -> control point at cursor -> end
      return `M0,20 Q${x},${y} 1000,20`;
    };

    // Interpolate between black and the string's color
    const getStrokeColor = (intensity) => {
      const t = Math.min(1, Math.abs(intensity));
      // Parse the hex color
      const r = parseInt(stringColor.slice(1, 3), 16);
      const g = parseInt(stringColor.slice(3, 5), 16);
      const b = parseInt(stringColor.slice(5, 7), 16);
      // Interpolate from dark gray (26, 26, 26) to the color
      const nr = Math.round(26 + (r - 26) * t);
      const ng = Math.round(26 + (g - 26) * t);
      const nb = Math.round(26 + (b - 26) * t);
      return `rgb(${nr}, ${ng}, ${nb})`;
    };

    // Animation loop with spring physics
    const animate = () => {
      if (!isHovering) {
        targetDeflection = 0;
      }

      // Spring physics
      const force = (targetDeflection - currentDeflection) * TENSION;
      velocity += force;
      velocity *= DAMPING;
      currentDeflection += velocity;

      // Color intensity based on current deflection
      const instantColor = Math.abs(currentDeflection) / MAX_DEFLECTION;

      // Track peak color and fade it slowly
      if (instantColor > peakColor) {
        peakColor = instantColor;
      } else {
        peakColor *= 0.95; // Slow fade (keeps color visible longer)
      }

      // Use the higher of instant or lingering color
      colorIntensity = Math.max(instantColor, peakColor);
      const strokeColor = getStrokeColor(colorIntensity);

      // Update path, color, and stroke width (thicker when deflected)
      path.setAttribute('d', generatePath(currentDeflection, mouseX));
      path.style.stroke = strokeColor;
      path.style.strokeWidth = 1 + colorIntensity * 2; // 1px to 3px

      // Continue animation if there's still movement OR color is still fading
      if (Math.abs(velocity) > 0.01 || Math.abs(targetDeflection - currentDeflection) > 0.01 || peakColor > 0.02) {
        animationId = requestAnimationFrame(animate);
      } else {
        // Snap to rest
        currentDeflection = 0;
        colorIntensity = 0;
        peakColor = 0;
        path.setAttribute('d', 'M0,20 L1000,20');
        path.style.stroke = '#1a1a1a';
        path.style.strokeWidth = 1;
        animationId = null;
      }
    };

    // Start animation if not running
    const startAnimation = () => {
      if (!animationId) {
        animationId = requestAnimationFrame(animate);
      }
    };

    // Mouse move handler
    wrapper.addEventListener('mousemove', (e) => {
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Normalized x position (0-1)
      mouseX = Math.max(0.05, Math.min(0.95, x / rect.width));

      // Calculate distance from center line (string is at vertical center)
      const centerY = rect.height / 2;
      const distanceFromString = y - centerY;

      // Deflection based on cursor position relative to string
      // Closer to string = more deflection, direction based on which side
      const proximity = Math.max(0, 1 - Math.abs(distanceFromString) / INFLUENCE_RADIUS);
      const direction = distanceFromString > 0 ? 1 : -1;

      targetDeflection = direction * proximity * MAX_DEFLECTION;
      isHovering = true;
      startAnimation();
    });

    // Mouse leave - let string snap back and play pluck sound
    let peakDeflection = 0; // Track the maximum deflection reached

    // Update peak tracking in mousemove
    wrapper.addEventListener('mousemove', () => {
      if (Math.abs(targetDeflection) > Math.abs(peakDeflection)) {
        peakDeflection = targetDeflection;
      }
    });

    wrapper.addEventListener('mouseleave', () => {
      // Play pluck sound based on peak deflection reached
      const intensity = peakDeflection / MAX_DEFLECTION;
      playPluck(index, intensity);

      // Reset peak for next interaction
      peakDeflection = 0;
      isHovering = false;
      targetDeflection = 0;
      startAnimation();
    });
  });
};

// Initialize wiggly FAQ and guitar strings
document.addEventListener('DOMContentLoaded', () => {
  initWigglyFaq();
  initGuitarStrings();
});
