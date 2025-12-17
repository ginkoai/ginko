# Handoff: Fix userId Mismatch Between Dashboard and CLI

## Status: In Progress (90% complete)

## Problem
Dashboard Focus screen fails with: `User does not have access to graph gin_1762125961056_dg4bsd`

## Root Cause
Two different userId derivation methods produced different results:
- **CLI** (`gk_` token): Used base64 hash → `user_Z2tfOTNl`
- **Dashboard** (OAuth JWT): Used base64 hash → `user_ZXlKaGJH`

## What Was Done

### 1. Created Shared Auth Resolver
**File:** `dashboard/src/lib/auth/resolve-user.ts` (NEW)

Extracts auth resolution logic into a reusable function:
- For `gk_` tokens: bcrypt compare against `user_profiles.api_key_hash`
- For OAuth JWTs: `supabase.auth.getUser(token)` via service role client
- Returns actual Supabase UUID in both cases

### 2. Updated CloudGraphClient
**File:** `dashboard/src/app/api/v1/graph/_cloud-graph-client.ts`

Modified `fromBearerToken()` (lines 154-188) to use resolver instead of base64 hack.

### 3. Updated extractUserIdFromToken Helper
Same file, lines 1196-1217 - made async and uses resolver.

### 4. Updated graph/init Route
**File:** `dashboard/src/app/api/v1/graph/init/route.ts`
Added `await` for the now-async `extractUserIdFromToken()`.

### 5. Migrated Graph Nodes
Updated all 4 Graph nodes with `graphId: 'gin_1762125961056_dg4bsd'` to use Chris's Supabase UUID: `b27cb2ea-dcae-4255-9e77-9949daa53d77`

### 6. Deployed to Correct Project
Was deploying to `dashboard` project → `app.watchhill.ai`
Fixed to deploy to `ginko-dashboard` project → `app.ginkoai.com`

## Current State

**Progress:** Resolver now works correctly!
- Error message changed from `user_ZXlKaGJH` to `b27cb2ea-dcae-4255-9e77-9949daa53d77`
- This confirms OAuth JWT is being resolved to correct Supabase UUID

**Remaining Issue:** `verifyAccess()` is returning false

The error is now: `User b27cb2ea-dcae-4255-9e77-9949daa53d77 does not have access to graph gin_1762125961056_dg4bsd`

## Next Steps

### Debug verifyAccess()
The `verifyAccess()` method only checks if graph exists (not userId):
```typescript
async verifyAccess(): Promise<boolean> {
  const result = await runQuery<{ count: number }>(
    `MATCH (g:Graph {graphId: $graphId})
     RETURN count(g) as count`,
    { graphId: this.context.graphId }
  );
  return result.length > 0 && result[0].count > 0;
}
```

Possible issues:
1. **Database connection issue** - The query might be failing silently
2. **GraphId mismatch** - Check if graphId is being passed correctly
3. **runQuery issue** - Check if the query is executing properly

### Recommended Debug Steps
1. Add debug logging to `verifyAccess()`:
```typescript
console.log('[verifyAccess] Checking graph:', this.context.graphId);
const result = await runQuery(...);
console.log('[verifyAccess] Result:', result);
```

2. Check Vercel logs for the actual query result

3. Verify graph exists with direct query:
```bash
npx tsx -e "
const neo4j = require('neo4j-driver');
const driver = neo4j.driver('neo4j+s://b475ee2d.databases.neo4j.io',
  neo4j.auth.basic('neo4j', 'znBGJwInpD-1QYA8tfx_fRAFX2ZqAMtm4FINzALoXog'));
async function main() {
  const session = driver.session();
  const result = await session.run('MATCH (g:Graph {graphId: \$id}) RETURN g', { id: 'gin_1762125961056_dg4bsd' });
  console.log('Graph nodes:', result.records.length);
  result.records.forEach(r => console.log(r.get('g').properties));
  await session.close();
  await driver.close();
}
main();
"
```

## Files Modified
| File | Change |
|------|--------|
| `dashboard/src/lib/auth/resolve-user.ts` | NEW - Shared userId resolver |
| `dashboard/src/app/api/v1/graph/_cloud-graph-client.ts` | Updated fromBearerToken() and extractUserIdFromToken() |
| `dashboard/src/app/api/v1/graph/init/route.ts` | Added await for async function |

## Cleanup Items
- [ ] Remove `watchhill.ai` domain from Vercel `dashboard` project
- [ ] Consider merging duplicate Graph nodes (4 nodes with same graphId)

## Key Context
- Chris's Supabase UUID: `b27cb2ea-dcae-4255-9e77-9949daa53d77`
- Graph ID: `gin_1762125961056_dg4bsd`
- Correct Vercel project: `ginko-dashboard` (NOT `dashboard`)
- Neo4j credentials in `.env` file
