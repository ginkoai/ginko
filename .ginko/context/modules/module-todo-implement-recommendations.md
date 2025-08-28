---
type: pattern
tags: [improvement, ai-context, templates, explore, architecture, plan, todo]
area: /packages/cli/src/commands
created: 2025-08-27
updated: 2025-08-27
relevance: critical
dependencies: [pattern-todo-implement-ginko-commands-as]
---

# TODO: Implement Recommendations From Critical Analysis of Ginko Modes

## Context
Critical analysis of explore, architecture, and plan modes revealed that while the output structure is solid, the templates are too generic for AI assistants that haven't been involved in Ginko's development. The templates lack project-specific context, don't guide AIs to examine actual code, and miss cross-references between documents (PRDs→ADRs→Plans).

## Technical Details
The analysis identified five critical improvements needed:

### 1. Enhanced AI Context Block
Every mode needs to explain what Ginko is and how the two-phase pattern works:
```typescript
// Add to explore.ts, architecture.ts, plan.ts
function generateAIContext(mode: string, exitCode: number): string {
  return `
## AI Context
You are completing a Ginko ${mode} template.
Ginko is a git-native context preservation system.
Exit code ${exitCode} signals AI enhancement needed.
Callback: ginko ${mode} --store --id=${id}

Project: ${await getProjectName()}
Recent work: ${await getRecentFiles()}
Available context: ${await listContextModules()}
  `;
}
```

### 2. Auto-Loading Related Documents
Commands should automatically find and include related work:
```typescript
// In explore.ts
const relatedPRDs = await findRelatedPRDs(topic);
const relatedADRs = await findRelatedADRs(topic);

if (relatedPRDs.length > 0) {
  prompt += `\n## Related PRDs\n${relatedPRDs.map(p => `- ${p}`).join('\n')}`;
}
```

### 3. Fix stderr Output Issue
Change output from stderr to stdout to avoid alarming "Error:" prefix:
```typescript
// Current (incorrect - causes anxiety)
console.error(template);  // Shows as "Error:" in terminal

// Fixed (correct - normal output)
console.log(template);    // Shows normally
```

### 4. More Specific AI Prompts
Replace generic placeholders with context-aware instructions:
```typescript
// Before (too generic)
`[AI: What specific problems are users/developers experiencing?]`

// After (context-aware)
`[AI: Based on recent commits in ${repoPath} and issues labeled 'bug' or 'pain-point', what specific problems are users/developers experiencing? Check ${relevantFiles}]`
```

### 5. Progressive Disclosure Options
Support different levels of context:
```typescript
interface ModeOptions {
  minimal?: boolean;      // Core questions only
  comprehensive?: boolean; // Include all context
  // default: standard
}

// Usage
ginko explore "topic" --minimal      // Quick, focused
ginko explore "topic"                // Standard (default)
ginko explore "topic" --comprehensive // Full context
```

## Code Examples

### Current Problem in explore.ts
```typescript
// Too generic, no project awareness
const prompt = `
Current Pain Points:
[AI: What specific problems are users/developers experiencing?]
`;
```

### Improved Implementation
```typescript
export async function exploreCommand(topic: string, options: ExploreOptions) {
  // Load project context
  const projectContext = await loadProjectContext();
  const relatedDocs = await findRelatedDocuments(topic);
  
  // Build context-aware prompt
  const prompt = generateExplorationPrompt(topic, explorationSize);
  
  // Add AI context block
  const aiContext = generateAIContext('explore', 43);
  
  // Include related work
  const references = formatReferences(relatedDocs);
  
  // Output to stdout (not stderr!)
  console.log(aiContext);
  console.log(prompt);
  console.log(references);
  
  // Exit with mode-specific code
  process.exit(43);
}
```

## Impact
- **New AI Success Rate**: Increase from ~60% to >90% successful completions
- **Context Quality**: Richer, more project-specific outputs
- **Developer Experience**: No more jarring "Error:" messages
- **Cross-Reference Value**: Automatic linking creates traceable documentation chain
- **Time Savings**: AI doesn't need to search for context manually

## Implementation Priority
1. **Critical**: Fix stderr→stdout (5 minutes) - Immediate UX improvement
2. **High**: Add AI context block (1 hour) - Enables new AIs to work
3. **High**: Auto-load related docs (2 hours) - Major value add
4. **Medium**: Specific prompts (1 hour) - Better output quality
5. **Low**: Progressive disclosure (2 hours) - Nice to have

## References
- Current implementations: 
  - /packages/cli/src/commands/explore.ts
  - /packages/cli/src/commands/architecture.ts
  - /packages/cli/src/commands/plan.ts
- Related ADRs:
  - ADR-023: Flow State Design Philosophy
  - ADR-024: AI-Enhanced Local Tooling
- Unix Philosophy: "Make output useful to both humans and programs"

## Related Patterns
- Git's helpful error messages that suggest next commands
- VSCode's progressive disclosure in command palette
- Man pages with SYNOPSIS, DESCRIPTION, EXAMPLES sections
- API documentation with context, parameters, examples

## Testing Checklist
- [ ] New AI (not Claude) can complete explore template successfully
- [ ] Architecture mode auto-references PRD if mentioned
- [ ] Plan mode pulls from ADR structure
- [ ] No "Error:" prefix appears in normal operation
- [ ] Context modules auto-load based on topic/directory