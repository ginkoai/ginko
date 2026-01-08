# UTM Tracking Schema - ginkoai.com

**Version:** 1.0
**Last Updated:** 2026-01-08
**Purpose:** Standardized UTM parameter schema for marketing attribution across all channels

## Overview

This document defines the UTM (Urchin Tracking Module) parameter conventions for tracking marketing campaigns on ginkoai.com. Consistent UTM usage enables accurate attribution analysis in Google Analytics 4.

**Key Benefits:**
- Track which channels drive traffic and conversions
- Measure campaign effectiveness
- Optimize marketing spend based on data
- Attribute installs to specific posts/threads/videos

---

## UTM Parameter Structure

### The 5 UTM Parameters

| Parameter | Purpose | Required | Example Values |
|-----------|---------|----------|----------------|
| `utm_source` | Where traffic originates | **Yes** | `reddit`, `twitter`, `linkedin`, `youtube` |
| `utm_medium` | Category of traffic | **Yes** | `organic-social`, `cpc`, `referral`, `email` |
| `utm_campaign` | Specific campaign/initiative | **Yes** | `mvp-launch`, `blog-post-001`, `tutorial-video` |
| `utm_content` | Variant/specific element | No | `headline-a`, `cta-button`, `comment-123` |
| `utm_term` | Paid search keyword | No | `context-management`, `ai-development` |

### Parameter Naming Rules

**General:**
- Use lowercase only
- Use hyphens for multi-word values (not underscores or spaces)
- Be concise but descriptive (3-20 characters ideal)
- Be consistent across campaigns

**Examples:**
- ✅ `utm_source=reddit`
- ✅ `utm_campaign=mvp-launch`
- ✅ `utm_content=r-programming-post-001`
- ❌ `utm_source=Reddit` (avoid capitals)
- ❌ `utm_campaign=MVP_Launch` (use hyphens, not underscores)
- ❌ `utm_content=Post in r/programming on Jan 8` (too long, has spaces)

---

## Platform-Specific Standards

### Reddit (`utm_source=reddit`)

**Structure:**
```
https://ginkoai.com?utm_source=reddit&utm_medium=organic-social&utm_campaign={campaign}&utm_content={subreddit-post-id}
```

**utm_medium values:**
- `organic-social` - Organic posts and comments
- `cpc` - Paid Reddit ads

**utm_campaign naming:**
- `mvp-launch` - MVP launch promotion
- `blog-post-{slug}` - Blog post promotion (e.g., `blog-post-ai-dev-chaos`)
- `tutorial-{topic}` - Tutorial/how-to content
- `discussion-{topic}` - Discussion threads

**utm_content naming:**
- `r-{subreddit}-{post-number}` - Post identifier
  - Examples: `r-programming-001`, `r-webdev-002`, `r-devtools-003`
- `comment-{thread-id}` - Comment in existing thread
  - Example: `comment-abc123`

**Examples:**
```
# Launch post in r/programming
https://ginkoai.com?utm_source=reddit&utm_medium=organic-social&utm_campaign=mvp-launch&utm_content=r-programming-001

# Blog post link in r/webdev
https://ginkoai.com/blog/ai-development-without-chaos?utm_source=reddit&utm_medium=organic-social&utm_campaign=blog-post-ai-dev-chaos&utm_content=r-webdev-001

# Comment in r/devtools discussion
https://ginkoai.com?utm_source=reddit&utm_medium=organic-social&utm_campaign=discussion-context-tools&utm_content=r-devtools-comment-001
```

---

### Twitter/X.com (`utm_source=twitter`)

**Structure:**
```
https://ginkoai.com?utm_source=twitter&utm_medium=organic-social&utm_campaign={campaign}&utm_content={tweet-type}
```

**utm_medium values:**
- `organic-social` - Organic tweets and threads
- `cpc` - Paid Twitter/X ads

**utm_campaign naming:**
- `mvp-launch` - MVP launch tweets
- `blog-post-{slug}` - Blog post promotion
- `thread-{topic}` - Tweet threads
- `tutorial-{topic}` - Tutorial content

**utm_content naming:**
- `thread-001`, `thread-002` - Thread number
- `single-tweet-001` - Single tweet
- `reply-001` - Reply to popular tweet
- `quote-tweet-001` - Quote tweet

