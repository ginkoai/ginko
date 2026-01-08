# Event Taxonomy - Marketing Analytics (GA4)

**Version:** 1.0
**Last Updated:** 2026-01-08
**Scope:** Marketing events only (landing page + blog)
**Tool:** Google Analytics 4 (GA4)

## Overview

This document defines the standardized event schema for marketing analytics on ginkoai.com. All events follow snake_case naming conventions and include UTM parameters for attribution tracking.

**Scope:**
- ✅ Landing page events (5 types)
- ✅ Blog events (4 types)
- ⏸️ Product events (CLI, dashboard) - deferred to PostHog sprint
- ⏸️ Community events (Discord) - deferred to PostHog sprint

---

## Naming Conventions

**Event Names:**
- Use `snake_case` format (all lowercase with underscores)
- Be descriptive and action-oriented
- Examples: `cta_click`, `blog_read_time`, `install_initiated`

**Property Names:**
- Use `snake_case` format
- Be specific and descriptive
- Include data type in documentation
- Examples: `cta_location`, `post_slug`, `scroll_depth_percent`

**Reserved Properties:**
All events automatically include these GA4 properties:
- `page_location` (string): Full URL
- `page_title` (string): Page title
- `language` (string): Browser language
- `screen_resolution` (string): Screen dimensions

---

## Landing Page Events

### 1. `page_view`

**Description:** Automatically tracked page view event (GA4 default)

**When to Fire:** On every page load

**Properties:**
| Property | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `path` | string | URL path | `/`, `/get-started`, `/developers` | Yes |
| `referrer` | string | Referring URL | `https://google.com`, `direct` | Yes |
| `utm_source` | string | Traffic source | `reddit`, `twitter`, `linkedin` | If present |
| `utm_medium` | string | Traffic medium | `organic-social`, `cpc`, `referral` | If present |
| `utm_campaign` | string | Campaign name | `mvp-launch`, `blog-post-001` | If present |
| `utm_content` | string | Content variant | `headline-a`, `cta-button` | If present |
| `utm_term` | string | Paid keyword | `context-management` | If present |

**Implementation:** Automatic via gtag.js

---

### 2. `cta_click`

**Description:** User clicks a call-to-action button on landing page

**When to Fire:** On click of any CTA button

**Properties:**
| Property | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `cta_location` | string | Section where CTA appears | `hero`, `features`, `footer` | Yes |
| `cta_text` | string | Button text | `Get Started`, `Install Now` | Yes |
| `destination_url` | string | Link target | `/get-started`, `https://github.com/ginkoai/ginko` | Yes |
| `utm_source` | string | Traffic source | `reddit`, `twitter` | If present |
| `utm_medium` | string | Traffic medium | `organic-social` | If present |
| `utm_campaign` | string | Campaign name | `mvp-launch` | If present |

**Implementation Example:**
```javascript
gtag('event', 'cta_click', {
  cta_location: 'hero',
  cta_text: 'Get Started',
  destination_url: '/get-started'
});
```

---

### 3. `install_initiated`

**Description:** User starts the installation process (clicks install button)

**When to Fire:** On click of install/download CTA

**Properties:**
| Property | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `platform` | string | User's OS/platform | `macos`, `linux`, `windows` | No |
| `install_method` | string | Installation approach | `npm`, `brew`, `curl` | Yes |
| `cta_location` | string | Where button was clicked | `hero`, `get-started-page` | Yes |
| `utm_source` | string | Traffic source | `reddit`, `twitter` | If present |
| `utm_medium` | string | Traffic medium | `organic-social` | If present |
| `utm_campaign` | string | Campaign name | `mvp-launch` | If present |

**Implementation Example:**
```javascript
gtag('event', 'install_initiated', {
  platform: 'macos',
  install_method: 'npm',
  cta_location: 'hero'
});
```

---

### 4. `github_link_click`

**Description:** User clicks a link to the GitHub repository

**When to Fire:** On click of any GitHub link

**Properties:**
| Property | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `link_location` | string | Where link appears | `header`, `footer`, `hero` | Yes |
| `destination_url` | string | GitHub URL | `https://github.com/ginkoai/ginko` | Yes |
| `utm_source` | string | Traffic source | `reddit`, `twitter` | If present |
| `utm_medium` | string | Traffic medium | `organic-social` | If present |
| `utm_campaign` | string | Campaign name | `mvp-launch` | If present |

