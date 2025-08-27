---
type: gotcha
tags: [handoff, archive, filesystem, ux]
area: /packages/cli/src/commands/handoff.ts
created: 2025-08-27
updated: 2025-08-27
relevance: medium
dependencies: []
---

# Archive Filename Format

## The Gotcha
Archive files were using numeric timestamps (1756308239480.md), making them impossible to scan.

## The Fix
Changed to human-readable format: `YYYY-MM-DD-description.md`
- Example: `2025-08-27-fix-auth-bug.md`
- Description from first 3 words of handoff message
- Time added if collision: `2025-08-27-1430-fix-auth-bug.md`

## Code Location
`/packages/cli/src/commands/handoff.ts` lines 124-163

## Why It Matters
Users need to quickly find previous sessions. Numeric timestamps require converting epochs mentally.