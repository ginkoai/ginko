# Rebrand Design Specification

**Status:** In Progress
**Last Updated:** 2026-02-20
**Epic:** EPIC-021

> **IMPORTANT:** This document captures design decisions and copy so they persist across sessions. Update this file as decisions are made.

---

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Cream | `#FAF7F0` | Primary background |
| Eggshell | `#F4EEDD` | Secondary background |
| Yellow | `#FFD13F` | Accent / Landing page |
| Orange | `#FFA001` | Developers page |
| Red | `#FF7343` | Team page |
| Pink | `#FF0084` | How It Works |
| Purple | `#B03192` | Blog / Gradient bottom |

> Note: These differ from the earlier CSS values. Need to confirm which palette is correct.

---

## Typography

- **Headers:** Anton (Google Font) - GO LARGE where possible
- **Body/Code:** JetBrains Mono (dev-friendly monospace)

### Font Colors
- **Primary:** `#FF7343` (red) and `#0d0d0d` (near black)
- **Secondary:** Other palette colors as needed depending on treatment

### Main Colors (use throughout)
| Color | Hex |
|-------|-----|
| Yellow | `#FFD13F` |
| Orange | `#FFA001` |
| Red | `#FF7343` |
| Pink | `#FF0084` |
| Purple | `#B03192` |

---

## Grid System

- **Format:** Wide format
- **Rule:** Strictly adhere to grid throughout
- Options: 3 equal columns + 1 decorative, or 4 equal columns
- [TODO: Add grid specifications from screenshots]

---

## Header

**Layout:** 3-column, full width

| Left | Center | Right |
|------|--------|-------|
| Hamburger menu (3 lines) | ginko rainbow stripe logo | "GET STARTED" button |

**Hamburger Menu:**
- 3 horizontal lines
- Color: TBD (likely dark gray or black)
- Opens full-screen or slide-out nav (see Hamburger Menu section)

**Logo:**
- ginko rainbow stripe logo (existing asset: `assets/ginko-logo-rainbow.png`)
- Centered in header

**GET STARTED Button:**
- Background: `#FF7343` (red)
- Text: "GET STARTED" uppercase, monospace (JetBrains Mono)
- Arrow icon in separate square section on right side
- Rounded corners
- Style reference: `reference/header-button-style.png`

**Mobile Behavior:** TBD

---

## Hamburger Menu

**Reference:** `reference/hamburger-menu-behavior.png`

### Open State
- **Type:** Full-screen takeover
- **Background:** Solid sunset color with texture (use `#FF7343` red or other palette color)
- **Close button:** X icon, top right, circular
- **Menu items:** Left-aligned, large bold uppercase condensed typography

### Menu Items (for ginko)
- HOME
- DEVELOPERS
- TEAMS
- HOW IT WORKS
- BLOG
- DOCS

### Animation: Enter
- Items fade in from ghosted/faded state
- Staggered animation (each item slightly delayed)

### Interaction: Hover
- Hovered item gets LARGER and shifts RIGHT
- Other items remain faded/muted
- Creates clear visual hierarchy of selected item

### Close
- Click X button or click outside menu area

---

## Hero Section

### Option A: "If You Know, You Ginko"

**Tagline:** If You Know, You Ginko

**Copy:** ginko supercharges your development by turning your AI model into a first-class partner. All of your project code, workplans, knowledge docs, and session logs all stay in git where human and AI partners have instant access. No more re-explaining every session, no more tokens wasted on big file scans. Just back to flow state in 30 seconds every time. ginko CLI is 100% open source and works with any model. All inference happens in your own environment.

**Image:** TBD

### Option B: [TBD]

[Additional hero variations for A/B testing]

### Hero Inspiration: Royal Beverage (reference/hero-inspo-royal-beverage.png)

- **Layout:** Large distressed typography as background texture
- **Layering:** Product/visual breaks OUT of text, overlapping it
- **Background:** Cream/off-white
- **Header:** Minimal - hamburger left, centered logo, utility icon right
- **Copy:** Small body text positioned to side (not centered)
- **Effect:** Typography as texture, hero visual dominates

