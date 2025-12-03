# Ginko Marketing Site Design Direction

**Epic:** EPIC-003 Sprint 1
**Created:** 2025-12-02
**Status:** APPROVED

## Confirmed Decisions

- **Primary Accent:** #22C55E (ginko green) ✓
- **Theme Support:** Dual themes from day one (light + dark) ✓
- **Style Priority:** Brass Hands aesthetic (industrial precision, corner brackets) with usability as top priority ✓

---

## Design Philosophy

Synthesized from style references:
- **Brass Hands** - Industrial precision, monospace authenticity, minimal color palette
- **Stripe Dev** - Developer-first patterns, keyboard shortcuts, clean hierarchy
- **Cloudflare Docs** - Scannable organization, hands-on pathways, dual theme support
- **Monospace Web** - Typography as structure, constraint-driven design, terminal authenticity

### Core Principle

**"Technical precision meets developer empathy"**

The design should feel like a well-crafted tool: precise, predictable, and efficient. It should signal to developers that ginko understands their world—terminals, code editors, and the value of flow state.

---

## Typography

### Primary Font Stack

```css
--font-mono: "JetBrains Mono", "Fira Code", "SF Mono", "Consolas", monospace;
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Usage

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Hero headline | Mono | 700 | 48-64px |
| Section headers | Mono | 600 | 32-40px |
| Subheadings | Mono | 500 | 24px |
| Body text | Sans | 400 | 16-18px |
| Code/technical | Mono | 400 | 14-16px |
| UI labels | Mono | 500 | 12-14px |
| Navigation | Mono | 500 | 14px |

### Hierarchy Principles

- Headlines in monospace establish technical credibility
- Body copy in sans-serif ensures readability for longer content
- All code, commands, and technical references in monospace
- Consider keyboard shortcut hints à la Stripe Dev: `[G] Get Started`

---

## Color Palette

### Light Mode (Primary)

```css
/* Backgrounds */
--bg-primary: #FAFAFA;      /* Main background */
--bg-secondary: #F5F5F5;    /* Cards, sections */
--bg-code: #1E1E1E;         /* Code blocks (dark) */

/* Text */
--text-primary: #171717;    /* Headings, primary content */
--text-secondary: #525252;  /* Body text, descriptions */
--text-muted: #A3A3A3;      /* Tertiary, timestamps */

/* Accents */
--accent-primary: #22C55E;  /* Primary CTA - ginko green */
--accent-secondary: #16A34A;/* Hover states */
--accent-highlight: #86EFAC;/* Subtle highlights */

/* Borders & Lines */
--border-subtle: #E5E5E5;   /* Dividers */
--border-strong: #D4D4D4;   /* Card borders */
```

### Dark Mode

```css
/* Backgrounds */
--bg-primary: #0A0A0A;      /* Main background */
--bg-secondary: #171717;    /* Cards, sections */
--bg-code: #1E1E1E;         /* Code blocks */

/* Text */
--text-primary: #FAFAFA;    /* Headings, primary content */
--text-secondary: #A3A3A3;  /* Body text, descriptions */
--text-muted: #525252;      /* Tertiary, timestamps */

/* Accents */
--accent-primary: #22C55E;  /* Primary CTA - ginko green */
--accent-secondary: #4ADE80;/* Hover states */
--accent-highlight: #166534;/* Subtle highlights */

/* Borders & Lines */
--border-subtle: #262626;   /* Dividers */
--border-strong: #404040;   /* Card borders */
```

### Semantic Colors

```css
--success: #22C55E;         /* Success states */
--warning: #F59E0B;         /* Warnings */
--error: #EF4444;           /* Errors */
--info: #3B82F6;            /* Informational */
```

---

## Spacing System

Based on 4px base unit, monospace-friendly:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
```

### Section Spacing

- Hero: `--space-24` vertical padding
- Content sections: `--space-16` vertical padding
- Cards: `--space-6` internal padding
- Inline elements: `--space-2` to `--space-4`

---

## Component Patterns

### Buttons

**Primary CTA:**
```css
.btn-primary {
  font-family: var(--font-mono);
  font-weight: 500;
  background: var(--accent-primary);
  color: var(--bg-primary);
  padding: var(--space-3) var(--space-6);
  border: none;
  transition: background 150ms ease;
}
.btn-primary:hover {
  background: var(--accent-secondary);
}
```

**Secondary:**
```css
.btn-secondary {
  font-family: var(--font-mono);
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
  padding: var(--space-3) var(--space-6);
}
```

### Cards

Inspired by Brass Hands' geometric framing:

