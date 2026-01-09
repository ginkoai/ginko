/**
 * Hero A/B Test System
 *
 * Tests 5 hero variants for conversion optimization.
 * Persists variant assignment in localStorage for consistency.
 * Tracks variant via GA4 custom dimension.
 */

(function() {
  'use strict';

  // Hero variants configuration
  const VARIANTS = {
    A: {
      id: 'A',
      name: 'problem-first',
      title: 'Stop re-explaining your codebase to AI.',
      subtitle: 'Ginko keeps context in the collaboration graph. Resume in 30 seconds with your project, decisions, and patterns intact.',
      primaryCta: { text: 'Install CLI', href: 'get-started.html' },
      secondaryCta: { text: 'View Docs', href: 'https://docs.ginko.ai' }
    },
    B: {
      id: 'B',
      name: 'outcome-first',
      title: 'Resume any AI session in 30 seconds.',
      subtitle: 'No re-explaining. Your AI remembers your codebase, decisions, and patterns.',
      primaryCta: { text: 'Try it free', href: 'https://app.ginkoai.com/auth/signup' },
      secondaryCta: { text: 'See how it works', href: 'how-it-works.html' }
    },
    C: {
      id: 'C',
      name: 'contrast',
      title: 'AI forgets. Ginko doesn\'t.',
      subtitle: 'Context that persists in the collaboration graph. Pick up where you left off.',
      primaryCta: { text: 'Get started free', href: 'https://app.ginkoai.com/auth/signup' },
      secondaryCta: { text: 'View Docs', href: 'https://docs.ginko.ai' }
    },
    D: {
      id: 'D',
      name: 'quantified-pain',
      title: 'You\'ve spent 10 minutes re-explaining. Again.',
      subtitle: 'Ginko eliminates context rot. Your AI stays sharp across sessions.',
      primaryCta: { text: 'Fix it now', href: 'https://app.ginkoai.com/auth/signup' },
      secondaryCta: { text: 'View Docs', href: 'https://docs.ginko.ai' }
    },
    E: {
      id: 'E',
      name: 'identity',
      title: 'Stop being your AI\'s context janitor.',
      subtitle: 'Ginko manages project context automatically. Start any session with your AI already caught up.',
      primaryCta: { text: 'Install CLI', href: 'get-started.html' },
      secondaryCta: { text: 'See how it works', href: 'how-it-works.html' }
    }
  };

  const STORAGE_KEY = 'ginko_hero_variant';
  const VARIANT_IDS = Object.keys(VARIANTS);

  /**
   * Get or assign variant for this user
   */
  function getVariant() {
    // Check for URL override (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    const override = urlParams.get('hero_variant');
    if (override && VARIANTS[override.toUpperCase()]) {
      return VARIANTS[override.toUpperCase()];
    }

    // Check localStorage for existing assignment
    let variantId = localStorage.getItem(STORAGE_KEY);

    if (!variantId || !VARIANTS[variantId]) {
      // Assign random variant
      variantId = VARIANT_IDS[Math.floor(Math.random() * VARIANT_IDS.length)];
      localStorage.setItem(STORAGE_KEY, variantId);

      // Track assignment event
      trackVariantAssignment(variantId, true);
    } else {
      // Track returning user with existing variant
      trackVariantAssignment(variantId, false);
    }

    return VARIANTS[variantId];
  }

  /**
   * Track variant assignment in GA4
   */
  function trackVariantAssignment(variantId, isNewAssignment) {
    if (typeof gtag === 'function') {
      // Set user property for all future events
      gtag('set', 'user_properties', {
        hero_variant: variantId,
        hero_variant_name: VARIANTS[variantId].name
      });

      // Fire assignment event
      gtag('event', 'hero_variant_assigned', {
        variant_id: variantId,
        variant_name: VARIANTS[variantId].name,
        is_new_assignment: isNewAssignment,
        page_type: getPageType()
      });
    }
  }

  /**
   * Determine page type for analytics
   */
  function getPageType() {
    const path = window.location.pathname;
    if (path.includes('developers')) return 'developers';
    if (path.includes('teams')) return 'teams';
    return 'index';
  }

  /**
   * Apply variant to the page
   */
  function applyVariant(variant) {
    // Update title
    const titleEl = document.querySelector('[data-hero-title]');
    if (titleEl) {
      titleEl.textContent = variant.title;
    }

    // Update subtitle
    const subtitleEl = document.querySelector('[data-hero-subtitle]');
    if (subtitleEl) {
      subtitleEl.textContent = variant.subtitle;
    }

    // Update primary CTA
    const primaryCtaEl = document.querySelector('[data-hero-cta-primary]');
    if (primaryCtaEl) {
      primaryCtaEl.textContent = variant.primaryCta.text;
      primaryCtaEl.href = variant.primaryCta.href;
      primaryCtaEl.setAttribute('data-variant', variant.id);
    }

    // Update secondary CTA
    const secondaryCtaEl = document.querySelector('[data-hero-cta-secondary]');
    if (secondaryCtaEl) {
      secondaryCtaEl.textContent = variant.secondaryCta.text;
      secondaryCtaEl.href = variant.secondaryCta.href;
      secondaryCtaEl.setAttribute('data-variant', variant.id);
    }

    // Add variant class to hero for potential styling differences
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      heroEl.setAttribute('data-variant', variant.id);
    }

    // Log to console in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('[Hero A/B Test] Variant applied:', variant.id, '-', variant.name);
    }
  }

  /**
   * Initialize A/B test
   */
  function init() {
    // Only run on pages with hero elements
    if (!document.querySelector('[data-hero-title]')) {
      return;
    }

    const variant = getVariant();
    applyVariant(variant);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.ginkoHeroAB = {
    getVariant: getVariant,
    VARIANTS: VARIANTS,
    forceVariant: function(id) {
      if (VARIANTS[id.toUpperCase()]) {
        localStorage.setItem(STORAGE_KEY, id.toUpperCase());
        location.reload();
      }
    },
    clearVariant: function() {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };
})();
