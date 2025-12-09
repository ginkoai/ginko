# Dashboard Visual Audit

> EPIC-005 Sprint 1 - TASK-6
> Audit of dashboard against marketing site design system

---

## Executive Summary

The dashboard uses a standard light-mode Shadcn/UI design system that doesn't align with the marketing site's dark-first, industrial "Brass Hands" aesthetic. Key gaps include color tokens, typography, spacing, and signature visual elements (corner brackets).

**Overall Alignment Score: 25%** - Significant refresh needed.

---

## Gap Analysis

### 1. Color Tokens

| Element | Marketing Site | Dashboard | Gap |
|---------|---------------|-----------|-----|
| **Background (dark)** | `#31332B` / `#101010` | White `#FFFFFF` | Critical - Wrong theme default |
| **Accent color** | `#C1F500` (ginko green) | `#3B82F6` (blue) | Critical - Wrong brand color |
| **Text primary** | `#FAFAFA` | `#0A0A0A` | Critical - Inverted for dark mode |
| **Text secondary** | `#C5C5B8` | `#64748B` (gray) | Medium |
| **Border** | `#2a2a2a` | `#E5E5E5` | Critical |
| **Surface** | `#101010` | `#FFFFFF` | Critical |

**Priority: HIGH** - Dashboard is light-mode while marketing is dark-first.

### 2. Typography

| Element | Marketing Site | Dashboard | Gap |
|---------|---------------|-----------|-----|
| **Headings font** | JetBrains Mono | Inter | Critical - Wrong font |
| **Body font** | Inter | Inter | Aligned |
| **Mono font** | JetBrains Mono | JetBrains Mono | Aligned |
| **Heading weight** | 700-800 (bold/extrabold) | 500-600 (medium/semibold) | Medium |
| **Font sizes** | Custom scale (--font-size-*) | Tailwind default | Low |

**Priority: HIGH** - Headings should use JetBrains Mono for brand consistency.

### 3. Spacing System

| Element | Marketing Site | Dashboard | Gap |
|---------|---------------|-----------|-----|
| **Base unit** | 4px (--space-1 to --space-24) | Tailwind default (4px base) | Aligned |
| **Section padding** | --space-20 (80px) | Varies | Low |
| **Card padding** | --space-8 (32px) | Tailwind p-4/p-6 | Low |

**Priority: LOW** - Tailwind defaults are close enough.

### 4. Component Styles

#### Buttons

| Element | Marketing Site | Dashboard | Gap |
|---------|---------------|-----------|-----|
| **Primary bg** | `#C1F500` (green) | `#3B82F6` (blue) | Critical |
| **Primary text** | `#0A0A0A` (black) | `#FFFFFF` (white) | Critical |
| **Border radius** | `9999px` (pill) | `0.375rem` (rounded-md) | High |
| **Font** | JetBrains Mono | System | Medium |

#### Cards

| Element | Marketing Site | Dashboard | Gap |
|---------|---------------|-----------|-----|
| **Background** | `var(--color-surface)` dark | White | Critical |
| **Border** | `#2a2a2a` subtle | `#E5E5E5` gray | Critical |
| **Border radius** | `--radius-lg` (12px) | `rounded-lg` (8px) | Low |
| **Shadow** | Custom dark shadows | `shadow-sm` | Medium |

#### Inputs

| Element | Marketing Site | Dashboard | Gap |
|---------|---------------|-----------|-----|
| **Background** | Dark surface | White | Critical |
| **Border** | Dark subtle | Light gray | Critical |
| **Focus ring** | Green accent | Blue | High |

### 5. Dark Theme

| Element | Marketing Site | Dashboard | Gap |
|---------|---------------|-----------|-----|
| **Default theme** | Dark | Light | Critical |
| **Dark mode support** | Yes (data-theme="dark") | Yes (.dark class) | Aligned mechanism |
| **Dark mode colors** | Custom ginko palette | Shadcn defaults | High |

**Priority: CRITICAL** - Dashboard should default to dark mode.

### 6. Signature Visual Elements

| Element | Marketing Site | Dashboard | Gap |
|---------|---------------|-----------|-----|
| **Corner brackets** | Yes (Brass Hands style) | No | High - Brand signature |
| **Diagonal stripe dividers** | Yes | No | Medium |
| **Terminal styling** | Yes (accent prompts) | No | Medium |
| **Gradient backgrounds** | Subtle (surface gradients) | None | Low |

