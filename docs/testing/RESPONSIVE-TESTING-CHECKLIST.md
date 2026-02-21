# Responsive Testing Checklist

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Scope:** Website responsive testing across viewports

---

## Device Testing Matrix

| Category | Device | Viewport | Priority |
|----------|--------|----------|----------|
| **Mobile** | iPhone SE | 375 × 667 | High |
| **Mobile** | iPhone 14 Pro | 393 × 852 | High |
| **Mobile** | Android (Pixel 7) | 412 × 915 | Medium |
| **Tablet** | iPad Mini (portrait) | 768 × 1024 | High |
| **Tablet** | iPad Mini (landscape) | 1024 × 768 | **Critical** |
| **Tablet** | iPad Air (portrait) | 820 × 1180 | Medium |
| **Tablet** | iPad Air (landscape) | 1180 × 820 | High |
| **Tablet** | iPad Pro 12.9 (portrait) | 1024 × 1366 | Medium |
| **Tablet** | iPad Pro 12.9 (landscape) | 1366 × 1024 | High |
| **Desktop** | Small laptop | 1280 × 800 | High |
| **Desktop** | Large desktop | 1920 × 1080 | Medium |

> **Rule: Always test tablets in BOTH portrait and landscape orientations.**
> Landscape often hits different breakpoints than portrait, especially near 1024px.

## CSS Breakpoints (styles.css)

| Breakpoint | Target |
|------------|--------|
| `1024px` | Tablet / small desktop |
| `768px` | Tablet portrait |
| `480px` | Mobile |

---

## Pages to Test

1. `index.html` (homepage)
2. `blog/` (blog listing + individual posts)
3. `how-it-works.html`
4. `developers.html`
5. `teams.html`
6. `get-started.html`
7. `privacy.html` / `terms.html`

---

## Junction & Bracket Verification

**IMPORTANT:** The site uses decorative corner brackets and junction markers on grids/tables. These require special attention during responsive testing.

### Element Reference

| Element | Symbol | CSS Class | Used In |
|---------|--------|-----------|---------|
| Corner brackets | `└ ┘ ┌ ┐` | `.corner-bracket`, `.bracketed` | Cards, terminals, pricing |
| Section dividers | `////` | `.section-divider` | Between major sections |
| Left T-junction | `├` | `::before` pseudo | Row dividers at left border |
| Right T-junction | `┤` | `::after` pseudo | Row dividers at right border |
| Top T-junction | `┬` | `::before` pseudo | Column dividers at top border |
| Bottom T-junction | `┴` | `::after` pseudo | Column dividers at bottom border |
| Cross junction | `┼` | `::after` pseudo | Where 4 cells meet |

### Junction Checklist

At **each breakpoint**, verify:

- [ ] **Corner brackets** - Do all 4 corners (┌ ┐ └ ┘) render without clipping or overlap?
- [ ] **T-junctions** - Do ├ ┤ ┬ ┴ align precisely with divider lines (not floating)?
- [ ] **Cross junctions** - Does ┼ appear only where 4 cells actually meet?
- [ ] **Grid collapse** - When columns reduce, are orphaned junctions hidden/removed?
- [ ] **No double borders** - Adjacent cells don't create 2px borders where 1px expected?

### Critical Breakpoints for Junctions

| Breakpoint | Grid Change | Risk Area |
|------------|-------------|-----------|
| **375px** | Multi-col → 1-col | Junctions should disappear or simplify |
| **768px** | 3-col → 2-col | Cross junctions may orphan |
| **1024px** | Full grid | All junctions should render |

### Sections with Junction Elements

| Section | Desktop Layout | Junction Types |
|---------|----------------|----------------|
| Transformation cards | 3-column | ├ ┤ at row dividers |
| Pricing | 3-column | Corner brackets per tier |
| FAQ | 2-column | ├ ┤ at row dividers |
| Features | 2×3 grid | ├ ┤ ┬ ┴ ┼ full set |
| Quickstart steps | 1-column | ├ ┤ between steps |

---

## General Responsive Checks

### Navigation
- [ ] Hamburger menu appears at correct breakpoint
- [ ] Mobile menu opens/closes correctly
- [ ] All nav links accessible
- [ ] GET STARTED CTA visible and tappable (44px+ touch target)

### Typography
- [ ] Headings don't overflow containers
- [ ] Body text readable (16px+ on mobile)
- [ ] No orphaned words in headings
- [ ] Code blocks scroll horizontally (not break layout)

### Images & Media
- [ ] Hero images scale correctly
- [ ] No horizontal scroll from oversized images
- [ ] Graph visualization adapts to viewport
- [ ] Logo marquee animates without jank

### Buttons & CTAs
- [ ] Touch targets 44px minimum
- [ ] Buttons don't overflow on mobile
- [ ] Hover states don't break on touch devices
- [ ] Focus states visible for keyboard nav

### Spacing & Layout
- [ ] Consistent padding at all sizes
- [ ] No content touching viewport edges
- [ ] Cards stack properly on mobile
- [ ] Footer links accessible on all devices

---

## Running Responsive Tests

### Quick Playwright Script

```bash
npx tsx -e "
import { chromium } from 'playwright';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 }
];

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });
    const page = await context.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: \`screenshots/homepage-\${vp.name}.png\`,
      fullPage: false
    });
    console.log(\`Saved: homepage-\${vp.name}.png\`);
    await context.close();
  }

  await browser.close();
}

run();
"
```

### Section-Specific Screenshots

```bash
npx tsx -e "
import { chromium } from 'playwright';

const sections = [
  { name: 'pricing', selector: '.pricing' },
  { name: 'faq', selector: '.faq' },
  { name: 'features', selector: '.features' }
];

// ... capture each section at each viewport
"
```

---

## Audit History

| Date | Page | Viewports | Result | Notes |
|------|------|-----------|--------|-------|
| 2026-02-04 | Homepage | 375, 768, 1280, 1920 | ✅ Pass | Junction elements working correctly |
| 2026-02-04 | Homepage | 1024×768 (iPad landscape) | ✅ Fixed | Orphaned T-junctions at breakpoint edge - wrapped desktop rules in `@media (min-width: 1025px)` |

---

## Related Documents

- [LANDING-PAGE-AUDIT.md](../marketing/LANDING-PAGE-AUDIT.md) - Content & messaging audit
- [UAT-TEST-PLAN-EPIC006.md](./UAT-TEST-PLAN-EPIC006.md) - User acceptance testing
