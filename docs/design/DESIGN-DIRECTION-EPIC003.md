# Ginko Marketing Site Design Direction & Style Guide

**Epic:** EPIC-003 Sprint 1
**Created:** 2025-12-02
**Updated:** 2025-12-03
**Status:** IMPLEMENTED

## Confirmed Decisions

- **Primary Accent:** #aeff00 (electric lime ginko green)
- **Theme Support:** Dual themes (light + dark) via `data-theme` attribute
- **Style Priority:** Brass Hands aesthetic (industrial precision, corner brackets)

---

## Design Philosophy

Synthesized from style references:
- **Brass Hands** - Industrial precision, monospace authenticity, corner bracket decorations
- **Stripe Dev** - Developer-first patterns, keyboard shortcuts, clean hierarchy
- **Cloudflare Docs** - Scannable organization, hands-on pathways, dual theme support
- **Monospace Web** - Typography as structure, constraint-driven design, terminal authenticity

### Core Principle

**"Technical precision meets developer empathy"**

The design should feel like a well-crafted tool: precise, predictable, and efficient. It signals to developers that ginko understands their world - terminals, code editors, and the value of flow state.

---

## Typography

### Font Stack

```css
--font-mono: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
--font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Font Size Scale (16px base)

```css
--font-size-xs: 0.75rem;      /* 12px */
--font-size-sm: 0.875rem;     /* 14px */
--font-size-base: 1rem;       /* 16px */
--font-size-lg: 1.125rem;     /* 18px */
--font-size-xl: 1.25rem;      /* 20px */
--font-size-2xl: 1.5rem;      /* 24px */
--font-size-3xl: 2rem;        /* 32px */
--font-size-4xl: 2.5rem;      /* 40px */
--font-size-5xl: 3rem;        /* 48px */
--font-size-6xl: 3.5rem;      /* 56px */
```

### Font Weights

```css
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-extrabold: 800;
```

### Usage Guidelines

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Hero headline | Mono | 700-800 | 56px (6xl) |
| Section headers | Mono | 600-700 | 40px (4xl) |
| Subheadings | Mono | 500-600 | 24px (2xl) |
| Body text | Sans | 400 | 16-18px |
| Code/terminal | Mono | 400-500 | 14-16px |
| UI labels | Mono | 500-600 | 12-14px |
| Navigation | Mono | 500 | 14px |

### Hierarchy Principles

- Headlines in monospace establish technical credibility
- Body copy in sans-serif ensures readability for longer content
- All code, commands, and technical references in monospace
- Line height: 1.2 for headings, 1.6 for body text

---

## Color Palette

### Light Mode (Default)

```css
/* Backgrounds */
--color-bg: #FAFAFA;
--color-surface: #FFFFFF;
--color-surface-hover: #F5F5F5;

/* Text */
--color-text: #0A0A0A;
--color-text-secondary: #525252;
--color-text-tertiary: #737373;

/* Accents - Electric Lime */
--color-accent: #aeff00;
--color-accent-hover: #9ae600;
--color-accent-light: rgba(174, 255, 0, 0.15);
--color-accent-dark: #8acc00;

/* Borders */
--color-border: #E5E5E5;
--color-border-strong: #D4D4D4;

/* Terminal */
--color-terminal-bg: #171717;
--color-terminal-text: #D4D4D4;
--color-terminal-prompt: #aeff00;
--color-terminal-comment: #737373;
--color-terminal-header: #262626;
```

### Dark Mode

```css
[data-theme="dark"] {
    --color-bg: #0A0A0A;
    --color-surface: #171717;
    --color-surface-hover: #262626;
    --color-text: #FAFAFA;
    --color-text-secondary: #A3A3A3;
    --color-text-tertiary: #737373;
    --color-border: #262626;
    --color-border-strong: #404040;
    --color-accent-light: #14532D;
    --color-terminal-bg: #0A0A0A;
    --color-terminal-header: #171717;
}
```

### Semantic Colors

```css
--color-success: #22C55E;
--color-warning: #F59E0B;
--color-danger: #EF4444;
--color-info: #3B82F6;
```

---

## Spacing System

Based on 4px base unit:

```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
```

### Section Spacing

- Hero: `--space-16` + 60px top, `--space-12` bottom
- Content sections: `--space-16` to `--space-20` vertical
- Cards: `--space-6` to `--space-8` internal padding
- Inline elements: `--space-2` to `--space-4`

---

## Border Radius

```css
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
```

**Special:** Buttons use `border-radius: 9999px` (pill shape)

---

## Shadows

### Light Mode

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

### Dark Mode

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
```

