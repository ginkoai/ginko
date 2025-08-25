# API Development Guide - Serverless MCP Functions

## Overview
This directory contains the **Ginko MCP (Model Context Protocol) server** implemented as Vercel serverless functions.

**Production URL**: https://mcp.ginko.ai

## Architecture Patterns

### Core Design Principles
- **Pure Serverless**: All functionality via Vercel API routes (`api/`)
- **Database-First**: All features work with and without database connection
- **Graceful Fallback**: In-memory storage when PostgreSQL unavailable
- **Stateless Operations**: Each request is independent

### Key Files & Structure
```
api/
├── _lib/                    # Shared libraries (TypeScript compiled to JS)
├── _utils.ts               # Common utilities and initialization 
├── tools/
│   ├── call.ts            # Primary MCP tool implementation (21 tools)
│   └── list.ts            # Tool discovery endpoint
├── sessions/              # Session management endpoints
├── best-practices/        # Best practices CRUD operations
└── health.ts             # System health check
```

## Development Patterns

### 1. Creating New API Endpoints
```typescript
// api/new-endpoint.ts
import { initializeDatabase, initializeAuth } from './_utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await initializeDatabase();
    const { user } = await initializeAuth(req, db);
    
    // Your logic here
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[ENDPOINT] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 2. Using Shared Libraries
All shared code lives in `_lib/` and is compiled TypeScript:
```typescript
import { DatabaseManager } from './_lib/database.js';
import { AuthManager } from './_lib/auth-manager.js';
import BestPracticesManager from './_lib/best-practices.js';
```

### 3. Database Operations
```typescript
// Always handle both connected and fallback modes
const db = await initializeDatabase();
if (db.isConnected()) {
  // Use PostgreSQL
  const result = await db.query('SELECT * FROM table');
} else {
  // Use in-memory fallback
  console.log('[DB] Using in-memory fallback');
}
```

## Testing & Debugging

### Production-Only Testing
⚠️ **Important**: We currently test directly in production due to environment level confusion issues. Local modifications were not being applied to production, so we've standardized on production testing.

```bash
# Health check
curl https://mcp.ginko.ai/api/health

# Test MCP tools
curl https://mcp.ginko.ai/api/tools/list

# Test with authentication
curl -H "X-API-Key: your-test-key" https://mcp.ginko.ai/api/tools/call
```

### Debugging Tips
- **Vercel Function logs**: Primary debugging method for serverless functions
- **Database state**: Health endpoint shows database connection status
- **Authentication**: Use test API keys from production Supabase auth system
- **Test users**: UUIDs `000...002` (E2E) and `000...004` (dev) in production

## Common Tasks

### Adding New MCP Tools
1. **Edit `api/tools/call.ts`**
2. **Add tool definition** in the `tools` array
3. **Implement handler** in the switch statement
4. **Deploy to production** and test via live endpoint

### Database Schema Changes
1. **Update** `database/schema.sql`
2. **Create migration** in `database/migrations/`
3. **Deploy** and test database connectivity in production
4. **Verify** via health endpoint

### Authentication Setup
- **Test users**: Use UUIDs `000...002` (E2E) and `000...004` (dev)
- **API keys**: Generated via production `api/sessions/capture.ts` endpoint
- **Environment**: Production Supabase auth system only

## Integration Points

### With Dashboard
- **API proxy routes**: `/api/sessions/scorecards` served by dashboard
- **Shared types**: Database types defined in dashboard/src/types/
- **Production URL**: https://app.ginko.ai

### With MCP Client
- **Tool discovery**: `api/tools/list.ts`
- **Tool execution**: `api/tools/call.ts`
- **Authentication**: API key based system

## Deployment Notes

### Vercel Configuration
- **Serverless runtime**: Node.js 18+
- **Build process**: TypeScript compilation via `scripts/prepare-api.sh`
- **Environment variables**: Managed via Vercel dashboard
- **Deploy command**: `vercel --prod` or automatic via Git pushes

### Database Requirements
- **Primary**: Supabase PostgreSQL for production persistence
- **Fallback**: In-memory storage (full functionality maintained)
- **Connection pooling**: Handled by database adapter
- **Test infrastructure**: Production database with test user UUIDs

---

**Quick Reference**:
- Health check: `curl https://mcp.ginko.ai/api/health`
- Tool list: `curl https://mcp.ginko.ai/api/tools/list`
- Build for deploy: `npm run build && npm run prepare:api`
- **Deploy**: Push to Git or `vercel --prod`