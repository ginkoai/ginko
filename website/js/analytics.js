/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-09
 * @tags: [analytics, ga4, event-tracking, marketing]
 * @related: [EVENT-TAXONOMY.md, UTM-SCHEMA.md]
 * @priority: high
 * @complexity: low
 * @dependencies: [gtag.js]
 */

/**
 * Analytics Helper Functions for ginkoai.com
 *
 * Implements event tracking according to EVENT-TAXONOMY.md
 * All events follow snake_case naming conventions
 * UTM parameters automatically preserved from page URL
 */

/**
 * Get UTM parameters from current page URL
 * @returns {Object} UTM parameters (empty if none present)
 */
function getUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const utm = {};

    const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    utmParams.forEach(param => {
        const value = urlParams.get(param);
        if (value) {
            utm[param] = value;
        }
    });

    return utm;
}

/**
 * Track CTA button click
 * Event: cta_click
 *
 * @param {string} ctaLocation - Where the CTA appears (e.g., 'hero', 'nav', 'pricing')
 * @param {string} ctaText - Button text (e.g., 'Get Started', 'Start Pro Trial')
 * @param {string} destinationUrl - Link target URL
 */
function trackCTAClick(ctaLocation, ctaText, destinationUrl) {
    if (typeof gtag === 'undefined') {
        console.warn('gtag not loaded - event not tracked');
        return;
    }

    const eventData = {
        cta_location: ctaLocation,
        cta_text: ctaText,
        destination_url: destinationUrl,
        ...getUTMParameters()
    };

    gtag('event', 'cta_click', eventData);
    console.log('Event tracked: cta_click', eventData);
}

/**
 * Track installation initiation
 * Event: install_initiated
 *
 * @param {string} installMethod - Installation method (e.g., 'npm', 'brew', 'curl')
 * @param {string} ctaLocation - Where the install button was clicked
 * @param {string} platform - User's OS/platform (optional, auto-detected if not provided)
 */
function trackInstallInitiated(installMethod, ctaLocation, platform = null) {
    if (typeof gtag === 'undefined') {
        console.warn('gtag not loaded - event not tracked');
        return;
    }

    // Auto-detect platform if not provided
    if (!platform) {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.indexOf('mac') !== -1) {
            platform = 'macos';
        } else if (userAgent.indexOf('win') !== -1) {
            platform = 'windows';
        } else if (userAgent.indexOf('linux') !== -1) {
            platform = 'linux';
        } else {
            platform = 'unknown';
        }
    }

    const eventData = {
        install_method: installMethod,
        cta_location: ctaLocation,
        ...(platform && { platform }),
        ...getUTMParameters()
    };

    gtag('event', 'install_initiated', eventData);
    console.log('Event tracked: install_initiated', eventData);
}

/**
 * Track GitHub link click
 * Event: github_link_click
 *
 * @param {string} linkLocation - Where the link appears (e.g., 'header', 'footer', 'hero')
 * @param {string} destinationUrl - GitHub URL
 */
function trackGitHubLinkClick(linkLocation, destinationUrl) {
    if (typeof gtag === 'undefined') {
        console.warn('gtag not loaded - event not tracked');
        return;
    }

    const eventData = {
        link_location: linkLocation,
        destination_url: destinationUrl,
        ...getUTMParameters()
    };

    gtag('event', 'github_link_click', eventData);
    console.log('Event tracked: github_link_click', eventData);
}

/**
 * Track documentation link click
 * Event: docs_link_click
 *
 * @param {string} linkLocation - Where the link appears (e.g., 'header', 'footer', 'hero')
 * @param {string} destinationUrl - Docs URL
 */
function trackDocsLinkClick(linkLocation, destinationUrl) {
    if (typeof gtag === 'undefined') {
        console.warn('gtag not loaded - event not tracked');
        return;
    }

    const eventData = {
        link_location: linkLocation,
        destination_url: destinationUrl,
        ...getUTMParameters()
    };

    gtag('event', 'docs_link_click', eventData);
    console.log('Event tracked: docs_link_click', eventData);
}

/**
 * Initialize event tracking on page load
 * Sets up click handlers for all tracked elements
 */
function initializeAnalytics() {
    console.log('Initializing analytics...');

    // Track CTA clicks
    document.querySelectorAll('[data-track-cta]').forEach(element => {
        element.addEventListener('click', function(e) {
            const location = this.getAttribute('data-cta-location');
            const text = this.textContent.trim();
            const destination = this.getAttribute('href');

            trackCTAClick(location, text, destination);
        });
    });

    // Track install button clicks
    document.querySelectorAll('[data-track-install]').forEach(element => {
        element.addEventListener('click', function(e) {
            const method = this.getAttribute('data-install-method');
            const location = this.getAttribute('data-cta-location');

            trackInstallInitiated(method, location);
        });
    });

    // Track GitHub link clicks
    document.querySelectorAll('[data-track-github]').forEach(element => {
        element.addEventListener('click', function(e) {
            const location = this.getAttribute('data-link-location');
            const destination = this.getAttribute('href');

            trackGitHubLinkClick(location, destination);
        });
    });

    // Track docs link clicks
    document.querySelectorAll('[data-track-docs]').forEach(element => {
        element.addEventListener('click', function(e) {
            const location = this.getAttribute('data-link-location');
            const destination = this.getAttribute('href');

            trackDocsLinkClick(location, destination);
        });
    });

    console.log('Analytics initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnalytics);
} else {
    // DOM already loaded
    initializeAnalytics();
}
