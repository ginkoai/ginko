# Production Monitoring Guide

**Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Current
**Related:** [DEPLOYMENT.md](./DEPLOYMENT.md), [SCALING.md](./SCALING.md)

## Overview

This guide covers monitoring, logging, and observability for the Ginko Cloud Knowledge Graph production environment.

## Monitoring Stack

### Current Tools

1. **Vercel Analytics** (Built-in)
   - Real User Monitoring (RUM)
   - Core Web Vitals
   - Traffic analytics
   - Error tracking

2. **Neo4j AuraDB Console** (Built-in)
   - Database metrics
   - Query performance
   - Storage usage
   - Connection monitoring

3. **Supabase Dashboard** (Built-in)
   - API usage metrics
   - Auth analytics
   - Database performance
   - Quota monitoring

### Recommended Additional Tools

1. **Sentry** (Error Tracking)
   - JavaScript error tracking
   - Performance monitoring
   - Release tracking
   - User context

2. **UptimeRobot** (Uptime Monitoring)
   - HTTP(S) monitoring
   - Port monitoring
   - Keyword monitoring
   - Alert notifications

3. **LogRocket** (Session Replay - Optional)
   - Session replay
   - User behavior analytics
   - Console logs
   - Network activity

## Key Metrics

### Application Metrics

#### Response Time
- **Target:** P95 < 200ms
- **Warning:** P95 > 500ms
- **Critical:** P95 > 1000ms

**Where to check:**
- Vercel Analytics → Performance
- Load test results

#### Success Rate
- **Target:** > 99%
- **Warning:** < 99%
- **Critical:** < 95%

**Where to check:**
- Vercel Analytics → Errors
- API logs

#### Throughput
- **Target:** > 50 req/s sustained
- **Warning:** Degradation > 20%
- **Critical:** Service unavailable

**Where to check:**
- Vercel Analytics → Traffic
- Load test results

### Infrastructure Metrics

#### Neo4j AuraDB

**Connection Pool**
- **Target:** < 80% utilization
- **Warning:** > 80% utilization
- **Critical:** Connection refused

**Query Performance**
- **Target:** Average query < 100ms
- **Warning:** Average query > 500ms
- **Critical:** Average query > 2000ms

**Storage**
- **Target:** < 70% used
- **Warning:** > 80% used
- **Critical:** > 90% used

**Where to check:**
- Neo4j AuraDB Console → Metrics
- Database tab → Performance

#### Supabase

**API Requests**
- **Target:** < 80% of quota
- **Warning:** > 80% of quota
- **Critical:** Quota exceeded

**Database Connections**
- **Target:** < 60 connections
- **Warning:** > 80 connections
- **Critical:** > 100 connections

**Auth MAU (Monthly Active Users)**
- **Target:** < 40k MAU (free tier: 50k)
- **Warning:** > 45k MAU
- **Critical:** > 50k MAU

**Where to check:**
- Supabase Dashboard → Reports
- Settings → Usage

#### Vercel

**Build Minutes**
- **Target:** < 80% of quota
- **Warning:** > 90% of quota
- **Critical:** Quota exceeded

**Bandwidth**
- **Target:** < 80% of quota
- **Warning:** > 90% of quota
- **Critical:** Quota exceeded

**Function Executions**
- **Target:** < 1M per day
- **Warning:** > 5M per day
- **Critical:** > 10M per day

**Where to check:**
- Vercel Dashboard → Usage
- Project Settings → Usage

### User Experience Metrics

#### Core Web Vitals

**LCP (Largest Contentful Paint)**
- **Good:** < 2.5s
- **Needs Improvement:** 2.5s - 4s
- **Poor:** > 4s

**FID (First Input Delay)**
- **Good:** < 100ms
- **Needs Improvement:** 100ms - 300ms
- **Poor:** > 300ms

**CLS (Cumulative Layout Shift)**
- **Good:** < 0.1
- **Needs Improvement:** 0.1 - 0.25
- **Poor:** > 0.25

**Where to check:**
- Vercel Analytics → Web Vitals
- Chrome DevTools → Lighthouse