---

## Motion & Transitions

### Timing

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Standard Hover Effects

```css
/* Button lift */
:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

/* Card lift (pricing) */
:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}
```

### Animations

```css
@keyframes cursor-blink {
    0%, 50%   { opacity: 1; }
    51%, 100% { opacity: 0; }
}
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

## Component Patterns

### Buttons

**Primary Button** (`.btn-primary`)
```css
background: var(--color-accent);      /* #aeff00 */
color: #0A0A0A;
border: 2px solid var(--color-accent);
border-radius: 9999px;               /* pill-shaped */
padding: var(--space-3) var(--space-6);
font-family: var(--font-mono);
font-weight: 500;

:hover {
    background: var(--color-accent-hover);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}
```

**Secondary Button** (`.btn-secondary`)
```css
background: transparent;
color: var(--color-accent);
border: 2px solid var(--color-accent);

:hover {
    background: var(--color-accent);
    color: white;
}
```

**Outline Button** (`.btn-outline`)
```css
background: transparent;
color: var(--color-text);
border: 2px solid var(--color-border-strong);

:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
}
```

**Size Variants:**
- `.btn-large`: `padding: var(--space-4) var(--space-8)`
- `.btn-primary-large` / `.btn-secondary-large`: Full-sized versions

### Cards

**Base Card**
```css
.card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    padding: var(--space-8);
    position: relative; /* for corner brackets */
}
```

**Featured Card**
```css
.card.featured {
    border-color: var(--color-accent);
    background: var(--color-accent-light);
}
```

### Corner Brackets (Brass Hands Signature)

```html
<div class="[component]">
    <div class="corner-bracket top-left"></div>
    <div class="corner-bracket top-right"></div>
    <!-- Content -->
    <div class="corner-bracket bottom-left"></div>
    <div class="corner-bracket bottom-right"></div>
</div>
```

```css
.corner-bracket {
    position: absolute;
    width: 12px;
    height: 12px;
    border-color: var(--color-accent);
    border-style: solid;
}
.top-left     { top: -6px; left: -6px; border-width: 2px 0 0 2px; }
.top-right    { top: -6px; right: -6px; border-width: 2px 2px 0 0; }
.bottom-left  { bottom: -6px; left: -6px; border-width: 0 0 2px 2px; }
.bottom-right { bottom: -6px; right: -6px; border-width: 0 2px 2px 0; }
```

**Used on:** Hero content, all cards, terminal windows, testimonials, CTA sections

### Terminal Components

**Terminal Window**
```html
<div class="terminal-window">
    <div class="corner-bracket top-left"></div>
    <div class="corner-bracket top-right"></div>
    <div class="terminal-header">
        <div class="terminal-controls">
            <span class="control red"></span>
            <span class="control yellow"></span>
            <span class="control green"></span>
        </div>
        <span class="terminal-title">terminal</span>
    </div>
    <div class="terminal-body">
        <div class="terminal-line">
            <span class="prompt">$</span> ginko start
        </div>
        <div class="terminal-line response">
            <span class="status-icon">✓</span> Session restored
        </div>
    </div>
    <div class="corner-bracket bottom-left"></div>
    <div class="corner-bracket bottom-right"></div>
</div>
```

**Inline Terminal (Copyable)**
```html
<div class="terminal-inline terminal-copyable terminal-bracketed"
     data-copy="npm install -g @ginkoai/cli">
    <div class="corner-bracket top-left"></div>
    <div class="corner-bracket top-right"></div>
    <span class="terminal-prompt">$</span>
    <span class="terminal-command">npm install -g @ginkoai/cli</span>
    <button class="copy-btn" aria-label="Copy to clipboard">
        <span class="copy-icon">⧉</span>
        <span class="copy-success">✓</span>
    </button>
    <div class="corner-bracket bottom-left"></div>
    <div class="corner-bracket bottom-right"></div>
