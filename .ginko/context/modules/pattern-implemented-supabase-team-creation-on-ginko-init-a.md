---
type: pattern
tags: [feature, high, supabase, api, cli]
relevance: critical
created: 2026-01-17T23:34:23.390Z
updated: 2026-01-17T23:34:23.390Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768692863349
insightId: dbd3c8c2-2969-4200-bdaf-9cb891a13433
---

# Implemented Supabase team creation on ginko init (adhoc_2...

**Type**: pattern  
**Tags**: feature, high, supabase, api, cli  
**Created**: 2026-01-17  

## Pattern Description

Implemented Supabase team creation on ginko init (adhoc_260117_s01_t09)

## Implementation

Supabase team creation on ginko init (adhoc_260117_s01_t09)

## Code Example

*No code example available*

## When to Use

Implemented Supabase team creation on ginko init (adhoc_260117_s01_t09). Modified /api/v1/graph/init endpoint to create a Supabase team with graph_id linked when a new project is initialized. Uses createServiceRoleClient() to bypass RLS. Added user as team owner in team_members table. This enables team collaboration features like invites and access control for new projects.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `dashboard/src/app/api/v1/graph/init/route.ts`