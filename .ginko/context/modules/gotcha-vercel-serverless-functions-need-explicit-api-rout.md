---
type: gotcha
tags: [nextjs, api, vercel, app-router, serverless]
relevance: medium
created: 2025-09-09T18:50:35.204Z
updated: 2025-09-09T18:50:35.204Z
dependencies: []
sessionId: xtophr@gmail.com-1757443835189
insightId: 7e3b93ba-3d06-45f6-aaf9-3fec628f4716
---

# Vercel serverless functions need explicit API route exports

**Type**: gotcha  
**Tags**: nextjs, api, vercel, app-router, serverless  
**Created**: 2025-09-09  
**Session**: xtophr@gmail.com-1757443835189  

## The Gotcha

API routes returning 404 despite correct file placement

## The Solution

Changed from default export to named exports (GET, POST) in route.ts files for App Router compatibility

## Code Example

### Before
```typescript
export default function handler(req, res) { }
```

### After
```typescript
export async function GET(request: Request) { }
export async function POST(request: Request) { }
```


## How to Avoid

Always use named exports for HTTP methods in App Router API routes

## Impact

- **Time Saved**: 90 minutes
- **Reusability**: 90%
- Saves 1-2 hours debugging Next.js 13+ API routes

## Related Files

*No specific files*

## Related Modules

- **Variant of**: `gotcha-vercel-serverless-functions-need-explicit-api-rout.md`
  - Similar but distinct: Refinement or evolution, Significantly different time impact

💡 Consider updating existing module instead

---
*This context module was automatically generated from session insights.*