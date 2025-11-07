# Production Deployment Guide

**Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Current
**Related:** [MONITORING.md](./MONITORING.md), [SCALING.md](./SCALING.md)

## Overview

This guide covers production deployment procedures for the Ginko Cloud Knowledge Graph platform, including the Dashboard (Next.js), Neo4j AuraDB, and Supabase authentication.

**Production Environment:**
- **Dashboard:** https://app.ginkoai.com (Vercel)
- **Database:** Neo4j AuraDB (hosted)
- **Authentication:** Supabase (hosted)
- **DNS:** Managed via Vercel/domain provider

## Pre-Deployment Checklist

### 1. Code Quality

- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] Linting clean (`npm run lint`)
- [ ] No console errors or warnings in production build
- [ ] All dependencies up to date (check for HIGH vulnerabilities)

### 2. Environment Variables

Required environment variables for production:

#### Dashboard (Vercel)
```bash
# Neo4j Configuration
NEO4J_URI=neo4j+s://<instance>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<secure-password>

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Application URLs
NEXT_PUBLIC_APP_URL=https://app.ginkoai.com
NEXT_PUBLIC_API_URL=https://app.ginkoai.com/api

# OAuth Configuration (if enabled)
GITHUB_CLIENT_ID=<github-client-id>
GITHUB_CLIENT_SECRET=<github-client-secret>
NEXT_PUBLIC_ENABLE_GITHUB_AUTH=true
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false

# Voyage AI Embeddings (ADR-045)
VOYAGE_API_KEY=<voyage-api-key>
VOYAGE_MODEL=voyage-3.5
VOYAGE_DIMENSIONS=1024

# Application Metadata
NEXT_PUBLIC_BRAND_NAME=Ginko
NEXT_PUBLIC_SITE_NAME=Ginko Dashboard
NEXT_PUBLIC_SITE_URL=https://app.ginkoai.com
```

### 3. Database Setup

#### Neo4j AuraDB
- [ ] Instance provisioned and running
- [ ] Vector indexes created (see `scripts/setup-vector-indexes.ts`)
- [ ] Sample data loaded and verified
- [ ] Backup schedule configured
- [ ] Connection tested from production environment

#### Supabase
- [ ] Project created and configured
- [ ] Authentication providers enabled
- [ ] Row-level security policies configured
- [ ] Database tables created (if applicable)
- [ ] API keys generated and secured

### 4. Infrastructure Verification

Run health checks before deployment:

```bash
# Run comprehensive health check
npm run health-check

# Expected output:
# ✓ DNS Resolution
# ✓ SSL Certificate
# ✓ Vercel Deployment
# ✓ Neo4j AuraDB Connection
# ✓ Supabase Connection
# ✓ REST API Endpoint
# ⚠ GraphQL Endpoint (auth required)
```

## Deployment Procedures

### Standard Deployment (Vercel)

#### Automatic Deployment (Git Push)

1. **Commit and push to main branch:**
   ```bash
   git add .
   git commit -m "feat: your changes"
   git push origin main
   ```

2. **Vercel automatically:**
   - Detects the push
   - Builds the Next.js application
   - Runs preview deployment
   - Promotes to production (if main branch)

3. **Monitor deployment:**
   ```bash
   vercel logs --follow
   ```

#### Manual Deployment (CLI)

1. **Build locally:**
   ```bash
   npm run build
   npm run type-check
   ```

2. **Deploy to production:**
   ```bash
   vercel --prod
   ```

3. **Verify deployment:**
   ```bash
   curl -I https://app.ginkoai.com
   ```

### Environment Variable Updates

**Via Vercel Dashboard:**
1. Navigate to Project Settings → Environment Variables
2. Update variable(s)
3. Trigger redeploy for changes to take effect

**Via Vercel CLI:**
```bash
# Add/update environment variable
vercel env add NEO4J_PASSWORD production

# Pull environment variables locally
vercel env pull .env.production.local

# List environment variables
vercel env ls
```

### Database Migrations

#### Neo4j Schema Changes

1. **Create migration script:**
   ```cypher
   // schema/migrations/008-add-new-index.cypher
   CREATE INDEX node_type_index IF NOT EXISTS
   FOR (n:Node)
   ON (n.type);
   ```

2. **Test migration locally:**
   ```bash
   npm run neo4j:migrate -- schema/migrations/008-add-new-index.cypher
   ```

3. **Apply to production:**
   ```bash
   NEO4J_URI=<production-uri> npm run neo4j:migrate
   ```

4. **Verify migration:**
   ```bash
   npm run neo4j:verify
   ```

#### Supabase Migrations

1. **Create migration:**
   ```bash
   npx supabase migration new add_new_table
   ```

2. **Write migration SQL:**
   ```sql
   CREATE TABLE new_table (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     created_at TIMESTAMP DEFAULT now()
   );
   ```

3. **Apply migration:**
   ```bash
   npx supabase db push
   ```

### Rollback Procedures

#### Vercel Deployment Rollback

1. **Via Vercel Dashboard:**
   - Navigate to Deployments
   - Find previous successful deployment
   - Click "Promote to Production"

2. **Via CLI:**
   ```bash
   # List recent deployments
   vercel ls

   # Promote specific deployment
   vercel promote <deployment-url>
   ```

#### Database Rollback

**Neo4j:**
```bash
# Restore from backup (contact AuraDB support)
# Or manually revert schema changes
```

**Supabase:**
```bash
# Revert migration
npx supabase migration repair --version <previous-version>
```

