---
type: setup
status: current
updated: 2025-01-31
tags: [vercel, deployment, hosting, quick-setup]
related: [vercel-deployment-guide.md, supabase-setup.md, parallel-setup-commands.md]
priority: high
audience: [developer, ai-agent]
estimated-read: 5-min
dependencies: [ADR-001]
---

# Vercel Setup Instructions

## 1. Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

## 2. Initialize Vercel Project

```bash
# In your project root
vercel

# Follow prompts:
# ? Set up and deploy "contextMCP"? [Y/n] y
# ? Which scope do you want to deploy to? Your Personal Account
# ? Link to existing project? [y/N] n
# ? What's your project's name? contextmcp
# ? In which directory is your code located? ./
```

## 3. Configure Environment Variables

```bash
# Add Supabase environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Enter your Supabase URL: https://YOUR_PROJECT_REF.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Enter your Supabase anon key

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Enter your Supabase service role key

# Verify environment variables
vercel env ls
```

## 4. Custom Domain Setup

```bash
# Add custom domain (after purchasing contextmcp.com)
vercel domains add contextmcp.com
vercel domains add www.contextmcp.com

# Configure DNS:
# Add CNAME record: www -> cname.vercel-dns.com
# Add A record: @ -> 76.76.19.19
```

## 5. Preview Deployments

```bash
# Deploy to preview URL
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls
```

## 6. Vercel Project Settings

In Vercel Dashboard:

### Build & Development Settings
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Development Command: `npm run dev`

### Environment Variables
- Production: Add all environment variables
- Preview: Copy from production
- Development: Copy from production

### Domains
- Production: contextmcp.com, www.contextmcp.com
- Preview: Auto-generated URLs for PRs

## 7. GitHub Integration

```bash
# Connect GitHub repository
# In Vercel Dashboard → Import Git Repository
# Select contextMCP repository
# Configure:
# - Auto-deploy on git push
# - Preview deployments on PRs
# - Comment on PRs with deployment URLs
```

## Setup Complete ✅

Your Vercel configuration includes:
- ✅ Automatic deployments from git
- ✅ Preview deployments for PRs
- ✅ Environment variables configured
- ✅ Custom domain ready
- ✅ Global edge deployment
- ✅ 30s function timeout for APIs