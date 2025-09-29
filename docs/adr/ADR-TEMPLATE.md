---
type: decision
status: draft | proposed | accepted | deprecated | superseded
updated: YYYY-MM-DD
tags: [tag1, tag2, tag3]
related: [file1.md, file2.md]
priority: low | medium | high | critical
audience: [developer, ai-agent, stakeholder, user]
estimated-read: X-min
dependencies: [ADR-XXX, document-name.md]
---

# ADR-XXX: [Decision Title]

**Status:** [Draft | Proposed | Accepted | Deprecated | Superseded]  
**Date:** YYYY-MM-DD  
**Authors:** [Author Name(s)]  
**Reviewers:** [Reviewer Name(s)]  
**Supersedes:** [ADR-XXX] *(if applicable)*  
**Superseded by:** [ADR-XXX] *(if applicable)*  

## Context

### Problem Statement
*What is the issue that we're seeing that is motivating this decision or change?*

### Business Context
*Why does this matter to the business/users/stakeholders?*

### Technical Context  
*What is the current technical situation? What constraints do we have?*

### Key Requirements
*What are the specific requirements this decision must address?*

## Decision

*What is the change that we're proposing or have agreed to implement?*

### Chosen Solution
*Describe the selected approach in detail*

### Implementation Approach
*How will this be implemented? Key technical details.*

## Architecture

### System Design
*Architectural diagrams, component interactions, data flows*

```typescript
// Code examples, interfaces, or key implementation details
```

### Integration Points
*How does this integrate with existing systems?*

### Data Model Changes
*Any database schema changes, API changes, etc.*

## Alternatives Considered

### Option 1: [Alternative Name]
**Description:** *Brief description*  
**Pros:** *Benefits of this approach*  
**Cons:** *Drawbacks of this approach*  
**Decision:** *Why rejected*

### Option 2: [Alternative Name]
**Description:** *Brief description*  
**Pros:** *Benefits of this approach*  
**Cons:** *Drawbacks of this approach*  
**Decision:** *Why rejected*

## Consequences

### Positive Impacts
*What becomes easier or better as a result of this decision?*

### Negative Impacts  
*What becomes more difficult or worse? What are the risks?*

### Neutral Impacts
*What changes but isn't necessarily better or worse?*

### Migration Strategy
*How do we transition from the current state to the new state?*

## Implementation Details

### Technical Requirements
*Specific technical needs, dependencies, infrastructure*

### Security Considerations
*Security implications, threat model changes, mitigations*

### Performance Implications
*Impact on system performance, scalability considerations*

### Operational Impact
*Changes to deployment, monitoring, maintenance, support*

## Monitoring and Success Metrics

### Key Performance Indicators
*How will we measure if this decision is successful?*

### Monitoring Strategy
*What do we need to monitor? Alerts, dashboards, etc.*

### Success Criteria
*What conditions indicate this decision was correct?*

### Failure Criteria
*What conditions would indicate we need to revisit this decision?*

## Risks and Mitigations

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| [Risk 1] | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |

### Business Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| [Risk 1] | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |

## Timeline and Milestones

### Implementation Phases
- **Phase 1** (Timeline): *Description*
- **Phase 2** (Timeline): *Description*
- **Phase 3** (Timeline): *Description*

### Key Milestones
- **Milestone 1** (Date): *Description*
- **Milestone 2** (Date): *Description*

## Review and Updates

### Review Schedule
*When should this decision be reviewed? What triggers a review?*

### Update History
| Date | Author | Changes |
|------|--------|---------|
| YYYY-MM-DD | [Author] | Initial version |

## References

### Documentation
- [Document Title](link-to-document)
- [Related ADR](ADR-XXX-title.md)

### External References
- [External Resource](external-link)
- [Standards/Specifications](link)

### Code References
- Implementation: `path/to/code.ts`
- Tests: `path/to/tests.spec.ts`
- Configuration: `path/to/config.json`

---

**Notes for Authors:**
- Remove sections that don't apply to your decision
- Use concrete, specific language rather than abstract concepts
- Include diagrams where helpful (Mermaid syntax supported)
- Link to related documents and code
- Consider the audience - write for future developers who weren't involved in the decision
- Update the ADR index after creating this document