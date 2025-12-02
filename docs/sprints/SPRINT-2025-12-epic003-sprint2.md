# SPRINT: EPIC-003 Sprint 2 - Content Infrastructure & Initial Stock

## Sprint Overview

**Sprint Goal**: Establish blog infrastructure and create initial "stock" content pieces
**Duration**: 2 weeks (2025-12-16 to 2025-12-29)
**Type**: Content & Infrastructure sprint
**Progress:** 0% (0/5 tasks complete)

**Success Criteria:**
- Blog section live on marketing site
- 3-5 initial blog posts published
- Content matches stock-and-flow strategy
- SEO fundamentals in place
- Content management workflow documented

---

## Sprint Tasks

### TASK-1: Blog Infrastructure Setup (4h)
**Status:** [ ] Not Started
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
**Status:** [ ] Not Started
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

---

### TASK-3: Initial Blog Posts - Developer Focus (8h)
**Status:** [ ] Not Started
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

---

### TASK-4: Initial Blog Posts - Manager/Team Focus (4h)
**Status:** [ ] Not Started
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

[To be filled as work progresses]

## Next Steps

[To be updated during sprint]

## Blockers

- Sprint 1 (website redesign) should be substantially complete

---

## Notes

- Stock content should be evergreen where possible
- Each post should have clear value without being salesy
- CTA placement: end of post, subtle
- Target word count: 800-1500 words per post