</div>
```

### Section Dividers

```html
<div class="section-divider"></div>
<div class="section-divider--inverted section-divider"></div>
```

```css
.section-divider {
    height: 20px;
    background: repeating-linear-gradient(
        -45deg,
        var(--color-accent),
        var(--color-accent) 2px,
        transparent 2px,
        transparent 10px
    );
}
```

---

## Layout

### Container Widths

```css
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--space-6);
}
```

### Responsive Breakpoints

```css
/* Tablet */
@media (max-width: 1024px) {
    .container { padding: 0 var(--space-4); }
    /* Reduce hero title to font-size-5xl */
}

/* Mobile */
@media (max-width: 768px) {
    --font-size-6xl: 2.5rem;
    --font-size-5xl: 2rem;
    --font-size-4xl: 1.75rem;
    /* Single column grids */
    /* Stack buttons vertically */
}
```

### Grid Patterns

```css
/* Problem/Feature grids */
.problem-grid, .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-8);
}

/* Pricing grid (3 columns) */
.pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-6);
}
```

---

## Navigation

```html
<nav class="navbar">
    <div class="nav-container">
        <div class="nav-logo">
            <span class="logo-text">ginko</span>
        </div>
        <div class="nav-menu">
            <a href="#developers" class="nav-link">Developers</a>
            <a href="#teams" class="nav-link">Teams</a>
            <a href="#pricing" class="nav-link">Pricing</a>
            <a href="https://docs.ginko.ai" class="nav-link">Docs</a>
        </div>
        <div class="nav-actions">
            <a href="https://app.ginkoai.com/auth/signup" class="btn-primary">Get Started</a>
        </div>
    </div>
</nav>
```

```css
.navbar {
    position: fixed;
    top: 0;
    z-index: 1000;
    background: rgba(250, 250, 250, 0.8);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-border);
}

[data-theme="dark"] .navbar {
    background: rgba(10, 10, 10, 0.8);
}
```

---

## Page Structure Template

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ginko - [Page Title]</title>
    <meta name="description" content="[Description]">
    <link rel="stylesheet" href="styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <nav class="navbar">...</nav>

    <section class="hero">
        <div class="container">...</div>
    </section>

    <div class="section-divider"></div>

    <section class="[section-name]">
        <div class="container">...</div>
    </section>

    <div class="section-divider"></div>

    <!-- More sections -->

    <div class="section-divider--inverted section-divider"></div>

    <footer class="footer">...</footer>

    <div id="toast" class="toast">Copied!</div>
    <script src="script.js"></script>
</body>
</html>
```

---

## Accessibility

### Focus States

```css
:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
}
```

### ARIA Requirements

- All icon buttons: `aria-label="[description]"`
- Interactive elements without text must have labels
- Proper heading hierarchy (h1 > h2 > h3)

---

## Key Design Principles Summary

1. **Corner brackets everywhere** - Brass Hands signature on all cards/containers
2. **Electric lime accent** - #aeff00 for CTAs and highlights
3. **Pill-shaped buttons** - border-radius: 9999px
4. **Monospace headings** - JetBrains Mono for technical feel
5. **Terminal authenticity** - Dark backgrounds, proper prompt styling
6. **Lift on hover** - translateY(-2px) for interactive elements
7. **Section dividers** - Diagonal stripes between sections
8. **Dual theme** - Light/dark via data-theme attribute
9. **4px spacing scale** - Consistent spacing multiples
10. **Container pattern** - All sections wrap content in .container

---

## File References

- **Styles:** `/website/styles.css` (1503 lines)
- **Homepage:** `/website/index.html` (409 lines)
- **JavaScript:** `/website/script.js` (298 lines)

---

*Last updated: 2025-12-03 | Version: 2.0 (Implemented)*
