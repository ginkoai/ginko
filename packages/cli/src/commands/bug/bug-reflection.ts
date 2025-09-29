/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-29
 * @tags: [bug, reflection, tracking, ai-enhanced]
 * @related: [../../core/reflection-pattern.ts, bug-context-gatherer.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [reflection-pattern, fs, path, chalk]
 */

import { ReflectionCommand } from '../../core/reflection-pattern.js';
import { BugContextGatherer } from './bug-context-gatherer.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { pathManager } from '../../core/config/path-config.js';
import { execSync } from 'child_process';

interface BugOptions {
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  status?: 'Open' | 'InProgress' | 'Testing' | 'Resolved';
  reporter?: string;
  'no-analysis'?: boolean;
  reproduce?: boolean;
  save?: boolean;
  verbose?: boolean;
}

/**
 * Bug-specific implementation of the Reflection Pattern
 * Analyzes bugs with codebase context and creates structured bug reports
 */
export class BugReflectionCommand extends ReflectionCommand {
  private contextGatherer: BugContextGatherer;

  constructor() {
    super('bug');
    this.contextGatherer = new BugContextGatherer();
  }

  /**
   * Execute bug reflection
   */
  async execute(intent: string, options: BugOptions = {}): Promise<void> {
    console.log(chalk.blue('🔍 Analyzing bug with context...\n'));

    // Load template
    const template = await this.loadTemplate(options);

    // Gather context
    if (options.verbose) {
      console.log(chalk.dim('   Gathering context...'));
    }
    const context = await this.contextGatherer.gather(intent);

    if (options.verbose) {
      console.log(chalk.green('   ✓ Scanned recent logs'));
      console.log(chalk.green('   ✓ Analyzed related code changes'));
      console.log(chalk.green('   ✓ Checked similar past issues\n'));
    }

    // Auto-detect priority if not specified
    const priority = options.priority || this.detectPriority(intent, context);

    // Generate bug number and filename
    const bugNumber = await this.getNextBugNumber();
    const slug = this.generateSlug(intent);
    const filename = `BUG-${bugNumber}-${slug}.md`;

    // Generate AI prompt
    const prompt = await this.generatePrompt(intent, template, context, {
      priority,
      status: options.status || 'Open',
      reporter: options.reporter || await this.getGitUser(),
      number: bugNumber,
      includeReproduction: options.reproduce !== false,
      skipAnalysis: options['no-analysis'] === true
    });

    console.log(chalk.blue('📋 Bug Analysis:'));
    console.log(chalk.dim(`   Priority: ${priority} (${options.priority ? 'specified' : 'auto-detected'})`));
    if (context.affectedComponents.length > 0) {
      console.log(chalk.dim(`   Affected: ${context.affectedComponents.join(', ')}`));
    }
    if (context.probableCause && !options['no-analysis']) {
      console.log(chalk.dim(`   Probable cause: ${context.probableCause}`));
    }
    console.log();

    // Generate bug report content
    const content = await this.generateBugReport({
      number: bugNumber,
      title: this.generateTitle(intent),
      priority,
      status: options.status || 'Open',
      reporter: options.reporter || await this.getGitUser(),
      description: intent,
      context,
      template,
      skipAnalysis: options['no-analysis'] === true
    });

    // Save bug report
    const bugsDir = path.join(pathManager.getGinkoRoot(), 'bugs');
    await fs.mkdir(bugsDir, { recursive: true });

    const bugPath = path.join(bugsDir, filename);
    await fs.writeFile(bugPath, content, 'utf-8');

    console.log(chalk.green(`💾 Created: ${path.relative(process.cwd(), bugPath)}\n`));

    // Update bug index
    await this.updateBugIndex(bugNumber, filename, {
      title: this.generateTitle(intent),
      priority,
      status: options.status || 'Open',
      date: new Date().toISOString().split('T')[0]
    });

    // Show next steps
    console.log(chalk.blue('Next steps:'));
    console.log(chalk.dim('   1. Review proposed solutions'));
    console.log(chalk.dim('   2. Test reproduction steps'));
    console.log(chalk.dim('   3. Assign to developer'));
    console.log();
    console.log(chalk.dim(`   View: ginko bugs show BUG-${bugNumber}`));
  }

  /**
   * Load bug-specific template
   */
  private async loadTemplate(options: BugOptions): Promise<any> {
    return {
      requiredSections: [
        'metadata',
        'problem_description',
        'evidence',
        options['no-analysis'] ? null : 'root_cause_analysis',
        'impact_assessment',
        options.reproduce !== false ? 'reproduction_steps' : null,
        'proposed_solutions',
        'workaround',
        'next_steps'
      ].filter(Boolean),
      contextToConsider: [
        'recent_errors_in_logs',
        'related_code_changes',
        'similar_past_bugs',
        'affected_components',
        'system_environment'
      ],
      rulesAndConstraints: [
        'Priority auto-detection: crash/security=Critical, blocks workflow=High, UX issue=Medium, cosmetic=Low',
        'Include specific error messages and stack traces',
        'Root cause analysis uses codebase context',
        'Solutions ranked by feasibility and impact',
        'Link to related files with line numbers'
      ]
    };
  }

  /**
   * Auto-detect bug priority based on keywords
   */
  private detectPriority(description: string, context: any): 'Critical' | 'High' | 'Medium' | 'Low' {
    const lower = description.toLowerCase();

    // Critical indicators
    if (lower.match(/\b(crash|security|data loss|corruption|exploit|vulnerability|down)\b/)) {
      return 'Critical';
    }

    // High indicators
    if (lower.match(/\b(block|broken|fail|timeout|error|exception|cannot|unable)\b/)) {
      return 'High';
    }

    // Low indicators
    if (lower.match(/\b(cosmetic|typo|formatting|color|spacing|alignment)\b/)) {
      return 'Low';
    }

    // Default to Medium
    return 'Medium';
  }

  /**
   * Get next bug number
   */
  private async getNextBugNumber(): Promise<string> {
    const bugsDir = path.join(pathManager.getGinkoRoot(), 'bugs');

    try {
      await fs.mkdir(bugsDir, { recursive: true });
      const files = await fs.readdir(bugsDir);

      const bugNumbers = files
        .filter(f => f.startsWith('BUG-'))
        .map(f => {
          const match = f.match(/^BUG-(\d+)-/);
          return match ? parseInt(match[1], 10) : 0;
        });

      const maxNumber = bugNumbers.length > 0 ? Math.max(...bugNumbers) : 0;
      return String(maxNumber + 1).padStart(3, '0');
    } catch {
      return '001';
    }
  }

  /**
   * Generate URL-friendly slug from description
   */
  private generateSlug(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join('-');
  }

  /**
   * Generate bug title (first sentence or max 60 chars)
   */
  private generateTitle(description: string): string {
    const firstSentence = description.split(/[.!?]/)[0];
    return firstSentence.length > 60
      ? firstSentence.substring(0, 57) + '...'
      : firstSentence;
  }

  /**
   * Get git user name
   */
  private async getGitUser(): Promise<string> {
    try {
      const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
      return name || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Generate bug report content
   */
  private async generateBugReport(data: any): Promise<string> {
    const { number, title, priority, status, reporter, description, context, skipAnalysis } = data;
    const date = new Date().toISOString().split('T')[0];

    let content = `# BUG-${number}: ${title}

**Reported**: ${date}
**Reporter**: ${reporter}
**Priority**: ${priority}
**Status**: ${status}
${context.affectedComponents.length > 0 ? `**Tags**: ${context.affectedComponents.join(', ')}` : ''}

## Problem Description
${description}

## Evidence
`;

    // Add error messages if available
    if (context.errors && context.errors.length > 0) {
      content += `**Error Messages**:\n\`\`\`\n${context.errors.join('\n\n')}\n\`\`\`\n\n`;
    }

    // Add stack traces if available
    if (context.stackTraces && context.stackTraces.length > 0) {
      content += `**Stack Trace**:\n\`\`\`\n${context.stackTraces[0]}\n\`\`\`\n\n`;
    }

    // Add affected files
    if (context.affectedFiles && context.affectedFiles.length > 0) {
      content += `**Affected Files**:\n`;
      context.affectedFiles.forEach((file: string) => {
        content += `- \`${file}\`\n`;
      });
      content += '\n';
    }

    // Root cause analysis
    if (!skipAnalysis) {
      content += `## Root Cause Analysis
${context.probableCause || 'Analysis requires further investigation.'}

`;
      if (context.affectedComponents.length > 0) {
        content += `**Affected Components**:\n`;
        context.affectedComponents.forEach((comp: string) => {
          content += `- ${comp}\n`;
        });
        content += '\n';
      }
    }

    // Impact assessment
    content += `## Impact Assessment
- **User Impact**: ${this.assessUserImpact(priority, description)}
- **System Impact**: Under investigation
- **Affected Users**: To be determined

`;

    // Reproduction steps
    content += `## Reproduction Steps
1. [Describe initial conditions]
2. [Action that triggers bug]
3. [Observed behavior]
4. **Expected**: [What should happen]
5. **Actual**: [What actually happens]

`;

    // Proposed solutions
    content += `## Proposed Solutions

### Option 1: Investigation Required
Further analysis needed to determine appropriate fix.

**Next Investigation Steps**:
- Review related code changes
- Check for similar issues in bug history
- Analyze error patterns in logs

`;

    // Workaround
    content += `## Workaround
${context.workaround || 'No workaround identified yet.'}

`;

    // Related issues
    content += `## Related Issues
- Related to: [BUG-xxx if applicable]
- Caused by: [commit hash if known]
- Blocks: [feature/backlog item if applicable]

`;

    // Next steps
    content += `## Next Steps
- [ ] Verify reproduction steps
- [ ] Investigate root cause
- [ ] Develop fix
- [ ] Test solution
- [ ] Deploy and verify
`;

    return content;
  }

  /**
   * Assess user impact based on priority
   */
  private assessUserImpact(priority: string, description: string): string {
    switch (priority) {
      case 'Critical':
        return 'Severe - System unusable or data at risk';
      case 'High':
        return 'High - Major functionality blocked or degraded';
      case 'Medium':
        return 'Moderate - Workaround available but user experience affected';
      case 'Low':
        return 'Minor - Cosmetic or edge case issue';
      default:
        return 'To be assessed';
    }
  }

  /**
   * Update bug index for querying
   */
  private async updateBugIndex(number: string, filename: string, metadata: any): Promise<void> {
    const bugsDir = path.join(pathManager.getGinkoRoot(), 'bugs');
    const indexPath = path.join(bugsDir, 'index.json');

    let index: any = { bugs: [] };

    try {
      const existing = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(existing);
    } catch {
      // New index
    }

    index.bugs.push({
      number: `BUG-${number}`,
      filename,
      ...metadata,
      created: new Date().toISOString()
    });

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}