# Conversion Funnel Visualization

## Overview

This document describes the conversion funnel for ginko's website, tracking the user journey from landing page to first CLI session.

## Funnel Stages

| Stage | Event | Description |
|-------|-------|-------------|
| 1 | `page_view` (landing) | User lands on ginkoai.com |
| 2 | `cta_click` | User clicks hero CTA (Install CLI / Get Started) |
| 3 | `page_view` (get-started) | User views install instructions page |
| 4 | `install_initiated` | User copies install command |
| 5 | `install_complete`* | CLI successfully installed |
| 6 | `first_session`* | User runs `ginko start` for the first time |

*Stages 5-6 require CLI-side telemetry (opt-in).

## Current Event Tracking

### Website Events (GA4)

Events tracked via `js/analytics.js`:

```javascript
// CTA clicks (any location)
gtag('event', 'cta_click', {
  cta_location: 'hero|nav|pricing|final-cta|blog-post',
  cta_text: 'Install CLI|Get Started|Start Pro Trial',
  destination_url: string
});

// Install command copied
gtag('event', 'install_initiated', {
  install_method: 'npm|brew|curl',
  cta_location: 'hero|get-started|blog-post',
  platform: 'macos|windows|linux'
});

// Blog post engagement
gtag('event', 'blog_view', { post_slug, post_title });
gtag('event', 'blog_read_time', { seconds, scroll_depth_percent });
gtag('event', 'blog_cta_click', { cta_type, destination, post_slug });
```

### UTM Parameter Tracking

All events include UTM parameters when present:
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`

See [UTM-SCHEMA.md](./UTM-SCHEMA.md) for campaign naming conventions.

## Setting Up Funnel in GA4

### Step 1: Create Exploration

1. Go to GA4 > Explore > Create new exploration
2. Select "Funnel exploration" template

### Step 2: Configure Funnel Steps

Add these steps in order:

1. **Landing Page View**
   - Event: `page_view`
   - Condition: `page_location` contains `ginkoai.com` (not `/blog/`)

2. **CTA Click**
   - Event: `cta_click`
   - Condition: `cta_location` = `hero` OR `cta_location` = `nav`

3. **Get Started Page View**
   - Event: `page_view`
   - Condition: `page_location` contains `get-started`

4. **Install Command Copied**
   - Event: `install_initiated`

### Step 3: Set Time Window

- Set funnel completion window to **7 days** (users may install later)
- Enable "Open funnel" to see drop-offs at each stage

### Step 4: Add Segments

Create segments for analysis:
- Traffic source (organic, paid, social, referral)
- Device type (desktop, mobile)
- Campaign (utm_campaign)

## Key Metrics to Monitor

### Conversion Rates

| Metric | Target | Calculation |
|--------|--------|-------------|
| Landing → CTA Click | >5% | CTA clicks / page views |
| CTA → Get Started | >70% | Get started views / CTA clicks |
| Get Started → Install | >30% | Install initiated / get started views |
| Overall Funnel | >1% | Install initiated / landing page views |

### Drop-off Analysis

Monitor where users abandon:
- **High bounce on landing**: Messaging not resonating
- **Low CTA click rate**: CTA not compelling or visible
- **Drop-off at get-started**: Install process too complex
- **Low install copy rate**: Trust issue or friction

## Weekly Review Checklist

- [ ] Check funnel conversion rate trends
- [ ] Identify highest drop-off stage
- [ ] Compare A/B test variant performance
- [ ] Review UTM campaign performance
- [ ] Check mobile vs desktop conversion
- [ ] Export data for team review

## Future Enhancements

### CLI Telemetry (Opt-in)

When CLI telemetry is implemented:

```bash
# On first install
ginko_install_complete {
  install_method,
  platform,
  cli_version
}

# On first session
ginko_first_session {
  install_date,
  days_to_first_session,
  project_type
}
```

### PostHog Integration

PostHog can provide:
- Session recordings of funnel journeys
- Feature flag integration with A/B tests
- Cohort analysis by install date
- Retention tracking

## Related Documentation

- [EVENT-TAXONOMY.md](./EVENT-TAXONOMY.md) - Complete event naming conventions
- [UTM-SCHEMA.md](./UTM-SCHEMA.md) - Campaign tracking parameters
- Sprint: EPIC-010 Sprint 2 - TASK-9

---

*Last updated: 2026-01-12*