**Examples:**
```
# Launch thread
https://ginkoai.com?utm_source=twitter&utm_medium=organic-social&utm_campaign=mvp-launch&utm_content=thread-001

# Blog post promotion tweet
https://ginkoai.com/blog/patterns-and-gotchas?utm_source=twitter&utm_medium=organic-social&utm_campaign=blog-post-patterns&utm_content=single-tweet-001

# Tutorial thread
https://ginkoai.com?utm_source=twitter&utm_medium=organic-social&utm_campaign=tutorial-getting-started&utm_content=thread-001
```

---

### LinkedIn (`utm_source=linkedin`)

**Structure:**
```
https://ginkoai.com?utm_source=linkedin&utm_medium=organic-social&utm_campaign={campaign}&utm_content={post-type}
```

**utm_medium values:**
- `organic-social` - Organic LinkedIn posts
- `cpc` - Paid LinkedIn ads
- `sponsored` - Sponsored content

**utm_campaign naming:**
- `mvp-launch` - MVP announcement
- `blog-post-{slug}` - Blog post sharing
- `company-update-{topic}` - Company news
- `thought-leadership-{topic}` - Industry insights

**utm_content naming:**
- `post-001`, `post-002` - Post number
- `article-001` - LinkedIn article
- `carousel-001` - Carousel post
- `video-001` - Video post

**Examples:**
```
# MVP launch post
https://ginkoai.com?utm_source=linkedin&utm_medium=organic-social&utm_campaign=mvp-launch&utm_content=post-001

# Blog article share
https://ginkoai.com/blog/measuring-ai-collaboration-roi?utm_source=linkedin&utm_medium=organic-social&utm_campaign=blog-post-roi&utm_content=post-001

# Thought leadership post
https://ginkoai.com?utm_source=linkedin&utm_medium=organic-social&utm_campaign=thought-leadership-ai-context&utm_content=carousel-001
```

---

### YouTube (`utm_source=youtube`)

**Structure:**
```
https://ginkoai.com?utm_source=youtube&utm_medium=video&utm_campaign={campaign}&utm_content={video-location}
```

**utm_medium values:**
- `video` - YouTube videos (organic)
- `cpc` - YouTube ads

**utm_campaign naming:**
- `tutorial-{topic}` - Tutorial videos
- `demo-{feature}` - Feature demonstrations
- `explainer-{topic}` - Explainer videos
- `mvp-launch` - Launch video

**utm_content naming:**
- `description` - Link in video description
- `pinned-comment` - Pinned comment
- `card-001` - YouTube card
- `end-screen` - End screen element

**Examples:**
```
# Tutorial video description link
https://ginkoai.com?utm_source=youtube&utm_medium=video&utm_campaign=tutorial-getting-started&utm_content=description

# Demo video with card
https://ginkoai.com?utm_source=youtube&utm_medium=video&utm_campaign=demo-context-loading&utm_content=card-001

# Launch video pinned comment
https://ginkoai.com?utm_source=youtube&utm_medium=video&utm_campaign=mvp-launch&utm_content=pinned-comment
```

---

### Discord (`utm_source=discord`)

**Structure:**
```
https://ginkoai.com?utm_source=discord&utm_medium=referral&utm_campaign={campaign}&utm_content={channel}
```

**utm_medium values:**
- `referral` - Links shared in Discord
- `community` - Community-driven sharing

**utm_campaign naming:**
- `server-invite` - Discord server invitation
- `announcement-{topic}` - Server announcements
- `community-help` - Help/support interactions

**utm_content naming:**
- `channel-{name}` - Channel name
  - Examples: `channel-general`, `channel-support`, `channel-announcements`
- `dm` - Direct message link
- `welcome-message` - Automated welcome

**Examples:**
```
# Link in #general channel
https://ginkoai.com?utm_source=discord&utm_medium=referral&utm_campaign=community-discussion&utm_content=channel-general

# Announcement in #announcements
https://ginkoai.com?utm_source=discord&utm_medium=referral&utm_campaign=announcement-new-feature&utm_content=channel-announcements

# Welcome message link
https://ginkoai.com?utm_source=discord&utm_medium=referral&utm_campaign=server-invite&utm_content=welcome-message
```

---

### Email (`utm_source=email`)

**Structure:**
```
https://ginkoai.com?utm_source=email&utm_medium=email&utm_campaign={campaign}&utm_content={element}
```

**utm_medium values:**
- `email` - Email campaigns

