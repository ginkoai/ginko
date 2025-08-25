---
type: setup
status: current
updated: 2025-01-31
tags: [vercel, deployment, production, custom-domain, ci-cd]
related: [vercel-setup.md, supabase-setup-guide.md, PRODUCTION_ARCHITECTURE.md]
priority: critical
audience: [developer, ai-agent]
estimated-read: 10-min
dependencies: [supabase-setup-guide.md]
---

# Vercel Deployment Guide for ContextMCP Dashboard

This guide provides comprehensive instructions for deploying the ContextMCP dashboard to Vercel with custom domain setup and CI/CD integration.

## Prerequisites

- Vercel account (free or pro)
- GitHub repository access
- Domain ownership for contextmcp.com
- Supabase project with environment variables

## Initial Setup

### 1. Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 2. Link Project to Vercel

From the project root directory:

```bash
vercel link
```

Choose:
- Set up and deploy `~/Development/contextMCP`? **Y**
- Which scope? **Your username/organization**
- Link to existing project? **N**
- Project name: **contextmcp-dashboard**

## Environment Variables Configuration

### 1. Required Environment Variables

Set these in your Vercel dashboard or via CLI:

```bash
# Supabase Configuration
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY  
vercel env add SUPABASE_SERVICE_ROLE_KEY

# App Configuration
vercel env add NEXT_PUBLIC_APP_URL
```

### 2. Environment Values

**Production:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://ginkocmp-dashboard.vercel.app
```

**Preview:**
```
NEXT_PUBLIC_APP_URL=https://dashboard-abc123-yourname.vercel.app
```

**Note**: OAuth authentication is handled entirely by Supabase - no NextAuth configuration needed.

## OAuth Configuration for Production

### 1. Supabase OAuth Setup

1. Go to Supabase Dashboard > Authentication > Providers
2. Enable GitHub provider
3. Configure GitHub OAuth App:
   - **Application name**: ContextMCP Dashboard
   - **Homepage URL**: `https://ginkocmp-dashboard.vercel.app`
   - **Authorization callback URL**: `https://your-project.supabase.co/auth/v1/callback`

### 2. Supabase URL Configuration

```
Site URL: https://ginkocmp-dashboard.vercel.app
Redirect URLs: 
  - https://*.vercel.app/auth/callback
  - https://*.vercel.app/dashboard
```

**Key Features:**
- Wildcard patterns support dynamic Vercel URLs
- Automatic handling of preview deployments
- No manual URL updates needed for new deployments

### 3. GitHub OAuth App Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App with:
   - **Application name**: ContextMCP Dashboard
   - **Homepage URL**: `https://ginkocmp-dashboard.vercel.app`  
   - **Authorization callback URL**: `https://your-project.supabase.co/auth/v1/callback`
3. Copy Client ID and Client Secret to Supabase

## Custom Domain Setup (Future Enhancement)

### 1. Add Domain in Vercel Dashboard

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** > **Domains**
3. Add domain: `contextmcp.com`
4. Add domain: `www.contextmcp.com` (redirect to contextmcp.com)

### 2. DNS Configuration

Update your domain's DNS settings:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

### 3. Verify Domain

```bash
vercel domains verify contextmcp.com
```

## Deployment Commands

### Manual Deployment

```bash
# Production deployment
npm run dashboard:deploy

# Preview deployment  
npm run dashboard:deploy:preview

# From dashboard directory
cd dashboard
npm run deploy          # Production
npm run deploy:preview  # Preview
```

### Local Development

```bash
# Start dashboard locally
npm run dashboard:dev

# Or from dashboard directory
cd dashboard && npm run dev
```

## CI/CD with GitHub Actions

### 1. Automatic Deployments

Vercel automatically deploys:
- **Production**: commits to `main` branch → contextmcp.com
- **Preview**: commits to feature branches → preview URLs
- **Pull Requests**: each PR gets its own preview deployment

### 2. GitHub Integration Setup

1. Install Vercel GitHub app
2. Connect your repository
3. Configure deployment settings:
   - Production Branch: `main`
   - Build Command: `cd dashboard && npm run build`
   - Output Directory: `dashboard/.next`
   - Install Command: `cd dashboard && npm ci`

### 3. Manual GitHub Actions (Optional)