## Alerting Strategy

### Alert Channels

1. **Email:** For all severity levels
2. **Slack:** #alerts channel for P0/P1
3. **SMS/Phone:** P0 incidents only (via PagerDuty/OpsGenie)

### Alert Rules

#### Application Alerts

**High Error Rate**
- **Condition:** Error rate > 5% over 5 minutes
- **Severity:** P1
- **Action:** Check logs, recent deployments

**Slow Response Time**
- **Condition:** P95 latency > 1000ms over 5 minutes
- **Severity:** P1
- **Action:** Check database queries, scale resources

**Service Unavailable**
- **Condition:** Uptime check fails 3 consecutive times
- **Severity:** P0
- **Action:** Immediate investigation, rollback if needed

#### Infrastructure Alerts

**Neo4j Connection Issues**
- **Condition:** Connection failures > 10% over 5 minutes
- **Severity:** P1
- **Action:** Check AuraDB status, verify credentials

**Database Storage Critical**
- **Condition:** Storage > 90% used
- **Severity:** P1
- **Action:** Archive old data, upgrade plan

**Quota Exceeded**
- **Condition:** Any quota limit reached
- **Severity:** P2
- **Action:** Review usage, upgrade plan if needed

## Logging Strategy

### Log Levels

**ERROR:** Failures requiring immediate attention
```javascript
console.error('[API] Failed to fetch nodes:', error);
```

**WARN:** Issues that may require attention
```javascript
console.warn('[Cache] Redis connection unavailable, using fallback');
```

**INFO:** General operational information
```javascript
console.log('[Auth] User logged in:', userId);
```

**DEBUG:** Detailed diagnostic information
```javascript
console.debug('[Query] Neo4j query executed:', { query, params, duration });
```

### Log Retention

- **Vercel Logs:** 7 days (Free plan), 30 days (Pro plan)
- **Application Logs:** Configure external log aggregation for longer retention
- **Audit Logs:** Permanent retention (Supabase Auth logs)

### Log Analysis

**View recent logs:**
```bash
# Vercel logs (real-time)
vercel logs --follow

# Vercel logs (specific deployment)
vercel logs <deployment-url>

# Vercel logs (filtered)
vercel logs --filter=error
```

**Common log patterns to monitor:**
- Database connection errors
- Authentication failures
- API rate limiting
- Timeout errors
- Unhandled exceptions

## Health Check Implementation

### Automated Health Checks

**Script:** `scripts/health-check.ts`

**Run manually:**
```bash
npm run health-check
```

**Run in CI/CD:**
```yaml
# .github/workflows/health-check.yml
name: Production Health Check
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run health check
        run: npm run health-check
        env:
          NEO4J_URI: ${{ secrets.NEO4J_URI }}
          NEO4J_PASSWORD: ${{ secrets.NEO4J_PASSWORD }}
```

### Health Check Endpoints

**Vercel Deployment:**
```bash
curl https://app.ginkoai.com
# Expected: HTTP 200
```

**REST API:**
```bash
curl https://app.ginkoai.com/api/v1/knowledge/nodes?graphId=test&limit=1
# Expected: HTTP 401 (auth required)
```

**GraphQL:**
```bash
curl -X POST https://app.ginkoai.com/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
# Expected: HTTP 200 with auth error
```

## Dashboard Setup

### Vercel Analytics

**Enable:**
1. Go to Vercel Dashboard → Project → Analytics
2. Enable Speed Insights
3. Enable Web Vitals
4. Configure custom events (optional)

**View metrics:**
- Real-time traffic
- Geographic distribution
- Device types
- Top pages
- Referrers

### Neo4j Monitoring Dashboard

**Access:**
1. Log into Neo4j AuraDB Console
2. Select your instance
3. Go to Metrics tab

**Key charts:**
- Query rate
- Query duration
- Memory usage
- Storage usage
- Connection count

### Supabase Monitoring

**Access:**
1. Log into Supabase Dashboard
2. Select your project
3. Go to Reports