**utm_campaign naming:**
- `newsletter-{date}` - Newsletter (e.g., `newsletter-2026-01`)
- `onboarding-{step}` - Onboarding sequence
- `product-update-{version}` - Product updates
- `announcement-{topic}` - Special announcements

**utm_content naming:**
- `header-cta` - Header button/link
- `body-link-001` - Link in email body
- `footer-link` - Footer link
- `hero-image` - Hero image link

**Examples:**
```
# Newsletter CTA
https://ginkoai.com?utm_source=email&utm_medium=email&utm_campaign=newsletter-2026-01&utm_content=header-cta

# Onboarding email link
https://ginkoai.com/get-started?utm_source=email&utm_medium=email&utm_campaign=onboarding-step-1&utm_content=body-link-001

# Product update announcement
https://ginkoai.com?utm_source=email&utm_medium=email&utm_campaign=product-update-v2&utm_content=hero-image
```

---

### Direct/Referral Traffic (`utm_source=direct` or `utm_source={domain}`)

**Direct Traffic (No UTM):**
- Users typing URL directly
- Bookmarks
- Links without UTM parameters
- Shows as "(direct)" in GA4

**Referral Traffic (Automatic):**
- GA4 automatically tracks referrer domain
- Shows as domain name (e.g., `github.com`, `hackernews.com`)
- No UTM parameters needed for basic referral tracking

**When to Add UTM to Referrals:**
Use UTM parameters on links you control on other sites:
```
# Link in GitHub README
https://ginkoai.com?utm_source=github&utm_medium=referral&utm_campaign=readme&utm_content=installation-section

# Link on personal blog
https://ginkoai.com?utm_source=personal-blog&utm_medium=referral&utm_campaign=blog-mention&utm_content=john-doe-blog
```

---

## URL Builder Template

### Manual URL Builder Formula

```
Base URL + ? + utm_source={source} + & + utm_medium={medium} + & + utm_campaign={campaign} + & + utm_content={content}
```

### Spreadsheet Template

Create a Google Sheet with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| **Base URL** | Landing page URL | `https://ginkoai.com` |
| **utm_source** | Traffic source | `reddit` |
| **utm_medium** | Traffic medium | `organic-social` |
| **utm_campaign** | Campaign name | `mvp-launch` |
| **utm_content** | Content variant | `r-programming-001` |
| **utm_term** | (Optional) Keyword | - |
| **Full URL** | Generated link | `=A2&"?"&"utm_source="&B2&"&utm_medium="&C2&"&utm_campaign="&D2&"&utm_content="&E2` |

**Google Sheets Formula (Column G):**
```excel
=A2&"?"&"utm_source="&B2&"&utm_medium="&C2&"&utm_campaign="&D2&IF(E2<>"","&utm_content="&E2,"")&IF(F2<>"","&utm_term="&F2,"")
```

### Online Tools

**Recommended:**
- Google Campaign URL Builder: https://ga-dev-tools.google/campaign-url-builder/
- Ensures proper URL encoding
- Validates parameter format

**Usage:**
1. Enter website URL
2. Fill in campaign parameters
3. Copy generated URL
4. Test in browser before sharing

---

## GA4 Channel Grouping

### Default Channel Groups (GA4 Automatic)

GA4 automatically groups traffic based on source/medium:

| Channel | Rules | Examples |
|---------|-------|----------|
| **Organic Social** | `medium = organic-social` | Reddit, Twitter, LinkedIn organic posts |
| **Paid Social** | `medium = cpc OR medium = paid-social` AND `source = (social platform)` | Reddit ads, Twitter ads |
| **Organic Search** | `medium = organic` | Google, Bing search results |
| **Paid Search** | `medium = cpc OR medium = ppc` AND `source = (search engine)` | Google Ads, Bing Ads |
| **Email** | `medium = email` | Email campaigns |
| **Referral** | `medium = referral` | Links from other websites |
| **Direct** | `source = (direct)` | Direct traffic, bookmarks |
| **Video** | `medium = video` | YouTube videos |

### Custom Channel Grouping

For more granular analysis, create custom channel groups in GA4:

**Step 1: Navigate to Admin → Data Display → Channel Groups**

**Step 2: Create Custom Group**

Example custom channels:

