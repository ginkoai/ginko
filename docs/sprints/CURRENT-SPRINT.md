# SPRINT: EPIC-005 Sprint 1 - Market Readiness: Product Positioning + Dashboard Foundation

**Epic**: EPIC-005 Market Readiness

## Sprint Overview

**Sprint Goal**: Crystallize ginko's product positioning for dual audiences and establish dashboard visual foundation aligned with marketing site branding.

**Duration**: 2 weeks
**Type**: Foundation sprint
**Progress:** 70% (7/10 tasks complete)

**Success Criteria:**
- [ ] Tagline and product description finalized
- [ ] Elevator pitches for both segments documented
- [ ] Component branding defined
- [ ] Dashboard visual refresh complete (layout + style, not dynamic data)

---

## Sprint Tasks

### TASK-1: Define Core Tagline and Product Description (2h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Create a concise, memorable tagline and 1-2 sentence product description.

**Context:**
- Current tagline: "Context that flows with you"
- Current description: "Git-native session management for AI-assisted development"
- ginko has evolved: collaboration graph, coaching insights, autonomous agents, rapid flow state return

**Deliverables:**
- Primary tagline
- Product description (1-2 sentences)
- Supporting tagline variants for different contexts

**Files:**
- `website/index.html` (update hero)
- `docs/PRODUCT-POSITIONING.md` (new)

---

### TASK-2: Indie Developer Elevator Pitch (2h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Create a compelling 30-second pitch for indie developers.

**Key Messages:**
- Zero friction to try (`npm install -g @ginkoai/cli`)
- Immediate value (back in flow in 30 seconds)
- Git-native (no vendor lock-in)
- Works with existing tools (Claude Code, Cursor, etc.)

**Deliverables:**
- 30-second verbal pitch
- Written pitch for README/docs
- Key differentiators list

**Files:**
- `docs/PRODUCT-POSITIONING.md`
- `packages/cli/README.md` (update)

---

### TASK-3: SWE Leader Elevator Pitch (3h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Create a compelling pitch for engineering leaders, including tools to help them advocate internally.

**Key Messages:**
- Team productivity gains (measurable)
- AI collaboration governance
- Knowledge retention across sessions
- ROI and TCO considerations

**Deliverables:**
- 60-second verbal pitch
- Written pitch for enterprise page
- "How to pitch to decision makers" outline
- Key metrics and ROI talking points

**Files:**
- `docs/PRODUCT-POSITIONING.md`
- `website/teams.html` (update)

---

### TASK-4: Component Branding Guide (4h)
**Status:** [x] Complete
**Priority:** MEDIUM

**Goal:** Define consistent branding and messaging for each major ginko component.

**Components to brand:**
1. **ginko CLI** - The developer's daily driver
2. **Collaboration Graph** - The knowledge backbone
3. **Dashboard** - The visibility layer
4. **Autonomous Agent Collaboration** - AI-to-AI teamwork

**Deliverables:**
- Component name, tagline, description for each
- Key benefits per component
- Visual identity guidance (icons, colors)

**Files:**
- `docs/PRODUCT-POSITIONING.md`

---

### TASK-5: GitHub Open-Source Presence Refinement (3h)
**Status:** [x] Complete
**Priority:** MEDIUM

**Goal:** Optimize GitHub presence for indie developer discovery and adoption.

**Deliverables:**
- Updated root README.md with new positioning
- Clear "Get Started" section
- Demo GIF or terminal recording
- Contributing guidelines
- License clarity

**Files:**
- `README.md`
- `CONTRIBUTING.md` (if needed)
- `packages/cli/README.md`

---

### TASK-6: Dashboard Visual Audit (2h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Audit current dashboard against marketing site design system and document gaps.

**Audit Areas:**
- Color tokens alignment
- Typography (JetBrains Mono + Inter)
- Spacing system
- Component styles (buttons, cards, inputs)
- Dark theme consistency

**Deliverables:**
- Gap analysis document
- Priority list for visual refresh
- Design token mapping (marketing → dashboard)

**Files:**
- `dashboard/VISUAL-AUDIT.md` (new)

---

### TASK-7: Dashboard Design Token Alignment (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Import marketing site design tokens into dashboard Tailwind config.

**Implementation:**
- Extract CSS custom properties from `website/styles.css`
- Map to Tailwind config in dashboard
- Ensure dark theme as default

