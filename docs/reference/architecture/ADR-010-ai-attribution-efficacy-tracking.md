# ADR-010: AI Attribution and Efficacy Tracking System

**Status:** Accepted  
**Date:** 2025-08-04  
**Authors:** Claude (AI Assistant), Chris Norton  
**Reviewers:** Chris Norton  

## Context

As the Ginko Best Practices Marketplace moves toward production, we face two critical challenges:

1. **Production Data Quality**: How do we maintain trust and transparency when AI-generated content is mixed with human contributions?
2. **Efficacy Measurement**: How can we empirically validate that best practices actually improve development outcomes?

The user's specific concerns:
- "How will we know which records to purge before go-live?"
- "AI-generated BPs should be marked as such"
- "How can we test real-world efficacy of a BP?"

Their hypothesis: "Real world efficacy can be tested by measuring model effectiveness both with and without a BP, then measuring the results (time to task completion, token usage, solution quality, rework attempts, etc.)"

## Decision

We will implement a comprehensive **AI Attribution and Efficacy Tracking System** that:

### 1. AI Content Attribution
- **Transparent Labeling**: All content clearly marked by source (human, AI-generated, AI-curated)
- **Model Tracking**: Record which AI model generated content and prompt version used
- **Curation Workflow**: Human review process for AI-generated content before public visibility
- **Visual Indicators**: UI badges and styling to immediately communicate content origin

### 2. Empirical Efficacy Measurement
- **A/B Testing Framework**: Compare development outcomes with/without specific best practices
- **Measurable Metrics**: Time to completion, token efficiency, solution quality, error rates
- **Statistical Rigor**: Confidence intervals, p-values, sample size tracking
- **Community Validation**: User feedback on real-world effectiveness

## Architecture

### Database Schema

```sql
-- AI Attribution (added to best_practices table)
ALTER TABLE best_practices ADD COLUMN content_source VARCHAR(50) DEFAULT 'human' 
  CHECK (content_source IN ('human', 'ai_generated', 'ai_curated'));
ALTER TABLE best_practices ADD COLUMN ai_model VARCHAR(100);
ALTER TABLE best_practices ADD COLUMN verification_status VARCHAR(50) DEFAULT 'unverified' 
  CHECK (verification_status IN ('unverified', 'community_tested', 'empirically_validated'));

-- Efficacy Tracking Tables
CREATE TABLE bp_efficacy_experiments (
  id UUID PRIMARY KEY,
  bp_id UUID REFERENCES best_practices(id),
  hypothesis TEXT NOT NULL,
  control_group_description TEXT NOT NULL,
  treatment_group_description TEXT NOT NULL,
  -- ... experiment metadata
);

CREATE TABLE bp_efficacy_sessions (
  id UUID PRIMARY KEY,
  experiment_id UUID REFERENCES bp_efficacy_experiments(id),
  group_type VARCHAR(50) CHECK (group_type IN ('control', 'treatment')),
  -- Measurable outcomes
  total_duration_seconds INTEGER,
  token_count_input INTEGER,
  token_count_output INTEGER,
  solution_quality_score INTEGER CHECK (solution_quality_score BETWEEN 1 AND 10),
  rework_required BOOLEAN,
  -- ... additional metrics
);

CREATE TABLE bp_efficacy_results (
  id UUID PRIMARY KEY,
  experiment_id UUID REFERENCES bp_efficacy_experiments(id),
  -- Statistical results
  efficacy_score DECIMAL(5,2),
  statistical_significance BOOLEAN,
  confidence_interval_lower DECIMAL(5,2),
  confidence_interval_upper DECIMAL(5,2),
  -- ... comparative metrics
);
```

### API Integration

```typescript
interface BestPractice {
  // Existing fields...
  
  // AI Attribution
  content_source?: 'human' | 'ai_generated' | 'ai_curated';
  ai_model?: string;
  verification_status?: 'unverified' | 'community_tested' | 'empirically_validated';
  
  // Computed efficacy fields
  efficacy_score?: number;
  statistically_significant?: boolean;
  source_label?: string; // Auto-generated UI label
}
```

### UI Transparency

```tsx
// Visual attribution badges
{practice.source_label && (
  <Chip 
    label={practice.source_label}
    sx={{ 
      bgcolor: practice.content_source === 'human' ? '#f0f9ff' : '#fefce8',
      color: practice.content_source === 'human' ? '#0369a1' : '#a16207'
    }}
  />
)}

// Quality validation indicators
{practice.verification_status === 'empirically_validated' && (
  <Chip label="✅ Proven Effective" />
)}
```