| Custom Channel | Condition | Purpose |
|----------------|-----------|---------|
| **Reddit Organic** | `source = reddit AND medium = organic-social` | Track Reddit-specific performance |
| **Twitter Organic** | `source = twitter AND medium = organic-social` | Track Twitter/X performance |
| **LinkedIn Organic** | `source = linkedin AND medium = organic-social` | Track LinkedIn performance |
| **YouTube** | `source = youtube AND medium = video` | Track YouTube traffic |
| **Discord Community** | `source = discord` | Track Discord referrals |
| **Blog Promotion** | `campaign CONTAINS blog-post` | Track all blog post campaigns |
| **MVP Launch** | `campaign = mvp-launch` | Track launch campaign across all channels |

**Step 3: Set Priority Order**

Channel evaluation order (top to bottom):
1. Paid Search
2. Paid Social
3. Organic Social (by platform)
4. Email
5. Video
6. Organic Search
7. Referral
8. Direct

---

## Campaign Naming Conventions

### Campaign Types

| Campaign Type | Pattern | Examples |
|---------------|---------|----------|
| **Launch** | `mvp-launch` | MVP release announcement |
| **Blog Post** | `blog-post-{slug}` | `blog-post-ai-dev-chaos`, `blog-post-patterns` |
| **Tutorial** | `tutorial-{topic}` | `tutorial-getting-started`, `tutorial-sessions` |
| **Discussion** | `discussion-{topic}` | `discussion-context-tools`, `discussion-ai-workflow` |
| **Product Update** | `product-update-{version}` | `product-update-v2`, `product-update-sessions` |
| **Feature Demo** | `demo-{feature}` | `demo-context-loading`, `demo-team-collab` |
| **Newsletter** | `newsletter-{date}` | `newsletter-2026-01`, `newsletter-2026-02` |

### Version Control

Track campaign iterations:
- First attempt: `mvp-launch`
- Second iteration: `mvp-launch-v2`
- A/B test variants: `mvp-launch-headline-a`, `mvp-launch-headline-b`

---

## Testing & Validation

### Pre-Launch Checklist

Before sharing any UTM link:

- [ ] **URL Encoding**: Ensure special characters are encoded
- [ ] **Parameter Values**: Verify lowercase, hyphens (not spaces/underscores)
- [ ] **Required Parameters**: Include source, medium, campaign (minimum)
- [ ] **Link Works**: Test in browser before sharing
- [ ] **GA4 Tracking**: Verify link appears in GA4 Real-time report
- [ ] **Spreadsheet Logged**: Add to UTM tracking sheet

### How to Test UTM Links

**Method 1: Real-time Reports**
1. Open GA4 → Reports → Real-time
2. Click your UTM link in incognito window
3. Check "Traffic acquisition" card in Real-time
4. Verify source/medium/campaign appear correctly

**Method 2: DebugView (Chrome Extension)**
1. Install GA Debugger Chrome extension
2. Enable debugger
3. Click your UTM link
4. Check console for `page_view` event
5. Verify UTM parameters in event properties

**Method 3: Browser Network Tab**
1. Open DevTools → Network tab
2. Filter by "google-analytics" or "collect"
3. Click your UTM link
4. Inspect network request
5. Verify UTM parameters in query string

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| UTMs not appearing | Ad blockers | Test in incognito with extensions disabled |
| Mixed case values | Inconsistent naming | Use lowercase only |
| Spaces in parameters | Not URL encoded | Replace spaces with hyphens |
| Missing parameters | Incomplete URL | Include source, medium, campaign minimum |
| Wrong channel grouping | Incorrect medium value | Use standard medium values from this doc |

---

## Best Practices

### Do's ✅

- **Be consistent**: Use the same naming conventions every time
- **Be specific**: `r-programming-001` is better than `reddit-post-1`
- **Document everything**: Keep a spreadsheet of all UTM links
- **Test before sharing**: Always test links in GA4 before posting
- **Use lowercase**: Avoid capitalization inconsistencies
- **Track variants**: Use `utm_content` to A/B test different headlines/CTAs
- **Review weekly**: Check which campaigns are working in GA4

### Don'ts ❌

- **Don't use capitals**: `Reddit` vs `reddit` creates separate sources
- **Don't use spaces**: Replace with hyphens (`mvp-launch` not `mvp launch`)
- **Don't skip testing**: Broken UTM links = lost attribution data
- **Don't over-complicate**: Keep campaign names short and descriptive
- **Don't reuse content IDs**: Each post should have unique `utm_content`
- **Don't mix conventions**: Pick one pattern and stick to it
- **Don't forget to log**: Track all links in spreadsheet for reference

