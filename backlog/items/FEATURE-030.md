---
id: FEATURE-030
type: feature
title: Generate context modules from ProjectAnalyzer results
parent:
  - SPRINT-2025-08-28-enhanced-ginko-init
status: todo
priority: medium
created: '2025-10-20T21:00:00.000Z'
updated: '2025-10-20T21:00:00.000Z'
effort: 4-6 hours
tags: [init, context, analysis, automation]
sprint: null
size: M
author: chris@watchhill.ai
---

# Generate context modules from ProjectAnalyzer results

## Problem Statement
ProjectAnalyzer successfully detects tech stacks (React, Next.js, Python, Go, etc.) and saves analysis results to `.ginko/context/project-analysis.json`, but it doesn't generate **context modules** that AI assistants can load. This means the analysis data isn't actionable for context management.

**Current behavior**:
- `ginko init` runs ProjectAnalyzer
- Analysis saved: `.ginko/context/project-analysis.json`
- **No context modules created** in `.ginko/context/modules/`

**Expected behavior**:
- Based on detected tech stack, generate relevant context modules:
  - `react-patterns.md` for React projects
  - `api-conventions.md` for API projects
  - `testing-setup.md` if tests detected
  - `deployment-config.md` for deployment patterns

This aligns with Sprint Phase 2 deliverable: "Auto-generated context modules in `.ginko/context/modules/`"

## Solution

### Context Module Templates
Create templates for common tech stacks:

**React Project** generates:
- `react-patterns.md` - Component patterns, hooks, state management
- `typescript-setup.md` - TSConfig, type patterns
- `testing-react.md` - Jest/Vitest setup, testing patterns

**API Project** generates:
- `api-conventions.md` - REST/GraphQL patterns, error handling
- `database-schema.md` - ORM/query patterns
- `authentication.md` - Auth patterns detected

**Python Project** generates:
- `python-setup.md` - Virtual env, dependencies
- `testing-python.md` - pytest patterns
- `type-hints.md` - mypy/pydantic patterns

**Go Project** generates:
- `go-patterns.md` - Idioms, error handling
- `testing-go.md` - Testing conventions
- `module-structure.md` - Package organization

### Technical Implementation

**Location**: `packages/cli/src/context/`

**New files needed**:
1. `context-module-generator.ts` - Main generator logic
2. `templates/` directory - Context module templates
3. Integration into `init.ts` after analysis completes

**Flow**:
```typescript
// In init.ts after analysis:
if (deepAnalysis) {
  const generator = new ContextModuleGenerator(deepAnalysis);
  const modules = await generator.generate();

  for (const module of modules) {
    await fs.writeFile(
      path.join(contextModulesDir, module.filename),
      module.content
    );
  }
}
```

**Template structure**:
```markdown
# React Component Patterns

## Detected Setup
- Framework: ${analysis.frameworks.join(', ')}
- State Management: ${analysis.stateManagement || 'None detected'}
- Testing: ${analysis.testFramework}

## Recommended Patterns
[Pattern recommendations based on detected setup]

## Common Gotchas
[Framework-specific gotchas]

## Related Files
${analysis.entryPoints.join('\n')}
```

## Success Criteria
- [ ] Context modules generated for React projects
- [ ] Context modules generated for API projects
- [ ] Context modules generated for Python projects
- [ ] Context modules generated for Go projects
- [ ] Modules contain project-specific information (not generic)
- [ ] Modules reference actual detected files and patterns
- [ ] `ginko context` command lists generated modules
- [ ] Generated modules are git-tracked for team sharing
- [ ] Templates are customizable per project

## Checklist
- [ ] Create `ContextModuleGenerator` class
- [ ] Create template files for each tech stack
- [ ] Integrate generator into `init.ts`
- [ ] Add template variable substitution logic
- [ ] Test on React project (should generate 3+ modules)
- [ ] Test on API project (should generate 3+ modules)
- [ ] Test on Python project (should generate 2+ modules)
- [ ] Test on Go project (should generate 2+ modules)
- [ ] Test on monorepo (should detect multiple projects)
- [ ] Update `.gitignore` to track modules, ignore analysis.json
- [ ] Write unit tests for ContextModuleGenerator
- [ ] Document module generation in README

## Dependencies
- ProjectAnalyzer must be working (✅ already implemented)
- Template system infrastructure (✅ already exists for CLAUDE.md)
- Analysis results schema stable (⚠️ may need refinement)

## Technical Notes

**Why this was marked complete in sprint but isn't**:
- Sprint Phase 2 Task 4: "Generate context modules based on detected patterns" marked [x]
- But codebase shows only `project-analysis.json` is saved, no `.md` modules created
- Likely miscommunication or misunderstanding of deliverable

**Estimated effort breakdown**:
- ContextModuleGenerator class: 1-2 hours
- Template creation (4 stacks × 3 modules): 2-3 hours
- Integration + testing: 1-2 hours
- **Total**: 4-6 hours

## Related Items
- Sprint: SPRINT-2025-08-28-enhanced-ginko-init
- ADR-002: AI-Optimized File Discovery (frontmatter patterns)
- FEATURE-017: Persistent context modules

## Notes
- This feature completes Sprint Phase 2 deliverable: "Auto-generated context modules"
- Medium priority because analysis already works, modules are value-add
- Consider making templates user-customizable in `.ginko/templates/`
- Generated modules should follow ADR-002 frontmatter format
- Could be enhanced later with AI-generated context based on codebase analysis
