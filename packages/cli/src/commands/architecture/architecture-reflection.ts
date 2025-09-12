/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-12
 * @tags: [architecture, reflection, adr, design]
 * @related: [../../core/reflection-pattern.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [reflection-pattern, fs, child_process]
 */

import { ReflectionCommand } from '../../core/reflection-pattern.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Architecture domain reflection for ADRs and system design
 */
export class ArchitectureReflectionCommand extends ReflectionCommand {
  constructor() {
    super('architecture');
  }
  
  /**
   * Load architecture-specific template
   */
  async loadTemplate(): Promise<any> {
    return {
      requiredSections: [
        'status',
        'context',
        'decision',
        'rationale',
        'alternatives_considered',
        'consequences',
        'implementation',
        'validation',
        'references'
      ],
      contextToConsider: [
        'existing_architecture',
        'current_technologies',
        'team_capabilities',
        'performance_requirements',
        'security_constraints',
        'scalability_needs',
        'maintenance_burden',
        'cost_implications'
      ],
      rulesAndConstraints: [
        'Use ADR format (Context-Decision-Consequences)',
        'Number ADRs sequentially',
        'Include concrete alternatives with trade-offs',
        'Specify measurable success criteria',
        'Consider long-term maintenance',
        'Document assumptions explicitly',
        'Link to related ADRs and PRDs',
        'Include implementation examples'
      ],
      outputExample: `
# ADR-XXX: [Decision Title]

## Status
[Proposed | Accepted | Superseded]

## Context
[Problem description, why this decision is needed]
[Current state and pain points]
[Constraints and requirements]

## Decision
[Clear statement of the architectural decision]
[What we will do]

## Rationale
[Why this decision makes sense]
[Evidence and analysis supporting the decision]

## Alternatives Considered

### Alternative 1: [Name]
**Description**: [What]
**Pros**: [Benefits]
**Cons**: [Drawbacks]
**Rejected because**: [Reason]

### Alternative 2: [Name]
[Similar structure]

## Consequences

### Positive
- ✅ [Benefit 1]
- ✅ [Benefit 2]

### Negative
- ❌ [Drawback 1]
- ❌ [Drawback 2]

### Neutral
- ⚪ [Trade-off 1]

## Implementation

### Phase 1: [Title]
- Step 1: [Action]
- Step 2: [Action]

### Code Example
\`\`\`typescript
// Concrete implementation example
\`\`\`

## Validation
- How we'll know this decision was correct
- Metrics to track
- Review timeline

## References
- Related ADRs: [ADR-XXX]
- PRD: [PRD-XXX]
- Documentation: [Links]
- Discussion: [Links]`
    };
  }
  
  /**
   * Gather architecture-specific context
   */
  async gatherContext(intent: any): Promise<any> {
    const context = {
      conversationContext: {
        intent: intent.raw,
        timestamp: intent.timestamp
      },
      systemState: await this.gatherSystemState(),
      domainKnowledge: await this.gatherArchitecturalContext(),
      pastPatterns: await this.gatherExistingADRs()
    };
    
    return context;
  }
  
  /**
   * Gather system state
   */
  private async gatherSystemState(): Promise<any> {
    const state: any = {};
    
    // Get current technologies from package.json
    try {
      const packageJson = await fs.readFile('package.json', 'utf-8');
      const pkg = JSON.parse(packageJson);
      state.dependencies = Object.keys(pkg.dependencies || {});
      state.devDependencies = Object.keys(pkg.devDependencies || {});
    } catch (error) {
      state.dependencies = [];
      state.devDependencies = [];
    }
    
    // Check for architecture docs
    try {
      const { stdout } = await execAsync('find . -path "*/architecture/*" -name "*.md" | head -10');
      state.architectureDocs = stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      state.architectureDocs = [];
    }
    
    return state;
  }
  
  /**
   * Gather architectural context
   */
  private async gatherArchitecturalContext(): Promise<any> {
    const context: any = {};
    
    // Detect framework/architecture style
    context.architectureStyle = await this.detectArchitectureStyle();
    
    // Find key architectural components
    try {
      const { stdout: apis } = await execAsync('find . -path "*/api/*" -o -path "*/routes/*" | head -10');
      context.apiEndpoints = apis.trim().split('\n').filter(Boolean).length;
      
      const { stdout: models } = await execAsync('find . -name "*.model.*" -o -name "*.schema.*" | head -10');
      context.dataModels = models.trim().split('\n').filter(Boolean).length;
      
      const { stdout: services } = await execAsync('find . -name "*.service.*" -o -name "*.provider.*" | head -10');
      context.services = services.trim().split('\n').filter(Boolean).length;
    } catch (error) {
      context.apiEndpoints = 0;
      context.dataModels = 0;
      context.services = 0;
    }
    
    return context;
  }
  
  /**
   * Gather existing ADRs
   */
  private async gatherExistingADRs(): Promise<any> {
    const adrs: any = {};
    
    try {
      // Find existing ADRs
      const { stdout } = await execAsync('find . -name "ADR-*.md" -o -name "adr-*.md" | sort');
      const adrFiles = stdout.trim().split('\n').filter(Boolean);
      
      adrs.count = adrFiles.length;
      adrs.lastNumber = this.extractLastADRNumber(adrFiles);
      adrs.files = adrFiles.slice(-5); // Last 5 ADRs
      
      // Get recent ADR titles
      if (adrFiles.length > 0) {
        const recentTitles = [];
        for (const file of adrFiles.slice(-3)) {
          try {
            const content = await fs.readFile(file, 'utf-8');
            const titleMatch = content.match(/^#\s+ADR-\d+:\s+(.+)$/m);
            if (titleMatch) {
              recentTitles.push(titleMatch[1]);
            }
          } catch (error) {
            // Skip if can't read
          }
        }
        adrs.recentTitles = recentTitles;
      }
    } catch (error) {
      adrs.count = 0;
      adrs.lastNumber = 0;
      adrs.files = [];
      adrs.recentTitles = [];
    }
    
    return adrs;
  }
  
  /**
   * Detect architecture style
   */
  private async detectArchitectureStyle(): Promise<string[]> {
    const styles = [];
    
    try {
      // Check for common patterns
      const { stdout: microservices } = await execAsync('find . -name "docker-compose*.yml" | head -1');
      if (microservices.trim()) styles.push('microservices');
      
      const { stdout: serverless } = await execAsync('find . -name "serverless.yml" -o -name "vercel.json" | head -1');
      if (serverless.trim()) styles.push('serverless');
      
      const { stdout: monorepo } = await execAsync('find . -name "lerna.json" -o -path "*/packages/*" | head -1');
      if (monorepo.trim()) styles.push('monorepo');
      
      const { stdout: mvc } = await execAsync('find . -path "*/controllers/*" -o -path "*/models/*" -o -path "*/views/*" | head -1');
      if (mvc.trim()) styles.push('MVC');
      
    } catch (error) {
      // Default
      styles.push('modular');
    }
    
    return styles.length > 0 ? styles : ['standard'];
  }
  
  /**
   * Extract last ADR number
   */
  private extractLastADRNumber(files: string[]): number {
    let maxNumber = 0;
    
    for (const file of files) {
      const match = file.match(/ADR-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    return maxNumber;
  }
  
  /**
   * Generate architecture-specific reflection prompt
   */
  protected generateReflectionPrompt(
    intent: any,
    template: any,
    context: any
  ): string {
    const nextADRNumber = context.pastPatterns.lastNumber + 1;
    const architectureStyle = context.domainKnowledge.architectureStyle?.join(', ') || 'unknown';
    
    return `
<reflection-task domain="architecture">

INTENT: "${intent.raw}"

NEXT ADR NUMBER: ADR-${String(nextADRNumber).padStart(3, '0')}

CURRENT ARCHITECTURE:
- Style: ${architectureStyle}
- API Endpoints: ${context.domainKnowledge.apiEndpoints}
- Data Models: ${context.domainKnowledge.dataModels}
- Services: ${context.domainKnowledge.services}
- Technologies: ${context.systemState.dependencies?.slice(0, 10).join(', ') || 'unknown'}

EXISTING ADRs:
- Total: ${context.pastPatterns.count}
- Recent: ${context.pastPatterns.recentTitles?.join(', ') || 'none'}

TEMPLATE REQUIREMENTS:
${template.requiredSections.map((s: string) => `- ${s}`).join('\n')}

CONTEXT TO CONSIDER:
${template.contextToConsider.map((c: string) => `- ${c}`).join('\n')}

RULES TO FOLLOW:
${template.rulesAndConstraints.map((r: string) => `- ${r}`).join('\n')}

REFLECTION INSTRUCTIONS:
1. Analyze the architectural decision needed
2. Consider the current system architecture
3. Evaluate multiple alternatives with trade-offs
4. Make a clear, justified decision
5. Document positive and negative consequences
6. Provide concrete implementation guidance
7. Include code examples where helpful
8. Set clear validation criteria
9. Link to related decisions and documents

OUTPUT FORMAT:
${template.outputExample}

</reflection-task>`;
  }
}

/**
 * Factory function
 */
export function createArchitectureReflection() {
  return new ArchitectureReflectionCommand();
}