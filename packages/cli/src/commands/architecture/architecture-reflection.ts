/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-12
 * @tags: [architecture, adr, reflection, decisions]
 * @related: [../../core/reflection-pattern.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [reflection-pattern, fs, child_process, chalk]
 */

import { ReflectionCommand } from '../../core/reflection-pattern.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

const execAsync = promisify(exec);

/**
 * Architecture domain reflection for Architecture Decision Records (ADRs)
 * Focuses on technical decisions, alternatives, trade-offs, and consequences
 */
export class ArchitectureReflectionCommand extends ReflectionCommand {
  constructor() {
    super('architecture');
  }
  
  /**
   * Save ADR artifact to proper location
   */
  async saveArtifact(content: string, filename?: string): Promise<string> {
    // Ensure docs/architecture directory exists
    const adrDir = path.join(process.cwd(), 'docs', 'architecture');
    await fs.mkdir(adrDir, { recursive: true });
    
    // Generate filename if not provided
    if (!filename) {
      // Extract title from content
      const titleMatch = content.match(/^#\s+ADR-\d+:\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : 'Untitled';
      
      // Find next ADR number
      const existingADRs = await fs.readdir(adrDir).catch(() => []);
      const adrNumbers = existingADRs
        .filter(f => f.startsWith('ADR-'))
        .map(f => parseInt(f.match(/ADR-(\d+)/)?.[1] || '0', 10))
        .filter(n => !isNaN(n));
      
      const nextNumber = adrNumbers.length > 0 
        ? Math.max(...adrNumbers) + 1 
        : 1;
      
      // Clean title for filename
      const cleanTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      
      filename = `ADR-${String(nextNumber).padStart(3, '0')}-${cleanTitle}.md`;
    }
    
    // Write file
    const filepath = path.join(adrDir, filename);
    await fs.writeFile(filepath, content, 'utf-8');
    
    console.log(chalk.green(`\n✅ ADR saved to: ${path.relative(process.cwd(), filepath)}`));
    console.log(chalk.dim('   Use this document for architectural decision tracking'));
    
    return filepath;
  }
  
  /**
   * Load Architecture-specific template
   */
  async loadTemplate(): Promise<any> {
    return {
      requiredSections: [
        'title',
        'status',
        'context',
        'decision',
        'consequences',
        'alternatives_considered',
        'trade_offs',
        'related_decisions'
      ],
      contextToConsider: [
        'current_architecture',
        'technical_constraints',
        'performance_requirements',
        'scalability_needs',
        'security_considerations',
        'team_expertise',
        'maintenance_burden',
        'cost_implications',
        'future_flexibility'
      ],
      rulesAndConstraints: [
        'Document the WHY, not just the WHAT',
        'Include all viable alternatives considered',
        'Be explicit about trade-offs',
        'Consider both positive and negative consequences',
        'Link to related ADRs and decisions',
        'Use concrete examples where possible',
        'Consider reversibility of the decision',
        'Document assumptions explicitly',
        'Include measurable success criteria',
        'Consider impact on different stakeholders'
      ],
      outputExample: `
# ADR-XXX: [Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

## Context
[What is the issue we're seeing that motivates this decision?]
[Include relevant background, constraints, and forces at play]

### Problem Statement
[Specific problem being addressed]

### Current State
[How things work today and why it's insufficient]

### Requirements
- [Functional requirement]
- [Non-functional requirement]
- [Constraint]

## Decision
[The change that we're proposing and/or doing]

### Chosen Approach
[Detailed description of the selected solution]

### Implementation Strategy
[How we will implement this decision]

## Consequences

### Positive
- [Positive outcome]
- [Benefit gained]
- [Problem solved]

### Negative
- [Drawback]
- [Trade-off accepted]
- [New complexity introduced]

### Neutral
- [Side effect]
- [Change required]

## Alternatives Considered

### Option 1: [Alternative Name]
**Description**: [What this approach would entail]
**Pros**:
- [Advantage]
- [Benefit]
**Cons**:
- [Disadvantage]
- [Risk]
**Reason for rejection**: [Why we didn't choose this]

### Option 2: [Alternative Name]
[Similar structure]

### Option 3: [Do Nothing]
**Description**: Keep current approach
**Pros**:
- No change required
- No risk
**Cons**:
- Problem persists
- Technical debt grows
**Reason for rejection**: [Why status quo is insufficient]

## Trade-offs

| Aspect | Chosen Approach | Alternative 1 | Alternative 2 |
|--------|----------------|---------------|---------------|
| Performance | [Impact] | [Impact] | [Impact] |
| Complexity | [Impact] | [Impact] | [Impact] |
| Maintainability | [Impact] | [Impact] | [Impact] |
| Cost | [Impact] | [Impact] | [Impact] |
| Time to Market | [Impact] | [Impact] | [Impact] |

## Related Decisions

### Prior Art
- ADR-XXX: [Related prior decision]
- RFC-XXX: [Related proposal]

### This Decision Enables
- [Future decision made possible]
- [Architecture evolution path]

### This Decision Constrains
- [Future option eliminated]
- [Path not taken]

## Success Metrics
- [Measurable outcome]
- [Performance metric]
- [Quality metric]

## Review Schedule
- 3 months: [What to check]
- 6 months: [What to evaluate]
- 1 year: [What to reassess]

## References
- [Link to documentation]
- [Link to code]
- [Link to discussion]

---
**Date**: [YYYY-MM-DD]
**Author**: [Name]
**Reviewers**: [Names]
**Approval**: [Authority]`
    };
  }
  
  /**
   * Gather Architecture-specific context
   */
  async gatherContext(intent: any): Promise<any> {
    const context = {
      conversationContext: {
        intent: intent.raw,
        timestamp: intent.timestamp
      },
      systemState: await this.gatherSystemState(),
      currentArchitecture: await this.gatherArchitectureContext(),
      existingADRs: await this.gatherExistingADRs()
    };
    
    return context;
  }
  
  /**
   * Gather system state
   */
  private async gatherSystemState(): Promise<any> {
    const state: any = {};
    
    // Get current branch for context
    try {
      const { stdout: branch } = await execAsync('git branch --show-current');
      state.currentBranch = branch.trim();
      
      // Recent commits to understand current work
      const { stdout: commits } = await execAsync('git log --oneline -10');
      state.recentCommits = commits.trim().split('\n').slice(0, 5);
    } catch (error) {
      state.currentBranch = 'unknown';
      state.recentCommits = [];
    }
    
    return state;
  }
  
  /**
   * Gather current architecture context
   */
  private async gatherArchitectureContext(): Promise<any> {
    const context: any = {};
    
    // Analyze package.json for tech stack
    try {
      const packageJson = await fs.readFile('package.json', 'utf-8');
      const pkg = JSON.parse(packageJson);
      
      // Extract key architectural components
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      context.techStack = this.identifyTechStack(deps);
      
      // Identify architectural patterns
      context.patterns = await this.identifyPatterns();
      
    } catch (error) {
      context.techStack = [];
      context.patterns = [];
    }
    
    // Check for architecture documentation
    try {
      const { stdout: archFiles } = await execAsync(
        'find . -name "ARCHITECTURE.md" -o -name "architecture.md" -o -name "*.architecture.md" | head -5'
      );
      context.existingDocs = archFiles.trim().split('\n').filter(Boolean);
    } catch (error) {
      context.existingDocs = [];
    }
    
    // Analyze directory structure
    try {
      const { stdout: structure } = await execAsync(
        'find . -type d -name "src" -o -name "lib" -o -name "packages" | head -10'
      );
      context.projectStructure = this.analyzeStructure(structure);
    } catch (error) {
      context.projectStructure = 'unknown';
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
      const { stdout } = await execAsync(
        'find . -name "ADR-*.md" -o -name "adr-*.md" | head -20'
      );
      const adrFiles = stdout.trim().split('\n').filter(Boolean);
      
      adrs.count = adrFiles.length;
      adrs.files = adrFiles;
      
      // Extract recent ADR titles and statuses
      if (adrFiles.length > 0) {
        const recentADRs = [];
        for (const file of adrFiles.slice(0, 5)) {
          try {
            const content = await fs.readFile(file, 'utf-8');
            const titleMatch = content.match(/^#\s+ADR-\d+:\s+(.+)$/m);
            const statusMatch = content.match(/^##\s+Status\s*\n(.+)$/m);
            
            if (titleMatch) {
              recentADRs.push({
                file: path.basename(file),
                title: titleMatch[1],
                status: statusMatch ? statusMatch[1].trim() : 'Unknown'
              });
            }
          } catch (error) {
            // Skip if can't read
          }
        }
        adrs.recent = recentADRs;
      }
      
      // Identify ADR patterns and numbering
      const numbers = adrFiles
        .map(f => f.match(/ADR-(\d+)/))
        .filter(Boolean)
        .map(m => parseInt(m![1], 10));
      
      adrs.highestNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
      
    } catch (error) {
      adrs.count = 0;
      adrs.files = [];
      adrs.recent = [];
      adrs.highestNumber = 0;
    }
    
    return adrs;
  }
  
  /**
   * Identify tech stack from dependencies
   */
  private identifyTechStack(deps: Record<string, string>): string[] {
    const stack = [];
    
    // Frameworks
    if (deps['next']) stack.push('Next.js');
    if (deps['react']) stack.push('React');
    if (deps['vue']) stack.push('Vue');
    if (deps['@angular/core']) stack.push('Angular');
    if (deps['express']) stack.push('Express');
    if (deps['fastify']) stack.push('Fastify');
    if (deps['@nestjs/core']) stack.push('NestJS');
    
    // Databases
    if (deps['@supabase/supabase-js']) stack.push('Supabase');
    if (deps['pg'] || deps['postgres']) stack.push('PostgreSQL');
    if (deps['mongodb']) stack.push('MongoDB');
    if (deps['redis']) stack.push('Redis');
    
    // Infrastructure
    if (deps['@vercel/node']) stack.push('Vercel');
    if (deps['aws-sdk'] || deps['@aws-sdk/client-s3']) stack.push('AWS');
    if (deps['@google-cloud/storage']) stack.push('Google Cloud');
    
    // Tools
    if (deps['typescript']) stack.push('TypeScript');
    if (deps['graphql']) stack.push('GraphQL');
    if (deps['prisma']) stack.push('Prisma');
    
    return stack;
  }
  
  /**
   * Identify architectural patterns
   */
  private async identifyPatterns(): Promise<string[]> {
    const patterns = [];
    
    try {
      // Check for common patterns
      const { stdout: microservices } = await execAsync(
        'find . -type d -name "services" -o -name "microservices" | head -1'
      );
      if (microservices) patterns.push('Microservices');
      
      const { stdout: monorepo } = await execAsync('find . -name "lerna.json" -o -name "pnpm-workspace.yaml" | head -1');
      if (monorepo) patterns.push('Monorepo');
      
      const { stdout: serverless } = await execAsync('find . -name "serverless.yml" -o -name "vercel.json" | head -1');
      if (serverless) patterns.push('Serverless');
      
      const { stdout: eventDriven } = await execAsync('grep -r "EventEmitter\\|pubsub\\|messageQueue" --include="*.ts" --include="*.js" | head -1');
      if (eventDriven) patterns.push('Event-Driven');
      
    } catch (error) {
      // Ignore errors in pattern detection
    }
    
    return patterns;
  }
  
  /**
   * Analyze project structure
   */
  private analyzeStructure(structure: string): string {
    const dirs = structure.trim().split('\n').filter(Boolean);
    
    if (dirs.some(d => d.includes('packages'))) {
      return 'Monorepo';
    } else if (dirs.some(d => d.includes('src/app') || d.includes('src/pages'))) {
      return 'Application';
    } else if (dirs.some(d => d.includes('lib'))) {
      return 'Library';
    } else {
      return 'Standard';
    }
  }
  
  /**
   * Generate Architecture-specific reflection prompt
   */
  protected generateReflectionPrompt(
    intent: any,
    template: any,
    context: any
  ): string {
    const techStack = context.currentArchitecture.techStack?.join(', ') || 'Not identified';
    const patterns = context.currentArchitecture.patterns?.join(', ') || 'None detected';
    const nextADRNumber = (context.existingADRs.highestNumber || 0) + 1;
    
    return `
<reflection-task domain="architecture">

INTENT: "${intent.raw}"

CURRENT ARCHITECTURE:
- Tech Stack: ${techStack}
- Patterns: ${patterns}
- Project Structure: ${context.currentArchitecture.projectStructure}
- Existing Docs: ${context.currentArchitecture.existingDocs?.length || 0} files

EXISTING ADRS:
- Count: ${context.existingADRs.count}
- Next Number: ADR-${String(nextADRNumber).padStart(3, '0')}
- Recent ADRs:
${context.existingADRs.recent?.map((adr: any) => `  - ${adr.file}: ${adr.title} [${adr.status}]`).join('\n') || '  None'}

TEMPLATE REQUIREMENTS:
${template.requiredSections.map((s: string) => `- ${s}`).join('\n')}

CONTEXT TO CONSIDER:
${template.contextToConsider.map((c: string) => `- ${c}`).join('\n')}

RULES TO FOLLOW:
${template.rulesAndConstraints.map((r: string) => `- ${r}`).join('\n')}

REFLECTION INSTRUCTIONS:
1. Understand the architectural decision being made
2. Identify all viable alternatives
3. Analyze trade-offs objectively
4. Consider long-term consequences
5. Document assumptions explicitly
6. Link to existing ADRs where relevant
7. Consider reversibility and migration paths
8. Include concrete examples
9. Define measurable success criteria
10. Consider all stakeholder perspectives

IMPORTANT:
- Focus on the WHY behind the decision
- Be explicit about what we're optimizing for
- Document what we're explicitly NOT doing
- Consider both technical and business implications
- Think about future maintainers reading this

OUTPUT FORMAT:
${template.outputExample}

ARTIFACT HANDLING:
When AI generates the ADR based on this template:
1. Save to: docs/architecture/ADR-XXX-[title].md
2. Use sequential numbering (001, 002, etc.)
3. Clean title for filename (lowercase, hyphens)
4. Preserve full markdown formatting
5. Link to related ADRs by number

</reflection-task>`;
  }
}

/**
 * Factory function
 */
export function createArchitectureReflection() {
  return new ArchitectureReflectionCommand();
}