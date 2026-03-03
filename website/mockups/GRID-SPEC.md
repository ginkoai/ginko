# Ginko Grid System Specification

**Source**: Figma / Design Tool Grid Settings
**Last Updated**: 2026-03-03

---

## Grid Parameters

| Property      | Value    |
|---------------|----------|
| Max Width     | 1400px   |
| Columns       | 12       |
| Gutter        | 20px     |
| Margin        | 0px      |

---

## Calculated Values

```
Total Width:    1400px
Total Gutters:  11 × 20px = 220px
Column Space:   1400px - 220px = 1180px
Column Width:   1180px ÷ 12 = 98.33px
```

---

## Column Spans (at 1400px)

| Cols | Width (approx) | Use Cases |
|------|----------------|-----------|
| 1    | 98px           | Icons, small elements |
| 2    | 217px          | Sidebar icons, narrow elements |
| 3    | 335px          | Cards, small content blocks |
| 4    | 453px          | Medium content, nav groups |
| 5    | 572px          | - |
| 6    | 690px          | Half-width sections |
| 7    | 808px          | - |
| 8    | 927px          | Main content with sidebar |
| 9    | 1045px         | Wide content |
| 10   | 1163px         | - |
| 11   | 1282px         | - |
| 12   | 1400px         | Full width |

---

## CSS Grid Implementation

```css
.grid-container {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

/* Column span classes */
.col-1  { grid-column: span 1; }
.col-2  { grid-column: span 2; }
.col-3  { grid-column: span 3; }
.col-4  { grid-column: span 4; }
.col-5  { grid-column: span 5; }
.col-6  { grid-column: span 6; }
.col-7  { grid-column: span 7; }
.col-8  { grid-column: span 8; }
.col-9  { grid-column: span 9; }
.col-10 { grid-column: span 10; }
.col-11 { grid-column: span 11; }
.col-12 { grid-column: span 12; }

/* Position classes */
.col-start-1  { grid-column-start: 1; }
.col-start-2  { grid-column-start: 2; }
/* ... etc */
```

---

## Mockup Requirements

When creating HTML mockups, **always include**:

1. **Grid overlay toggle** - JavaScript button to show/hide grid lines
2. **Container at 1400px** - Not 1200px or 1400px
3. **Elements snapped to columns** - No "eyeballed" centering
4. **Document column assignments** - Comment which columns each element spans

### Example Footer Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  1    2    3    4    5    6    7    8    9   10   11   12           │
├─────────────────────────────────────────────────────────────────────┤
│  [Logo + CTA]        │         [Social Icons]     │  [Nav Links]    │
│  cols 1-4            │         cols 5-9           │  cols 10-12     │
├─────────────────────────────────────────────────────────────────────┤
│  [Copyright]                                                        │
│  cols 1-4                                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Grid Overlay CSS (for mockups)

```css
.grid-overlay {
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 1400px;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 20px;
    pointer-events: none;
    z-index: 9999;
}

.grid-overlay .col {
    background: rgba(255, 0, 0, 0.1);
    border-left: 1px solid rgba(255, 0, 0, 0.3);
    border-right: 1px solid rgba(255, 0, 0, 0.3);
}
```

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| 1400px+    | Full 12-column grid |
| 1024px     | Consider reducing to 8 cols or stacking |
| 768px      | Stack to single column or 2-col |
| 480px      | Single column only |

---

## Checklist for Mockups

- [ ] Container is exactly 1400px max-width
- [ ] Grid has 12 columns with 20px gutters
- [ ] All elements align to column edges
- [ ] Column assignments documented in HTML comments
- [ ] Grid overlay toggle included
- [ ] Responsive behavior specified
