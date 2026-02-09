---
epic_id: EPIC-021
status: active
created: 2026-02-09
updated: 2026-02-09
roadmap_lane: now
roadmap_status: in_progress
tags: [design, branding, website, exploration]
---

# EPIC-021: Experimental Rebrand - Sunset Retro Aesthetic

## Vision

Transform ginko's visual identity from generic dev-tool-dark-mode to a distinctive, warm, retro-technical aesthetic. The goal is memorable differentiation while maintaining developer credibility.

**Design Philosophy:** "A developer with taste, not a designer who doesn't code."

## Goal

Create HTML prototypes exploring the new brand direction. Iterate on key sections to validate the aesthetic before committing to full production implementation.

**This is exploration, not production build.**

## Brand Direction Summary

### Color Palette
| Name | Hex | Role |
|------|-----|------|
| Cream | `#FCFBF1` | Primary background |
| Yellow | `#FDC400` | Gradient top / Landing page |
| Orange | `#FC9500` | Developers page |
| Red | `#FE4500` | Team page |
| Violet | `#E00256` | How It Works |
| Purple | `#A70086` | Blog / Gradient bottom |
| Purple Black | `#271D26` | Dark accent |
| Black | `#0B0B0B` | Text / Dark mode bg |
| Gray | `#615F61` | Secondary text |

### Typography
- **Headers:** Instrument Serif (editorial feel)
- **Body/Code:** JetBrains Mono (dev-friendly monospace)

### Key Visual Elements
- Sunset gradient stripe motif (Record-inspired)
- Ginkgo leaf integrated into logo/branding
- Dot grid backgrounds with radial fade mask
- Corner brackets on interactive elements (existing)
- Alternating section backgrounds (page color ↔ cream)
- "iykyg" footer logo treatment

### Interactive Elements (Fidget Philosophy)
- Scroll-triggered text spotlight
- Halftone/dot matrix animations
- ASCII reveal for founder photos
- Typewriter text effects
- Liquid buttons
- Particle systems

### Inspiration Sources (Reference, Don't Copy)
- Record (takerecord.com) - Sunset stripes, warm palette
- Browserbase - Isometric illustrations, grid paper
- Fellow/Atlas (Kyle Anthony Miller) - Retro-technical aesthetic
- Hiro - Tree structure navigation, dev-native feel
- Dropbox - Section alternation, brand system

## Success Criteria

- [ ] Brand foundation CSS complete (colors, typography, spacing)
- [ ] 2-3 hero variations explored
- [ ] Key sections (problem, solution, features) iterated
- [ ] Interactive element prototypes (at least 2)
- [ ] Chris approves direction for production implementation

## Scope

### In Scope
- HTML/CSS prototypes (not production-ready)
- Landing page sections only (initially)
- Light mode exploration (primary)
- Dark mode exploration (secondary)
- 2-3 variations per major section
- Key interactive animations

### Out of Scope
- Full site rebuild
- CMS integration
- Performance optimization
- Mobile-first (desktop exploration first)
- Blog templates
- Documentation site

### Dependencies
- Chris available for design review/feedback
- Access to Instrument Serif font (Google Fonts)
- Logo assets (sunset stripe versions)

## Sprint Breakdown

| Sprint | ID | Goal | Duration |
|--------|-----|------|----------|
| Sprint 1 | e021_s01 | Brand Foundation | 2-3 days |
| Sprint 2 | e021_s02 | Hero Iterations | 2-3 days |
| Sprint 3 | e021_s03 | Section Iterations | 3-4 days |
| Sprint 4 | e021_s04 | Interactive Polish | 2-3 days |

**Total Duration:** ~2 weeks (exploratory pace)

## Technical Approach

### Prototype Structure
```
website/
  rebrand/
    index.html           # Main prototype
    styles/
      variables.css      # Brand tokens
      typography.css     # Font system
      components.css     # Reusable elements
    iterations/
      hero-v1.html
      hero-v2.html
      hero-v3.html
      sections-v1.html
    assets/
      logos/
      icons/
```

### CSS Custom Properties (Brand Tokens)
```css
:root {
  /* Sunset Palette */
  --color-cream: #FCFBF1;
  --color-yellow: #FDC400;
  --color-orange: #FC9500;
  --color-red: #FE4500;
  --color-violet: #E00256;
  --color-purple: #A70086;
  --color-purple-black: #271D26;
  --color-black: #0B0B0B;
  --color-gray: #615F61;

  /* Typography */
  --font-heading: 'Instrument Serif', serif;
  --font-body: 'JetBrains Mono', monospace;
}
```

## Differentiation from Inspiration

| Inspiration | ginko's Unique Take |
|-------------|---------------------|
| Military/government spec sheets | Dev terminal aesthetic |
| Neutral cream + black | Sunset gradient palette |
| Generic registration marks | Ginkgo leaf motif |
| "Field Manual" framing | "Session handoff" / "context graph" |
| Circular seals/stamps | Striped leaf + "iykyg" Easter egg |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Too "designery" for devs | High | Keep terminal elements, monospace prominent |
| Looks like Record copy | Medium | Lean into ginkgo leaf, unique color applications |
| Chris changes direction | Low | Iterate fast, get early feedback |
| Font licensing issues | Low | Instrument Serif is Google Fonts (free) |

---

## Changelog

### v1.0.0 - 2026-02-09
- Initial epic creation
- Comprehensive brand direction captured
- 4-sprint exploration structure
- Prototype-first approach (not production)