```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  padding: var(--space-6);
  position: relative;
}

/* Optional: Corner brackets for emphasis */
.card--featured::before,
.card--featured::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid var(--accent-primary);
}
.card--featured::before {
  top: -1px;
  left: -1px;
  border-right: none;
  border-bottom: none;
}
.card--featured::after {
  bottom: -1px;
  right: -1px;
  border-left: none;
  border-top: none;
}
```

### Code Blocks

Terminal-authentic styling:

```css
.code-block {
  font-family: var(--font-mono);
  background: var(--bg-code);
  color: #E5E5E5;
  padding: var(--space-4);
  border-radius: 4px;
  overflow-x: auto;
}

.code-block--with-header {
  /* Terminal-style header */
}
.code-header {
  background: #2D2D2D;
  padding: var(--space-2) var(--space-4);
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.code-header::before {
  content: '●  ●  ●';
  color: #525252;
  font-size: 10px;
}
```

### Navigation

```css
.nav {
  font-family: var(--font-mono);
  font-size: 14px;
  display: flex;
  gap: var(--space-6);
}

.nav-item {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 150ms ease;
}
.nav-item:hover {
  color: var(--text-primary);
}
.nav-item--active {
  color: var(--accent-primary);
}

/* Optional keyboard hints */
.nav-item kbd {
  font-size: 11px;
  padding: 2px 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 2px;
  margin-right: var(--space-1);
}
```

---

## Layout Grid

### Container Widths

```css
--container-sm: 640px;   /* Blog content */
--container-md: 768px;   /* Standard content */
--container-lg: 1024px;  /* Wide content */
--container-xl: 1280px;  /* Full-width sections */
```

### Responsive Breakpoints

```css
--bp-sm: 640px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
```

---

## Motion & Animation

### Principles

- Subtle, purposeful animations only
- No decorative motion that distracts
- Respect `prefers-reduced-motion`

### Timing

```css
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
--easing-default: cubic-bezier(0.4, 0, 0.2, 1);
```

### Standard Transitions

```css
/* Hover states */
transition: color var(--duration-fast) var(--easing-default);
transition: background var(--duration-fast) var(--easing-default);

/* Page transitions (if using) */
transition: opacity var(--duration-normal) var(--easing-default);
```

---

## Iconography

### Approach

- Line icons, consistent 24px base size
- Consider Lucide, Heroicons, or Phosphor
- Monochrome, inheriting text color
- Used sparingly to support, not replace, text

### Usage Guidelines

- Navigation: Icons optional, text primary
- Feature cards: Icon + text label
- CTAs: Text only (icons can distract)
- Status indicators: Small icons with text labels

---

## Key Design Patterns

### 1. Terminal Authenticity

Elements that feel familiar to developers:
- Monospace typography
- Dark code blocks with syntax highlighting
- Command-line style prompts: `$ ginko start`
- Status indicators with technical terminology

### 2. Scannable Hierarchy

From Cloudflare Docs:
- Clear visual sections with consistent headers
- Card-based grouping for related content
- Progressive disclosure (overview → details)
- Generous whitespace between sections

### 3. Developer-First CTAs

From Stripe Dev:
- Keyboard shortcut hints
- Quick-start paths prominent
- "Try it" / playground integrations where possible
- Copy-to-clipboard on code snippets

### 4. Geometric Precision

From Brass Hands:
- Corner bracket accents on featured elements
- Grid-aligned layouts
- Minimal color usage for maximum impact
- Industrial aesthetic without coldness

---

## Current Site Audit Summary

### What to Keep

- Clear problem/solution narrative
- Quantified benefits (metrics)
- Developer-centric language
- Pricing transparency

### What to Change

- Hero: State what ginko IS before the problem
- Typography: Shift to monospace-forward
- Color: Simplify to green accent on neutral base
- Layout: More whitespace, cleaner sections
- CTAs: Reduce repetition, increase clarity
- Remove: Speculative roadmap, emoji overuse

---

## Next Steps

1. [ ] Review and approve design direction
2. [ ] Select/confirm font licensing (JetBrains Mono is free)
3. [ ] Create Figma/design mockups (optional)
4. [ ] Implement design tokens in code
5. [ ] Build component library

---

## Resolved Decisions

1. **Green accent color**: `#22C55E` confirmed ✓

2. **Dark mode priority**: Dual themes from day one ✓

3. **Existing brand assets**: TBD - review lighthouse-logo.svg in website/

4. **Inspiration priority**: Brass Hands (industrial precision) with usability first ✓

5. **Corner brackets**: Use sparingly for featured elements (usability > style) ✓
