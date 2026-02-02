# ADR-016: Simplify MCP Interface While Preserving Internal Capabilities

## Status
Deprecated (superseded by ADR-077 git-native CLI architecture, 2026-02-02)

## Context
We're implementing a mode-aware session handoff system for Claude Code integration. During development, we identified tension between:

1. **MVP Requirements**: Simple, focused interface for single developers
2. **Future Team Features**: Rich project analysis and team collaboration tools
3. **Interface Complexity**: Too many exposed tools create cognitive overhead
4. **Implementation Effort**: Risk of rebuilding functionality when scaling to teams

The original design exposed 15+ MCP tools to Claude, including:
- `get_project_overview` - Project structure and file analysis
- `get_team_activity` - Team collaboration insights
- `list_sessions` - Browse historical sessions
- Various analytics and context tools

User feedback indicated this was too complex for the single-developer MVP use case.

## Decision

**Preserve functionality, simplify interface through strategic hiding.**

### Exposed MCP Tools (Claude Interface)
- `context` / `ctx` - Single startup command (auto-loads everything)
- `prepare_handoff` / `handoff` - Create session handoff
- `load_handoff` - Load most recent handoff (no session browsing)
- `get_best_practices` - Team coding standards
- `suggest_best_practice` - Contextual guidance

### Hidden Tools (Internal Use Only)
- `get_project_overview` - Used internally by context tool
- `get_team_activity` - Future team features
- `list_sessions` - Replaced with auto-load most recent
- Analytics and dashboard tools

### Key Changes
1. **Single Entry Point**: `context` tool becomes the primary startup command
2. **Auto-Resume**: Context tool automatically loads most recent handoff
3. **Simplified Handoff**: Remove session browsing, always use most recent
4. **Hidden Intelligence**: Project analysis happens behind scenes
5. **Future-Proof**: Team features ready but not exposed

## Rationale

### Benefits
- **Reduced Cognitive Load**: 5 tools instead of 15+ for typical use
- **Faster Onboarding**: Single `context` command gets everything
- **Future Ready**: Team features available when market demands them  
- **No Rework**: Functionality preserved, just interface changes
- **Better UX**: Auto-resume eliminates manual session management

### Trade-offs
- **Power User Limitations**: Advanced users can't access all features directly
- **Debugging Complexity**: Hidden tools harder to troubleshoot
- **Feature Discovery**: Users won't know about hidden capabilities

## Implementation

### Context Tool Enhancement
```typescript
case 'context':
  // Visible: Load best practices
  const practices = await getBestPractices(db, teamId);
  
  // Hidden: Get project intelligence  
  const overview = await contextManager.getProjectOverview();
  
  // Auto: Load most recent handoff
  const handoff = await loadMostRecentHandoff(userId, teamId, projectId);
  
  // Combined intelligent output
  return { practices + projectContext + handoff }
```

### Handoff Template Update
Enhanced handoff creation template includes project context updates:
```markdown
## 🏗️ Project Context Updates (Include if significant changes discovered)
**System Architecture**: [Architecture decisions discovered this session]
**Current Goals**: [Sprint priorities that emerged or changed]  
**Key Constraints**: [Performance, security, budget requirements discovered]
**Development Phase**: [Current phase: planning, building, testing, shipping]
```

## Migration Path

### Phase 1: MVP (Current)
- Expose simplified tool set
- Hide advanced features
- Focus on single-developer experience

### Phase 2: Team Features (Future)
- Expose team collaboration tools based on user demand
- Add team onboarding workflows
- Enable multi-developer project contexts

### Phase 3: Enterprise (Future)  
- Full analytics and dashboard exposure
- Advanced project intelligence
- Cross-team collaboration features

## Monitoring

### Success Metrics
- **User Adoption**: Increased usage of context tool vs. manual tool selection
- **Session Continuity**: Higher success rate of handoff loading
- **Support Requests**: Decreased questions about tool selection
- **Feature Requests**: Demand for previously hidden features indicates scaling need

### Failure Indicators
- **Power User Complaints**: Requests for direct access to hidden tools
- **Context Quality**: Reduced effectiveness due to hidden project analysis
- **Team Adoption**: Difficulty scaling to multi-developer teams

## Alternatives Considered

### 1. Remove Functionality Entirely
**Rejected**: Would require rebuilding for team features

### 2. Advanced/Basic Mode Toggle
**Rejected**: Adds configuration complexity to MVP

### 3. Progressive Disclosure UI
**Rejected**: Claude Code MCP interface doesn't support this pattern

### 4. Separate Team vs Individual Products
**Rejected**: Increases maintenance burden and market confusion

## Related ADRs
- ADR-007: Supabase Platform Adoption
- [Future] ADR-009: Team Collaboration Features

## Date
2025-08-11

## Authors
- Claude Code Session
- Chris Norton (chris@ginko.ai)