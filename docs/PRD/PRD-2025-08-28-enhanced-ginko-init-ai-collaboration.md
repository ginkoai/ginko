# Product Requirements Document: Enhanced ginko init for AI-Human Collaboration

## Document Information
- **Date**: 2025-08-28
- **Author**: Chris Norton
- **Status**: Draft
- **Related ADRs**: ADR-002 (AI-Optimized File Discovery), ADR-023 (Flow State), ADR-024 (AI-Enhanced Local Tooling)

## Executive Summary

Transform `ginko init` from a basic setup command into an intelligent project optimizer that creates the perfect environment for AI-Human collaboration. The enhancement focuses on immediate productivity, progressive learning, and flow state preservation while maintaining the Unix philosophy of simplicity.

## Problem Statement

### Current Pain Points
1. **Context Loss**: Developers repeatedly explain project structure to AI assistants
2. **Pattern Ignorance**: AI suggestions don't match project conventions
3. **Discovery Friction**: AI cannot quickly understand file purposes
4. **Learning Overwhelm**: Users don't know which Ginko commands to use when
5. **Setup Burden**: Manual configuration required for effective AI collaboration

### User Journey Without Enhancement
```
Day 1: Excitement → Setup friction → Context explanation → Frustration
Day 7: Repetitive context → Pattern mismatches → Reduced AI usage
Day 30: "AI is more trouble than help" → Abandonment
```

## Solution Overview

### Core Principle
**"Magic out of the box, mastery through natural discovery"**

### Key Innovations

1. **Intelligent Project Analysis**
   - Auto-detect tech stack and patterns
   - Generate project-specific context modules
   - Create optimized CLAUDE.md with conventions

2. **Frontmatter-First Development**
   - Enforce ADR-002 discovery patterns
   - Generate templates for all file types
   - Enable 70% faster AI context discovery

3. **Progressive Learning System**
   - Track command usage locally/privately
   - Show contextual tips based on user journey
   - Natural command discovery without overwhelm

4. **Zero-Configuration Magic**
   - Works immediately with sensible defaults
   - Optional optimization for power users
   - Privacy-first, local-only operation

## User Experience

### The First Five Minutes

```bash
$ ginko init
✨ Analyzing your project...
  → Detected: Next.js 14, TypeScript, Supabase
  → Found: 127 components, 23 API routes
  → Patterns: Custom hooks, Server components

📝 Generated CLAUDE.md with your conventions
🎯 Created 5 starter context modules
✅ AI collaboration readiness: 94/100

$ ginko start
💡 Tip: When you discover something important, try: ginko capture "insight"
```

### Progressive Discovery Journey

**Level 1: First Steps (Days 1-3)**
- Commands: `start`
- Discovers: `capture`
- Learning: Save insights without breaking flow

**Level 2: Building Habits (Days 3-7)**
- Commands: `start`, `capture`
- Discovers: `handoff`, `vibecheck`
- Learning: Session management and recalibration

**Level 3: Flow States (Week 2)**
- Commands: Basic set
- Discovers: `explore`, `architecture`, `plan`
- Learning: Structured development workflow

**Level 4: Team Patterns (Month 1+)**
- Commands: Full suite
- Discovers: `ship`, team conventions
- Learning: Collaborative development patterns

## Functional Requirements

### F1: CLAUDE.md Generation
- **Must** generate project-specific AI instructions
- **Must** include frontmatter templates and examples
- **Must** document file discovery patterns (head -12)
- **Should** customize based on detected tech stack
- **Could** include team-specific conventions

### F2: Project Analysis
- **Must** detect primary languages and frameworks
- **Must** identify existing patterns and conventions
- **Should** calculate AI collaboration readiness score
- **Should** suggest improvements for existing files
- **Could** generate architecture documentation

### F3: Context Module Generation
- **Must** create starter modules based on detected patterns
- **Must** include common gotchas for tech stack
- **Should** prioritize by relevance to current work
- **Could** extract modules from existing code comments

### F4: Progressive Learning System
- **Must** track command usage locally
- **Must** show max 1 tip per session
- **Must** respect flow state (no tips during deep work)
- **Should** provide documentation links
- **Could** customize learning path based on role

