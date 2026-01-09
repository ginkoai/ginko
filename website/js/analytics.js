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

// ============================================================
// Blog Event Tracking (TASK-7)
// ============================================================

/**
 * Get blog post metadata from page
 * @returns {Object} Post metadata (slug, title, category)
 */
function getBlogPostMetadata() {
    const article = document.querySelector('[data-post-slug]');
    if (!article) {
        // Fallback: extract from URL and page title
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const slug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '';
        const title = document.title.replace(' - ginko blog', '').trim();
        return { slug, title, category: '' };
    }

    return {
        slug: article.getAttribute('data-post-slug') || '',
        title: article.getAttribute('data-post-title') || document.title,
        category: article.getAttribute('data-post-category') || ''
    };
}

/**
 * Track blog post view
 * Event: blog_view
 *
 * @param {string} postSlug - URL-friendly post ID
 * @param {string} postTitle - Blog post title
 * @param {string} postCategory - Post category (optional)
 */
function trackBlogView(postSlug, postTitle, postCategory = '') {
    if (typeof gtag === 'undefined') {
        console.warn('gtag not loaded - event not tracked');
        return;
    }

    const eventData = {
        post_slug: postSlug,
        post_title: postTitle,
        ...(postCategory && { post_category: postCategory }),
        ...getUTMParameters()
    };

    gtag('event', 'blog_view', eventData);
    console.log('Event tracked: blog_view', eventData);
}

/**
 * Track blog read time (engagement)
 * Event: blog_read_time
 *
 * @param {number} seconds - Time spent on page
 * @param {number} scrollDepthPercent - Percentage of page scrolled
 * @param {string} postSlug - URL-friendly post ID
 * @param {string} postTitle - Blog post title
 */
function trackBlogReadTime(seconds, scrollDepthPercent, postSlug, postTitle) {
    if (typeof gtag === 'undefined') {
        console.warn('gtag not loaded - event not tracked');
        return;
    }

    const eventData = {
        seconds: seconds,
        scroll_depth_percent: scrollDepthPercent,
        post_slug: postSlug,
        post_title: postTitle,
        ...getUTMParameters()
    };

    gtag('event', 'blog_read_time', eventData);
    console.log('Event tracked: blog_read_time', eventData);
}

/**
 * Track blog CTA click
 * Event: blog_cta_click
 *
 * @param {string} ctaType - Type of CTA (install, join-discord, read-more)
 * @param {string} destination - Link target URL
 * @param {string} postSlug - URL-friendly post ID
 * @param {string} postTitle - Blog post title
 * @param {string} ctaPosition - Where CTA appears (inline, end-of-post, sidebar)
 */
function trackBlogCTAClick(ctaType, destination, postSlug, postTitle, ctaPosition = '') {
    if (typeof gtag === 'undefined') {
        console.warn('gtag not loaded - event not tracked');
        return;
    }

    const eventData = {
        cta_type: ctaType,
        destination: destination,
        post_slug: postSlug,
        post_title: postTitle,
        ...(ctaPosition && { cta_position: ctaPosition }),
        ...getUTMParameters()
    };

    gtag('event', 'blog_cta_click', eventData);
    console.log('Event tracked: blog_cta_click', eventData);
}

/**
 * Track blog share
 * Event: blog_share
 *
 * @param {string} platform - Share destination (twitter, linkedin, reddit, copy-link)
 * @param {string} postSlug - URL-friendly post ID
 * @param {string} postTitle - Blog post title
 * @param {string} shareLocation - Where share button appears (top, bottom, floating)
 */
function trackBlogShare(platform, postSlug, postTitle, shareLocation = '') {
    if (typeof gtag === 'undefined') {
        console.warn('gtag not loaded - event not tracked');
        return;
    }

    const eventData = {
        platform: platform,
        post_slug: postSlug,
        post_title: postTitle,
        ...(shareLocation && { share_location: shareLocation }),
        ...getUTMParameters()
    };

    gtag('event', 'blog_share', eventData);
    console.log('Event tracked: blog_share', eventData);
}

/**
 * Calculate current scroll depth percentage
 * @returns {number} Scroll depth as percentage (0-100)
 */
function getScrollDepthPercent() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (docHeight === 0) return 100;
    return Math.round((scrollTop / docHeight) * 100);
}

/**
 * Initialize blog-specific analytics tracking
 * Sets up read time tracking, CTA tracking, and share tracking
 */
function initializeBlogAnalytics() {
    // Check if we're on a blog post page
    const isBlogPost = window.location.pathname.includes('/blog/') &&
                       window.location.pathname !== '/blog/' &&
                       !window.location.pathname.endsWith('/blog/index.html');

    if (!isBlogPost) {
        console.log('Not a blog post page, skipping blog analytics');
        return;
    }

    console.log('Initializing blog analytics...');

    const metadata = getBlogPostMetadata();

    // Track blog view on page load
    trackBlogView(metadata.slug, metadata.title, metadata.category);

    // Set up read time tracking at thresholds: 30s, 60s, 120s, 300s
    const readTimeThresholds = [30, 60, 120, 300];
    const firedThresholds = new Set();
    let startTime = Date.now();

    function checkReadTimeThresholds() {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const scrollDepth = getScrollDepthPercent();

        for (const threshold of readTimeThresholds) {
            if (elapsedSeconds >= threshold && !firedThresholds.has(threshold)) {
                firedThresholds.add(threshold);
                trackBlogReadTime(threshold, scrollDepth, metadata.slug, metadata.title);
            }
        }

        // Stop checking once all thresholds fired
        if (firedThresholds.size < readTimeThresholds.length) {
            requestAnimationFrame(checkReadTimeThresholds);
        }
    }

    // Start read time tracking
    requestAnimationFrame(checkReadTimeThresholds);

    // Track blog CTA clicks (elements with data-track-blog-cta attribute)
    document.querySelectorAll('[data-track-blog-cta]').forEach(element => {
        element.addEventListener('click', function(e) {
            const ctaType = this.getAttribute('data-cta-type') || 'link';
            const destination = this.getAttribute('href') || '';
            const position = this.getAttribute('data-cta-position') || '';

            trackBlogCTAClick(ctaType, destination, metadata.slug, metadata.title, position);
        });
    });

    // Track blog shares (elements with data-track-blog-share attribute)
    document.querySelectorAll('[data-track-blog-share]').forEach(element => {
        element.addEventListener('click', function(e) {
            const platform = this.getAttribute('data-share-platform') || 'unknown';
            const location = this.getAttribute('data-share-location') || '';

            trackBlogShare(platform, metadata.slug, metadata.title, location);
        });
    });

    // Also track any CTA links within blog content that go to get-started
    document.querySelectorAll('.blog-post-content a[href*="get-started"]').forEach(element => {
        if (!element.hasAttribute('data-track-blog-cta')) {
            element.addEventListener('click', function(e) {
                trackBlogCTAClick('install', this.getAttribute('href'), metadata.slug, metadata.title, 'inline');
            });
        }
    });

    // Track docs links within blog content
    document.querySelectorAll('.blog-post-content a[href*="docs.ginko"]').forEach(element => {
        if (!element.hasAttribute('data-track-blog-cta')) {
            element.addEventListener('click', function(e) {
                trackBlogCTAClick('docs', this.getAttribute('href'), metadata.slug, metadata.title, 'inline');
            });
        }
    });

    console.log('Blog analytics initialized for:', metadata.slug);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeAnalytics();
        initializeBlogAnalytics();
    });
} else {
    // DOM already loaded
    initializeAnalytics();
    initializeBlogAnalytics();
}
