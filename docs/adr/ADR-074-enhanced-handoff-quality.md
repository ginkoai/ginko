# ADR-074: Enhanced Handoff Quality Standards

## Status
Proposed

## Context

Current handoff generation produces minimal context (30 lines) when comprehensive handoffs (200+ lines) are needed for maintaining flow state. The difference between a basic and great handoff can save 20-30 minutes of context rebuilding in the next session.

## Decision

Implement a multi-stage handoff generation process that ensures comprehensive context capture.

## Handoff Quality Framework

### 1. Mandatory Sections (Scored)

```typescript
interface HandoffQuality {
  sections: {
    achievements: {
      required: true,
      minItems: 3,
      score: 20,
      includes: ['what', 'why', 'impact']
    },
    workstream: {
      required: true,
      score: 15,
      includes: ['PRDs', 'ADRs', 'tasks', 'focus']
    },
    nextSteps: {
      required: true,
      minItems: 3,
      score: 20,
      includes: ['specific_commands', 'file_paths', 'time_estimates']
    },
    modifiedFiles: {
      required: true,
      score: 15,
      includes: ['path', 'description', 'changes']
    },
    mentalModel: {
      required: true,
      score: 10,
      includes: ['concept', 'innovation', 'architecture']
    },
    knownIssues: {
      required: false,
      score: 10,
      includes: ['blockers', 'warnings', 'dependencies']
    },
    codeExamples: {
      required: false,
      score: 10,
      includes: ['before', 'after', 'pattern']
    }
  },

  minimumScore: 70,  // Must achieve 70% quality
  targetScore: 85,   // Ideal handoff
}
```

### 2. Context Gathering Pipeline

```typescript
class EnhancedHandoffPipeline extends SimplePipelineBase {
  async generate(): Promise<string> {
    return this
      .gatherGitContext()      // What changed
      .analyzeSession()        // What was accomplished
      .detectWorkstream()      // Active PRDs/ADRs
      .extractCodePatterns()   // Key code changes
      .identifyBlockers()      // Known issues
      .generateNextSteps()     // Specific actions
      .scoreQuality()          // Ensure completeness
      .enrichWithAI()          // Add insights
      .execute();
  }

  private async analyzeSession(): this {
    // Analyze git log for session duration
    const commits = await this.getRecentCommits();

    // Extract file changes with descriptions
    const changes = await this.categorizeChanges();

    // Identify patterns and decisions
    const patterns = await this.extractPatterns();

    this.ctx.achievements = this.synthesizeAchievements(
      commits,
      changes,
      patterns
    );

    return this;
  }

  private async generateNextSteps(): this {
    // Based on TODOs, FIXMEs, and incomplete work
    const incompleteTasks = await this.findIncompleteTasks();

    // Based on test failures
    const failingTests = await this.checkTestStatus();

    // Based on workstream goals
    const workstreamNext = await this.getWorkstreamNextSteps();

    this.ctx.nextSteps = this.prioritizeSteps(
      incompleteTasks,
      failingTests,
      workstreamNext
    );

    return this;
  }

  private async scoreQuality(): this {
    const score = this.calculateScore();

    if (score < 70) {
      // Enrich with more context
      await this.addMissingContext();
    }

    this.ctx.qualityScore = score;
    this.ctx.confidence = score / 100;

    return this;
  }
}
```

### 3. Multi-Source Context Aggregation

```typescript
interface ContextSources {
  git: {
    commits: Commit[],
    diffs: Diff[],
    branches: Branch[],
    uncommitted: Changes[]
  },
  filesystem: {
    modifiedFiles: FileChange[],
    newFiles: string[],
    deletedFiles: string[],
    movedFiles: FileMove[]
  },
  code: {
    todos: TODO[],
    fixmes: FIXME[],
    patterns: Pattern[],
    imports: ImportChange[]
  },
  session: {
    duration: number,
    commands: Command[],
    errors: Error[],
    decisions: Decision[]
  },
  workstream: {
    prds: PRD[],
    adrs: ADR[],
    tasks: Task[],
    focus: string
  }
}
```

### 4. Template System

```typescript
class HandoffTemplate {
  static readonly SECTIONS = {
    header: `# Session Handoff: {{title}}

**Date**: {{date}}
**Session ID**: {{sessionId}}
**Next Session Goal**: {{nextGoal}}`,

    achievements: `## 🎯 Session Achievements

