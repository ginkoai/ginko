# GA4 Event Tracking Testing Guide

## Overview

This document provides testing instructions for verifying GA4 event tracking on ginkoai.com.

**GA4 Property:** G-6733RPZ8RN
**Events Implemented:** 9 total (5 landing page + 4 blog events)
**Testing Methods:** Real-time reports, DebugView, Browser DevTools

---

## Prerequisites

1. **Install GA Debugger (Chrome Extension)**
   - https://chrome.google.com/webstore/detail/google-analytics-debugger/
   - Enable the extension before testing

2. **Access to GA4**
   - Login to https://analytics.google.com
   - Select property G-6733RPZ8RN
   - Navigate to Reports → Realtime

3. **Test Environment**
   - Use incognito/private window to avoid ad blockers
   - Disable browser extensions (except GA Debugger)
   - Test on https://ginkoai.com (production)

---

## Testing Checklist - Landing Page Events

### 1. `cta_click` Event (7 CTAs)

**Test locations:**
- [ ] **Nav:** Click "Get Started" button in navigation
  - Expected: `cta_location: 'nav'`, `cta_text: 'Get Started'`

- [ ] **Hero:** Click "Get Started" button in hero section
  - Expected: `cta_location: 'hero'`, `cta_text: 'Get Started'`

- [ ] **Pricing Free:** Click "Get Started" in Free plan
  - Expected: `cta_location: 'pricing-free'`, `cta_text: 'Get Started'`

- [ ] **Pricing Pro:** Click "Start Pro Trial" in Pro plan
  - Expected: `cta_location: 'pricing-pro'`, `cta_text: 'Start Pro Trial'`

- [ ] **Final CTA:** Click "Get Started Free" button
  - Expected: `cta_location: 'final-cta'`, `cta_text: 'Get Started Free'`

**Verification:**
```javascript
// Check browser console for:
Event tracked: cta_click {
  cta_location: "hero",
  cta_text: "Get Started",
  destination_url: "https://app.ginkoai.com/auth/signup"
}
```

---

### 2. `install_initiated` Event (2 locations)

**Test locations:**
- [ ] **Hero:** Click copy button on `npm install -g @ginkoai/cli`
  - Expected: `install_method: 'npm'`, `cta_location: 'hero'`, `platform: 'macos'/'windows'/'linux'`

- [ ] **Final CTA:** Click copy button in final CTA section
  - Expected: `install_method: 'npm'`, `cta_location: 'final-cta'`

**Verification:**
```javascript
// Check browser console for:
Event tracked: install_initiated {
  install_method: "npm",
  cta_location: "hero",
  platform: "macos"
}
```

---

### 3. `docs_link_click` Event (5 locations)

**Test locations:**
- [ ] **Nav:** Click "Docs" in navigation
  - Expected: `link_location: 'nav'`

- [ ] **Hero:** Click "View Docs" button
  - Expected: `link_location: 'hero'`

- [ ] **Final CTA:** Click "Read the Docs" button
  - Expected: `link_location: 'final-cta'`

- [ ] **Footer Product:** Click "Documentation" in footer
  - Expected: `link_location: 'footer'`

- [ ] **Footer Resources:** Click "Getting Started" or "API Reference"
  - Expected: `link_location: 'footer'`

**Verification:**
```javascript
// Check browser console for:
Event tracked: docs_link_click {
  link_location: "nav",
  destination_url: "https://docs.ginko.ai"
}
```

---

### 4. `github_link_click` Event (2 locations)

**Test locations:**
- [ ] **Footer Product:** Click "GitHub" link
  - Expected: `link_location: 'footer'`, `destination_url: 'https://github.com/ginkoai'`

- [ ] **Footer Resources:** Click "Examples" link
  - Expected: `link_location: 'footer'`, `destination_url: 'https://github.com/ginkoai/examples'`

**Verification:**
```javascript
// Check browser console for:
Event tracked: github_link_click {
  link_location: "footer",
  destination_url: "https://github.com/ginkoai"
}
```

---

## Testing with UTM Parameters

Test that UTM parameters are automatically included in events:

1. **Visit page with UTM parameters:**
   ```
   https://ginkoai.com?utm_source=reddit&utm_medium=organic-social&utm_campaign=mvp-launch&utm_content=r-programming-001
   ```

