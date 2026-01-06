# SPRINT: MVP Marketing Strategy Sprint 2 - Landing Page Optimization

## Sprint Overview

**Sprint Goal**: Maximize landing page conversion through proven best practices, clear pain-point-addressing CTAs, social proof, and A/B testing infrastructure

**Duration**: 2 weeks (2026-01-13 to 2026-01-27)
**Type**: Feature sprint
**Progress:** 0% (0/10 tasks complete)

**Success Criteria:**
- [ ] Landing page template implemented with modern design
- [ ] Hero CTA conversion rate measurable and >3% target
- [ ] Social proof elements live (testimonials, GitHub stars, user quotes)
- [ ] A/B testing framework operational with 2+ active tests
- [ ] Page load time <3s (90th percentile)
- [ ] Mobile responsive design validated
- [ ] Blog CTAs cross-link to landing page

---

## Sprint Tasks

### TASK-1: Implement landing page template (8h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Apply provided landing page template with modern, conversion-focused design

**Implementation Notes:**
User will provide template as starting point. Key sections to include:
1. **Hero Section**
   - Pain-point-addressing headline
   - Clear value proposition
   - Primary CTA (Install CLI)
   - Secondary CTA (View Demo / Read Docs)
   - Hero image/video/animation

2. **Problem/Solution**
   - Developer pain points (context switching, AI rework, team visibility)
   - How ginko solves each

3. **Features**
   - Key capabilities with icons/visuals
   - Session management
   - Knowledge graph
   - Team collaboration

4. **Social Proof**
   - User testimonials
   - GitHub stars counter
   - Company logos (if applicable)
   - Usage stats

5. **How It Works**
   - 3-step flow (Install → Start → Collaborate)
   - Screenshots or demo

6. **CTA Section**
   - Final conversion push
   - Install instructions
   - Links to docs, GitHub, Discord

**Files:**
- `dashboard/src/app/(marketing)/page.tsx`
- `dashboard/src/components/marketing/*.tsx` (new components)
- `dashboard/src/styles/marketing.css`

**Acceptance Criteria:**
- Template implemented with all sections
- Responsive design (mobile, tablet, desktop)
- Accessible (WCAG AA)
- No layout shift (CLS < 0.1)

Follow: ADR-TBD (design system standards)

---

### TASK-2: Refine hero CTA with pain-point messaging (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Craft compelling headline and CTAs that address specific developer pain points

**Implementation Notes:**
**Pain Points to Address:**
- "Stop losing context every time your AI restarts"
- "Make your AI collaboration observable and traceable"
- "Turn 28-second session starts into 2 seconds"
- "Give your team visibility into AI-driven work"

**Headline Options (A/B test):**
- "Git-native context for AI pair programming"
- "Never lose your AI collaboration context again"
- "Make AI collaboration safe, observable, and learnable"

**CTA Button Text (A/B test):**
- "Install Ginko CLI" (technical, direct)
- "Get Started Free" (benefit-focused)
- "Try Ginko Now" (action-oriented)

**Implementation:**
- Create headline variants
- Design CTA buttons with high contrast
- Add micro-copy under CTA ("Free forever. 2-minute setup.")
- Include trust signals near CTA (GitHub stars, open source badge)

**Files:**
- `dashboard/src/app/(marketing)/page.tsx` (hero section)
- `dashboard/src/config/marketing-copy.ts` (copy variants)

**Acceptance Criteria:**
- 3+ headline variants ready for A/B test
- 3+ CTA button text variants
- Micro-copy reinforces low friction
- Design passes contrast ratio checks (WCAG)

Apply: conversion-optimization-pattern

---

### TASK-3: Add social proof elements (6h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Build trust through testimonials, GitHub stats, and early user quotes

**Implementation Notes:**
**Social Proof Types:**
1. **GitHub Stats**
   - Live star count (GitHub API)
   - Contributor count
   - "Trusted by X developers"

2. **User Testimonials**
   - Collect from early users (2-3 quotes minimum)
   - Include name, role, company (if permissible)
   - Photo or avatar
   - Quote format: Pain point → How ginko solved it

3. **Usage Stats** (if available)
   - "X sessions managed"
   - "X context switches prevented"
   - "65% reduction in rework" (from internal data)

4. **Trust Badges**
   - Open source badge
   - Built with Claude badge
   - MIT License badge

**Files:**
- `dashboard/src/components/marketing/SocialProof.tsx`
- `dashboard/src/components/marketing/GitHubStats.tsx`
- `dashboard/src/components/marketing/Testimonials.tsx`
- `dashboard/src/app/api/github-stats/route.ts` (fetch stars)

