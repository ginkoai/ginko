---
type: feature
tags: [privacy, ai, solo-developers, sanitization, zero-retention]
area: ai-insights
created: 2025-09-09
updated: 2025-09-09
relevance: high
dependencies: [intelligent-model-routing]
---

# Ginko Basic AI - Privacy-Preserving Insights

## Context
Solo developers need AI insights but often lack API keys or don't want the complexity. Ginko Basic AI provides this while maintaining absolute privacy through sanitization and zero retention.

## Privacy Architecture

### What We Process (Sanitized Only)
```typescript
interface MinimalContext {
  // Safe metrics only
  sessionMetrics: {
    duration: number;
    filesChanged: number;
    contextSwitches: number;
  };
  
  // What we NEVER send
  // ❌ Actual code
  // ❌ File names/paths  
  // ❌ Commit messages
  // ❌ Personal identifiers
}
```

### Zero-Retention Promise
1. Process in memory only
2. Return insights to user's git
3. Delete everything immediately
4. No logs, no storage, no training

### Transparency by Design
```bash
# User sees exactly what's sent
ginko insights --preview
> Session duration: 4.5 hours
> Files modified: 12
> Context switches: 8
> No personal data included

# Explicit consent required
ginko insights --confirm
```

## Economics
- **Cost per user**: $0.0345/month (sustainable)
- **Free tier**: 10 insights/month
- **Pro tier**: 100 insights/month at $10
- **Conversion driver**: Get value before adding API key

## Trust Building
- Full transparency on data sent
- Zero retention architecture
- Results stored in user's git only
- Optional - can always use own API keys

## Impact
- Removes barrier for 65% of developers without API keys
- Drives 5-8% free-to-paid conversion
- Builds trust through transparency
- Enables viral growth in solo developer segment

## References
- [Solo Developer AI Solution](docs/PRD/solo-developer-ai-solution.md)
- [Privacy Architecture](docs/PRD/ginko-philosophy-manifesto.md#privacy-first-ai-architecture)