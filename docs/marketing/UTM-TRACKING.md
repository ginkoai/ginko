# UTM Tracking Guide

## Overview

This document defines our UTM parameter conventions for tracking marketing attribution across all platforms. Consistent UTM usage enables accurate channel performance analysis in Google Analytics.

---

## UTM Parameter Reference

| Parameter | Purpose | Required |
|-----------|---------|----------|
| `utm_source` | Traffic source (platform) | Yes |
| `utm_medium` | Marketing medium type | Yes |
| `utm_campaign` | Campaign name | Yes |
| `utm_content` | Content identifier | Recommended |
| `utm_term` | Paid search keywords | Paid only |

---

## Standard Values

### utm_source (Platform)

| Platform | Value |
|----------|-------|
| X.com (Twitter) | `twitter` |
| Reddit | `reddit` |
| LinkedIn | `linkedin` |
| YouTube | `youtube` |
| Discord | `discord` |
| GitHub | `github` |
| Email | `email` |
| Direct/QR | `direct` |

### utm_medium (Type)

| Type | Value | Use For |
|------|-------|---------|
| Organic social | `organic-social` | Unpaid posts, threads, comments |
| Video | `video` | YouTube videos, embedded clips |
| Referral | `referral` | Links from other sites |
| Email | `email` | Newsletter, notifications |
| Paid social | `paid-social` | Paid ads (future) |

### utm_campaign (Campaign)

| Campaign | Value | Description |
|----------|-------|-------------|
| Sprint 3 Content | `sprint3-content` | Current content push (Jan 2026) |
| MVP Launch | `mvp-launch` | General launch campaign |
| Blog Promo | `blog-{slug}` | Specific blog post promotion |

---

## URL Builder

### Template

```
https://ginkoai.com/{page}?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}&utm_content={content}
```

### Quick Reference by Platform

#### X.com (Twitter)

```
?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content={type}-{topic}
```

**Examples:**
| Content Type | utm_content Value |
|--------------|-------------------|
| Blog thread (post 1) | `thread-ai-amnesia` |
| Blog thread (post 6) | `thread-6-week-estimate` |
| Tip post | `tip-context-logging` |
| Feature spotlight | `feature-session-start` |
| Founder post | `founder-building-update` |

#### Reddit

```
?utm_source=reddit&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=r-{subreddit}-{type}
```

**Examples:**
| Subreddit | Post Type | utm_content Value |
|-----------|-----------|-------------------|
| r/ExperiencedDevs | Discussion | `r-experienceddevs-discussion` |
| r/programming | Showcase | `r-programming-showcase` |
| r/ChatGPTCoding | Comment | `r-chatgptcoding-comment` |
| r/commandline | Tool share | `r-commandline-tool` |

#### LinkedIn

```
?utm_source=linkedin&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content={type}-{topic}
```

**Examples:**
| Content Type | utm_content Value |
|--------------|-------------------|
| Leadership post | `post-ai-chaos` |
| ROI post | `post-measuring-roi` |
| Blog share | `share-6-week-estimate` |

#### YouTube

```
?utm_source=youtube&utm_medium=video&utm_campaign=sprint3-content&utm_content={type}-{topic}
```

**Examples:**
| Content Type | utm_content Value |
|--------------|-------------------|
| Tutorial video | `tutorial-session-start` |
| Short | `short-30-seconds` |
| Demo | `demo-team-context` |

#### Discord

```
?utm_source=discord&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content={channel}-{type}
```

---

## Pre-Generated Links

### Landing Page Links

| Platform | Use Case | Full URL |
|----------|----------|----------|
| X.com thread | Blog post 6 | `https://ginkoai.com?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=thread-6-week-estimate` |
| X.com tip | General tip | `https://ginkoai.com?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=tip-general` |
| Reddit showcase | r/programming | `https://ginkoai.com?utm_source=reddit&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=r-programming-showcase` |
| LinkedIn | Leadership post | `https://ginkoai.com?utm_source=linkedin&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=post-leadership` |
| YouTube | Tutorial video | `https://ginkoai.com?utm_source=youtube&utm_medium=video&utm_campaign=sprint3-content&utm_content=tutorial-getting-started` |

### Blog Post Links

