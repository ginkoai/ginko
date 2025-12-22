# Site-002 Design Specification

**Version:** 1.1
**Created:** 2025-12-21
**Updated:** 2025-12-22
**Status:** Beta Review

> **Current Phase:** Reviewing revised design direction with beta users. Prototype available at `site-002/` for feedback collection.

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2025-12-22 | Single-column layout, green logo, larger CTA buttons, increased body text (18px) |
| 1.0 | 2025-12-21 | Initial design spec and prototype |

---

## Overview

A complete redesign of the Ginko marketing site addressing user feedback that the current site is "too techy" and "anxiety-inducing." The new design prioritizes clarity, warmth, and the core message: **"Focus without anxiety."**

## User Feedback Summary

| Issue | Feedback |
|-------|----------|
| Visual style | "Too techy," makes people "feel lost in the matrix" |
| Colors | Dark background + electric green are "jarring," hard to focus |
| Messaging | Doesn't convey "Focus without anxiety" - actually feels anxiety-inducing |

## Design Objectives

1. **Make it lighter and more soothing** while keeping energy up
2. **Clarify the message** - visitors should understand what Ginko does
3. **Single page** - streamlined, scrollable experience
4. **Typography-driven** - cards tell the Ginko story through words

---

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Navy | `#011C40` | Nav header background |
| Gold | `#F2BB13` | CTA accent (cards 1, 6) |
| Orange | `#F87A18` | CTA accent (cards 2, 7) |
| Red-Orange | `#D92B04` | CTA accent (cards 3, 8) |
| Maroon | `#400101` | CTA accent (cards 4, 9) |
| White | `#FFFFFF` | Card backgrounds, nav text |
| Light Grey | `#EEEEEE` | Body background |
| Dark Grey | `#333333` | Section headers |
| Black | `#000000` | Index numerals, body text |

### CTA Color Cycling

Section card CTAs cycle through the warm palette colors:
- Cards 1, 6: Gold (`#F2BB13`) with dark text
- Cards 2, 7: Orange (`#F87A18`) with white text
- Cards 3, 8: Red-Orange (`#D92B04`) with white text
- Cards 4, 9: Maroon (`#400101`) with white text
- Cards 5, 10: Navy (`#011C40`) with white text

---

## Typography

| Element | Font | Size | Color |
|---------|------|------|-------|
| Section Index Numeral | Times New Roman | 144px | `#000000` |
| Section Card Header | Times New Roman | 48px | `#333333` |
| Problem/Solution Text | Roboto | 18px | `#000000` |
| Modal Header | Roboto | 18px | `#000000` |
| Nav Text | System/Roboto | 14px | `#FFFFFF` |

### Font Loading

- **Times New Roman:** System font (no loading required)
- **Roboto:** Google Fonts (preconnect for performance)

---

## Page Structure

### 1. Nav Header

- **Background:** `#011C40`
- **Behavior:** Fixed at top on scroll
- **Components:**
  - Ginko Logo (left)
  - NPM Install CTA (center) - copyable command: `npm install -g @ginkoai/cli`
  - Sign In link (right) - links to dashboard

### 2. Body

- **Background:** `#EEEEEE`
- **Content:** 10 Section Cards in responsive grid

### 3. Section Cards

- **Background:** `#FFFFFF`
- **Corners:** `border-radius: 8px`
- **Layout:** Two-column within card
  - **Left column:** Large index numeral (01-10) + Large square CTA button (stacked vertically)
  - **Right column:** Section header + Problem text + Solution text
- **CTA Button:** Large square/rectangle (~144px), cycles through palette colors

### 4. Modal Window

- **Background:** `#EEEEEE`
- **Corners:** `border-radius: 12px`
- **Behavior:**
  - Click outside to close
  - X button to close
  - Escape key to close
  - Focus trap for accessibility
- **Components:**
  - Close button (X)
  - Media placeholder (image/video area)
  - Modal header text
  - "Get Started" CTA button

---

## 10 Section Topics

| # | Title | Theme |
|---|-------|-------|
| 01 | Maximize Flow | Stay in the zone, minimize interruptions |
| 02 | Maintain Rapport | Build understanding between human and AI |
| 03 | Partners, Not Assistants | Collaborative relationship, not command/response |
| 04 | Use Comparative Advantage | Let AI do what it's good at, humans do what they're good at |
| 05 | Work With Intent | Purposeful, goal-oriented development |
| 06 | Preserve Knowledge | Capture insights, decisions, context for the future |
| 07 | Iterate And Deliver | Ship continuously, improve incrementally |
| 08 | Introducing Vibe Tribes | Team collaboration and shared context |
| 09 | Collaborate Natively | Work in your existing tools, not a separate app |
| 10 | Coach With Insight | AI that learns and improves with you |

---

## Responsive Breakpoints

| Breakpoint | Width | Layout | Card Layout |
|------------|-------|--------|-------------|
| Mobile | < 640px | Single column | Numeral + CTA side-by-side, text below |
| Tablet | 640px - 1024px | Single column (max 800px) | Numeral + CTA stacked left, text right |
| Desktop | > 1024px | Single column (max 800px) | Numeral + CTA stacked left, text right |

---

## Accessibility Requirements (WCAG 2.2 AA)

### Color Contrast
- All text must meet 4.5:1 ratio for normal text
- Large text (18px+) must meet 3:1 ratio
- CTA buttons with colored backgrounds must have sufficient contrast

### Keyboard Navigation
- All interactive elements focusable via Tab
- Modal focus trap (Tab cycles within modal)
- Escape key closes modal
- Visible focus indicators

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for interactive elements
- Modal announced with `role="dialog"` and `aria-modal="true"`

### Motion
- Respect `prefers-reduced-motion` for animations

---

## Technical Implementation

### Stack
- **Framework:** React 18
- **Build Tool:** Vite 5
- **Language:** TypeScript
- **Styling:** CSS (no framework, custom properties)

### Directory Structure
```
site-002/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   └── ginko-logo-white.png
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── components/
    │   ├── NavHeader.tsx
    │   ├── SectionCard.tsx
    │   └── Modal.tsx
    └── data/
        └── sections.ts
```

### Build Output
- Static files in `dist/` directory
- Relative asset paths for easy deployment

---

## Logo

- **File:** `ginko-logo-green.png` (primary), `ginko-logo-white.png` (alternate)
- **Original Size:** 1625 x 607 pixels
- **Usage:** Nav header (scaled to 40px height)
- **Background:** Transparent

---

## Links

| Element | Destination |
|---------|-------------|
| Sign In | `https://app.ginkoai.com` (dashboard) |
| Get Started (modal) | `https://app.ginkoai.com/signup` |
| NPM Install | Copy to clipboard: `npm install -g @ginkoai/cli` |

---

## Wireframe Reference

See attached wireframe images:
- Page wireframe: Shows card layout with index numeral, header, problem/solution text, CTA
- Modal wireframe: Shows close button, media placeholder, header, CTA button
