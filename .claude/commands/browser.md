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

### Examples

| Request | Command |
|---------|---------|
| "screenshot the landing page" | `npx tsx scripts/browser.ts screenshot /` |
| "screenshot the /about page" | `npx tsx scripts/browser.ts screenshot /about` |
| "take a viewport screenshot of pricing" | `npx tsx scripts/browser.ts screenshot /pricing --viewport` |
| "save the blog as PDF" | `npx tsx scripts/browser.ts pdf /blog` |

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

After taking a screenshot, use the Read tool to view the image file. The screenshot will be saved to `website/screenshots/` with a timestamped filename.

**IMPORTANT**: After executing the screenshot command, always read the resulting image file to show it to the user.

</browser-command>