### Major Accomplishments
{{#each achievements}}
{{index}}. ✅ **{{title}}** - {{description}}
{{/each}}

### Key Decisions Made
{{#each decisions}}
- **{{category}}**: {{decision}}
{{/each}}`,

    workstream: `## 🎯 Active Workstream

### Current Focus: {{focus}}
{{#if prds}}
- **Primary PRDs**:
{{#each prds}}
  - {{number}}: {{title}}
{{/each}}
{{/if}}`,

    nextSteps: `## 📝 Specific Next Steps

{{#each steps}}
{{index}}. **{{title}}**
   - Location: \`{{location}}\`
   - Command: \`{{command}}\`
   - Estimate: {{timeEstimate}}
{{/each}}`,

    codeExamples: `### {{title}}
\`\`\`{{language}}
// Current: {{currentDescription}}
{{currentCode}}

// New: {{newDescription}}
{{newCode}}
\`\`\``,

    quality: `---
**Handoff Quality**: {{qualityDescription}}
**Score**: {{score}}/100
**Generated**: {{date}}
**Session Duration**: {{duration}}
**Confidence**: {{confidence}}`
  };
}
```

### 5. Quality Enforcement

```typescript
class HandoffQualityChecker {
  static validate(handoff: string): QualityReport {
    const report: QualityReport = {
      score: 0,
      missing: [],
      suggestions: []
    };

    // Check mandatory sections
    if (!handoff.includes('Session Achievements')) {
      report.missing.push('achievements');
      report.suggestions.push('Add at least 3 major accomplishments');
    }

    // Check code examples
    const codeBlocks = handoff.match(/```/g)?.length || 0;
    if (codeBlocks < 2) {
      report.suggestions.push('Add code examples showing before/after');
    }

    // Check specificity
    const commands = handoff.match(/`[^`]+`/g)?.length || 0;
    if (commands < 5) {
      report.suggestions.push('Add more specific commands and file paths');
    }

    // Check next steps
    if (!handoff.includes('Specific Next Steps')) {
      report.missing.push('nextSteps');
      report.critical = true;
    }

    // Calculate score
    report.score = this.calculateScore(handoff);

    return report;
  }

  static enhance(handoff: string, report: QualityReport): string {
    let enhanced = handoff;

    // Auto-add missing sections
    for (const missing of report.missing) {
      enhanced += this.generateSection(missing);
    }

    // Add suggestions as comments
    if (report.suggestions.length > 0) {
      enhanced += '\n\n<!-- Quality Suggestions:\n';
      report.suggestions.forEach(s => {
        enhanced += `- ${s}\n`;
      });
      enhanced += '-->\n';
    }

    return enhanced;
  }
}
```

## Implementation Strategy

### Phase 1: Context Gathering (Week 1)
1. Implement multi-source context aggregation
2. Add git analysis for session reconstruction
3. Extract code patterns and changes

### Phase 2: Quality Scoring (Week 1)
1. Implement scoring algorithm
2. Add quality gates (minimum 70%)
3. Create enhancement suggestions

### Phase 3: Template System (Week 2)
1. Create flexible template engine
2. Add section templates
3. Support custom templates

### Phase 4: AI Enhancement (Week 2)
1. Use AI to synthesize insights
2. Generate missing sections
3. Improve narrative flow

## Example Output Structure

```markdown
# Session Handoff: [Descriptive Title]

## 🎯 Session Achievements (20 points)
- Major accomplishments with impact
- Key decisions with rationale
- Problems solved

## 🎯 Active Workstream (15 points)
- Current PRDs/ADRs/Tasks
- Focus area
- Sprint goals

## 🔄 Current State (15 points)
- Modified files with descriptions
- Git status
- Test status

## 🧠 Mental Model (10 points)
- Architectural understanding
- Key patterns discovered
- Conceptual breakthroughs

## ⚡ Specific Next Steps (20 points)
- Exact commands to run
- Files to modify
- Time estimates

## 💡 Session Insights (10 points)
- Learnings
- Patterns
- Optimizations

## 🚧 Known Issues (10 points)
- Blockers
- Dependencies
- Warnings

## Quality Metrics
- Score: 85/100
- Confidence: High
- Completeness: Comprehensive
```

## Success Metrics

1. **Handoff Quality Score**: Average > 85%
2. **Time to Context**: < 3 minutes (down from 20)
3. **Session Continuity**: 95% successful resumptions
4. **Developer Satisfaction**: "Feels like continuing same session"

## Related ADRs

- ADR-013: Simple Builder Pattern
- ADR-003: Refactor Core Commands to Use Reflection

## Decision Record

- **Date**: January 15, 2025
- **Status**: Proposed
- **Review**: After 10 production handoffs