**Acceptance Criteria:**
- GitHub star count live and accurate
- 2+ testimonials displayed attractively
- Trust badges visible above the fold or in footer
- Responsive design for all proof elements

Apply: social-proof-pattern
Avoid: 💡 fake-testimonials-gotcha (only use real users)

---

### TASK-4: Set up A/B testing framework (6h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Implement A/B testing infrastructure for headline and CTA optimization

**Implementation Notes:**
**Tool Options:**
- Google Optimize (deprecated, use GA4 experiments)
- PostHog Feature Flags + Experiments
- Vercel Edge Config + Middleware
- Custom implementation with cookies

**Recommended:** PostHog Experiments (already installing PostHog)

**Implementation:**
1. Configure PostHog experiments
2. Create feature flags for:
   - Hero headline variant
   - CTA button text variant
   - CTA button color variant
3. Implement variant rendering in React
4. Set conversion goal (CTA click or install initiated)
5. Statistical significance calculator

**Initial Tests:**
- Test 1: Headline A vs B vs C
- Test 2: CTA button text A vs B
- Test 3: CTA button color (primary vs accent)

**Files:**
- `dashboard/src/lib/experiments.ts` (wrapper for PostHog)
- `dashboard/src/app/(marketing)/page.tsx` (variant rendering)
- `dashboard/src/hooks/useExperiment.ts` (React hook)

**Acceptance Criteria:**
- 2+ experiments running simultaneously
- Variant assignment consistent per user
- Conversion events tracked per variant
- Results viewable in PostHog

Follow: ADR-TBD (experimentation standards)
Apply: ab-testing-pattern

---

### TASK-5: Optimize page load performance (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Achieve <3s page load time (90th percentile) for landing page

**Implementation Notes:**
**Optimization Tactics:**
1. **Images**
   - Use Next.js Image component
   - WebP format with fallbacks
   - Lazy loading below the fold
   - Proper sizing (no oversized images)

2. **JavaScript**
   - Code splitting
   - Lazy load non-critical components
   - Remove unused dependencies
   - Minimize third-party scripts

3. **CSS**
   - Critical CSS inline
   - Remove unused styles
   - Minimize reflows

4. **Fonts**
   - Subset fonts (only needed characters)
   - Preload critical fonts
   - font-display: swap

5. **Caching**
   - Set proper cache headers
   - CDN for static assets (Vercel Edge)

**Measurement:**
- Lighthouse CI in GitHub Actions
- WebPageTest
- Real User Monitoring (RUM) via GA4

**Files:**
- `dashboard/next.config.js` (optimization config)
- `dashboard/src/app/(marketing)/page.tsx` (lazy loading)
- `dashboard/src/styles/globals.css` (critical CSS)

**Acceptance Criteria:**
- Lighthouse Performance score >90
- Largest Contentful Paint (LCP) <2.5s
- First Input Delay (FID) <100ms
- Cumulative Layout Shift (CLS) <0.1
- Total Blocking Time (TBT) <300ms

Apply: performance-optimization-pattern
Avoid: 💡 premature-optimization-gotcha (measure first)

---

### TASK-6: Add mobile responsive design (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Ensure landing page converts well on mobile devices

**Implementation Notes:**
**Breakpoints:**
- Mobile: <640px
- Tablet: 640px - 1024px
- Desktop: >1024px

**Mobile Optimizations:**
- Hamburger menu for navigation
- Larger tap targets (min 44x44px)
- Simplified hero section (shorter headline, single CTA)
- Stacked layouts instead of side-by-side
- Readable font sizes (min 16px body)
- No horizontal scroll

**Testing:**
- Chrome DevTools device emulation
- Real device testing (iOS Safari, Android Chrome)
- BrowserStack for broad coverage

**Files:**
- `dashboard/src/app/(marketing)/page.tsx` (responsive components)
- `dashboard/tailwind.config.ts` (breakpoint config)
- `dashboard/src/components/marketing/MobileNav.tsx`

**Acceptance Criteria:**
- All sections render correctly on mobile
- CTAs easily tappable
- No layout issues on iOS Safari
- Text readable without zooming
- Lighthouse mobile score >85

---

### TASK-7: Integrate blog CTAs to landing page (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Cross-link blog posts to landing page with conversion CTAs

**Implementation Notes:**
**CTA Placements:**
1. **Inline CTAs** (mid-post)
   - After problem description: "Ginko solves this with..." → CTA
   - After technical explanation: "Try it yourself" → CTA

