---
sprint_id: EPIC-003-S2
epic_id: EPIC-003
status: paused
created: 2025-12-03
updated: 2025-12-05
paused_reason: Prioritizing EPIC-004 (AI-to-AI Collaboration)
---

# SPRINT: EPIC-003 Sprint 2 - Content Infrastructure & Initial Stock

## Sprint Overview

**Sprint Goal**: Establish blog infrastructure and create initial "stock" content pieces
**Duration**: 2 weeks (2025-12-16 to 2025-12-29)
**Type**: Content & Infrastructure sprint
**Progress:** 80% (4/5 tasks complete)

**Success Criteria:**
- Blog section live on marketing site
- 3-5 initial blog posts published
- Content matches stock-and-flow strategy
- SEO fundamentals in place
- Content management workflow documented

---

## Sprint Tasks

### TASK-1: Blog Infrastructure Setup (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Add blog functionality to marketing site

**Implementation Notes:**
- Evaluate blog approach (MDX, CMS, headless)
- Set up blog routing and templates
- Create post listing page
- Create individual post template
- Add RSS feed

**Considerations:**
- Keep it simple - MDX or markdown files preferred
- Avoid heavy CMS unless necessary
- Easy for non-technical content updates

**Files:**
- `marketing-site/src/pages/blog/index.tsx`
- `marketing-site/src/pages/blog/[slug].tsx`
- `marketing-site/content/blog/` (markdown files)

---

### TASK-2: Content Strategy & Editorial Calendar (3h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Define content themes and create initial publishing schedule

**Implementation Notes:**
- Identify 5-10 content themes/pillars
- Map themes to audience (developer vs manager)
- Create 4-week content calendar
- Define post formats (tutorial, thought piece, case study)

**Content Pillars (draft):**
- AI pair programming best practices
- Context management challenges
- Team collaboration with AI
- Developer productivity
- Getting started guides
- Technical deep dives

**Deliverables:**
- Content pillar document
- 4-week editorial calendar
- Post template/structure guide

**Completion Notes:**
- Created `website/content/CONTENT-STRATEGY.md` with:
  - 6 content pillars with audience mapping
  - 2 audience profiles (Developers, Engineering Managers)
  - 5 post formats with structure templates
  - 4-week editorial calendar (6 posts planned)
  - Content guidelines (voice, CTA, SEO, quality checklist)
  - Success metrics and post pipeline
- Verified 2025-12-03

---

### TASK-3: Initial Blog Posts - Developer Focus (8h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Write 3 developer-focused blog posts

**Post Ideas:**
1. "Why AI Assistants Forget Everything (And How to Fix It)"
   - Problem: context loss between sessions
   - Solution: ginko's approach
   - Subtle CTA at end

2. "Back in Flow in 30 Seconds: The ginko start Experience"
   - What happens when you run ginko start
   - How context is preserved
   - Developer workflow integration

3. "Patterns and Gotchas: Teaching Your AI Partner"
   - How ginko learns from your codebase
   - Pattern and gotcha system
   - Practical examples

**Tone:** Collegial, helpful, developer-to-developer

**Completion Notes:**
- Post 1: `2025-12-10-why-ai-assistants-forget.md` (from TASK-1)
- Post 2: `2025-12-17-back-in-flow.md` - ginko start experience, flow state, session anatomy
- Post 3: `2025-12-26-patterns-and-gotchas.md` - tribal knowledge, pattern/gotcha capture, team amplification
- All posts follow Problem/Solution or How-To format from content strategy
- Collegial developer-to-developer tone throughout
- Subtle CTAs at end of each post
- Verified 2025-12-03

---

### TASK-4: Initial Blog Posts - Manager/Team Focus (4h)
**Status:** [x] Complete
**Priority:** MEDIUM

**Goal:** Write 1-2 posts for engineering managers

**Post Ideas:**
1. "AI-Assisted Development Without the Chaos"
   - Team coordination challenges
   - How ginko provides visibility
   - Knowledge preservation benefits

2. "Measuring AI Collaboration ROI"
   - What to track
   - How ginko helps
   - Team productivity metrics

**Completion Notes:**
- Post 1: `2025-12-19-ai-development-without-chaos.md` - Team coordination challenges, knowledge evaporation, making AI work visible
- Post 2: `2025-12-31-measuring-ai-collaboration-roi.md` - ROI framework, key metrics (time to first commit, rework rate, knowledge propagation, onboarding velocity, context recovery time)
- Both posts follow Thought Leadership format from content strategy
- Manager-focused tone: strategic perspective, ROI-oriented, team coordination focus
- Subtle CTAs at end of each post
- Verified 2025-12-03

---

### TASK-5: SEO & Discoverability Setup (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Ensure content is discoverable

**Implementation Notes:**
- Meta tags and Open Graph setup
- Sitemap generation
- robots.txt configuration
- Schema markup for blog posts
- Internal linking strategy

**Files:**
- `marketing-site/src/components/SEO.tsx`
- `marketing-site/public/sitemap.xml`
- `marketing-site/public/robots.txt`

---

## Accomplishments This Sprint

### 2025-12-03: Blog Infrastructure Complete (TASK-1)
- Created ADR-050 documenting architecture decision (static markdown + build script)
- Built lightweight Node.js build system:
  - `build-blog.js` - Markdown → HTML with syntax highlighting
  - `watch-blog.js` - Development mode with auto-rebuild
  - Templates matching Brass Hands aesthetic
- Added first blog post: "Why AI Assistants Forget Everything"
- Generated RSS feed at `/blog/feed.xml`
- Updated navigation on all pages with Blog link
- Updated `vercel.json` for automated builds
- Files: `website/build-blog.js`, `website/templates/`, `website/content/blog/`

### 2025-12-03: Manager-Focused Blog Posts Complete (TASK-4)
- Created 2 thought leadership posts for engineering managers:
  1. "AI-Assisted Development Without the Chaos" - Addresses team coordination challenges, knowledge evaporation, context fragmentation, invisible work. Provides actionable patterns for building team AI workflows.
  2. "Measuring AI Collaboration ROI" - Comprehensive framework for measuring AI tool ROI. Key metrics: time to first commit, rework rate, knowledge propagation time, onboarding velocity, context recovery time.
- Both posts ~1200-1500 words, strategic tone, manager-focused
- Files: `website/content/blog/2025-12-19-ai-development-without-chaos.md`, `website/content/blog/2025-12-31-measuring-ai-collaboration-roi.md`

## Next Steps

1. TASK-5: SEO & discoverability setup (final task)

## Blockers

- ~~Sprint 1 (website redesign) should be substantially complete~~ ✅ Complete

---

## Notes

- Stock content should be evergreen where possible
- Each post should have clear value without being salesy
- CTA placement: end of post, subtle
- Target word count: 800-1500 words per post
