---
type: gotcha
status: active
updated: 2026-02-03
tags: [css, website, brackets, junctions, pseudo-elements]
severity: medium
---

# CSS Bracket Junction Overlap Gotcha

## Problem

When fixing or adding bracket junctions (┌┬┐├┼┤└┴┘) to grid layouts, adding explicit marker elements causes **overlapping segments** because the site already has comprehensive pseudo-element rules drawing junctions.

## Symptoms

- Double lines at junction positions
- "Notch" effects where lines extend beyond expected boundaries
- Overlapping horizontal/vertical segments at grid intersections
- Junctions appearing "thicker" than 1px

## Root Cause

The website has a layered junction system:

1. **Grid-level `::before`/`::after`** - Draw outer corner brackets (┌┐└┘) and edge T-junctions (┬┴)
2. **Item-level `::before`/`::after`** - Draw internal T-junctions (├┤) and cross junctions (┼) via adjacent T-junctions meeting

When you add **explicit marker elements** (spans with positioning), they draw ON TOP of the existing pseudo-element rules, causing overlap.

## Solution

**Don't add explicit markers** - use the existing pseudo-element system:

```css
/* These rules already exist and handle junctions */
.faq-item:not(:last-child)::before { /* T-junction at top-right */ }
.faq-item:not(:last-child)::after { /* T-junction at bottom-right */ }
```

Cross junctions (┼) are automatically formed when:
- Item N's `::after` draws ┴ at its bottom
- Item N+2's `::before` draws ┬ at its top
- These meet at the row boundary to form ┼

## Positioning Junctions on Borders

When you DO need explicit junction markers (e.g., custom layouts), use `transform` for reliable centering:

```css
/* WRONG - manual pixel math breaks with different element sizes */
.junction {
    position: absolute;
    bottom: -6px;  /* Fragile - assumes 12px element */
}

/* RIGHT - transform centers element on the border regardless of size */
.junction {
    position: absolute;
    bottom: 0;
    transform: translateY(50%);  /* Centers on border */
}
```

The `translateY(50%)` approach:
- Works regardless of junction element height
- Automatically centers on the border line
- No manual pixel calculations needed

## Debugging Checklist

1. **Check existing rules first** - Search for `::before` and `::after` on the element and its children
2. **Inspect with DevTools** - Look for multiple elements at the same position
3. **Check z-index stacking** - Different z-index values can cause visual artifacts
4. **Reference working example** - Core Concepts section on `how-it-works.html` shows correct implementation

## Reference Implementation

**Core Concepts** (how-it-works.html) uses explicit marker elements because it's a 2x2 grid with custom layout. This is the EXCEPTION, not the rule.

**FAQ section** (index.html) uses the standard pseudo-element system because it follows the standard grid pattern.

## Key Files

- `website/styles.css` lines 4850-4890 - Item-level junction rules
- `website/styles.css` lines 4729-4780 - Grid-level corner bracket rules
- `website/how-it-works.html` lines 146-200 - Explicit marker CSS (reference only)

## When to Use Explicit Markers

Only use explicit positioned marker elements when:
1. The grid has a non-standard structure (like Core Concepts 2x2)
2. The existing pseudo-element selectors don't apply
3. You need junctions at positions not covered by item boundaries

Otherwise, rely on the existing system.
