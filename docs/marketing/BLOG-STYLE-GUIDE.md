# Blog Style Guide

The ginko blog voice: practitioner sharing real lessons from the field. Not thought leadership. Not marketing copy. An engineer telling other engineers what they learned and why it matters.

## Voice and Tone

**Write as a practitioner, not a pundit.** Every post should be grounded in something we actually built, measured, or discovered. Abstract advice without a concrete story behind it doesn't belong here.

**Conversational but precise.** Write the way you'd explain something to a sharp colleague over coffee. No jargon for jargon's sake, but don't dumb down technical concepts either.

**Confident without being preachy.** State what we learned and why it matters. Don't hedge everything into oblivion, but don't pretend we have all the answers either. "We're still figuring this out" is a valid thing to say.

**First person, singular.** The author is Chris. Use "I" for personal experience, "we" for team decisions and ginko-as-a-product. Don't use "you" to lecture. Use "you" to set up scenarios the reader recognizes.

## Punctuation and Formatting

### Do Not Use

- **Emdashes.** No `—` characters, no `--` substitutes. Restructure the sentence instead. Use colons, periods, commas, or parentheses.
  - Bad: "The AI partner, the one doing hundreds of tasks, never sees it."
  - Bad: "The AI partner -- the one doing hundreds of tasks -- never sees it."
  - Good: "The AI partner (the one doing hundreds of tasks per session) never sees it."
  - Good: "The AI partner never sees it. This is the partner doing hundreds of tasks per session."

- **Exclamation marks.** Almost never. If the writing needs an exclamation mark to convey excitement, the writing isn't doing its job.

- **Scare quotes for emphasis.** Use bold for emphasis. Reserve quotes for actual quotations, terms being defined, or phrases being examined.

### Do Use

- **Bold** for key terms, emphasis, and pattern names.
- *Italics* for the subtitle/lede line, the closing CTA, and when referencing a phrase or question being examined.
- **Colons** where you'd otherwise reach for an emdash. "One of the things we built early on was a coaching score: a dashboard metric that tracks how well the pair follows process."
- **Periods for punch.** Short sentences after long ones create rhythm. "That's exactly what we're doing to our AI partners."
- **Tables** for comparisons and structured data. They scan faster than bullet lists when comparing dimensions.
- **Code blocks** for CLI examples, data formats, and anything the reader might type.

## Post Structure

### Frontmatter

```yaml
---
title: "Title Here"
date: YYYY-MM-DD
author: Chris Norton
description: "One or two sentences. This appears in search results and social cards."
slug: "url-friendly-slug"
tags: ["tag-one", "tag-two", "tag-three"]
---
```

- **Title:** Specific and concrete. Prefer a claim or observation over a generic topic label. "Why Our 6-Week Estimate Took 3 Days" over "Thoughts on AI Velocity."
- **Description:** Should make someone want to click. State what happened and hint at the insight.
- **Tags:** 4-5 tags. Always include `"ai-collaboration"` or `"developer-tools"`. Use lowercase, hyphenated.

### Anatomy of a Post

1. **H1 title** (matches frontmatter title)
2. **Subtitle/lede** in italics. One sentence that hooks or summarizes.
3. **Opening section.** Set up the problem or scenario. Ground it in something real.
4. **The insight.** The core of the post. What did we learn? Include data, examples, or before/after comparisons.
5. **Implications.** Why does this matter beyond our specific case? What's the broader principle?
6. **Actionable takeaways.** Numbered list, 3-5 items. Each one should be something the reader can do this week.
7. **Closing line.** Short. Memorable. Lands the thesis one more time.
8. **Horizontal rule + CTA.** Soft sell. See CTA section below.

Not every post needs all eight elements. Shorter posts can skip the implications section or fold takeaways into the closing. But the pattern (story, insight, principle, action) should be recognizable.

### Section Headings

Use H2 (`##`) for main sections. Use H3 (`###`) sparingly for subsections within a long section. Headings should be descriptive, not clever. "The Slowest Feedback Loop for the Fastest Worker" works because it's both descriptive and sharp. "Let's Talk About Loops" does not.

## The Closing CTA

Every post ends with:

```markdown
---

*[Soft-sell paragraph linking the post's theme to ginko. One or two sentences.
Ends with a link to ginkoai.com.]*
```

**Rules:**
- Always separated by a horizontal rule (`---`)
- Always in italics
- Always includes at least one link to `https://ginkoai.com`
- Connect it to the post's specific topic, don't use a generic pitch
- Tone: inviting, not pushy. "If your team is ready to close the loop" not "Sign up now!"
- One to three sentences max

**Examples from published posts:**

> *Ginko helps Human+AI teams work faster by making context persistent and knowledge shareable. If you're seeing similar acceleration factors, we'd love to hear about it. [Get in touch](https://ginkoai.com).*

> *[Ginko](https://ginkoai.com) gives Human+AI pairs a shared knowledge graph with built-in coaching scores, process adherence tracking, and feedback loops that both partners can see. If your team is ready to close the loop, [get started today](https://ginkoai.com).*

## Content Guidelines

### What We Write About

- Lessons from building ginko (technical and philosophical)
- Patterns and anti-patterns in Human+AI collaboration
- Concrete results with real numbers (token reductions, velocity multipliers, time savings)
- Management and process insights that emerge from working with AI partners
- Honest assessments of what doesn't work yet

### What We Don't Write About

- Generic AI hype or predictions about AGI
- Product feature announcements disguised as blog posts
- Comparisons trashing competitors
- Anything we haven't actually done or measured ourselves

### The "Would I Share This?" Test

Before publishing, ask: would I share this in a Slack channel of senior engineers and feel good about it? If the post is too shallow, too salesy, or too obvious, it fails the test.

## File Naming

```
website/content/blog/YYYY-MM-DD-slug-matching-the-frontmatter.md
```

Date in the filename matches the `date` field in frontmatter. Slug in the filename matches the `slug` field.

## Checklist Before Publishing

- [ ] No emdashes anywhere in the file
- [ ] Frontmatter complete (title, date, author, description, slug, tags)
- [ ] Subtitle/lede line present in italics
- [ ] At least one concrete example, number, or before/after comparison
- [ ] Actionable takeaways section
- [ ] Horizontal rule + italicized CTA linking to ginkoai.com
- [ ] Filename matches `YYYY-MM-DD-slug.md` pattern
- [ ] Read aloud once. If any sentence sounds like marketing copy, rewrite it.