### F5: Frontmatter Templates
- **Must** generate templates for detected file types
- **Must** include all required fields from ADR-002
- **Should** be customizable via config
- **Could** auto-apply via git hooks

## Non-Functional Requirements

### Performance
- Init completion in <10 seconds for average project
- Project scanning <30 seconds for large codebases
- Zero performance impact on subsequent commands

### Privacy
- All analysis happens locally
- No data leaves the machine
- Learning progress stored in .ginko/
- Telemetry disabled by default

### Usability
- Zero configuration required for basic use
- Progressive disclosure of advanced features
- Clear, actionable output messages
- Unix philosophy: do one thing well

### Compatibility
- Support all major frameworks
- Work with or without git
- Graceful degradation for unsupported stacks
- Backward compatible with existing .ginko/ directories

## Technical Design Considerations

### File Structure
```
.ginko/
├── CLAUDE.md              # AI instructions (new)
├── learning/              # Progress tracking (new)
│   └── progress.json     
├── templates/             # Frontmatter templates (new)
│   ├── typescript.md
│   ├── javascript.md
│   └── [language].md
├── context/
│   └── modules/          # Auto-generated modules
├── config.json           # Enhanced configuration
└── [existing structure]
```

### Command Options
```bash
ginko init [options]
  --scan           # Deep project analysis
  --optimize       # Full AI optimization
  --interactive    # Wizard mode
  --no-learning    # Disable progress tracking
  --force          # Reinitialize existing project
```

## Success Metrics

### Immediate (Day 1)
- Time to first `ginko capture`: <30 minutes
- CLAUDE.md generation success: 100%
- Zero configuration needed: Yes

### Short-term (Week 1)
- Users discover 3+ commands naturally
- AI context accuracy improves 70%
- No documentation lookups needed

### Long-term (Month 1)
- Complete command progression achieved
- Team patterns documented
- "Can't imagine working without it"

## Implementation Phases

### Phase 1: Core CLAUDE.md (Week 1)
- Generate comprehensive AI instructions
- Include frontmatter requirements
- Add discovery optimization patterns

### Phase 2: Learning System (Week 2)
- Implement progress tracking
- Add smart tip selection
- Create contextual help

### Phase 3: Project Scanner (Week 3)
- Tech stack detection
- Pattern analysis
- Context module generation

### Phase 4: Polish (Week 4)
- Interactive wizard
- Git hooks integration
- Documentation

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|---------|------------|
| Over-engineering | High | Start with minimal viable features |
| Learning system feels gamified | Medium | Strictly professional, no badges |
| Slow project scanning | Medium | Async scanning, caching |
| Too many generated files | Low | Conservative defaults, user control |

## Open Questions

1. Should we version CLAUDE.md for different AI models?
2. How do we handle monorepo/workspace setups?
3. Should learning progress sync across machines?
4. What's the right balance of generated vs. manual context?

## Appendix: Example CLAUDE.md Output

```markdown
# AI Collaboration Guide for [Project Name]

## Quick File Discovery
Always use `head -12 filename` first - our files have self-describing frontmatter.

## Required Frontmatter
Every TypeScript/JavaScript file MUST have:
\`\`\`typescript
/**
 * @fileType: [component|hook|api|utility|...]
 * @status: [current|deprecated]
 * @updated: YYYY-MM-DD
 * @tags: [relevant, search, terms]
 * @related: [connected-files.ts]
 * @priority: [critical|high|medium|low]
 * @complexity: [low|medium|high]
 */
\`\`\`

## Project Conventions
- Components: /components with .stories.tsx tests
- Hooks: /hooks with use- prefix
- API: Next.js app router in /app/api
- State: Zustand stores in /stores
- Types: Separate .types.ts files

## Context Modules Available
Run `ls .ginko/context/modules/` to see project-specific patterns.

## Collaboration Patterns
- Use `ginko vibecheck` when stuck
- Capture insights with `ginko capture`
- Create handoffs at natural breaks
```

---

This PRD provides a comprehensive vision for enhancing `ginko init` to create truly magical AI-Human collaboration experiences while maintaining simplicity and flow state.