**Apply to ginko:**
- Large "IYKYG" or tagline as background texture
- Particle animation or graph visual breaking through text
- Cream background
- Minimal header

---

## Features Section

### Feature 1: ginko start
- **Tagline:** Ready Player YOU
- **Copy:** ginko start loads your session context with tasks, goals, knowledge, and everything important you did in your last session. No more re-explaining the basics to your AI partner, just straight back to flow in 30 seconds or less.
- **Image:** TBD

### Feature 2: ginko charter
- **Tagline:** Your Blueprint For Success
- **Copy:** ginko charter gives your AI partner the big picture: project goals, audiences, pain-points, architecture, scope, acceptance criteria and more, all using natural conversation.
- **Image:** TBD

### Feature 3: ginko epic
- **Tagline:** WHY-WHAT-HOW
- **Copy:** ginko epic creates your work breakdown structure from your charter, knowledge docs, and conversation with you. Epics are broken down into sprints and tasks to keep your work on track.
- **Image:** TBD

### Feature 4: ginko vibecheck
- **Tagline:** Take A Beat
- **Copy:** ginko vibecheck is a built-in behavior that gives you and your AI partner a blame-free moment to challenge approach and pivot back to flow. Simply call "vibecheck" whenever things seem off, then have an open conversation. Any new discoveries will be automatically captured to help your whole team stay on track in the future.
- **Image:** TBD

### Feature 5: ginko insights
- **Tagline:** Level Up
- **Copy:** ginko insights analyzes your session logs, commits, and other data to pinpoint exactly where you are effective and where you have opportunities to improve. Team leaders can use ginko insights to level-up their whole team with measurable results.
- **Image:** TBD

### Feature 6: ginko handoff
- **Tagline:** We'll Take It From Here
- **Copy:** ginko handoff handles all the end-of-session housekeeping in a single command. git commits, temp-file cleanup, doc updates and more are all taken care of so you can start your next session right where you left off.
- **Image:** TBD

### Feature 7: ginko collaboration graph
- **Tagline:** Get Real, In Real Time
- **Copy:** AI-driven development takes days, not weeks. Fast-moving teams need real-time updates on task completion, issues, and insights. Ginko collaboration graph keeps all your project status updated automatically so human and AI partners all stay in sync.
- **Image:** TBD

---

## Page Section Order

1. Header
2. Hero
3. Animated logo row (scrolling right to left, grey/black logos on cream)
4. Sound Familiar? (pain points)
5. How It Works
6. Features (7 full-width blocks)
7. FAQ
8. Pricing
9. Final Testimonial (full-width)
10. Final CTA
11. Footer

---

## Section: Animated Logo Row

- **Position:** After hero
- **Behavior:** Scrolling right to left (infinite loop)
- **Logo colors:** Grey or black on cream background
- **Logos:** [TBD - which company logos?]

---

## Section: Sound Familiar? (Pain Points)

**Reference:** `reference/sound-familiar-section.png`

- **Label:** "ZERO PAIN" (small caps, gray, tracking wide)
- **Heading:** "Sound familiar?" (Anton, large)
- **Layout:** 3 quote cards in row

### Quote Card Design
- **Quote marks:** Large decorative quotation marks in `#FF7343` red
- **NOTE:** Use interesting/decorative quote marks (NOT JetBrains Mono) - consider serif or stylized
- **Quote text:** JetBrains Mono italic
- **Attribution:** "— [role], [description]" in gray

### Quotes Content
1. "I spent 20 minutes explaining what we did yesterday..." — Every developer, every morning
2. "My AI forgot everything again. It's like Groundhog Day..." — Senior engineer, frustrated
3. "Every session is like starting from scratch..." — Team lead, about to give up

---

## Section: How It Works

**Reference:** `reference/how-it-works-section.png`

- **Label:** "HOW IT WORKS" (small caps, gray, wide tracking)
- **Heading:** "Three steps to AI that remembers" (Anton, large)
- **Layout:** 3 numbered cards in row

### Card Design
- **Number:** Large `#FF7343` red, stylized/condensed font
- **Title:** Anton
- **Body:** JetBrains Mono
- **Card background:** Cream/beige with subtle border

### Content

