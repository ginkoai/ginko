---
type: setup
status: approved
updated: 2025-01-31
tags: [supabase, database, authentication, production, schema]
related: [supabase-setup.md, vercel-deployment-guide.md, ADR-001-infrastructure-stack-selection.md]
priority: critical
audience: [developer, ai-agent]
estimated-read: 30-min
dependencies: [ADR-001]
---

# ContextMCP Supabase Setup Guide

This guide walks you through setting up Supabase for the ContextMCP MVP, from initial project creation to production deployment.

## Table of Contents
- [Prerequisites](#prerequisites)
- [1. Create Supabase Project](#1-create-supabase-project)
- [2. Configure Authentication](#2-configure-authentication)
- [3. Set Up Database Schema](#3-set-up-database-schema)
- [4. Configure Environment Variables](#4-configure-environment-variables)
- [5. Test the Integration](#5-test-the-integration)
- [6. Deploy to Production](#6-deploy-to-production)
- [7. Monitoring and Maintenance](#7-monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- [Supabase account](https://supabase.com) (free tier works)
- [GitHub account](https://github.com) for OAuth
- Node.js 18+ installed
- Basic understanding of PostgreSQL

## 1. Create Supabase Project

### Step 1.1: Create New Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `contextmcp-prod` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier

### Step 1.2: Wait for Project Setup
- Project creation takes 2-3 minutes
- You'll see a progress indicator
- Once complete, you'll be redirected to the project dashboard

### Step 1.3: Get Project Credentials
1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Project API Key** (anon, public)
   - **Service Role Key** (secret, keep secure)

## 2. Configure Authentication

### Step 2.1: Enable GitHub OAuth

#### Create GitHub OAuth App
1. Go to [GitHub Settings → Developer settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: `ContextMCP`
   - **Homepage URL**: `https://your-domain.com` (or localhost for dev)
   - **Authorization callback URL**: `https://your-project-id.supabase.co/auth/v1/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

#### Configure in Supabase
1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find "GitHub" and click configure
3. Enable the provider
4. Enter your GitHub **Client ID** and **Client Secret**
5. Click "Save"

### Step 2.2: Configure Auth Settings
1. Go to **Authentication** → **Settings**
2. Update these settings:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add any additional URLs you'll use
3. Under **Email Auth**:
   - Enable "Enable email confirmations" if desired
   - Configure email templates (optional)

## 3. Set Up Database Schema

### Step 3.1: Run Database Migrations
1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `database/mvp-schema.sql`
4. Click "Run" to execute the schema

### Step 3.2: Verify Tables Created
1. Go to **Table Editor**
2. You should see these tables:
   - `sessions` - For storing user sessions
   - `user_profiles` - Extended user information
   - `session_analytics` - Usage tracking

### Step 3.3: Test Row Level Security
1. Go to **Authentication** → **Users**
2. Create a test user (or use GitHub OAuth)
3. In **SQL Editor**, run a test query:
```sql
-- This should return empty (no access to other users' data)
SELECT * FROM sessions WHERE user_id != auth.uid();

-- This should work (access to own data)
SELECT * FROM user_profiles WHERE id = auth.uid();
```

## 4. Configure Environment Variables

### Step 4.1: Copy Environment Template
```bash
cp .env.example .env
```

### Step 4.2: Fill in Supabase Values
Edit `.env` and add your Supabase credentials:

```env
# From Supabase Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# From GitHub OAuth App
SUPABASE_AUTH_GITHUB_CLIENT_ID=your_github_client_id
SUPABASE_AUTH_GITHUB_SECRET=your_github_client_secret

# Your application URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 4.3: Update Dashboard Environment
```bash
cd dashboard
cp .env.local.example .env.local
# Edit .env.local with the same Supabase values
```

## 5. Test the Integration

### Step 5.1: Start the Development Server
```bash
# Start the ContextMCP backend
npm run build
npm run start:remote

# In another terminal, start the dashboard
cd dashboard
npm run dev
```

### Step 5.2: Test Authentication Flow
1. Open `http://localhost:3000`
2. Click "Login with GitHub"
3. Complete OAuth flow
4. Verify you're redirected to dashboard
5. Check that user profile was created in Supabase

### Step 5.3: Test Session Management
1. In the dashboard, try creating a session
2. Verify it appears in **Table Editor** → **sessions**
3. Check that analytics were recorded in **session_analytics**

### Step 5.4: Test API Key Generation
1. Go to dashboard settings
2. Verify API key is displayed
3. Test regenerating the API key
4. Confirm the key updated in **user_profiles** table

## 6. Deploy to Production

### Step 6.1: Update Environment for Production
1. Create production environment variables
2. Update **Site URL** in Supabase Auth settings
3. Update GitHub OAuth callback URL
4. Configure custom domain (optional)

### Step 6.2: Production Database Optimizations
Run these additional optimizations in **SQL Editor**:

```sql
-- Enable connection pooling
ALTER SYSTEM SET max_connections = 100;

-- Optimize for read-heavy workload
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Create additional indexes for production load
CREATE INDEX CONCURRENTLY sessions_quality_user_idx 
ON sessions (user_id, quality_score DESC) 
WHERE is_archived = false;

-- Update table statistics
ANALYZE sessions;
ANALYZE user_profiles;
ANALYZE session_analytics;
```

### Step 6.3: Set Up Monitoring
1. Go to **Settings** → **Database**
2. Enable **Database Webhooks** for important events
3. Set up **Logging** integration
4. Configure **Backup** schedule

## 7. Monitoring and Maintenance

### Daily Monitoring
- Check **Database** → **Reports** for performance metrics
- Monitor **Authentication** → **Users** for signup trends
- Review **Logs** for any errors

### Weekly Maintenance
- Review **Database** → **Roles** and permissions
- Check **Storage** usage and optimize if needed
- Update any security patches

### Monthly Tasks
- Review and archive old session data
- Analyze usage patterns from `session_analytics`
- Update database statistics: `ANALYZE;`

## Troubleshooting

### Common Issues

#### Authentication Not Working
```bash
# Check these settings:
1. GitHub OAuth callback URL matches exactly
2. Site URL is set correctly in Supabase
3. Environment variables are loaded properly

# Debug with:
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
```

#### Database Connection Issues
```sql
-- Check connection limits:
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Reset connections if needed:
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '10 minutes';
```

#### RLS Policies Not Working
```sql
-- Test RLS as specific user:
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Check policy definitions:
SELECT * FROM pg_policies WHERE tablename = 'sessions';
```

#### Performance Issues
```sql
-- Check slow queries:
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check index usage:
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;
```

### Getting Help

1. **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
2. **Community Discord**: [discord.supabase.com](https://discord.supabase.com)
3. **ContextMCP Issues**: Create an issue in the GitHub repository

### Next Steps

Once your Supabase setup is working:

1. **Security Audit**: Review RLS policies and API access
2. **Performance Testing**: Load test with realistic data
3. **Backup Strategy**: Set up automated backups
4. **Monitoring**: Integrate with your preferred monitoring tools
5. **Scaling**: Plan for database scaling as usage grows

---

## Quick Reference

### Useful SQL Queries

```sql
-- Count sessions by user
SELECT u.email, COUNT(s.id) as session_count
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
LEFT JOIN sessions s ON u.id = s.user_id
GROUP BY u.id, u.email
ORDER BY session_count DESC;

-- Top active users this week
SELECT up.github_username, COUNT(sa.id) as events
FROM session_analytics sa
JOIN user_profiles up ON sa.user_id = up.id
WHERE sa.created_at > NOW() - INTERVAL '7 days'
GROUP BY up.id, up.github_username
ORDER BY events DESC
LIMIT 10;

-- Database size and growth
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Environment Variables Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_AUTH_GITHUB_CLIENT_ID`
- [ ] `SUPABASE_AUTH_GITHUB_SECRET`
- [ ] `NEXT_PUBLIC_SITE_URL`

### Production Deployment Checklist

- [ ] GitHub OAuth app configured for production domain
- [ ] Supabase auth settings updated for production
- [ ] Environment variables set in production environment
- [ ] Database schema deployed
- [ ] RLS policies tested
- [ ] API keys secured
- [ ] Monitoring configured
- [ ] Backup strategy implemented