| Post | Platform | Full URL |
|------|----------|----------|
| Post 1: AI Amnesia | X.com | `https://ginkoai.com/blog/why-ai-assistants-forget?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=thread-ai-amnesia` |
| Post 2: Flow State | X.com | `https://ginkoai.com/blog/back-in-flow-30-seconds?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=thread-flow-state` |
| Post 3: Team Chaos | LinkedIn | `https://ginkoai.com/blog/ai-development-without-chaos?utm_source=linkedin&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=post-team-chaos` |
| Post 5: ROI | LinkedIn | `https://ginkoai.com/blog/measuring-ai-collaboration-roi?utm_source=linkedin&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=post-roi` |
| Post 6: 6-Week | X.com | `https://ginkoai.com/blog/why-our-6-week-estimate-took-3-days?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=thread-velocity` |
| Post 6: 6-Week | Reddit | `https://ginkoai.com/blog/why-our-6-week-estimate-took-3-days?utm_source=reddit&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=r-experienceddevs-velocity` |

### GitHub/Docs Links

| Destination | Platform | Full URL |
|-------------|----------|----------|
| GitHub repo | X.com | `https://github.com/ginkoai/ginko?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=repo-link` |
| Docs | Reddit | `https://docs.ginkoai.com?utm_source=reddit&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=docs-link` |

---

## Link Shortening (Optional)

For cleaner links in posts, use a URL shortener that preserves UTM parameters.

### Options

| Service | Notes |
|---------|-------|
| Bitly | Free tier, custom back-halves |
| Rebrandly | Custom domain support |
| Short.io | Good analytics |

### Format

```
go.ginkoai.com/{short-code}
```

**Examples:**
- `go.ginkoai.com/tw-velocity` → Full Twitter link for Post 6
- `go.ginkoai.com/rd-showcase` → Full Reddit showcase link

---

## Tracking in Google Analytics

### Channel Groupings

GA4 will automatically group traffic using these UTM values:

| Channel | Matching Criteria |
|---------|-------------------|
| Organic Social | medium = organic-social |
| Video | medium = video |
| Referral | medium = referral |
| Email | medium = email |
| Paid Social | medium = paid-social |

### Custom Reports

Create reports for:
1. **Traffic by Platform** - utm_source breakdown
2. **Content Performance** - utm_content analysis
3. **Campaign Performance** - utm_campaign comparison
4. **Conversion by Channel** - Events segmented by source/medium

### Key Events to Track

| Event | Description |
|-------|-------------|
| `page_view` | Landing page visits |
| `cta_click` | Hero CTA clicks |
| `blog_read` | Blog post engagement |
| `github_click` | GitHub repo visits |
| `docs_click` | Documentation visits |

---

## Link Tracking Spreadsheet

Maintain a master list of all UTM-tagged links:

**File:** `docs/marketing/utm-links.csv`

```csv
short_code,full_url,platform,content_type,post_reference,created,notes
tw-velocity,https://ginkoai.com/blog/...,twitter,thread,post-6,2026-01-12,6-week estimate thread
rd-showcase,https://ginkoai.com?...,reddit,showcase,general,2026-01-12,r/programming showcase
li-roi,https://ginkoai.com/blog/...,linkedin,post,post-5,2026-01-12,ROI measurement post
```

---

## Best Practices

### DO

- Use consistent naming (lowercase, hyphens)
- Include utm_content for granular tracking
- Test links before posting
- Log all links in the tracking spreadsheet
- Use short links for character-limited platforms

### DON'T

- Mix naming conventions (twitter vs Twitter vs x.com)
- Skip utm_content (makes analysis harder)
- Create links without logging them
- Use spaces or special characters in values

### Naming Conventions

- All lowercase: `twitter` not `Twitter`
- Hyphens for multi-word: `organic-social` not `organic_social`
- Short but descriptive: `thread-velocity` not `thread-about-the-velocity-post`
- Consistent prefixes: `r-` for subreddits, `post-` for LinkedIn posts

---

## Quick Copy-Paste Templates

### X.com

```
?utm_source=twitter&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=
```

### Reddit

```
?utm_source=reddit&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=r-
```

### LinkedIn

```
?utm_source=linkedin&utm_medium=organic-social&utm_campaign=sprint3-content&utm_content=
```

### YouTube

```
?utm_source=youtube&utm_medium=video&utm_campaign=sprint3-content&utm_content=
```

---

*Last updated: 2026-01-12*
*Sprint: EPIC-010 Sprint 3*