| # | Title | Copy |
|---|-------|------|
| 01 | Start your session | Run ginko start and your AI loads full project context instantly. |
| 02 | Work naturally | Decisions, patterns, and learnings are captured as you code. |
| 03 | Hand off | Run ginko handoff. Tomorrow, pick up exactly where you left off. |

---

## Section: Features

**Layout:** 7 full-width blocks (one per feature)

**Reference images:**
- `reference/features-inspo-crypto-blocks.png` (halftone/pixel style)
- `reference/features-inspo-laws-ux.png` (geometric icon cards)
- `reference/features-inspo-typography.png` (mixed weight emphasis)

### Design Direction (TBD - choose approach)

**Option A: Crypto/Bold Blocks**
- Full-width colored background per feature
- Halftone or pixelated image treatments
- Large bitmap/pixel-style typography
- Very bold, high impact

**Option B: Geometric Icons**
- Large abstract geometric icon per feature
- Icon in colored square
- Clean, minimal, conceptual

**Option C: Halftone Photography**
- Photos with halftone/dot treatment
- Retro print aesthetic

### Treatment Elements
- **Typography:** Go LARGE with Anton
- **Type effects:** Mixed weights, key words emphasized (bold black vs gray)
- **Colors:** Each feature uses different palette color
- **Icons/Images:** Specialized, large, colored

### Iconography Style

**Reference:** `reference/icons-kloroform-*.png` (Studio Kloroform)

- **Style:** Monoline, abstract geometric
- **Stroke:** Single weight, clean lines
- **Themes:** Technical, organic, architectural, abstract
- **Forms:** Globes, waves, spirals, grids, 3D shapes, connections

**Icon ideas per feature:**
| Feature | Icon concept |
|---------|--------------|
| ginko start | Spark, burst, launch |
| ginko charter | Blueprint, layered structure |
| ginko epic | Stacked forms, hierarchy |
| ginko vibecheck | Wave, pulse, balance |
| ginko insights | Graph, connections, rays |
| ginko handoff | Flow, relay, transfer |
| ginko collaboration graph | Network, nodes, connections |

### Feature Color Assignments (suggested)
| Feature | Color |
|---------|-------|
| ginko start | Yellow `#FFD13F` |
| ginko charter | Orange `#FFA001` |
| ginko epic | Red `#FF7343` |
| ginko vibecheck | Pink `#FF0084` |
| ginko insights | Purple `#B03192` |
| ginko handoff | Yellow `#FFD13F` |
| ginko collaboration graph | Orange `#FFA001` |

---

## Section: FAQ

**Reference:** `reference/faq-*.png`

### Header
- **Tag:** Small uppercase label above heading (e.g., "QUERIES" or "FAQ")
- **Tag style:** Red text, red outline, OR red rectangle background
- **Heading options:**
  - "Frequently Asked Queries" (dev humor)
  - "Questions?"
  - "Got Questions? We've Got Answers"

### Accordion Design
- **Hover state:** Yellow `#FFD13F` background
- **Toggle icon:** + rotates to × when opened
- **Open state:** Dashed divider, monospace answer text
- **Border:** Optional colored outline on hover (blue or accent color)

### Retro Tech Variant
- Numbered items: "FAQ 01.", "FAQ 02.", etc.
- "/" prefix on questions
- Red highlight on key words
- Two-column layout: intro left, Q&A right

### FAQ Questions (from existing site)
- Is my code safe?
- Does it work with Cursor, Copilot, or Claude?
- How is this different from just using CLAUDE.md?
- What happens when I switch branches?
- Can I use ginko on multiple machines?
- How do team permissions work?

---

## Section: Pricing

**Reference:** `reference/pricing-section.png`

### Header
- **Heading:** "Simple, transparent pricing" (Anton)
- **Tag:** Optional "PRICING" label above

### Layout
- 3 columns: Free, Pro (featured), Enterprise
- Pro card highlighted with `#FF7343` orange background
- "MOST POPULAR" badge on Pro

### Card Design
- **Plan name:** Serif (Anton)
- **Price:** Large "$X" with small "/mo" suffix
- **Features:** List with divider lines between
- **CTA:** Black button with arrow