---

## UTM Link Examples by Use Case

### MVP Launch Campaign

**Reddit Launch Post:**
```
https://ginkoai.com?utm_source=reddit&utm_medium=organic-social&utm_campaign=mvp-launch&utm_content=r-programming-001
```

**Twitter Launch Thread:**
```
https://ginkoai.com?utm_source=twitter&utm_medium=organic-social&utm_campaign=mvp-launch&utm_content=thread-001
```

**LinkedIn Launch Post:**
```
https://ginkoai.com?utm_source=linkedin&utm_medium=organic-social&utm_campaign=mvp-launch&utm_content=post-001
```

### Blog Post Promotion

**Blog Post on Reddit:**
```
https://ginkoai.com/blog/ai-development-without-chaos?utm_source=reddit&utm_medium=organic-social&utm_campaign=blog-post-ai-dev-chaos&utm_content=r-webdev-001
```

**Blog Post on Twitter:**
```
https://ginkoai.com/blog/ai-development-without-chaos?utm_source=twitter&utm_medium=organic-social&utm_campaign=blog-post-ai-dev-chaos&utm_content=single-tweet-001
```

**Blog Post in Newsletter:**
```
https://ginkoai.com/blog/ai-development-without-chaos?utm_source=email&utm_medium=email&utm_campaign=newsletter-2026-01&utm_content=featured-post
```

### Tutorial Content

**YouTube Tutorial:**
```
https://ginkoai.com/get-started?utm_source=youtube&utm_medium=video&utm_campaign=tutorial-getting-started&utm_content=description
```

**Reddit Tutorial Post:**
```
https://ginkoai.com/get-started?utm_source=reddit&utm_medium=organic-social&utm_campaign=tutorial-getting-started&utm_content=r-learnprogramming-001
```

---

## Reporting & Analysis

### Key GA4 Reports

**Traffic Acquisition Report:**
- Path: Reports → Acquisition → Traffic acquisition
- Shows: Sessions by source/medium/campaign
- Use: Identify which channels drive most traffic

**Campaign Performance Report:**
- Path: Reports → Acquisition → User acquisition
- Shows: New users by campaign
- Use: Measure campaign effectiveness

**Engagement Report:**
- Path: Reports → Engagement → Pages and screens
- Filter by: Campaign parameter
- Use: See which campaigns drive engagement

### Custom Explorations

Create custom explorations in GA4:

**Campaign ROI Analysis:**
- Dimension: Campaign name
- Metrics: Users, Sessions, Conversions (installs)
- Filter: Date range for campaign period

**Channel Comparison:**
- Dimension: Source/Medium
- Metrics: Engagement rate, Bounce rate, Avg session duration
- Comparison: Week over week

**Content Variant Testing:**
- Dimension: utm_content
- Metrics: Click-through rate, Conversion rate
- Segment: By campaign
- Use: A/B test headlines, CTAs, post formats

---

## Maintenance & Updates

### Weekly Tasks
- [ ] Review top campaigns in GA4
- [ ] Check for UTM typos or inconsistencies
- [ ] Update UTM tracking spreadsheet with new links
- [ ] Archive old/completed campaigns

### Monthly Tasks
- [ ] Analyze campaign performance trends
- [ ] Identify best-performing channels
- [ ] Retire underperforming campaign patterns
- [ ] Update this document with new conventions

### Quarterly Tasks
- [ ] Review and update channel grouping rules
- [ ] Audit all active UTM links for consistency
- [ ] Document lessons learned from campaigns
- [ ] Update URL builder template if needed

---

## Reference Files

**Related Documentation:**
- Event Taxonomy: `docs/analytics/EVENT-TAXONOMY.md`
- Sprint Plan: `docs/sprints/SPRINT-2026-01-epic010-sprint1-analytics-foundation.md`
- Epic Overview: `docs/epics/EPIC-010-mvp-marketing-strategy.md`

**External Resources:**
- GA4 Campaign URL Builder: https://ga-dev-tools.google/campaign-url-builder/
- GA4 Documentation: https://support.google.com/analytics/answer/10917952
- UTM Best Practices: https://support.google.com/analytics/answer/1033863

---

**Status:** Complete
**Created:** 2026-01-08 (EPIC-010 Sprint 1, TASK-4)
**Next Steps:** Implement landing page event tracking (TASK-5) using these UTM conventions