**Implementation Example:**
```javascript
gtag('event', 'github_link_click', {
  link_location: 'header',
  destination_url: 'https://github.com/ginkoai/ginko'
});
```

---

### 5. `docs_link_click`

**Description:** User clicks a link to documentation

**When to Fire:** On click of any documentation link

**Properties:**
| Property | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `link_location` | string | Where link appears | `header`, `footer`, `features` | Yes |
| `destination_url` | string | Docs URL | `/docs`, `/docs/getting-started` | Yes |
| `utm_source` | string | Traffic source | `reddit`, `twitter` | If present |
| `utm_medium` | string | Traffic medium | `organic-social` | If present |
| `utm_campaign` | string | Campaign name | `mvp-launch` | If present |

**Implementation Example:**
```javascript
gtag('event', 'docs_link_click', {
  link_location: 'header',
  destination_url: '/docs/getting-started'
});
```

---

## Blog Events

### 6. `blog_view`

**Description:** User views a blog post

**When to Fire:** On blog post page load

**Properties:**
| Property | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `post_slug` | string | URL-friendly post ID | `ai-development-without-chaos` | Yes |
| `post_title` | string | Blog post title | `AI Development Without Chaos` | Yes |
| `post_category` | string | Post category | `tutorials`, `announcements` | No |
| `utm_source` | string | Traffic source | `reddit`, `twitter`, `linkedin` | If present |
| `utm_medium` | string | Traffic medium | `organic-social` | If present |
| `utm_campaign` | string | Campaign name | `blog-post-001` | If present |

**Implementation Example:**
```javascript
gtag('event', 'blog_view', {
  post_slug: 'ai-development-without-chaos',
  post_title: 'AI Development Without Chaos',
  post_category: 'tutorials'
});
```

---

### 7. `blog_read_time`

**Description:** Tracks how long user engages with blog post

**When to Fire:** At time thresholds: 30s, 60s, 120s, 300s

**Properties:**
| Property | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `seconds` | number | Seconds on page | `30`, `60`, `120`, `300` | Yes |
| `scroll_depth_percent` | number | % of page scrolled | `25`, `50`, `75`, `100` | Yes |
| `post_slug` | string | URL-friendly post ID | `ai-development-without-chaos` | Yes |
| `post_title` | string | Blog post title | `AI Development Without Chaos` | Yes |
| `utm_source` | string | Traffic source | `reddit`, `twitter` | If present |
| `utm_campaign` | string | Campaign name | `blog-post-001` | If present |

**Implementation Example:**
```javascript
gtag('event', 'blog_read_time', {
  seconds: 60,
  scroll_depth_percent: 50,
  post_slug: 'ai-development-without-chaos',
  post_title: 'AI Development Without Chaos'
});
```

**Implementation Notes:**
- Fire at 30s, 60s, 120s, 300s thresholds
- Only fire once per threshold per session
- Calculate scroll depth at time of firing

---

### 8. `blog_cta_click`

**Description:** User clicks a CTA within a blog post

**When to Fire:** On click of any blog CTA button

**Properties:**
| Property | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `cta_type` | string | Type of CTA | `install`, `join-discord`, `read-more` | Yes |
| `destination` | string | Link target | `/get-started`, `https://discord.gg/...` | Yes |
| `post_slug` | string | URL-friendly post ID | `ai-development-without-chaos` | Yes |
| `post_title` | string | Blog post title | `AI Development Without Chaos` | Yes |
| `cta_position` | string | Where CTA appears | `inline`, `end-of-post`, `sidebar` | No |
| `utm_source` | string | Traffic source | `reddit`, `twitter` | If present |
| `utm_campaign` | string | Campaign name | `blog-post-001` | If present |

**Implementation Example:**
```javascript
gtag('event', 'blog_cta_click', {
  cta_type: 'install',
  destination: '/get-started',
  post_slug: 'ai-development-without-chaos',
  post_title: 'AI Development Without Chaos',
  cta_position: 'end-of-post'
});
```

---

### 9. `blog_share`

**Description:** User shares blog post on social media

**When to Fire:** On click of social share button

