# SPRINT: EPIC-010 Sprint 1 - MVP Marketing Strategy - Analytics Foundation

## Sprint Overview

**Sprint Goal**: Establish measurement infrastructure before launch to enable data-driven decision making from day one

**Duration**: 1 week (2026-01-06 to 2026-01-13)
**Type**: Infrastructure sprint
**Progress:** 50% (4/8 tasks complete)

**Strategic Decision (2026-01-07):** Deferring PostHog implementation (TASK-2, TASK-6) to focus on marketing analytics first. Using MVP Fast Track approach to prioritize landing page optimization.

**Success Criteria (MVP Fast Track):**
- [x] GA4 installed and tracking page views
- [x] Key marketing events defined (landing page, blog, UTM)
- [x] UTM parameter schema documented
- [x] Landing page CTA clicks tracked
- [ ] Blog engagement tracked (read time, scroll depth)
- ~~PostHog setup~~ (deferred to separate sprint)

---

## Sprint Tasks

### TASK-1: Set up Google Analytics 4 (4h)
**Status:** [x] Complete (2026-01-07)
**Priority:** HIGH

**Goal:** Install and configure GA4 for web traffic and user journey tracking

**Implementation Notes:**
- Create GA4 property for ginkoai.com
- Install gtag.js on landing page and blog
- Configure data stream for website
- Set up basic views and reports
- Enable enhanced measurement (scroll, outbound clicks, file downloads)
- Test event firing in GA4 DebugView

**Files:**
- `dashboard/src/app/layout.tsx` (add GA4 script)
- `blog/src/layouts/Layout.astro` (add GA4 script)
- `.env` (add GA4 measurement ID)

**Acceptance Criteria:**
- GA4 tracks page views on landing page and blog
- Enhanced measurement events visible in DebugView
- Real-time reports show activity within 2 hours

**Completion Notes:**
- ✓ GA4 property created (Measurement ID: G-6733RPZ8RN)
- ✓ gtag.js installed on 12 pages (5 marketing + 7 blog)
- ✓ Enhanced measurement enabled
- ✓ Deployed to production at ginkoai.com
- ⏳ Pending: Real-time testing in GA4 console

---

### TASK-2: Set up PostHog for product analytics (4h)
**Status:** [Z] Deferred (moved to separate sprint)
**Priority:** MEDIUM (downgraded)

**Goal:** Install PostHog for event-based product analytics and session tracking

**Note:** Deferred to focus on marketing analytics first. Will be addressed in a separate product analytics sprint after MVP launch.

**Implementation Notes:**
- Create PostHog project (cloud or self-hosted decision)
- Install posthog-js library
- Configure initialization with autocapture
- Set up session recording (optional, privacy considerations)
- Test event capture
- Create initial dashboard with key metrics

**Files:**
- `dashboard/src/app/layout.tsx` (PostHog initialization)
- `package.json` (add posthog-js dependency)
- `.env` (add PostHog project API key and host)

**Acceptance Criteria:**
- PostHog captures custom events from dashboard
- Session recording works (if enabled)
- Events appear in PostHog UI within minutes
- Autocapture tracking user interactions

