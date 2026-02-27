# Ginko Brand Guidelines

> Living document for maintaining visual consistency across Ginko products and marketing.

---

## Typography

### Font Families

| Font | Use Case | Fallbacks |
|------|----------|-----------|
| **Anton** | Headlines, titles, display text | Impact, sans-serif |
| **JetBrains Mono** | Body text, code, UI elements | SF Mono, Monaco, Cascadia Code, Courier New, monospace |

### Type Scale

Based on a **1.25 ratio** (Major Third) with 16px base.

| Token | Size | Line Height | Use Case |
|-------|------|-------------|----------|
| `--text-display` | 80px (5rem) | 1.0 | Hero headlines only |
| `--text-h1` | 56px (3.5rem) | 1.1 | Page/section titles |
| `--text-h2` | 40px (2.5rem) | 1.2 | Section headers |
| `--text-h3` | 32px (2rem) | 1.2 | Subsection headers |
| `--text-h4` | 24px (1.5rem) | 1.3 | Card titles, feature names |
| `--text-lg` | 18px (1.125rem) | 1.6 | Lead paragraphs, subtitles |
| `--text-base` | 16px (1rem) | 1.6 | Body text |
| `--text-sm` | 14px (0.875rem) | 1.5 | Captions, metadata, labels |
| `--text-xs` | 12px (0.75rem) | 1.4 | Fine print, timestamps |

### Mobile Reductions

Apply consistent **20% reduction** at mobile breakpoint (768px):

| Desktop | Mobile |
|---------|--------|
| 80px | 64px |
| 56px | 44px |
| 40px | 32px |
| 32px | 26px |
| 24px | 20px |

### Typography Rules

1. **One H1 per page** - For SEO and accessibility
2. **Headlines in Anton** - Always uppercase, letter-spacing: 0.02em
3. **Body in JetBrains Mono** - Lowercase, comfortable line-height (1.6)
4. **No font-size in px** - Use rem or CSS custom properties
5. **Semantic hierarchy** - Visual size must match semantic level (H1 > H2 > H3)

---

## Color Palette

### The Ginko Rainbow

Our signature gradient, inspired by sunset colors. Used for accents, dividers, and brand moments.

| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| **Yellow** | `#FDC400` | 253, 196, 0 | Highlight, first in sequence |
| **Orange** | `#FC9500` | 252, 149, 0 | Accent, warmth |
| **Red/Coral** | `#FE4500` | 254, 69, 0 | Primary accent, CTAs |
| **Magenta** | `#E00256` | 224, 2, 86 | Energy, emphasis |
| **Purple** | `#A70086` | 167, 0, 134 | Depth, end of sequence |

### Background Colors

| Name | Hex | Use |
|------|-----|-----|
| **Cream** | `#FAF8F0` | Primary background (light mode) |
| **Eggshell** | `#F4F0E0` | Alternating sections, cards |
| **Deep Black** | `#0d0d0d` | Dark mode background |
| **Warm Black** | `#100D08` | Text color (light mode) |

### Text Colors

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--color-text` | `#100D08` | `#FAF8F0` |
| `--color-text-secondary` | `#333333` | `#e0ddd6` |
| `--color-text-tertiary` | `#666666` | `#999999` |

### Accent Colors

| Token | Value | Use |
|-------|-------|-----|
| `--color-accent` | `#FE4500` | Primary buttons, links, highlights |
| `--color-accent-hover` | `#E53D00` | Hover states |
| `--color-accent-light` | `rgba(254, 69, 0, 0.15)` | Subtle backgrounds |

### Semantic Colors

| Name | Hex | Use |
|------|-----|-----|
| Success | `#22C55E` | Confirmations, positive states |
| Warning | `#F59E0B` | Cautions, attention |
| Danger | `#EF4444` | Errors, destructive actions |
| Info | `#3B82F6` | Informational messages |

### Terminal Theme

| Element | Color |
|---------|-------|
| Background | `#0d0d0d` |
| Text | `#FAF8F0` |
| Prompt | `#FE4500` |
| Comments | `#666666` |
| Header bar | `#1a1a1a` |

---

## Spacing

Based on a **4px grid** with 1rem = 16px base.