**Properties:**
| Property | Type | Description | Example | Required |
|----------|------|-------------|---------|----------|
| `platform` | string | Share destination | `twitter`, `linkedin`, `reddit`, `copy-link` | Yes |
| `post_slug` | string | URL-friendly post ID | `ai-development-without-chaos` | Yes |
| `post_title` | string | Blog post title | `AI Development Without Chaos` | Yes |
| `share_location` | string | Where share button appears | `top`, `bottom`, `floating` | No |

**Implementation Example:**
```javascript
gtag('event', 'blog_share', {
  platform: 'twitter',
  post_slug: 'ai-development-without-chaos',
  post_title: 'AI Development Without Chaos',
  share_location: 'bottom'
});
```

---

## Event Firing Checklist

Use this checklist when implementing event tracking:

### Landing Page Events
- [ ] `page_view` - Automatic (gtag.js), verify UTM parameters captured
- [ ] `cta_click` - Instrument all CTA buttons with event handler
- [ ] `install_initiated` - Track install/download button clicks
- [ ] `github_link_click` - Track all GitHub repository links
- [ ] `docs_link_click` - Track all documentation links

### Blog Events
- [ ] `blog_view` - Fire on page load with post metadata
- [ ] `blog_read_time` - Set up time-based tracking (30s, 60s, 120s, 300s)
- [ ] `blog_cta_click` - Instrument all blog CTAs
- [ ] `blog_share` - Track social share buttons

### Testing
- [ ] Verify events appear in GA4 DebugView
- [ ] Confirm all required properties are populated
- [ ] Test UTM parameter preservation across events
- [ ] Validate data types and formats
- [ ] Check event firing on mobile devices

---

## Property Naming Standards

### General Rules
1. **snake_case only** - `cta_location`, not `ctaLocation` or `CTA_Location`
2. **Descriptive names** - `install_method`, not `method` or `im`
3. **Consistent units** - Always specify units in name (`seconds`, `percent`)
4. **Boolean naming** - Use `is_*` or `has_*` prefix (`is_returning_visitor`)

### Data Types
- **string**: Text values (use quotes in examples)
- **number**: Numeric values (integers or floats)
- **boolean**: true/false values
- **timestamp**: ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)

### Common Property Patterns

**Location properties** (where something happened):
- `cta_location`, `link_location`, `share_location`, `cta_position`

**Identification properties** (what was interacted with):
- `post_slug`, `post_title`, `cta_text`, `cta_type`

**Attribution properties** (how user arrived):
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

**Metadata properties** (additional context):
- `platform`, `install_method`, `destination_url`, `post_category`

---

## Implementation Notes

### GA4 Setup
- Measurement ID: `G-6733RPZ8RN`
- Enhanced measurement enabled (scroll, outbound clicks, file downloads)
- Events sent via gtag.js

### UTM Parameters
- Always preserve UTM parameters from page URL
- Include in all custom events for attribution tracking
- See `docs/analytics/UTM-SCHEMA.md` for UTM conventions (TASK-4)

### Event Batching
- GA4 automatically batches events
- No manual batching required
- Events appear in DebugView within seconds
- Full reports update within 24-48 hours

### Privacy Considerations
- Never track PII (email, name, IP address)
- All events are anonymous by default
- No session recording at this time
- GDPR-compliant (no personal data collected)

---

## Next Steps

1. **Implement events in code** (TASK-5, TASK-7)
   - Add event tracking to landing page CTAs
   - Add event tracking to blog posts
   - Create helper functions in `analytics.ts`

2. **Test in GA4 DebugView**
   - Verify all events fire correctly
   - Confirm properties are populated
   - Check UTM parameter preservation

3. **Monitor in production**
   - Check GA4 Real-time reports
   - Review event counts daily
   - Validate data quality weekly

---

**Status:** Complete
**Created:** 2026-01-08 (EPIC-010 Sprint 1, TASK-3)
**Related Documents:**
- Sprint plan: `docs/sprints/SPRINT-2026-01-epic010-sprint1-analytics-foundation.md`
- UTM schema: `docs/analytics/UTM-SCHEMA.md` (to be created in TASK-4)
- Epic overview: `docs/epics/EPIC-010-mvp-marketing-strategy.md`
