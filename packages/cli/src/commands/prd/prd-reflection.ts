/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-12
 * @tags: [prd, reflection, requirements, product]
 * @related: [../../core/reflection-pattern.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [reflection-pattern, fs, child_process]
 */

import { ReflectionCommand } from '../../core/reflection-pattern.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

const execAsync = promisify(exec);

/**
 * PRD domain reflection for Product Requirements Documents
 * Focuses on the WHY - pain points, outcomes, value
 */
export class PRDReflectionCommand extends ReflectionCommand {
  constructor() {
    super('prd');
  }

  /**
   * Execute PRD reflection to create PRD document
   */
  async execute(intent: string, options?: any): Promise<void> {
    const template = await this.loadTemplate();
    const context = await this.gatherContext({ raw: intent, timestamp: new Date().toISOString() });
    const prompt = this.generateReflectionPrompt({ raw: intent }, template, context);

    console.log(chalk.blue('📋 PRD Reflection'));
    console.log(chalk.dim('   Use this prompt with AI to generate a PRD'));
    console.log();
    console.log(prompt);
  }

  /**
   * Save PRD artifact to proper location
   */
  async saveArtifact(content: string, filename?: string): Promise<string> {
    // Ensure docs/PRD directory exists at project root
    const projectRoot = path.resolve(process.cwd(), '../..');
    const prdDir = path.join(projectRoot, 'docs', 'PRD');
    await fs.mkdir(prdDir, { recursive: true });
    
    // Generate filename if not provided
    if (!filename) {
      // Extract title from content
      const titleMatch = content.match(/^#\s+PRD:\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : 'Untitled';
      
      // Find next PRD number
      const existingPRDs = await fs.readdir(prdDir).catch(() => []);
      const prdNumbers = existingPRDs
        .filter(f => f.startsWith('PRD-'))
        .map(f => parseInt(f.match(/PRD-(\d+)/)?.[1] || '0', 10))
        .filter(n => !isNaN(n));
      
      const nextNumber = prdNumbers.length > 0 
        ? Math.max(...prdNumbers) + 1 
        : 1;
      
      // Clean title for filename
      const cleanTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      
      filename = `PRD-${String(nextNumber).padStart(3, '0')}-${cleanTitle}.md`;
    }
    
    // Write file
    const filepath = path.join(prdDir, filename);
    await fs.writeFile(filepath, content, 'utf-8');
    
    console.log(chalk.green(`\n✅ PRD saved to: ${path.relative(process.cwd(), filepath)}`));
    console.log(chalk.dim('   Use this document for product planning and stakeholder alignment'));
    
    return filepath;
  }
  
  /**
   * Load PRD-specific template
   */
  async loadTemplate(): Promise<any> {
    return {
      requiredSections: [
        'executive_summary',
        'problem_statement',
        'user_pain_points',
        'desired_outcomes',
        'success_metrics',
        'user_stories',
        'functional_requirements',
        'non_functional_requirements',
        'solutions_considered',
        'recommended_solution',
        'value_assessment',
        'risks_and_mitigations',
        'timeline_and_phases',
        'stakeholders'
      ],
      contextToConsider: [
        'current_user_feedback',
        'competitive_analysis',
        'technical_constraints',
        'business_objectives',
        'resource_availability',
        'market_conditions',
        'existing_product_gaps',
        'customer_journey',
        'regulatory_requirements'
      ],
      rulesAndConstraints: [
        'Focus on user problems, not solutions',
        'Include measurable success criteria',
        'Provide clear value proposition',
        'Consider multiple solution alternatives',
        'Define specific, testable requirements',
        'Include ROI or value assessment',
        'Identify all stakeholders',
        'Set realistic timelines',
        'Address risks explicitly',
        'Link to business objectives'
      ],
      outputExample: `
# PRD: [Product/Feature Name]

## Executive Summary
[2-3 sentence overview of what we're building and why]

## Problem Statement

### Current State
[What exists today and why it's insufficient]

### User Pain Points
1. **Pain Point 1**: [Description]
   - Impact: [How this affects users]
   - Frequency: [How often this occurs]
   - Severity: [Critical/High/Medium/Low]

2. **Pain Point 2**: [Description]
   - Impact: [How this affects users]
   - Frequency: [How often this occurs]
   - Severity: [Critical/High/Medium/Low]

### Root Cause Analysis
[Why these problems exist]

## Desired Outcomes

### User Outcomes
- Users will be able to [capability]
- Users will no longer need to [current workaround]
- Users will experience [improvement]

### Business Outcomes
- Increase [metric] by [target]%
- Reduce [metric] by [target]%
- Enable [new capability]

## Success Metrics

| Metric | Current Value | Target Value | Measurement Method |
|--------|--------------|--------------|-------------------|
| [Metric 1] | [Current] | [Target] | [How to measure] |
| [Metric 2] | [Current] | [Target] | [How to measure] |

## User Stories

### Epic: [Epic Name]
- **As a** [user type]
- **I want** [capability]
- **So that** [benefit]

#### Story 1: [Story Name]
- **As a** [user type]
- **I want** [specific capability]
- **So that** [specific benefit]
- **Acceptance Criteria**:
  - [ ] [Testable criterion]
  - [ ] [Testable criterion]

## Functional Requirements

### Must Have (P0)
1. **[REQ-001]**: [Requirement description]
   - Rationale: [Why this is critical]
   - Acceptance: [How to verify]

### Should Have (P1)
1. **[REQ-010]**: [Requirement description]
   - Rationale: [Why this is important]
   - Acceptance: [How to verify]

### Nice to Have (P2)
1. **[REQ-020]**: [Requirement description]
   - Rationale: [Why this adds value]
   - Acceptance: [How to verify]

## Non-Functional Requirements

### Performance
- [Requirement with specific metric]

### Security
- [Requirement with specific standard]

### Usability
- [Requirement with specific criterion]

### Scalability
- [Requirement with specific target]

## Solutions Considered

### Option 1: [Solution Name]
**Description**: [What this solution entails]
**Pros**:
- [Advantage]
- [Advantage]
**Cons**:
- [Disadvantage]
- [Disadvantage]
**Effort**: [T-shirt size]
**Risk**: [Low/Medium/High]

### Option 2: [Solution Name]
[Similar structure]

### Option 3: [Do Nothing]
**Description**: Maintain status quo
**Pros**:
- No implementation cost
- No risk
**Cons**:
- Problems persist
- Competitive disadvantage

## Recommended Solution

**Recommendation**: Option [X] - [Solution Name]

**Rationale**:
[Why this solution best addresses the problems and delivers value]

## Value Assessment

### Cost-Benefit Analysis
- **Implementation Cost**: [Estimate in person-days/dollars]
- **Ongoing Cost**: [Maintenance, operations]
- **Expected Revenue Impact**: [Estimate]
- **Cost Savings**: [Efficiency gains]
- **ROI Timeline**: [When we break even]

### Strategic Value
- [Competitive advantage]
- [Market positioning]
- [Platform capabilities]
- [Future opportunities]

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|--------------------|
| [Risk 1] | [L/M/H] | [L/M/H] | [How to address] |
| [Risk 2] | [L/M/H] | [L/M/H] | [How to address] |

## Timeline and Phases

### Phase 1: MVP (Week 1-4)
- [Core functionality]
- [Basic features]
- Success Criteria: [What defines MVP success]

### Phase 2: Enhancement (Week 5-8)
- [Additional features]
- [Improvements]
- Success Criteria: [What defines success]

### Phase 3: Scale (Week 9-12)
- [Full rollout]
- [Optimizations]
- Success Criteria: [What defines success]

## Stakeholders

| Role | Name/Team | Interest | Influence |
|------|-----------|----------|----------|
| Sponsor | [Name] | High | High |
| Users | [Segment] | High | Medium |
| Engineering | [Team] | Medium | High |
| Support | [Team] | Medium | Medium |

## Appendix

### Research Data
- [Link to user research]
- [Link to competitive analysis]
- [Link to technical feasibility]

### Related Documents
- ADR-XXX: [Related architecture decision]
- EPIC-XXX: [Parent epic in backlog]
- [Design mockups]

---
**Document Status**: [Draft/Review/Approved]
**Last Updated**: [Date]
**Author**: [Name]
**Reviewers**: [Names]`
    };
  }
  
  /**
   * Gather PRD-specific context
   */
  async gatherContext(intent: any): Promise<any> {
    const context = {
      conversationContext: {
        intent: intent.raw,
        timestamp: intent.timestamp
      },
      systemState: await this.gatherSystemState(),
      domainKnowledge: await this.gatherProductContext(),
      pastPatterns: await this.gatherExistingPRDs()
    };
    
    return context;
  }
  
  /**
   * Gather system state
   */
  private async gatherSystemState(): Promise<any> {
    const state: any = {};
    
    // Get current branch to understand feature context
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
    
    // Check for existing documentation
    try {
      const { stdout: docs } = await execAsync('find . -name "README.md" -o -name "ARCHITECTURE.md" -o -name "*.prd.md" | head -10');
      state.existingDocs = docs.trim().split('\n').filter(Boolean);
    } catch (error) {
      state.existingDocs = [];
    }
    
    return state;
  }
  
  /**
   * Gather product context
   */
  private async gatherProductContext(): Promise<any> {
    const context: any = {};
    
    // Analyze package.json for product info
    try {
      const packageJson = await fs.readFile('package.json', 'utf-8');
      const pkg = JSON.parse(packageJson);
      context.productName = pkg.name;
      context.version = pkg.version;
      context.description = pkg.description;
      
      // Detect product type from dependencies
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      context.productType = this.detectProductType(deps);
    } catch (error) {
      context.productName = 'Unknown Product';
      context.productType = ['general'];
    }
    
    // Check for user-facing features
    try {
      const { stdout: features } = await execAsync('find . -path "*/features/*" -o -path "*/components/*" -o -path "*/pages/*" | wc -l');
      context.featureCount = parseInt(features.trim(), 10);
    } catch (error) {
      context.featureCount = 0;
    }
    
    // Check for tests (indicates quality requirements)
    try {
      const { stdout: tests } = await execAsync('find . -name "*.test.*" -o -name "*.spec.*" | wc -l');
      context.testCount = parseInt(tests.trim(), 10);
      context.hasTests = context.testCount > 0;
    } catch (error) {
      context.testCount = 0;
      context.hasTests = false;
    }
    
    // Check for analytics/metrics (indicates data-driven)
    try {
      const { stdout: analytics } = await execAsync('grep -r "analytics\|telemetry\|metrics" --include="*.ts" --include="*.js" | wc -l');
      context.hasAnalytics = parseInt(analytics.trim(), 10) > 0;
    } catch (error) {
      context.hasAnalytics = false;
    }
    
    return context;
  }
  
  /**
   * Gather existing PRDs
   */
  private async gatherExistingPRDs(): Promise<any> {
    const prds: any = {};
    
    try {
      // Find existing PRDs
      const { stdout } = await execAsync('find . -name "*PRD*.md" -o -name "*prd*.md" -o -name "*requirements*.md" | head -10');
      const prdFiles = stdout.trim().split('\n').filter(Boolean);
      
      prds.count = prdFiles.length;
      prds.files = prdFiles;
      
      // Extract recent PRD titles if any exist
      if (prdFiles.length > 0) {
        const titles = [];
        for (const file of prdFiles.slice(0, 3)) {
          try {
            const content = await fs.readFile(file, 'utf-8');
            const titleMatch = content.match(/^#\s+(.+)$/m);
            if (titleMatch) {
              titles.push(titleMatch[1]);
            }
          } catch (error) {
            // Skip if can't read
          }
        }
        prds.recentTitles = titles;
      }
    } catch (error) {
      prds.count = 0;
      prds.files = [];
      prds.recentTitles = [];
    }
    
    // Check for issues/tickets (user feedback)
    try {
      const { stdout: issues } = await execAsync('find . -path "*/.github/ISSUE_TEMPLATE/*" | head -5');
      prds.hasIssueTemplates = issues.trim().length > 0;
    } catch (error) {
      prds.hasIssueTemplates = false;
    }
    
    return prds;
  }
  
  /**
   * Detect product type from dependencies
   */
  private detectProductType(deps: Record<string, string>): string[] {
    const types = [];
    
    // Web frameworks
    if (deps['react'] || deps['vue'] || deps['@angular/core']) types.push('web-app');
    if (deps['next'] || deps['nuxt'] || deps['gatsby']) types.push('ssr-app');
    
    // API/Backend
    if (deps['express'] || deps['fastify'] || deps['koa']) types.push('api');
    if (deps['@nestjs/core']) types.push('enterprise-api');
    
    // CLI/Tools
    if (deps['commander'] || deps['yargs'] || deps['inquirer']) types.push('cli-tool');
    
    // Data/ML
    if (deps['tensorflow'] || deps['@tensorflow/tfjs']) types.push('ml-product');
    if (deps['d3'] || deps['chart.js']) types.push('data-visualization');
    
    // Mobile
    if (deps['react-native'] || deps['@ionic/core']) types.push('mobile-app');
    
    // Infrastructure
    if (deps['aws-sdk'] || deps['@aws-sdk/client-s3']) types.push('cloud-service');
    if (deps['kubernetes-client']) types.push('infrastructure');
    
    return types.length > 0 ? types : ['general-application'];
  }
  
  /**
   * Generate PRD-specific reflection prompt
   */
  protected generateReflectionPrompt(
    intent: any,
    template: any,
    context: any
  ): string {
    const productType = context.domainKnowledge.productType?.join(', ') || 'application';
    const hasTests = context.domainKnowledge.hasTests ? 'Yes' : 'No';
    const hasAnalytics = context.domainKnowledge.hasAnalytics ? 'Yes' : 'No';
    
    return `
<reflection-task domain="prd">

INTENT: "${intent.raw}"

PRODUCT CONTEXT:
- Name: ${context.domainKnowledge.productName || 'Unknown'}
- Type: ${productType}
- Version: ${context.domainKnowledge.version || '0.1.0'}
- Features: ${context.domainKnowledge.featureCount} components/pages
- Has Tests: ${hasTests} (${context.domainKnowledge.testCount} test files)
- Has Analytics: ${hasAnalytics}
- Current Branch: ${context.systemState.currentBranch}

EXISTING DOCUMENTATION:
- PRDs: ${context.pastPatterns.count}
- Recent: ${context.pastPatterns.recentTitles?.join(', ') || 'none'}
- Has Issue Templates: ${context.pastPatterns.hasIssueTemplates ? 'Yes' : 'No'}

TEMPLATE REQUIREMENTS:
${template.requiredSections.map((s: string) => `- ${s}`).join('\n')}

CONTEXT TO CONSIDER:
${template.contextToConsider.map((c: string) => `- ${c}`).join('\n')}

RULES TO FOLLOW:
${template.rulesAndConstraints.map((r: string) => `- ${r}`).join('\n')}

REFLECTION INSTRUCTIONS:
1. Focus on the WHY - what problem are we solving?
2. Identify specific user pain points with evidence
3. Define measurable success criteria
4. Consider multiple solution approaches
5. Assess value and ROI
6. Identify risks and mitigation strategies
7. Create clear requirements that can be tested
8. Define phases for incremental delivery
9. Consider all stakeholders
10. Link to existing documentation and decisions

IMPORTANT:
- Be specific about user problems, not vague
- Include concrete metrics, not aspirational goals
- Consider technical feasibility given the product type
- Address non-functional requirements (performance, security, etc.)
- Think about long-term maintenance and evolution

OUTPUT FORMAT:
${template.outputExample}

ARTIFACT HANDLING:
When AI generates the PRD based on this template:
1. Save to: docs/PRD/PRD-XXX-[title].md
2. Use sequential numbering (001, 002, etc.)
3. Clean title for filename (lowercase, hyphens)
4. Preserve full markdown formatting

</reflection-task>`;
  }
}

/**
 * Factory function
 */
export function createPRDReflection() {
  return new PRDReflectionCommand();
}