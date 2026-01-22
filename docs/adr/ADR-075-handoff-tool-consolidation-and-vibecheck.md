# ADR-075: Handoff Tool Consolidation and Vibecheck Pattern

**Status**: Proposed  
**Date**: 2025-08-11  
**Context**: MCP Tools UX and Collaboration Enhancement  

## Problem

We have two overlapping MCP tools that create UX confusion:

1. **`handoff`**: Generates comprehensive, mode-aware session transitions but doesn't persist them
2. **`capture`**: Provides basic templates with two-step approval process for persistence

Users expect a single, seamless handoff experience that both generates quality transitions AND saves them for the next session.

## Decision

### 1. Consolidate to Single `handoff` Tool
- **Keep the rich, mode-aware template** from current handoff tool
- **Add the two-step approval process** from capture tool  
- **Remove the capture tool** to eliminate confusion
- **Add auto-load functionality** for seamless session resumption

### 2. Introduce `vibecheck` Collaboration Pattern
- **Mutual recalibration tool** - either party can call when sensing drift/frustration
- **Gentle redirection mechanism** with options (stay focused/pivot/step back)
- **Context stashing capability** to pause current work and resume later
- **Signature differentiator** for Ginko collaboration experience

## Template Enhancement (Best of Both)

**From handoff (keep):**
- Mode-aware context (PLANNING/DEBUGGING/BUILDING/LEARNING/SHIPPING)
- Emotional tone preservation
- Instant start commands  
- Human approval checkpoints
- Conditional sections based on mode

**From capture (add):**
- Explicit "Files Changed" section
- "Key Decisions" tracking
- Clear next steps prioritization

**New additions:**
- Priority signals (CRITICAL/HIGH/LOW) 
- Success criteria clarity
- Constraint specification
- Collaboration context section

## Implementation Plan

### Phase 1: Enhanced Handoff Tool
1. Merge template structures
2. Implement two-step approval (generate → review → save)
3. Add auto-load for next sessions
4. Include 24-hour staleness warnings
5. Remove capture tool

### Phase 2: Vibecheck Integration  
1. Document pattern in project-level `CLAUDE.md`
2. Add setup tool to MCP for automatic CLAUDE.md updates
3. Implement context stashing system
4. Add collaboration guidelines to handoff template

## Benefits

- **Single, clear workflow** for session transitions
- **Preserved transparency** through approval process
- **Enhanced collaboration culture** through vibecheck
- **Better AI-human alignment** with explicit mode awareness
- **Reduced cognitive load** by eliminating tool choice confusion

## Risks

- **Learning curve** for existing users familiar with capture tool
- **Template complexity** might overwhelm some users (mitigated by human scanning behavior)
- **Transmission challenge** ensuring vibecheck pattern carries across sessions

## Success Metrics

- Users consistently use handoff tool (vs current split usage)
- Session continuity improves (measured by successful context preservation)
- Collaboration satisfaction increases (qualitative feedback)
- Mode discipline improves (less mid-session scope drift)

## Related

- See current handoff template in `api/templates/handoff-creation-template.md`
- MCP tools consolidation aligns with ADR-008 (simplified 5-tool interface)
- Collaboration patterns support team development context from CLAUDE.md

---

**Authors**: Chris Norton, Claude  
**Decision**: Pending implementation