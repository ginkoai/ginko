# Session Handoff: Sprint Parser ADR-052 Support

**Date:** 2026-01-05
**Model:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Branch:** main (clean, all pushed)

## Summary

Fixed critical bug where sprint progress showed 0% despite all tasks complete. Root cause was sprint parser not supporting ADR-052 naming convention.

## Accomplishments

### 1. Bug Fix: Sprint Parser ADR-052 Support
- **Problem:** `ginko start` showed "Sprint 2 0%" when sprint file showed 100% complete
- **Root Cause 1:** Task header regex in `sprint-loader.ts` only matched `TASK-N` format, not `e008_s02_t01`
- **Root Cause 2:** Progress regex in `context-loader-events.ts` expected `**Progress**:` but file had `**Progress:**`
- **Fix:** Updated regexes to support both legacy and ADR-052 naming conventions
- **Files:**
  - `packages/cli/src/lib/sprint-loader.ts:488` - task header regex
  - `packages/cli/src/lib/sprint-loader.ts:527` - dependency regex
  - `packages/cli/src/lib/context-loader-events.ts:882` - progress regex

### 2. Published @ginkoai/cli@2.0.0-beta.7
- Contains sprint parser fixes
- Available on npm with `beta` tag

### 3. Moved to Sprint 3
- Updated `CURRENT-SPRINT.md` to Sprint 3 (Insights & Polish)
- 6 tasks focused on insights member filter and onboarding optimization

## Commits (all pushed to main)

1. `cc5a4db` - fix(cli): Support ADR-052 naming convention in sprint parser
2. `908e201` - chore(cli): Bump version to 2.0.0-beta.7
3. `81fe265` - chore: Update CURRENT-SPRINT to Sprint 3 (Insights & Polish)

## Current State

- **Sprint:** Team Collaboration Sprint 3 - Insights & Polish (0%)
- **Next Task:** e008_s03_t01 - Insights Page Member Filter
- **Branch:** main (clean)
- **npm:** @ginkoai/cli@2.0.0-beta.7 published

## Next Steps

1. Start Sprint 3 Task 1: Add member filter dropdown to Insights page
2. Permission check: owners see all members, members see self only
3. Files to modify:
   - `dashboard/src/app/insights/page.tsx`
   - `dashboard/src/components/insights/MemberFilter.tsx` (new)

## Technical Notes

### Regex Patterns for ADR-052 Support

Task headers now match:
```regex
/^###\s+((?:TASK-\d+|e\d+_s\d+_t\d+|adhoc_\d+_s\d+_t\d+)):\s*(.+?)(?:\s*\((.+?)\))?$/i
```

Dependencies now match:
```regex
/^(?:TASK-\d+|t\d+|e\d+_s\d+_t\d+|adhoc_\d+_s\d+_t\d+)$/i
```

Progress line now matches both:
- `**Progress:** 100%` (colon inside bold)
- `**Progress**: 100%` (colon outside bold)

## Environment

- Node.js v24.4.0
- ginko CLI linked locally (npm link)
- Global ginko updated to local build