2. **End-of-post CTA**
   - Summary of value prop
   - Install button
   - Links to docs, GitHub, Discord

3. **Sidebar CTA** (persistent)
   - "Get Started with Ginko"
   - GitHub stars badge
   - Install command

**CTA Copy Examples:**
- "Stop losing AI context. Install Ginko in 2 minutes."
- "Make your AI collaboration traceable. Try Ginko free."
- "Turn 28s session starts into 2s. Get Ginko now."

**Files:**
- `blog/src/components/InlineCTA.astro`
- `blog/src/components/EndOfPostCTA.astro`
- `blog/src/components/SidebarCTA.astro`
- `blog/src/layouts/BlogPost.astro` (integrate CTAs)

**Acceptance Criteria:**
- CTAs appear on all blog posts
- Click tracking via GA4
- Responsive design
- A/B test different CTA copy variants

Apply: content-marketing-pattern

---

### TASK-8: Add install instructions and quick start (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Reduce friction from CTA click to first session

**Implementation Notes:**
**Install Section:**
- Copy-paste npm install command
- One-click copy button
- Platform detection (macOS, Linux, Windows)
- Prerequisites check (Node.js version)
- Link to troubleshooting docs

**Quick Start:**
1. Install: `npm install -g ginko`
2. Initialize: `ginko init`
3. Start session: `ginko start`
4. Log your work: `ginko log "Achievement unlocked"`

**Video/GIF:**
- 30-second demo of installation and first session
- Hosted on YouTube or embedded
- Autoplay muted with captions

**Files:**
- `dashboard/src/components/marketing/InstallInstructions.tsx`
- `dashboard/src/components/marketing/QuickStart.tsx`
- `dashboard/src/components/marketing/DemoVideo.tsx`

**Acceptance Criteria:**
- Install command copy works
- Platform-specific instructions shown
- Quick start guide clear and actionable
- Demo video loads quickly (<1MB)

---

### TASK-9: Create conversion funnel visualization (3h)
**Status:** [ ] Not Started
**Priority:** LOW

**Goal:** Visualize user journey from landing to CLI install

**Implementation Notes:**
**Funnel Stages:**
1. Landing page view
2. Hero CTA click
3. Install instructions viewed
4. Install command copied
5. CLI installed (tracked via PostHog)
6. First `ginko start` session

**Tool:** PostHog Funnels or GA4 Funnel Exploration

**Metrics:**
- Conversion rate per stage
- Drop-off points (where users leave)
- Time between stages
- Segmentation by traffic source

**Deliverable:**
- Funnel report in PostHog/GA4
- Weekly funnel review schedule
- Documented in `docs/analytics/CONVERSION-FUNNEL.md`

**Acceptance Criteria:**
- All 6 stages tracked
- Drop-off analysis identifies bottlenecks
- Funnel viewable by team
- Alerts for significant drop-off changes

---

### TASK-10: Conduct landing page audit (2h)
**Status:** [ ] Not Started
**Priority:** LOW

**Goal:** Review landing page against conversion best practices checklist

**Implementation Notes:**
**Audit Checklist:**
- [ ] Clear value proposition above the fold
- [ ] Pain points explicitly stated
- [ ] Single primary CTA (no confusion)
- [ ] Social proof visible
- [ ] Trust signals (open source, GitHub, testimonials)
- [ ] Fast load time (<3s)
- [ ] Mobile responsive
- [ ] Accessible (keyboard navigation, screen readers)
- [ ] No broken links
- [ ] Clear next steps after CTA

**Tools:**
- Manual review
- Lighthouse audit
- WAVE accessibility checker
- UsabilityHub five-second test (optional)

**Deliverable:**
- Audit report in `docs/marketing/LANDING-PAGE-AUDIT.md`
- List of improvements for future sprints

**Acceptance Criteria:**
- Checklist 90%+ complete
- Critical issues (broken links, slow load) resolved
- Recommendations documented

---

## Accomplishments This Sprint

[To be filled as work progresses]

---

## Next Steps

1. Begin Sprint 3: Content & Multi-Channel Funnel
2. Monitor landing page conversion rate post-launch
3. Iterate on A/B test winners

---

## Blockers

[To be updated if blockers arise]

---

## References

- [EPIC-010: MVP Marketing Strategy](../epics/EPIC-010-mvp-marketing-strategy.md)
- [Sprint 1: Analytics Foundation](./SPRINT-2026-01-e010-sprint1-analytics-foundation.md)
- Conversion optimization resources:
  - https://unbounce.com/landing-page-examples/
  - https://www.optimizely.com/optimization-glossary/
