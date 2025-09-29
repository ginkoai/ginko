---
type: setup
status: current
updated: 2025-01-31
tags: [supabase, database, authentication, quick-setup]
related: [supabase-setup-guide.md, vercel-setup.md, parallel-setup-commands.md]
priority: high
audience: [developer, ai-agent]
estimated-read: 5-min
dependencies: [ADR-001]
---

# Supabase Setup Instructions

## 1. Create Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize project
supabase init

# Link to remote project (create one at supabase.com first)
supabase link --project-ref YOUR_PROJECT_REF
```

## 2. Apply Database Schema

```bash
# Apply the MVP schema
supabase db reset

# Or apply manually:
psql -h db.YOUR_PROJECT_REF.supabase.co -p 5432 -d postgres -U postgres -f database/mvp-schema.sql
```

## 3. Configure Authentication

In Supabase Dashboard → Authentication → Providers:

### GitHub OAuth Setup
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App:
   - Application name: ContextMCP
   - Homepage URL: https://contextmcp.com
   - Authorization callback URL: https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
3. Copy Client ID and Client Secret
4. In Supabase Dashboard:
   - Enable GitHub provider
   - Add Client ID and Client Secret
   - Set Redirect URLs: `https://your-app.vercel.app/auth/callback`

## 4. Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 5. Test Database Connection

```sql
-- Test query in Supabase SQL editor
SELECT 
    table_name,
    column_name,
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

## 6. Enable Realtime (Optional)

```sql
-- Enable realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
```

## Setup Complete ✅

Your Supabase project is ready with:
- ✅ User authentication via GitHub OAuth
- ✅ Sessions table with RLS policies
- ✅ User profiles with API keys
- ✅ Search optimization
- ✅ Automatic profile creation on signup