### Pricing Tiers

**Free - $0/mo**
- Core CLI
- Local context storage
- Unlimited sessions
- CTA: "GET STARTED"

**Pro - $9/mo** (featured)
- Everything in Free
- Knowledge graph
- Pattern coaching
- Progress dashboard
- CTA: "START FREE TRIAL"

**Enterprise - $29/mo**
- Everything in Pro
- Team sync
- Analytics
- Priority support
- CTA: "CONTACT SALES"

### Creative Enhancements (optional)
- Retro stripe accent on Pro card
- Sunset gradient instead of solid orange
- Corner brackets on cards
- Background pattern on Free/Enterprise
- Hover animations

---

## Section: Final Testimonial

**Position:** Full-width, directly above footer
**Reference:** `reference/final-testimonial-current.png`

### Layout: Static Single Quote (matches current site)
- **Background:** Dark/near-black `#0d0d0d`
- **Border:** Thin accent color outline (yellow-green on current site, adapt to sunset palette)
- **Corner brackets:** Yellow/accent color in corners
- **Quote marks:** Large decorative `"` in accent color (yellow `#FFD13F` or lime)
- **Quote text:** Monospace (JetBrains Mono), accent color
- **Emphasis:** Key phrase italicized (e.g., "my frustrations are gone.")
- **Attribution:** Small caps, same color, below quote (e.g., "BETA USER FEEDBACK")

### Current Quote
> "The rapport is right there from the start. The flow is preserved, and *my frustrations are gone.*"
> — BETA USER FEEDBACK

### Background Pattern (optional - TBD)
Alternative location for pattern if not used on CTA. Use ONE, not both.

Options:
- **Dots/halftone:** Retro print aesthetic, subtle behind dark bg
- **Waves/moiré:** Organic, pairs with testimonial warmth
- **Grid:** Technical feel, fades at edges

### Testimonial Marquee (use elsewhere)
Scrolling testimonial rules can be used at other points in the page:
- After hero (instead of/alongside logo row)
- Between feature blocks
- Above pricing

Format: Scrolling quotes with ☆ or ◆ separators

---

## Section: Final CTA

**Position:** Above footer OR integrated into footer

### Layout
- Full-width band
- Background: Accent color (suggest `#FF7343` red or sunset gradient)
- Centered content

### Content
- **Headline:** TBD (e.g., "Ready to stop repeating yourself?")
- **Button:** "GET STARTED" or "TRY GINKO FREE"
- **Style:** Matches header button (arrow in separate square)

### Background Pattern (optional - TBD)
Good opportunity for texture. Options from pattern library:
- **Dots:** Halftone fade at edges
- **Grid:** Technical graph paper feel
- **Waves:** Moiré curves, organic
- **Cross/X marks:** Various densities

Pattern should be subtle/monochromatic so CTA button pops. Use CSS mask for edge fade:
```css
mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, #000 50%, transparent 100%);
```

---

## Section: Footer

**Reference:** `reference/footer-current.png`

### Layout Changes from Current
- **Logo:** Rainbow stripe ginko logo (not green leaf)
- **Motto:** REMOVE "Context that flows with you"
- **Links:** Simplify - hamburger nav handles most navigation
- **iykyg logo:** Keep, but needs rainbow stripe treatment

### Structure

| Left Column | Right Column |
|-------------|--------------|
| Rainbow stripe ginko logo | Minimal links (TBD) |
| (no motto) | |

### Simplified Links (suggested)
Since hamburger nav exists, footer links can be minimal:
- GitHub
- Docs
- Privacy
- Terms

Or even simpler: just legal links in bottom bar.

### iykyg Logo Treatment
- Large "iykyg" text with ginkgo leaf on final "g"
- **Recolor:** Apply sunset gradient/rainbow stripe to match brand
- Colors: `#B03192` → `#FF0084` → `#FF7343` → `#FFA001` → `#FFD13F`

### Bottom Bar
- **Left:** ©2026 ginko. All rights reserved.
- **Right:** PRIVACY POLICY | TERMS OF SERVICE

### Background
- Dark `#0d0d0d` (keep from current)
- iykyg logo as large background element (muted/subtle)

