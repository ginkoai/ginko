---
type: gotcha
tags: [fix, high, auth]
relevance: critical
created: 2026-01-13T23:31:38.013Z
updated: 2026-01-13T23:31:38.013Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768347097980
insightId: 595f4f3f-edb5-4c3a-9c8b-7e4aa414ce61
---

# Fixed Roadmap→Graph deep link redirect bug

**Type**: gotcha  
**Tags**: fix, high, auth  
**Created**: 2026-01-13  
**Session**: session-chris-at-watchhill-ai-1768347097980  

## The Gotcha

OAuthHandler in root layout was listening for SIGNED_IN events and calling router.push('/dashboard') even when already on dashboard pages. Session refreshes triggered this, interrupting navigation. Fix: Added check to skip redirect if already on /dashboard/* routes.

## The Solution

check to skip redirect if already on /dashboard/* routes

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed Roadmap→Graph deep link redirect bug. Root cause: OAuthHandler in root layout was listening for SIGNED_IN events and calling router.push('/dashboard') even when already on dashboard pages. Session refreshes triggered this, interrupting navigation. Fix: Added check to skip redirect if already on /dashboard/* routes.

## Related Files

- `dashboard/src/components/auth/oauth-handler.tsx:49-58`

---
*This context module was automatically generated from session insights.*