2. **Click any tracked element** (CTA, docs link, GitHub link, install button)

3. **Verify UTM parameters in event:**
   ```javascript
   Event tracked: cta_click {
     cta_location: "hero",
     cta_text: "Get Started",
     destination_url: "https://app.ginkoai.com/auth/signup",
     utm_source: "reddit",
     utm_medium: "organic-social",
     utm_campaign: "mvp-launch",
     utm_content: "r-programming-001"
   }
   ```

---

## Testing Methods

### Method 1: Browser Console (Fastest)

1. Open https://ginkoai.com
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to **Console** tab
4. Click any tracked element
5. Look for `Event tracked:` messages

**Pros:** Immediate feedback, see all properties
**Cons:** Only shows events you trigger

---

### Method 2: GA4 Real-time Reports

1. Open https://analytics.google.com
2. Select property G-6733RPZ8RN
3. Navigate to **Reports → Realtime**
4. In another tab, open https://ginkoai.com
5. Click tracked elements
6. Watch for events appearing in Real-time report (~5-10 second delay)

**Pros:** Confirms events reach GA4
**Cons:** 5-10 second delay, less detail

---

### Method 3: GA4 DebugView

1. Install GA Debugger Chrome extension
2. Enable extension (icon should turn blue)
3. Open https://ginkoai.com
4. Open GA4: Reports → Admin → DebugView
5. Click tracked elements
6. Watch events appear in DebugView with full properties

**Pros:** Full event details, confirms GA4 receipt
**Cons:** Requires extension, only works for your session

---

### Method 4: Network Tab (Technical)

1. Open https://ginkoai.com
2. Open DevTools (F12)
3. Go to **Network** tab
4. Filter by `collect` or `google-analytics`
5. Click tracked element
6. Inspect network request to see event data

**Pros:** See exactly what's sent to GA4
**Cons:** Technical, harder to read

---

## Common Issues & Troubleshooting

### Events not appearing in console

**Possible causes:**
- JavaScript not loaded: Check for `analytics.js` in Network tab
- Console errors: Check for errors in Console tab
- gtag not loaded: Verify GA4 script is in `<head>`

**Solution:**
- Hard refresh page (Cmd+Shift+R or Ctrl+Shift+R)
- Check browser console for errors
- Verify `analytics.js` loaded successfully

---

### Events not reaching GA4

**Possible causes:**
- Ad blockers: Disable ad blockers and extensions
- Privacy settings: Some browsers block analytics
- Network issues: Check Network tab for failed requests

**Solution:**
- Test in incognito window
- Disable browser extensions temporarily
- Check for firewall/privacy software blocking requests

---

### UTM parameters not included

**Possible causes:**
- Visited page without UTM parameters first
- UTM parameters stripped by browser/extension
- Hard refresh cleared parameters

**Solution:**
- Always test with full UTM URL
- Copy/paste URL with parameters directly
- Don't navigate from non-UTM page

---

## Success Criteria

✅ **Landing Page Events Complete When:**
- All 7 CTA clicks tracked with correct `cta_location`
- 2 install initiated events tracked with `install_method` and `platform`
- 5 docs link clicks tracked with correct `link_location`
- 2 GitHub link clicks tracked with correct destination URLs
- UTM parameters included when present in URL
- Events visible in GA4 Real-time reports
- No console errors

---

## Next Steps

After completing landing page event testing:

1. **TASK-7:** Implement blog analytics tracking
   - `blog_view` on page load
   - `blog_read_time` at time thresholds
   - `blog_cta_click` for blog CTAs
   - `blog_share` for social sharing

2. **Production Validation:**
   - Test on live site (ginkoai.com)
   - Monitor GA4 for 24-48 hours
   - Check event counts in GA4 reports
   - Validate data quality

3. **Documentation:**
   - Update EVENT-TAXONOMY.md if needed
   - Document any implementation notes
   - Share testing guide with team

---

## Reference Files

- Event taxonomy: `docs/analytics/EVENT-TAXONOMY.md`
- UTM schema: `docs/analytics/UTM-SCHEMA.md`
- Analytics helper: `website/js/analytics.js`
- Sprint plan: `docs/sprints/SPRINT-2026-01-epic010-sprint1-analytics-foundation.md`

---

**Last Updated:** 2026-01-09
**Status:** Ready for testing
**GA4 Property:** G-6733RPZ8RN