**Priority: HIGH** - Corner brackets are a brand signature.

---

## Priority List for Visual Refresh

### P0 - Critical (Must Fix)

1. **Dark mode as default**
   - Switch dashboard to dark-first
   - Update CSS variables for dark theme
   - Files: `globals.css`, `layout.tsx`

2. **Accent color: Blue → Ginko Green**
   - Replace `#3B82F6` with `#C1F500`
   - Update all primary color references
   - Files: `globals.css`, `tailwind.config.js`, `button.tsx`

3. **Button styling**
   - Green background, black text
   - Pill shape (border-radius: 9999px)
   - JetBrains Mono font
   - Files: `button.tsx`

4. **Card styling**
   - Dark background
   - Subtle dark borders
   - Files: `card.tsx`

### P1 - High (Should Fix)

5. **Heading typography**
   - Use JetBrains Mono for h1-h6
   - Increase weight to 700
   - Files: `globals.css`, component styles

6. **Corner brackets**
   - Add to key cards and sections
   - Port CSS from marketing site
   - Files: New `corner-brackets.css` or component

7. **Sidebar update**
   - Dark background
   - Green accent for active state
   - Files: `dashboard-sidebar.tsx`

8. **Navigation/header**
   - Dark background with blur
   - Green logo accent
   - Files: `dashboard-nav.tsx`

### P2 - Medium (Nice to Have)

9. **Focus states**
   - Green focus rings instead of blue
   - Files: `globals.css`, component styles

10. **Terminal/code blocks**
    - Match marketing site terminal styling
    - Green prompts

11. **Diagonal stripe dividers**
    - Add between major sections

12. **Loading states**
    - Update shimmer to dark theme

### P3 - Low (Optional)

13. **Subtle gradients**
    - Add surface gradients where appropriate

14. **Custom scrollbar**
    - Match dark theme

---

## Design Token Mapping

### Marketing Site → Dashboard Translation

```css
/* Marketing Site Tokens → Dashboard CSS Variables */

/* Backgrounds */
--color-bg: #31332B;           → --background: 75 4% 18%;
--color-surface: #101010;       → --card: 0 0% 6%;

/* Accent */
--color-accent: #C1F500;        → --primary: 74 100% 48%;
--color-accent-hover: #addc00;  → --primary-hover: 74 100% 43%;

/* Text */
--color-text: #FAFAFA;          → --foreground: 0 0% 98%;
--color-text-secondary: #C5C5B8; → --muted-foreground: 60 6% 75%;

/* Borders */
--color-border: #2a2a2a;        → --border: 0 0% 16%;
--color-border-strong: #3a3a3a; → --border-strong: 0 0% 23%;

/* Terminal */
--color-terminal-bg: #101010;   → --terminal-bg: 0 0% 6%;
--color-terminal-prompt: #C1F500; → --terminal-prompt: 74 100% 48%;
```

---

## Implementation Notes

### Phase 1: Token Alignment (TASK-7)
- Import marketing site CSS variables into dashboard
- Update Tailwind config to use new tokens
- Set dark mode as default

### Phase 2: Component Updates (TASK-8)
- Update Button, Card, Input components
- Update Sidebar and Nav
- Add corner bracket component

### Phase 3: Polish
- Terminal styling
- Dividers and visual flourishes
- Loading states

---

## Files to Modify

### High Priority
- `dashboard/src/app/globals.css` - CSS variables
- `dashboard/tailwind.config.js` - Color tokens
- `dashboard/src/app/layout.tsx` - Dark mode default
- `dashboard/src/components/ui/button.tsx` - Styling
- `dashboard/src/components/ui/card.tsx` - Styling
- `dashboard/src/components/dashboard/dashboard-sidebar.tsx` - Dark + green

### Medium Priority
- `dashboard/src/components/dashboard/dashboard-nav.tsx` - Header styling
- `dashboard/src/components/ui/input.tsx` - Dark styling
- `dashboard/src/components/ui/badge.tsx` - Colors

### New Files
- `dashboard/src/components/ui/corner-brackets.tsx` - Brass Hands signature element

---

## Checklist

- [x] Color token gap analysis
- [x] Typography gap analysis
- [x] Spacing system comparison
- [x] Component styles audit
- [x] Dark theme assessment
- [x] Signature elements identified
- [x] Priority list created
- [x] Token mapping defined
- [x] Files to modify listed

---

*Created: 2025-12-09*
*Status: Complete*
