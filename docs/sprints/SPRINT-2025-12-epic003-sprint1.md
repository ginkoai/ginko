# SPRINT: EPIC-003 Sprint 1 - Website Redesign & Rebranding

## Sprint Overview

**Sprint Goal**: Transform ginkoai.com into a modern, developer-focused marketing site with clear value propositions
**Duration**: 2 weeks (2025-12-02 to 2025-12-15)
**Type**: Design & Development sprint
**Progress:** 67% (4/6 tasks complete)

**Success Criteria:**
- Modern monospace design implemented
- Developer value proposition clearly communicated
- Manager value proposition present (secondary)
- CTAs to get started with ginko
- Mobile-responsive design
- Deployed to Vercel

**Dependencies:**
- Style examples from Chris (BLOCKER until provided)

---

## Sprint Tasks

### TASK-1: Style Research & Design Direction (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Establish design direction based on provided style examples

**Implementation Notes:**
- Review style examples from Chris
- Identify key design patterns (typography, spacing, color)
- Create mood board / design tokens
- Document monospace font choices

**Deliverables:**
- Design direction document
- Color palette
- Typography scale
- Component style guide

**Blocked by:** Style examples from Chris

---

### TASK-2: Site Architecture & Content Outline (3h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Define site structure and content hierarchy

**Implementation Notes:**
- Map current site structure
- Define new page hierarchy
- Outline content for each section
- Plan navigation flow

**Pages to include:**
- Home (hero, value props, CTA)
- Features / How it Works
- For Developers (70% focus)
- For Teams/Managers (30% focus)
- Pricing (if applicable)
- Blog (infrastructure)
- Docs link (to existing docs)
- Get Started / Install

---

### TASK-3: Homepage Redesign (8h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Create compelling homepage with clear value proposition

**Implementation Notes:**
- Hero section with tagline and primary CTA
- Problem/solution narrative
- Key features showcase
- Social proof section (if available)
- Secondary CTAs

**Key Messages:**
- "AI collaboration without context loss"
- "Back in flow in 30 seconds"
- Developer-first, team-friendly

**Files:**
- `marketing-site/src/pages/index.tsx` (or similar)

---

### TASK-4: Developer & Manager Value Pages (6h)
**Status:** [x] Complete
**Priority:** MEDIUM

**Goal:** Create targeted landing pages for each audience

**Implementation Notes:**
- Developer page: productivity, flow state, context preservation
- Manager page: team visibility, knowledge retention, ROI
- Each with specific CTAs
- Brief technical overview where relevant

**Files:**
- `marketing-site/src/pages/developers.tsx`
- `marketing-site/src/pages/teams.tsx`

---

### TASK-5: Technical Overview & Getting Started (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Provide brief technical context and clear installation path

**Implementation Notes:**
- How ginko works (high-level architecture)
- Installation steps (npm, configuration)
- Quick start guide
- Link to full documentation

**Files:**
- `marketing-site/src/pages/how-it-works.tsx`
- `marketing-site/src/pages/get-started.tsx`

---

### TASK-6: Responsive Design & Polish (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Ensure site works across all devices and feels polished

**Implementation Notes:**
- Mobile-first responsive adjustments
- Performance optimization
- Accessibility review (contrast, focus states)
- Final QA pass

**Files:**
- Global styles
- Component refinements

---

## Accomplishments This Sprint

### 2025-12-02: Design Direction & Site Architecture
- Analyzed 4 style references (Brass Hands, Stripe Dev, Cloudflare Docs, Monospace Web)
- Created design direction document: `docs/design/DESIGN-DIRECTION-EPIC003.md`
- Created site architecture document: `docs/design/SITE-ARCHITECTURE-EPIC003.md`
- Confirmed design decisions with Chris: #22C55E green, dual themes, Brass Hands aesthetic

### 2025-12-02: Homepage Redesign Complete
- Rewrote styles.css (1503 lines) with full design system:
  - CSS custom properties for typography, colors, spacing
  - Dual theme support (light/dark)
  - JetBrains Mono + Inter typography
  - Brass Hands corner bracket decorations
  - Responsive breakpoints (1024px, 768px)
- Rewrote index.html (409 lines) with new content:
  - Simplified branding: "ginko" (removed "AI")
  - New hero: "Context that flows with you"
  - Monospace labels: CONTEXT_ROT, SESSION_HANDOFF, etc.
  - Realistic terminal demo showing ginko start output
  - Clean pricing section (Free/Pro/Enterprise)
  - Removed: roadmap, inflated stats, ROI calculator
- Created script.js (298 lines):
  - Theme toggle with localStorage persistence
  - Mobile menu toggle
  - Smooth scroll with header offset
  - Intersection observer animations
  - Reduced motion support

### 2025-12-03: Developer & Manager Value Pages Complete
- Updated design direction document with implemented styles (`docs/design/DESIGN-DIRECTION-EPIC003.md`)
  - Full CSS custom properties documentation
  - Component patterns with code examples
  - Corner bracket implementation guide
  - Terminal component specifications
  - Page structure template
- Created developers.html (25KB):
  - Hero: "Stay in flow. Ship faster."
  - Problem cards: CONTEXT_ROT, HANDOFF_HELL, FLOW_DISRUPTION
  - Full terminal demo with ginko start output
  - 9 feature cards (6 Free, 3 Pro)
  - Developer workflow timeline (morning/lunch/evening)
  - Testimonial with corner brackets
  - CTA section with install command
- Created teams.html (27KB):
  - Hero: "Team context that scales."
  - Problem cards: KNOWLEDGE_SILOS, ONBOARDING_FRICTION, VISIBILITY_GAP
  - Team event sync terminal demo
  - 6 feature cards with Pro/Enterprise badges
  - ROI stats section (70% faster, 3 days onboarding, etc.)
  - 3-step setup guide
  - Pricing CTA section (Pro + Enterprise)
- Both pages follow Brass Hands aesthetic with full corner bracket implementation

## Next Steps

1. TASK-5: Technical Overview & Getting Started pages
2. TASK-6: Responsive polish and final QA
3. Deploy to Vercel and test production

## Blockers

- [x] ~~Awaiting style examples from Chris (TASK-1 blocked)~~ - Resolved 2025-12-02

---

## Notes

- Current site: https://www.ginkoai.com
- Hosting: Vercel
- Tech stack: TBD (review current implementation)