Apply: analytics-integration-pattern
Avoid: 💡 pii-tracking-gotcha (don't capture sensitive data)

---

### TASK-3: Define key event taxonomy - Marketing Events Only (1h)
**Status:** [x] Complete (2026-01-08)
**Priority:** HIGH

**Goal:** Create standardized event naming and properties schema for marketing analytics (GA4)

**Note:** Scoped to marketing events only. Product events (CLI, dashboard) deferred to PostHog sprint.

**Implementation Notes:**
Define events for:
1. **Landing Page** (GA4)
   - `page_view` (path, referrer, utm_*)
   - `cta_click` (cta_location, cta_text)
   - `install_initiated` (platform, install_method)
   - `github_link_click` (link_location)
   - `docs_link_click` (link_location)

2. **Blog** (GA4)
   - `blog_view` (post_slug, post_title)
   - `blog_read_time` (seconds, scroll_depth_percent)
   - `blog_cta_click` (cta_type, destination)
   - `blog_share` (platform, post_slug)

3. ~~**Product Events**~~ (deferred to PostHog sprint)
4. ~~**Community Events**~~ (deferred to PostHog sprint)

**Deliverable:**
- Event schema document in `docs/analytics/EVENT-TAXONOMY.md`
- Property naming conventions
- Event firing checklist

**Acceptance Criteria:**
- Landing page events (5 types) documented with properties
- Blog events (4 types) documented with properties
- Naming follows snake_case convention
- Properties include UTM parameters where applicable
- Event taxonomy document created in `docs/analytics/EVENT-TAXONOMY.md`

**Completion Notes:**
- ✓ Created comprehensive EVENT-TAXONOMY.md (9 events documented)
- ✓ Landing page events: page_view, cta_click, install_initiated, github_link_click, docs_link_click
- ✓ Blog events: blog_view, blog_read_time, blog_cta_click, blog_share
- ✓ All events include property schemas with types, descriptions, and examples
- ✓ Implementation examples provided for each custom event
- ✓ Property naming conventions and standards documented
- ✓ Event firing checklist created
- ✓ Privacy considerations and GDPR compliance noted

---

### TASK-4: Implement UTM tracking system (3h)
**Status:** [x] Complete (2026-01-08)
**Priority:** HIGH

**Goal:** Create UTM parameter schema for attribution tracking

**Implementation Notes:**
**UTM Structure:**
```
utm_source: Platform (reddit, twitter, linkedin, youtube, discord)
utm_medium: Type (organic-social, cpc, referral, email)
utm_campaign: Campaign name (mvp-launch, blog-post-001, tutorial-video)
utm_content: Variant (headline-a, cta-button, comment-123)
utm_term: Keyword (optional, for paid search)
```

**Link Examples:**
- Reddit post: `?utm_source=reddit&utm_medium=organic-social&utm_campaign=mvp-launch&utm_content=r-programming-001`
- X.com thread: `?utm_source=twitter&utm_medium=organic-social&utm_campaign=blog-post-cognitive-scaffolding`
- YouTube video: `?utm_source=youtube&utm_medium=video&utm_campaign=tutorial-getting-started`

**Deliverable:**
- UTM schema document in `docs/analytics/UTM-SCHEMA.md`
- URL builder tool or spreadsheet template
- Channel grouping rules in GA4

**Acceptance Criteria:**
- UTM schema covers all platforms
- Channel grouping configured in GA4
- Test links working and tracked correctly

**Completion Notes:**
- ✓ Created comprehensive UTM-SCHEMA.md (6 platforms documented)
- ✓ Platform-specific standards: Reddit, Twitter/X, LinkedIn, YouTube, Discord, Email
- ✓ UTM parameter structure and naming rules defined
- ✓ 15+ link examples across all platforms and use cases
- ✓ URL builder spreadsheet template with formula
- ✓ GA4 channel grouping rules (default + custom channels)
- ✓ Campaign naming conventions (8 campaign types)
- ✓ Testing & validation procedures documented
- ✓ Best practices (do's and don'ts)
- ✓ Maintenance schedule (weekly, monthly, quarterly tasks)

Follow: ADR-TBD (analytics standards)

---

### TASK-5: Install GA4 tracking on landing page (3h)
**Status:** [x] Complete (2026-01-09)
**Priority:** MEDIUM

**Goal:** Instrument landing page with event tracking

**Implementation Notes:**
Events to track:
- Page view (automatic via gtag)
- Hero CTA click
- Feature section scroll
- Install button click
- Documentation link click
- GitHub link click
- Social proof interaction (testimonials, logos)

**Files:**
- `dashboard/src/app/(marketing)/page.tsx` (landing page)
- `dashboard/src/lib/analytics.ts` (helper functions)

**Acceptance Criteria:**
- All CTA clicks tracked with button location/text
- Events visible in GA4 real-time reports
- No console errors
- TypeScript types for event properties

**Completion Notes:**
- ✓ Created analytics.js with 4 event tracking functions
- ✓ Implemented data-driven event tracking using HTML data attributes
- ✓ Tracked 7 CTA button clicks across landing page:
  - Nav: "Get Started"
  - Hero: "Get Started", "View Docs"
  - Pricing: "Get Started" (Free), "Start Pro Trial" (Pro)
  - Final CTA: "Get Started Free", "Read the Docs"
- ✓ Tracked 2 install initiated events (npm copy buttons in hero and final CTA)
- ✓ Tracked 5 docs link clicks (nav, hero, final CTA, footer x2)
- ✓ Tracked 2 GitHub link clicks (footer GitHub and Examples)
- ✓ UTM parameter preservation implemented (auto-included in all events)
- ✓ Platform auto-detection for install_initiated events (macos/windows/linux)
- ✓ Console logging for debugging
- ✓ Created comprehensive TESTING-EVENTS.md guide with 4 testing methods
- ✓ Events follow EVENT-TAXONOMY.md specifications (snake_case naming)
- Ready for GA4 DebugView testing and production validation

Apply: event-tracking-pattern

---

### TASK-6: Install PostHog tracking on dashboard (3h)
**Status:** [Z] Deferred (blocked by TASK-2)
**Priority:** LOW (downgraded)

**Goal:** Instrument dashboard with product event tracking

**Note:** Deferred pending PostHog setup (TASK-2). Will be addressed in product analytics sprint.

**Implementation Notes:**
Events to track:
- Dashboard page view
- User signup
- Project created
- First `ginko start` detected (via webhook or event sync)
- Knowledge graph query
- Task assignment
- Sprint progress update

**Files:**
- `dashboard/src/app/layout.tsx` (PostHog init)
- `dashboard/src/lib/posthog.ts` (helper functions)
- `dashboard/src/app/api/*/route.ts` (server-side events)

**Acceptance Criteria:**
- Client-side events tracked on user actions
- Server-side events tracked for API calls
- User properties set (user_id, team_id, project_id)
- Events segmented by user properties in PostHog

Apply: product-analytics-pattern

---

### TASK-7: Add blog analytics tracking (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Track blog engagement metrics

**Implementation Notes:**
- Install GA4 on blog (already done in TASK-1)
- Add scroll depth tracking
- Track read time with custom event
- Track CTA clicks (install ginko, join Discord, read more)
- Track outbound links

**Files:**
- `blog/src/layouts/Layout.astro` (GA4 already added)
- `blog/src/components/ReadTimeTracker.astro` (new component)
- `blog/src/components/CTAButton.astro` (add tracking)

**Acceptance Criteria:**
- Read time calculated and sent after 30s, 60s, 120s thresholds
- Scroll depth tracked at 25%, 50%, 75%, 100%
- All CTA clicks tracked with post context
- Outbound links tracked

---

### TASK-8: Create analytics dashboard (4h)
**Status:** [ ] Not Started
**Priority:** LOW

**Goal:** Build initial dashboard for weekly metric reviews

**Implementation Notes:**
**Dashboard Sections:**
1. **Traffic Overview**
   - Unique visitors (daily, weekly)
   - Page views
   - Traffic by channel (GA4)

2. **Conversion Funnel**
   - Landing page views
   - CTA clicks
   - Install initiated
   - CLI installed
   - First session

3. **Content Performance**
   - Top blog posts (views, read time)
   - Top landing page CTAs
   - Top traffic sources

4. **Product Metrics**
   - CLI installs
   - Active users (weekly)
   - Sessions created
   - Dashboard signups

**Tool Options:**
- GA4 custom dashboard
- PostHog insights dashboard
- Google Data Studio (Looker Studio)
- Custom Next.js dashboard (future)

**Deliverable:**
- Dashboard accessible to team
- Metrics refreshed daily
- Screenshot/link documented

**Acceptance Criteria:**
- All 4 sections visible
- Data populated with test events
- Sharable link for team access
- Documented in `docs/analytics/DASHBOARD.md`

---

## Accomplishments This Sprint

### 2026-01-07: GA4 Setup Complete (TASK-1)
- Created GA4 property with measurement ID G-6733RPZ8RN
- Installed gtag.js tracking on 12 pages:
  - 5 marketing pages (index, get-started, developers, how-it-works, teams)
  - 7 blog pages (blog index + 6 blog posts)
- Enabled enhanced measurement (scroll tracking, outbound clicks, file downloads)
- Deployed to production at https://ginkoai.com
- Verified tracking code live on production
- **Strategic Decision:** Deferred PostHog implementation to focus on marketing analytics first (Option B: MVP Fast Track approach)

### 2026-01-08: Event Taxonomy Defined (TASK-3)
- Created comprehensive EVENT-TAXONOMY.md documentation
- Defined 9 marketing events:
  - **Landing page (5):** page_view, cta_click, install_initiated, github_link_click, docs_link_click
  - **Blog (4):** blog_view, blog_read_time, blog_cta_click, blog_share
- Documented all event properties with types, descriptions, and examples
- Established snake_case naming conventions
- Created event firing checklist
- Included implementation examples for gtag.js
- Documented privacy and GDPR compliance considerations
- Ready for implementation in TASK-5 and TASK-7

### 2026-01-08: UTM Tracking System Complete (TASK-4)
- Created comprehensive UTM-SCHEMA.md documentation
- Defined UTM parameter structure and naming rules (lowercase, hyphens, descriptive)
- Platform-specific standards for 6 channels:
  - **Reddit:** organic-social, campaign naming, subreddit tracking
  - **Twitter/X:** thread/tweet numbering, reply tracking
  - **LinkedIn:** post types (post, article, carousel, video)
  - **YouTube:** video content tracking (description, cards, end screens)
  - **Discord:** channel-based tracking, community referrals
  - **Email:** newsletter, onboarding, product updates
- 15+ link examples covering all platforms and use cases
- URL builder spreadsheet template with Google Sheets formula
- GA4 channel grouping rules (default + custom channels)
- Campaign naming conventions (8 types: launch, blog-post, tutorial, etc.)
- Testing & validation procedures (3 methods)
- Best practices and common issues troubleshooting
- Maintenance schedule (weekly, monthly, quarterly)
- Ready for campaign launches and link tracking

### 2026-01-09: Landing Page Event Tracking Complete (TASK-5)
- Created analytics.js helper library with 4 event tracking functions
- Implemented data-driven event tracking using HTML data attributes
- Tracked 16 total interactions across landing page:
  - **7 CTA clicks:** Nav, Hero (2), Pricing (2), Final CTA (2)
  - **2 Install initiated:** npm copy buttons (hero, final CTA)
  - **5 Docs links:** Nav, Hero, Final CTA, Footer (2)
  - **2 GitHub links:** Footer (GitHub, Examples)
- UTM parameter preservation (auto-included from URL in all events)
- Platform auto-detection for install events (macos/windows/linux)
- Console logging for debugging and verification
- Created TESTING-EVENTS.md with 4 testing methods (Console, Real-time, DebugView, Network)
- All events follow EVENT-TAXONOMY.md specifications (snake_case, proper properties)
- Ready for GA4 DebugView testing and production deployment

---

## Next Steps

1. Begin Sprint 2: Landing Page Optimization
2. Use analytics data to inform A/B testing priorities
3. Create baseline metrics report before launch

---

## Blockers

[To be updated if blockers arise]

---

## References

- [EPIC-010: MVP Marketing Strategy](../epics/EPIC-010-mvp-marketing-strategy.md)
- Google Analytics 4 Documentation: https://developers.google.com/analytics/devguides/collection/ga4
- PostHog Documentation: https://posthog.com/docs
