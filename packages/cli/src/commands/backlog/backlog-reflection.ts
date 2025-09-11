/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, reflection, universal-pattern]
 * @related: [../../core/reflection-pattern.ts, context-gatherer.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [reflection-pattern, context-gatherer]
 */

import { ReflectionCommand } from '../../core/reflection-pattern.js';
import { ContextGatherer } from './context-gatherer.js';
import { BacklogBase } from './base.js';

/**
 * Backlog-specific implementation of the Reflection Pattern
 */
export class BacklogReflectionCommand extends ReflectionCommand {
  private contextGatherer: ContextGatherer;
  private backlog: BacklogBase;
  
  constructor() {
    super('backlog');
    this.contextGatherer = new ContextGatherer();
    this.backlog = new BacklogBase();
  }
  
  /**
   * Load backlog-specific template
   */
  async loadTemplate(): Promise<any> {
    await this.backlog.init();
    
    return {
      requiredSections: [
        'metadata (type, title, priority, size)',
        'problem_statement',
        'solution_approach',
        'acceptance_criteria',
        'technical_notes',
        'relationships'
      ],
      contextToConsider: [
        'current_work_in_progress',
        'related_backlog_items',
        'recent_commits',
        'project_technologies',
        'team_patterns'
      ],
      rulesAndConstraints: [
        'Title must be concise (max 60 chars)',
        'Priority based on: Critical=blocking/security, High=user-facing, Medium=improvements, Low=nice-to-have',
        'Size estimates: S=<1day, M=1-3days, L=3-5days, XL=>5days',
        'Include specific, measurable acceptance criteria',
        'Reference related items by ID',
        'Follow existing patterns in the codebase'
      ],
      outputExample: `
## Execute Command:
\`\`\`bash
ginko backlog create [type] "[title]" -p [priority] -s [size]
\`\`\`

## Then Create Content:
### Problem Statement
[What problem, who affected, current pain]

### Solution Approach
[Technical approach, alternatives considered]

### Acceptance Criteria
- [ ] Specific measurable outcome
- [ ] User-visible behavior
- [ ] Edge case handled

### Technical Notes
Dependencies: [packages]
Security: [considerations]
Performance: [requirements]

### Relationships
Parent: [FEATURE-XXX]
Related: [IDs]
Blocks: [IDs]`
    };
  }
  
  /**
   * Gather backlog-specific context
   */
  async gatherContext(intent: any): Promise<any> {
    const context = await this.contextGatherer.gatherContext();
    const backlogItems = await this.backlog.listItems();
    
    return {
      conversationContext: {
        intent: intent.raw,
        timestamp: intent.timestamp
      },
      systemState: {
        currentBranch: context.currentBranch,
        modifiedFiles: context.modifiedFiles,
        isDirty: context.isDirty
      },
      domainKnowledge: {
        totalItems: backlogItems.length,
        inProgress: context.inProgressItems,
        highPriority: context.highPriorityItems,
        recentlyUpdated: context.recentlyUpdated
      },
      pastPatterns: {
        existingTypes: this.analyzeItemTypes(backlogItems),
        commonSizes: this.analyzeItemSizes(backlogItems),
        priorityDistribution: this.analyzePriorities(backlogItems)
      },
      projectContext: {
        technologies: context.mainTechnologies,
        hasTests: context.hasTests,
        hasCICD: context.hasCICD
      }
    };
  }
  
  /**
   * Generate backlog-specific reflection prompt
   */
  protected generateReflectionPrompt(
    intent: any,
    template: any,
    context: any
  ): string {
    // Pass the full context object that has the expected structure
    const fullContext = {
      ...context.systemState,
      inProgressItems: context.domainKnowledge.inProgress,
      highPriorityItems: context.domainKnowledge.highPriority,
      activeItems: { length: context.domainKnowledge.totalItems }
    };
    const contextSummary = this.contextGatherer.generateContextSummary(fullContext);
    
    return `
<reflection-task domain="backlog">

INTENT: "${intent.raw}"

CURRENT CONTEXT:
${contextSummary}

BACKLOG STATE:
- Total items: ${context.domainKnowledge.totalItems}
- In progress: ${context.domainKnowledge.inProgress.map((i: any) => i.id).join(', ') || 'none'}
- High priority count: ${context.domainKnowledge.highPriority.length}

PROJECT CONTEXT:
- Technologies: ${context.projectContext.technologies?.join(', ') || 'unknown'}
- Has tests: ${context.projectContext.hasTests}
- Has CI/CD: ${context.projectContext.hasCICD}

TEMPLATE REQUIREMENTS:
${template.requiredSections.map((s: string) => `- ${s}`).join('\n')}

RULES TO FOLLOW:
${template.rulesAndConstraints.map((r: string) => `- ${r}`).join('\n')}

REFLECTION INSTRUCTIONS:
1. Analyze the intent to determine item type (feature/story/task)
2. Consider the current context and work in progress
3. Set appropriate priority based on impact and urgency
4. Estimate size based on complexity and scope
5. Create comprehensive content for all required sections
6. Reference related items from the backlog
7. Follow team patterns observed in existing items

OUTPUT FORMAT:
${template.outputExample}

</reflection-task>`;
  }
  
  /**
   * Analyze item type distribution
   */
  private analyzeItemTypes(items: any[]): Record<string, number> {
    const types: Record<string, number> = {
      feature: 0,
      story: 0,
      task: 0
    };
    
    items.forEach(item => {
      if (types[item.type] !== undefined) {
        types[item.type]++;
      }
    });
    
    return types;
  }
  
  /**
   * Analyze size distribution
   */
  private analyzeItemSizes(items: any[]): Record<string, number> {
    const sizes: Record<string, number> = {
      S: 0,
      M: 0,
      L: 0,
      XL: 0
    };
    
    items.forEach(item => {
      if (sizes[item.size] !== undefined) {
        sizes[item.size]++;
      }
    });
    
    return sizes;
  }
  
  /**
   * Analyze priority distribution
   */
  private analyzePriorities(items: any[]): Record<string, number> {
    const priorities: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    items.forEach(item => {
      if (priorities[item.priority] !== undefined) {
        priorities[item.priority]++;
      }
    });
    
    return priorities;
  }
}