## Implementation Details

### AI Content Seeding
- Created 4 high-quality AI-generated best practices with proper Claude attribution
- Each practice marked with `content_source: 'ai_generated'`, `ai_model: 'claude-3-5-sonnet-20241022'`
- Practices cover essential patterns: Error handling, React optimization, Database migrations, Claude prompting

### Efficacy Measurement Process
1. **Experiment Design**: Define hypothesis, control/treatment conditions
2. **Session Tracking**: Monitor Claude Code sessions with/without best practice
3. **Metric Collection**: Automatically capture performance indicators
4. **Statistical Analysis**: Calculate efficacy scores with confidence intervals
5. **Validation**: Update practice verification status based on results

### Data Quality Assurance
- **No Mock Human Data**: Only legitimate AI or human contributions
- **Clear Attribution**: Impossible to mistake AI content for human content  
- **Curation Gates**: AI content requires human review before public visibility
- **Community Feedback**: Real user validation of practice effectiveness

## Consequences

### Positive
- **Trust and Transparency**: Users can make informed decisions about content origin
- **Quality Assurance**: Systematic validation of practice effectiveness
- **Data-Driven Improvement**: Empirical evidence guides practice recommendations
- **Production Readiness**: Clear path to purge/validate content before launch
- **Scientific Rigor**: A/B testing provides statistical confidence in recommendations

### Negative
- **Implementation Complexity**: Requires sophisticated tracking and analysis infrastructure
- **Data Collection Requirements**: Need significant usage data for statistical significance
- **UI Complexity**: Additional visual elements may clutter interface
- **Performance Overhead**: Efficacy tracking adds database queries and storage

### Neutral
- **User Behavior Change**: Users may initially prefer human-authored content
- **Maintenance Overhead**: Curation workflow requires ongoing human involvement

## Monitoring and Success Metrics

### Attribution System Success
- **Transparency Score**: % of users who correctly identify content source
- **Trust Metrics**: User adoption rates of AI vs human content
- **Curation Efficiency**: Time from AI generation to approved status

### Efficacy System Success  
- **Validation Coverage**: % of practices with empirical validation
- **Accuracy**: Correlation between predicted and actual effectiveness
- **Usage Impact**: Adoption increase for empirically validated practices

### Production Readiness
- **Content Quality**: Zero mock/placeholder data in production
- **Attribution Completeness**: 100% content properly labeled by source
- **Statistical Confidence**: Efficacy claims backed by significant results

## Alternatives Considered

### 1. Manual Content Curation Only
**Rejected**: Doesn't scale and provides no empirical validation of effectiveness.

### 2. Simple AI/Human Flags
**Rejected**: Insufficient granularity for production quality assurance and doesn't address efficacy measurement.

### 3. Survey-Based Effectiveness
**Rejected**: Subjective and prone to bias compared to empirical measurement.

### 4. No Attribution System
**Rejected**: Violates transparency principles and user trust requirements.

## Implementation Status

- ✅ Database schema migration complete (`002-ai-attribution-and-efficacy-tracking.sql`)
- ✅ API integration updated with new fields and views
- ✅ UI components enhanced with attribution badges and quality indicators  
- ✅ Seeding infrastructure with properly attributed AI content
- ✅ Efficacy tracking tables and triggers implemented
- 🔲 Experiment management UI (future enhancement)
- 🔲 Statistical analysis automation (future enhancement)

## References

- [PRD-001: Best Practices Marketplace MVP](../product-requirements/PRD-001-best-practices-marketplace-mvp.md)
- [PRD-002: Best Practices Web Interface](../product-requirements/PRD-002-best-practices-web-interface.md)
- Migration: `database/migrations/002-ai-attribution-and-efficacy-tracking.sql`
- Implementation: `api/mcp/best-practices/index.ts`, `dashboard/src/app/marketplace/page.tsx`

---

**Decision Record Conclusion**: This ADR establishes a comprehensive system for AI content attribution and empirical efficacy validation that addresses production data quality concerns while enabling scientific measurement of best practice effectiveness. The implementation provides transparency, maintains user trust, and creates a foundation for data-driven practice recommendations.