---
type: setup
status: current
updated: 2025-01-31
tags: [parallel-setup, infrastructure, speed-optimization, automation]
related: [supabase-setup.md, vercel-setup.md, SPRINT-001-dependencies-analysis.md]
priority: high
audience: [developer, ai-agent]
estimated-read: 5-min
dependencies: [ADR-001]
---

# Parallel Infrastructure Setup Commands

Execute these commands simultaneously in separate terminals for maximum speed:

## Terminal 1: Supabase Setup
```bash
# Install and setup Supabase
npm install -g supabase
supabase login
supabase init
supabase start

# Apply schema
supabase db reset
# Or manually: psql -h localhost -p 54322 -d postgres -U postgres -f database/mvp-schema.sql
```

## Terminal 2: Vercel Setup  
```bash
# Install and configure Vercel
npm install -g vercel
vercel login
vercel

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

## Terminal 3: Next.js Dashboard
```bash
# Create dashboard with T3 stack
cd dashboard/
npx create-t3-app@latest contextmcp-dashboard --nextAuth --prisma --tailwind --typescript

# Install additional dependencies
cd contextmcp-dashboard
npm install @supabase/supabase-js @supabase/auth-ui-react @supabase/auth-ui-shared
npm install framer-motion lucide-react sonner
npm install -D @types/node
```

## Terminal 4: MCP Client Package
```bash
# Create MCP client package
mkdir packages/mcp-client
cd packages/mcp-client
npm init -y
npm install @modelcontextprotocol/sdk express cors
npm install -D typescript @types/node @types/express @types/cors tsx
```

## Parallel Execution Benefits

**Sequential Time**: ~3-4 hours
**Parallel Time**: ~45-60 minutes  
**Time Saved**: 2-3 hours

## Completion Checklist

### Terminal 1 Complete When:
- ✅ Supabase CLI installed
- ✅ Local Supabase running on port 54322
- ✅ Database schema applied
- ✅ Auth configured for GitHub

### Terminal 2 Complete When:
- ✅ Vercel CLI installed
- ✅ Project linked to Vercel
- ✅ Environment variables set
- ✅ Domain configured (optional)

### Terminal 3 Complete When:
- ✅ Next.js app created with T3 stack
- ✅ Dependencies installed
- ✅ TypeScript configured
- ✅ Tailwind CSS ready

### Terminal 4 Complete When:
- ✅ MCP client package scaffolded
- ✅ Dependencies installed
- ✅ TypeScript configured
- ✅ Ready for implementation

## Next Steps After Parallel Setup

Once all terminals complete, you'll have:
1. **Database ready** → Can implement auth & sessions
2. **Deployment ready** → Can deploy immediately  
3. **Frontend ready** → Can build UI components
4. **MCP client ready** → Can implement capture/resume

This parallel approach gets us to coding the actual features much faster!