## Post-Deployment Verification

### 1. Health Check

```bash
npm run health-check
```

**Expected Results:**
- ✓ DNS Resolution
- ✓ SSL Certificate (valid)
- ✓ Vercel Deployment (HTTP 200)
- ✓ Neo4j Connection
- ✓ Supabase Connection
- ✓ REST API Endpoint
- ⚠ GraphQL Endpoint (requires auth)

### 2. Load Testing

```bash
# Basic load test (20 requests, 5 concurrent)
npm run load-test -- --concurrent=5 --requests=20

# Full load test (1000 requests, 50 concurrent)
npm run load-test -- --concurrent=50 --requests=1000 --auth=<token>
```

**Performance Targets:**
- P95 latency < 200ms
- Success rate > 99%
- Throughput > 50 req/s

### 3. Functional Testing

**Dashboard:**
- [ ] Home page loads
- [ ] Authentication flow works
- [ ] Knowledge graph visible
- [ ] Search functionality works
- [ ] Public catalog pages accessible

**API Endpoints:**
- [ ] REST API returns 401 without auth
- [ ] REST API works with valid token
- [ ] GraphQL endpoint accessible
- [ ] Vector search returns results

### 4. Monitoring Setup

**Vercel Analytics:**
- [ ] Analytics enabled in Vercel dashboard
- [ ] Core Web Vitals tracking
- [ ] Error tracking enabled

**Neo4j Monitoring:**
- [ ] AuraDB metrics dashboard accessible
- [ ] Query performance acceptable
- [ ] Storage usage within limits

**Supabase Monitoring:**
- [ ] Project dashboard accessible
- [ ] Auth metrics visible
- [ ] API usage within quota

## Deployment Schedule

### Recommended Schedule

- **Feature deployments:** Tuesday-Thursday, 9am-5pm PT
- **Hotfixes:** Anytime (with approval)
- **Database migrations:** Tuesday/Wednesday, 10am-2pm PT
- **Avoid:** Fridays, weekends, holidays

### Deployment Windows

- **Standard:** 2-hour window for testing
- **Major updates:** 4-hour window with rollback plan
- **Hotfixes:** 30-minute window

## Security Considerations

### API Keys & Secrets

- **Never commit secrets to git**
- Store in Vercel environment variables
- Rotate keys quarterly or after any suspected compromise
- Use service accounts for production (not personal accounts)

### SSL/TLS

- Certificate auto-renewal via Vercel
- Force HTTPS for all connections
- HSTS enabled (max-age=63072000)

### Access Control

- **Neo4j:** IP whitelist + strong password
- **Supabase:** Row-level security policies
- **Vercel:** Team access with 2FA required

## Incident Response

### Severity Levels

**P0 - Critical (< 15min response)**
- Service completely unavailable
- Data loss or corruption
- Security breach

**P1 - High (< 1hr response)**
- Major feature unavailable
- Significant performance degradation
- Authentication failures

**P2 - Medium (< 4hr response)**
- Minor feature unavailable
- Intermittent errors
- Performance issues affecting <10% of users

**P3 - Low (< 24hr response)**
- Cosmetic issues
- Feature requests
- Documentation updates

### Incident Response Playbook

1. **Acknowledge:** Post in #incidents channel
2. **Assess:** Determine severity level
3. **Communicate:** Update status page
4. **Investigate:** Check logs, metrics, recent deployments
5. **Resolve:** Fix or rollback
6. **Verify:** Run health checks
7. **Post-mortem:** Document incident and prevention steps

## Cost Estimates

### Monthly Costs (Production)

**Vercel:**
- Pro Plan: $20/month (per team member)
- Bandwidth: ~$0 (within free tier for current traffic)

**Neo4j AuraDB:**
- Professional: ~$65/month (8GB storage, 2GB RAM)
- Enterprise: ~$650/month (larger instances)

**Supabase:**
- Pro Plan: $25/month
- Database: Included
- Auth: Included (50k MAU free)

**Voyage AI Embeddings:**
- Free Tier: 200M tokens (sufficient for development)
- Paid: $0.12 per 1M tokens (voyage-3.5)

**Total Estimated Cost:** $110-$720/month depending on scale

## Troubleshooting

### Common Issues

**Issue:** Deployment fails with build error
**Solution:** Check build logs, verify dependencies, run `npm run build` locally

**Issue:** Environment variables not updating
**Solution:** Redeploy after updating variables in Vercel dashboard

**Issue:** Neo4j connection timeout
**Solution:** Check IP whitelist, verify credentials, test connection locally

**Issue:** 502 Bad Gateway errors
**Solution:** Check serverless function timeout (increase if needed)

**Issue:** Slow API responses
**Solution:** Check Neo4j query performance, add indexes, optimize queries

### Debug Commands

```bash
# Check deployment status
vercel ls

# View recent logs
vercel logs --follow

# Test Neo4j connection
npm run neo4j:test

# Test Supabase connection
npm run supabase:test

# Run health checks
npm run health-check

# Run load tests
npm run load-test
```

## References

- [Vercel Deployment Documentation](https://vercel.com/docs/deployments)
- [Neo4j AuraDB Documentation](https://neo4j.com/docs/aura/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Production Checklist](https://nextjs.org/docs/going-to-production)

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-07 | 1.0 | Initial production deployment guide |

---

**Document Owner:** DevOps Team
**Review Schedule:** Quarterly
**Next Review:** 2026-02-07
