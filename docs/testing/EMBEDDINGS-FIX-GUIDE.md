# Quick Fix Guide - Embeddings ES Module Issue

## Problem
Semantic search returns HTTP 500: `require() of ES Module not supported`

## Solution
Change static import to dynamic import in embeddings service.

---

## Step 1: Edit File
**File**: `src/graph/embeddings-service.ts`
**Line**: ~12 (import statement)

### Change FROM:
```typescript
import { pipeline, Pipeline } from '@xenova/transformers';

export class EmbeddingsService {
  private embedder: Pipeline | null = null;
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    this.embedder = await pipeline(
      'feature-extraction',
      this.config.model,
      { cache_dir: process.env.TRANSFORMERS_CACHE || './.cache/transformers' }
    );
    
    this.isInitialized = true;
  }
}
```

### Change TO:
```typescript
// Remove static import at top of file
// import { pipeline, Pipeline } from '@xenova/transformers';  // DELETE THIS

export class EmbeddingsService {
  private embedder: any | null = null;  // Change Pipeline to any
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Add dynamic import here
    const { pipeline } = await import('@xenova/transformers');
    
    this.embedder = await pipeline(
      'feature-extraction',
      this.config.model,
      { cache_dir: process.env.TRANSFORMERS_CACHE || './.cache/transformers' }
    );
    
    this.isInitialized = true;
  }
}
```

---

## Step 2: Rebuild & Deploy
```bash
npm run build
vercel --prod
```

---

## Step 3: Test
```bash
# Run E2E tests
./test-embeddings-e2e.sh

# Or manual test
curl -X POST "https://ginko-bjob1vkom-chris-nortons-projects.vercel.app/api/v1/graph/query" \
  -H "Authorization: Bearer test_token_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "graphId": "gin_1762125961056_dg4bsd",
    "query": "vector embeddings",
    "limit": 5,
    "threshold": 0.70
  }'
```

**Expected**: HTTP 200 with results array

---

## Why This Works

- **Before**: TypeScript compiles static import to CommonJS `require()`
- **After**: Dynamic `import()` works in both CommonJS and ES modules
- **Result**: Xenova transformers loads correctly

---

**Time Required**: 15 minutes
**Risk Level**: Low (isolated change)
**Testing**: Automated test script included