| Token | Value | Pixels |
|-------|-------|--------|
| `--space-1` | 0.25rem | 4px |
| `--space-2` | 0.5rem | 8px |
| `--space-3` | 0.75rem | 12px |
| `--space-4` | 1rem | 16px |
| `--space-5` | 1.25rem | 20px |
| `--space-6` | 1.5rem | 24px |
| `--space-8` | 2rem | 32px |
| `--space-10` | 2.5rem | 40px |
| `--space-12` | 3rem | 48px |
| `--space-16` | 4rem | 64px |
| `--space-20` | 5rem | 80px |
| `--space-24` | 6rem | 96px |

### Spacing Guidelines

- **Container padding**: `--space-8` (32px) desktop, `--space-4` (16px) mobile
- **Section padding**: `--space-20` (80px) vertical
- **Card padding**: `--space-6` to `--space-8`
- **Button padding**: `--space-3` vertical, `--space-6` horizontal
- **Stack spacing**: `--space-4` between related elements

---

## Layout

### Container

```css
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 var(--space-8);
}
```

### Breakpoints

| Name | Width | Target |
|------|-------|--------|
| Mobile | < 768px | Phones |
| Tablet | 768px - 1024px | Tablets, small laptops |
| Desktop | > 1024px | Laptops, desktops |

### Grid

- 12-column grid for complex layouts
- Gutter: `--space-4` (16px) to `--space-8` (32px)
- Full-bleed sections: `width: 100vw; margin-left: calc(-50vw + 50%);`

---

## Components

### Buttons

**Primary (Accent)**
- Background: `--color-accent` (#FE4500)
- Text: White
- Padding: `--space-3` `--space-6`
- Border-radius: 4px
- Hover: `--color-accent-hover`

**Secondary**
- Background: `--color-terminal-bg` (#0d0d0d)
- Text: Cream (#FAF8F0)
- Border: none

### Cards

- Background: `--color-surface` (#F4F0E0)
- Border: 2px solid `--color-text`
- Border-radius: 8px
- Padding: `--space-4` to `--space-6`
- Hover: translateY(-2px), box-shadow

### Links

- Color: `--color-accent`
- Underline on hover
- No underline by default (in body text) or underline always (in navigation)

### Section Dividers

- Simple: thin line at `--color-border`
- Rainbow: 5-band gradient using Ginko Rainbow colors
- ASCII: "iykyg\" repeating pattern (special brand moment)

---

## Interactive Elements

### Guitar String FAQ Lines

A signature Ginko interaction:
- Thin, taut lines (1px, `#1a1a1a`)
- Deflect toward cursor on hover
- Spring physics snap-back with oscillation
- Color intensity increases with deflection (Ginko Rainbow)
- Pluck sound on release (Web Audio API)

### Hover States

- Scale: 1.02 - 1.05 for subtle lift
- Color transitions: 0.3s ease
- Transform transitions: 0.2s ease

---

## Logo Usage

### Primary Logo
- Rainbow-striped ginkgo leaf + wordmark
- Minimum size: 32px height
- Clear space: 1x leaf height on all sides

### Wordmark Only
- Use when space is limited
- Minimum size: 24px height

### Favicon
- Simplified leaf icon
- Works at 16px, 32px, 192px

---

## Voice & Tone

### Brand Personality
- **Technical but approachable** - We speak developer, but we're not intimidating
- **Confident but not arrogant** - We know our stuff, we don't brag
- **Playful but purposeful** - Fun interactions that serve a function
- **Clear and concise** - No fluff, respect for reader's time

### Writing Guidelines
- Use active voice
- Lead with benefits, follow with features
- Avoid jargon unless speaking to developers
- One idea per sentence
- Headlines: Action-oriented, benefit-focused

---

## File Naming

### Images
```
[type]-[description]-[variant].[ext]
hero-dumbo-clean.png
logo-rainbow-striped.svg
icon-terminal-32.png
```

### CSS Classes (BEM)
```
.block__element--modifier
.faq-wiggly__question--active
.btn__icon--left
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-27 | Initial brand guidelines |

---

*This document should be updated as the brand evolves. When in doubt, refer to existing implementations on ginkoai.com.*
