---
description: Control browser with Playwright - take screenshots, navigate pages, interact with elements
---

<browser-command>

Interpret the user's natural language request and execute browser automation using Playwright.

**User request**: $ARGUMENTS

## Available Actions

1. **Screenshot** - Capture a page as PNG
   - "take a screenshot of the landing page" → screenshot of `/`
   - "screenshot the about page" → screenshot of `/about`
   - "capture the pricing page" → screenshot of `/pricing`
   - "screenshot just the viewport" → use `--viewport` flag

2. **PDF** - Save a page as PDF
   - "save the docs as PDF" → PDF of `/docs`

3. **Navigate** - Go to a URL (for multi-step actions)
   - "go to the contact page"

## Execution

Run the browser script from the `website` directory:

```bash
cd /Users/bunny/Development/ginko/website && npx tsx scripts/browser.ts <action> <target> [flags]
```

### Basic Examples

| Request | Command |
|---------|---------|
| "screenshot the landing page" | `npx tsx scripts/browser.ts screenshot /` |
| "screenshot the /about page" | `npx tsx scripts/browser.ts screenshot /about` |
| "take a viewport screenshot of pricing" | `npx tsx scripts/browser.ts screenshot /pricing --viewport` |
| "save the blog as PDF" | `npx tsx scripts/browser.ts pdf /blog` |

### Responsive Testing Examples

| Request | Command |
|---------|---------|
| "test mobile view of home" | `npx tsx scripts/browser.ts screenshot / --mobile --viewport` |
| "tablet screenshot of about" | `npx tsx scripts/browser.ts screenshot /about --tablet --viewport` |
| "test at 390px width" | `npx tsx scripts/browser.ts screenshot / --width 390 --viewport` |

## Screenshot Constraints

**CRITICAL**: Screenshots are automatically capped at 1999px on both dimensions to avoid Anthropic API errors when sending multiple images.

- Full-page screenshots taller than 1999px are clipped
- Viewport dimensions are capped at 1999px
- A warning is logged when capping occurs

## Responsive Testing Workflow

When testing responsive layouts, follow this workflow to avoid API errors:

### 1. Test ONE Breakpoint at a Time

**DO NOT** batch multiple breakpoints in a single conversation turn. Test sequentially:

```bash
# Step 1: Mobile
npx tsx scripts/browser.ts screenshot / --mobile --viewport
# [Review screenshot, note issues]

# Step 2: Tablet
npx tsx scripts/browser.ts screenshot / --tablet --viewport
# [Review screenshot, note issues]

# Step 3: Desktop
npx tsx scripts/browser.ts screenshot / --viewport
# [Review screenshot, note issues]
```

### 2. Standard Breakpoints

| Preset | Dimensions | Use Case |
|--------|-----------|----------|
| `--mobile` | 375×667 | iPhone SE / small phones |
| `--tablet` | 768×1024 | iPad / tablets |
| `--desktop` | 1280×720 | Standard desktop (default) |
| `--wide` | 1920×1080 | Full HD monitors |

Custom dimensions: `--width <px> --height <px>`

### 3. Visual QA Checklist

At each breakpoint, verify:

- [ ] **No horizontal overflow** - Content fits within viewport width
- [ ] **Tap targets ≥44px** - Buttons/links are finger-friendly on mobile
- [ ] **Readable text** - Font sizes appropriate for device
- [ ] **Images scale** - No cropping or distortion
- [ ] **Navigation works** - Menu collapses/expands appropriately
- [ ] **Spacing consistent** - Margins/padding adjust to screen size

### 4. Error Recovery

If you encounter an API error about image dimensions:

1. **Stop** the current testing session
2. **Use viewport mode**: Add `--viewport` flag to limit screenshot height
3. **Test one breakpoint** per conversation turn
4. **Resume** testing sequentially

## Prerequisites

The dev server must be running. If the screenshot fails with connection error:

1. Check if dev server is running: `lsof -i :3000`
2. If not, start it: `cd website && npm run dev`
3. Wait for it to be ready, then retry the screenshot

## Page Mapping

Common page references:
- "landing page", "home", "homepage", "/" → `/`
- "about", "about page" → `/about`
- "pricing" → `/pricing`
- "blog" → `/blog`
- "docs", "documentation" → `/docs`
- "get started", "getting started" → `/get-started`
- "how it works" → `/how-it-works`
- "contact" → `/contact`

## Output

After taking a screenshot, use the Read tool to view the image file. The screenshot will be saved to `/tmp/ginko-screenshots/` with a timestamped filename.

**IMPORTANT**: After executing the screenshot command, always read the resulting image file to show it to the user.

</browser-command>
