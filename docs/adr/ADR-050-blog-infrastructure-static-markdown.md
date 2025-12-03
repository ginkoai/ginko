# ADR-050: Blog Infrastructure - Static Markdown with Build Script

## Status
Accepted

## Date
2025-12-03

## Context

EPIC-003 Sprint 2 requires adding a blog to the ginko marketing site for content marketing. The marketing site (www.ginkoai.com) is currently a pure static HTML/CSS/JS site deployed on Vercel with no build step.

We need a blog infrastructure that:
1. Allows writing posts in a developer-friendly format (markdown)
2. Maintains the existing "Brass Hands" visual aesthetic
3. Keeps the site simple and fast
4. Doesn't require a CMS or database
5. Supports SEO fundamentals (meta tags, RSS feed)

### Options Considered

#### Option 1: Pure Static HTML
Write each blog post as a standalone HTML file.

**Pros:**
- Zero dependencies
- No build step
- Full control over markup

**Cons:**
- Tedious for content creation
- Difficult to maintain consistency
- No markdown support
- Manual RSS feed updates

#### Option 2: Full Static Site Generator (Gatsby, Astro, 11ty)
Replace the current site with a full SSG framework.

**Pros:**
- Rich ecosystem
- Built-in markdown support
- Many plugins available

**Cons:**
- Complete site rewrite required
- Increased complexity
- Different mental model than current site
- Overkill for simple blog needs

#### Option 3: Next.js + MDX
Move the marketing site to Next.js (same as dashboard).

**Pros:**
- Consistent with dashboard tech stack
- Good MDX support
- Familiar React patterns

**Cons:**
- Complete site rewrite required
- Heavier than needed for static content
- Slower build times
- More complex deployment

#### Option 4: Lightweight Build Script (Selected)
Add a Node.js build script that compiles markdown files to HTML using the existing templates.

**Pros:**
- Minimal changes to existing site
- Write posts in markdown
- Reuses existing CSS/styling
- Simple, focused tooling
- Fast build times
- Easy to understand and maintain

**Cons:**
- Custom tooling (though minimal)
- Need to maintain build script

## Decision

Implement **Option 4: Lightweight Build Script** for the blog.

### Architecture

```
website/
├── content/
│   └── blog/
│       ├── 2025-12-10-why-ai-assistants-forget.md
│       └── 2025-12-15-back-in-flow.md
├── blog/
│   ├── index.html          (generated)
│   └── why-ai-assistants-forget/
│       └── index.html      (generated)
├── templates/
│   ├── blog-list.html      (template)
│   └── blog-post.html      (template)
├── build-blog.js           (build script)
└── package.json            (new - for build deps)
```

### Build Process

1. Read markdown files from `content/blog/`
2. Parse frontmatter for metadata (title, date, description, author, tags)
3. Convert markdown to HTML using `marked`
4. Inject into HTML templates with existing styles
5. Generate blog index page with post listing
6. Generate RSS feed

### Frontmatter Format

```markdown
---
title: "Why AI Assistants Forget Everything (And How to Fix It)"
date: 2025-12-10
description: "The context rot problem and how git-native session management solves it."
author: "Chris Norton"
tags: ["context", "ai-collaboration", "developer-tools"]
---

Post content here...
```

### Dependencies (minimal)

- `marked` - Markdown to HTML conversion
- `gray-matter` - Frontmatter parsing
- `feed` - RSS feed generation

### Build Command

```bash
node build-blog.js
```

Added to Vercel deployment via `vercel.json` build command.

## Consequences

### Positive
- Blog posts written in markdown (developer-friendly)
- Existing CSS/styling preserved
- Fast builds (< 1 second for typical blog)
- No framework lock-in
- Easy to understand and modify
- SEO-friendly URLs (clean paths)

### Negative
- Custom build script requires maintenance
- No hot-reload for development (manual rebuild)
- Limited compared to full SSG features

### Neutral
- Introduces npm dependencies to marketing site
- Need to run build before deploy

## Implementation Notes

1. Create `website/package.json` with minimal deps
2. Create build script `website/build-blog.js`
3. Create HTML templates matching site aesthetic
4. Update `vercel.json` to run build
5. Add blog link to navigation

## Related

- EPIC-003 Sprint 2: Content Infrastructure
- Marketing site: website/ directory
- Design system: Brass Hands aesthetic

---

*ADR authored: 2025-12-03*
