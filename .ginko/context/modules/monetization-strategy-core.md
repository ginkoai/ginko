---
type: architecture
tags: [monetization, strategy, pricing, git-native, privacy]
area: platform
created: 2025-09-09
updated: 2025-09-09
relevance: critical
dependencies: [ADR-027, ADR-026]
---

# Monetization Strategy - Core Architecture

## Context
Ginko is transforming from a free tool to a monetized platform while maintaining its git-native, privacy-first philosophy. This represents a fundamental architectural shift that preserves user ownership while creating sustainable revenue.

## Key Principles

### Git-Native Philosophy
- **ALL project data lives in git** - no external data retention
- **Zero vendor lock-in** - delete Ginko, keep everything
- **Privacy-first** - we never see or store user data
- **Transparent pricing** - simple $10/month Pro tier

### Revenue Architecture
```yaml
Three Tiers:
  Free: Unlimited personal, 10 AI insights/month
  Pro: $10/month, 100 AI insights, team features
  Enterprise: $25-50/month, SSO, custom workflows

Revenue Streams:
  - Direct subscriptions (90%+ margins)
  - Marketplace commissions (30% of sales)
  - Featured placements ($50/month)
```

## Technical Implementation

### What Stays in Git
- All PRDs, architecture docs, handoffs
- Context cards and session data
- AI insights and analytics results
- Visualization configurations

### What Ginko Stores
- Subscription status only
- Hashed user ID for rate limiting
- Aggregated usage metrics (no content)

## Impact
- **41% cheaper than Jira Premium** with better AI features
- **90%+ gross margins** due to no data storage costs
- **No AI inference costs** - customers use their own API keys
- **Sustainable free tier** through intelligent cost optimization

## References
- [Monetization Strategy PRD](docs/PRD/monetization-strategy-2025.md)
- [ADR-027: Monetization Architecture](docs/adr/ADR-027-monetization-architecture.md)
- [Ginko Philosophy Manifesto](docs/PRD/ginko-philosophy-manifesto.md)