**Key Tokens:**
- `--color-accent: #aeff00` (ginko green)
- `--font-mono: JetBrains Mono`
- `--font-sans: Inter`
- Spacing scale
- Border radius
- Shadows

**Files:**
- `dashboard/tailwind.config.js`
- `dashboard/src/app/globals.css`

Follow: Marketing site design system

---

### TASK-8: Dashboard Layout Refresh (6h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Update dashboard layout to match marketing site aesthetic.

**Focus Areas:**
- Navigation alignment
- Page structure and spacing
- Card/panel styles
- Typography hierarchy
- Corner brackets aesthetic (from marketing site)

**Note:** Minimize dynamic data display fixes - those come in later sprints. Focus on layout and style only.

**Files:**
- `dashboard/src/app/layout.tsx`
- `dashboard/src/components/` (various)
- `dashboard/src/app/page.tsx`

Follow: Marketing site patterns
Avoid: Fixing dynamic data issues (deferred to Sprint 2-4)

---

### TASK-9: SWE Leader Infographic Concepts (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Design concepts for infographics that help SWE leaders make the case internally.

**Infographic Ideas:**
1. "Context Loss Cost" - Time lost per session restart without ginko
2. "Flow State ROI" - Productivity impact of rapid context restoration
3. "Knowledge Retention" - How ginko preserves institutional knowledge
4. "AI Collaboration Maturity" - Where teams are vs. where they could be

**Deliverables:**
- Wireframe sketches for 2-3 infographics
- Data points needed for each
- Copy/messaging for each

**Files:**
- `docs/marketing/INFOGRAPHIC-CONCEPTS.md` (new)

---

### TASK-10: Sprint 1 Documentation and Sync (2h)
**Status:** [ ] Not Started
**Priority:** LOW

**Goal:** Document all positioning decisions and sync to collaboration graph.

**Deliverables:**
- Finalized `docs/PRODUCT-POSITIONING.md`
- Graph sync of Sprint 1 tasks and artifacts
- Sprint retrospective notes

**Files:**
- `docs/PRODUCT-POSITIONING.md`
- Sprint file updates

---

## Accomplishments This Sprint

### 2025-12-09: Product Positioning Complete (TASK-1 through TASK-4)
- Finalized tagline: "The AI Collaboration Platform"
- Created elevator pitches for indie developers and SWE leaders
- Defined component branding guide
- All positioning captured in `docs/PRODUCT-POSITIONING.md`

### 2025-12-09: GitHub Presence Refinement (TASK-5)
- Updated root README.md with new positioning

### 2025-12-09: Dashboard Visual Audit Complete (TASK-6)
- Completed comprehensive audit in `dashboard/VISUAL-AUDIT.md`
- Key findings:
  - Dashboard is light-mode first, should be dark-first
  - Accent color is blue, should be ginko green (#C1F500)
  - Headings use Inter, should use JetBrains Mono
  - Missing corner brackets (brand signature)

### 2025-12-10: Dashboard Design Token Alignment Complete (TASK-7)
- Imported marketing site design tokens into `dashboard/src/app/globals.css`
- Key additions:
  - HSL color variables for dark mode (ginko green #C1F500, surfaces, text colors)
  - Spacing scale (4px base system: space-1 through space-24)
  - Shadow tokens (dark mode optimized with higher opacity)
  - Transition tokens (fast/base/slow with cubic-bezier easing)
- Updated Tailwind config with:
  - Ginko brand colors palette
  - Custom shadow utilities (shadow-ginko-sm/md/lg/xl)
  - Transition duration and timing utilities
  - Extended spacing scale
- Corner brackets CSS component ready for use
- Terminal styling components aligned with marketing site
- Dark mode is now default (`className="dark"` on html element)
- Files: `dashboard/tailwind.config.js`, `dashboard/src/app/globals.css`

## Next Steps

1. **TASK-8**: Dashboard Layout Refresh (HIGH priority)
   - Update layout to match marketing site aesthetic
   - Apply corner brackets, typography, spacing
   - Focus on navigation alignment, card/panel styles
2. **TASK-9**: SWE Leader Infographic Concepts
   - Design wireframes for 2-3 infographics
3. **TASK-10**: Sprint Documentation and Sync

## Blockers

[To be updated if blockers arise]