---

## Visual Elements

- Sunset gradient stripe motif
- Ginkgo leaf integration
- Dot grid backgrounds with radial fade
- Corner brackets on interactive elements
- "iykyg" footer logo treatment
- ASCII "iykyg" divider (section separator)

### ASCII Divider (assets/ascii-divider.*)

Repeating "iykyg" Easter egg pattern for section dividers:
```
    .-.     .-.     .-.     .-.     .-.
iykyg\\\iykyg\\\iykyg\\\iykyg\\\iykyg\\\
`-'     `-'     `-'     `-'     `-'
```

**Formats available:** `.txt`, `.png`, `.jpg`, `.gif`
**Use for:** Section dividers, horizontal rules, decorative breaks

### Animated Rules / Marquees (reference/animated-rules-*.png)

Scrolling text banners for section dividers or social proof.

**Style variations:**
| Background | Text | Separators |
|------------|------|------------|
| Black `#0d0d0d` | Cream | • bullets |
| Yellow `#FFD13F` | Black italic | — dashes |
| Orange `#FF7343` | White | • bullets |
| Yellow | Black | /// slashes |

**Marquee copy options:**
- SAVE YOUR TOKENS
- MAINTAIN FLOW STATE
- MEMORY FOR YOUR AI
- STOP REPEATING YOURSELF
- CONTEXT ROT IS DEAD
- BUILD DON'T REPEAT
- MEMORY AS A SERVICE
- FLOW STATE RESTORED
- GINKO CLI V1.0

**Testimonials as marquee:**
- Scrolling quotes with star ☆ or diamond ◆ separators
- Format: "Quote text" – Attribution
- Examples:
  - "Ginko is basically external RAM for my LLM." – Theo
  - "It's like git for LLM context. Essential." – Senior Engineer @ Meta

### Background Patterns (reference/bg-patterns-*.png)

**Pattern types:**
- **Grid:** Graph paper lines (technical feel)
- **Dots:** Small repeating dots (retro texture)
- **Waves:** Horizontal wavy lines (subtle, organic)

**Techniques:**
- Subtle, low-contrast patterns
- Fade at edges using CSS mask/gradient
- Match pattern color to section color (monochromatic)
- Use on cards OR full sections

**CSS example for edge fade:**
```css
.pattern-fade {
  mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, #000 50%, transparent 100%);
}
```

**Additional pattern types:**
- **Halftone dots:** Distort/fade at edges (see Tokyo ticket example)
- **Fine grid:** Technical graph paper, pairs with barcode accents
- **Moiré waves:** Curved lines, optical effect
- **Cross/X marks:** Various densities (24px, 30px, 36px, 48px)
- **Circles:** Open circles, overlapping circles

**Pattern library reference:** `reference/patterns-library.png`

### Inspiration: Retro Stripe Curves (reference/inspo-retro-stripe-*.png)

**Stripe variations:**
- Curved flows with U-turns and loops
- Corner radiations (flowing from edges)
- Vertical drops with curves at bottom
- S-curves / serpentine paths
- Works on BOTH cream and black backgrounds

**Recolor with ginko sunset palette:**
`#B03192` → `#FF0084` → `#FF7343` → `#FFA001` → `#FFD13F`

**Possible applications:**
- Section transitions/dividers
- Hero background element
- Feature block accents
- Footer decoration
- Loading/animation paths
- Card accents

**Status:** TBD - placement not yet decided

### Inspiration: Retro Circle Pattern (reference/inspo-retro-circles.png)

- Interlocking circles, repeating 70s pattern
- Already in sunset colors (yellow, orange, red, maroon)
- Textile/wallpaper aesthetic
- **Use for:** Background texture, section fill, decorative element

---

## Screenshots Reference

> Upload screenshots here or save to `website/rebrand/reference/` directory

[TODO: Re-upload reference screenshots]
- Header layout
- Hamburger menu
- Grid examples
- Section layouts
- Icon styles

---

## Changelog

### 2026-02-20
- Created design spec from recovered conversation transcript
- Captured colors, features copy, hero copy
- Missing: Header, hamburger, grid screenshots (need re-upload)