**Key metrics:**
- API requests per day
- Database size
- Active connections
- Auth MAU
- Storage usage

## Performance Monitoring

### Load Testing Schedule

**Daily (Automated):**
```bash
# Light load test (20 requests)
npm run load-test -- --concurrent=5 --requests=20
```

**Weekly (Manual):**
```bash
# Full load test (1000 requests)
npm run load-test -- --concurrent=50 --requests=1000 --auth=<token>
```

**Pre-deployment (Required):**
```bash
# Smoke test
npm run load-test -- --concurrent=10 --requests=100
```

### Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| P50 Latency | < 50ms | > 100ms | > 200ms |
| P95 Latency | < 200ms | > 500ms | > 1000ms |
| P99 Latency | < 500ms | > 1000ms | > 2000ms |
| Success Rate | > 99.5% | < 99% | < 95% |
| Throughput | > 100 req/s | < 50 req/s | < 10 req/s |

## Error Tracking Setup

### Sentry Integration (Recommended)

**1. Install Sentry:**
```bash
npm install @sentry/nextjs
```

**2. Configure Sentry:**
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out sensitive data
    return event;
  },
});
```

**3. Add error boundaries:**
```tsx
// app/error.tsx
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Error Monitoring Checklist

- [ ] JavaScript errors captured
- [ ] API errors logged
- [ ] Database errors tracked
- [ ] Authentication failures monitored
- [ ] Unhandled promise rejections caught
- [ ] Performance issues tracked
- [ ] User context attached to errors
- [ ] Source maps uploaded for stack traces

## Uptime Monitoring Setup

### UptimeRobot Configuration

**1. Create monitors:**
- **Main Site:** https://app.ginkoai.com (HTTP check every 5 minutes)
- **API Health:** https://app.ginkoai.com/api/v1/knowledge/nodes?graphId=test&limit=1 (HTTP 401 expected)
- **GraphQL:** https://app.ginkoai.com/api/graphql (POST request)

**2. Configure alerts:**
- Email notification on downtime
- Slack webhook integration
- SMS for critical alerts (optional)

**3. Status page:**
- Public status page URL
- Incident history
- Uptime percentages

## Incident Management

### Detection

**Automated:**
- Health check failures
- Uptime monitor alerts
- Error rate spikes
- Performance degradation

**Manual:**
- User reports
- Support tickets
- Team observations

### Response Workflow

1. **Acknowledge:** Post in #incidents Slack channel
2. **Assess:** Determine severity (P0/P1/P2/P3)
3. **Investigate:** Check logs, metrics, recent changes
4. **Mitigate:** Apply fix or rollback
5. **Verify:** Run health checks
6. **Document:** Post-mortem in incident log

### Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours
**Severity:** P0/P1/P2/P3
**Impact:** X users affected

## Timeline
- HH:MM - Incident detected
- HH:MM - Team notified
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

## Root Cause
[Detailed explanation]

## Resolution
[How it was fixed]

## Prevention
- [ ] Action item 1
- [ ] Action item 2
- [ ] Action item 3

## Lessons Learned
[What we learned]
```

## Maintenance Windows

### Scheduled Maintenance

**Frequency:** Monthly (first Tuesday, 10am-12pm PT)

**Activities:**
- Dependency updates
- Database optimization
- Performance tuning
- Security patches

**Notification:**
- Announce 7 days in advance
- Post in #announcements
- Update status page
- Email notification (if applicable)

### Emergency Maintenance

**Criteria:**
- Critical security vulnerability
- Data integrity issue
- Service stability threat

**Procedure:**
1. Notify team immediately
2. Update status page
3. Apply fixes
4. Verify resolution
5. Document incident

## References

- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Neo4j Monitoring Guide](https://neo4j.com/docs/operations-manual/current/monitoring/)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/metrics)
- [Sentry Documentation](https://docs.sentry.io/)
- [UptimeRobot Setup Guide](https://uptimerobot.com/help/)

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-07 | 1.0 | Initial monitoring guide |

---

**Document Owner:** DevOps Team
**Review Schedule:** Quarterly
**Next Review:** 2026-02-07