Create `.github/workflows/deploy.yml` for custom deployment logic:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: dashboard/package-lock.json
      
      - name: Install dependencies
        run: cd dashboard && npm ci
        
      - name: Run tests
        run: cd dashboard && npm run lint && npm run type-check
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./dashboard
```

## Project Structure for Deployment

```
/Users/cnorton/Development/contextMCP/
├── vercel.json                 # Vercel configuration
├── .vercelignore              # Files to exclude from deployment
├── dashboard/                 # Next.js application
│   ├── package.json           # Dashboard dependencies
│   ├── next.config.js         # Next.js configuration
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   ├── components/        # React components
│   │   └── lib/               # Utilities and Supabase
│   └── .next/                 # Build output (created during build)
└── docs/
    └── vercel-deployment-guide.md
```

## Vercel Configuration Highlights

### Key Features Configured

1. **Next.js 14 App Router Support**
   - Proper build and output directory configuration
   - App Router API routes handling

2. **API Routes Optimization**
   - 30-second timeout for API functions
   - 1GB memory allocation
   - Proper CORS headers

3. **Security Headers**
   - Content Security Policy headers
   - XSS protection
   - Frame options for security

4. **Multi-Region Deployment**
   - Primary regions: US East (iad1), US West (sfo1), Europe (fra1)
   - Optimized for global performance

## Monitoring and Analytics

### 1. Vercel Analytics

Enable in dashboard:
- Real User Monitoring (RUM)
- Core Web Vitals tracking
- Performance insights

### 2. Function Logs

Access function logs:
```bash
vercel logs --follow
```

### 3. Deployment Status

Check deployment status:
```bash
vercel ls
vercel inspect [deployment-url]
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build locally first
   cd dashboard && npm run build
   ```

2. **Environment Variable Issues**
   ```bash
   # List current env vars
   vercel env ls
   
   # Pull env vars for local development
   vercel env pull .env.local
   ```

3. **OAuth Authentication Issues**
   ```bash
   # Check Supabase logs
   # Verify GitHub OAuth app configuration
   # Confirm redirect URLs match deployment URLs
   # Test with: https://your-deployment.vercel.app/auth/login
   ```

4. **Domain Issues**
   ```bash
   # Check domain status
   vercel domains ls
   ```

5. **Function Timeout**
   - Increase timeout in `vercel.json`
   - Optimize API routes
   - Consider upgrading Vercel plan

### OAuth-Specific Troubleshooting

1. **"Code: missing" Error**
   - Verify GitHub OAuth callback URL points to Supabase
   - Check Supabase site URL matches deployment URL
   - Ensure wildcard patterns are configured correctly

2. **Authentication Loops**
   - Check middleware configuration (should only protect `/dashboard/*`)
   - Verify hash fragment handling in OAuth component
   - Test session persistence across page refreshes

3. **Database Profile Creation Failures**
   - Check Supabase logs for trigger errors
   - Verify user_profiles table schema
   - Test handle_new_user() function manually

### Debug Commands

```bash
# View deployments
vercel ls

# Get deployment details
vercel inspect [url]

# View function logs
vercel logs [url] --follow

# Check project info
vercel project ls
```

## Performance Optimization

### 1. Next.js Optimizations

- Image optimization with `next/image`
- Automatic code splitting
- Static generation where possible
- ISR (Incremental Static Regeneration) for dynamic content

### 2. Vercel Edge Functions

Consider using Edge Functions for:
- Authentication middleware
- Request/response transformation
- A/B testing logic

### 3. CDN and Caching

Vercel automatically provides:
- Global CDN distribution
- Automatic asset optimization
- Intelligent caching strategies

## Maintenance

### Regular Tasks

1. **Dependency Updates**
   ```bash
   cd dashboard && npm update
   ```

2. **Security Audits**
   ```bash
   cd dashboard && npm audit
   ```

3. **Performance Monitoring**
   - Check Vercel Analytics dashboard
   - Monitor Core Web Vitals
   - Review function execution times

### 4. Backup Strategy

- Repository is automatically backed up in GitHub
- Environment variables should be documented securely
- Database backups handled by Supabase

## Support and Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase + Vercel Integration](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

## Quick Reference

```bash
# Development
npm run dashboard:dev

# Production deployment
npm run dashboard:deploy

# Preview deployment
npm run dashboard:deploy:preview

# Check deployment status
vercel ls

# View logs
vercel logs --follow
```

---

**Last Updated:** 2025-08-01  
**Author:** Chris Norton <chris@ginko.ai>  
**Version:** 2.0 (Updated with OAuth Configuration)