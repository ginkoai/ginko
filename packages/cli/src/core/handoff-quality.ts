/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-01-15
 * @tags: [handoff, quality, scoring, validation]
 * @related: [../commands/handoff/handoff-reflection.ts, ./simple-pipeline.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [simple-git, fs-extra]
 */

import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Handoff Quality Management System
 * Ensures comprehensive, high-quality handoffs for AI+Human collaboration
 */

// ==================================================
// QUALITY DEFINITIONS
// ==================================================

export interface HandoffSection {
  name: string;
  required: boolean;
  minItems?: number;
  score: number;
  validator: (content: string) => boolean;
  enhancer?: (context: any) => string;
}

export interface QualityReport {
  score: number;
  maxScore: number;
  percentage: number;
  missing: string[];
  weak: string[];
  suggestions: string[];
  passed: boolean;
  confidence: number;
}

export interface HandoffContext {
  // Git context
  commits: any[];
  uncommittedChanges: any;
  branch: string;
  ahead: number;
  behind: number;

  // Session context
  sessionId: string;
  duration: string;
  startTime: Date;
  endTime: Date;

  // Workstream context
  prds: Array<{ number: string; title: string }>;
  adrs: Array<{ number: string; title: string }>;
  tasks: Array<{ number: string; title: string; priority: string }>;
  focus: string;

  // File context
  modifiedFiles: Array<{ path: string; changes: string; description?: string }>;
  newFiles: string[];
  deletedFiles: string[];

  // Code context
  todos: Array<{ file: string; line: number; text: string }>;
  fixmes: Array<{ file: string; line: number; text: string }>;
  patterns: any[];

  // Quality metadata
  achievements: string[];
  decisions: string[];
  nextSteps: Array<{ title: string; command?: string; location?: string; estimate?: string }>;
  knownIssues: string[];
  insights: string[];
}

// ==================================================
// QUALITY SCORING SYSTEM
// ==================================================

export class HandoffQualityScorer {
  private static readonly SECTIONS: Map<string, HandoffSection> = new Map([
    ['achievements', {
      name: 'Session Achievements',
      required: true,
      minItems: 3,
      score: 20,
      validator: (content: string) => {
        const achievements = content.match(/✅ \*\*[^*]+\*\*/g) || [];
        return achievements.length >= 3;
      },
      enhancer: (ctx: HandoffContext) => {
        if (!ctx.achievements || ctx.achievements.length < 3) {
          return `\n### ⚠️ Add at least 3 major achievements\n`;
        }
        return '';
      }
    }],

    ['workstream', {
      name: 'Active Workstream',
      required: true,
      score: 15,
      validator: (content: string) => {
        return content.includes('Current Focus:') ||
               content.includes('PRD-') ||
               content.includes('ADR-');
      }
    }],

    ['nextSteps', {
      name: 'Next Steps',
      required: true,
      minItems: 3,
      score: 20,
      validator: (content: string) => {
        const steps = content.match(/\d+\. \*\*[^*]+\*\*/g) || [];
        const commands = content.match(/`[^`]+`/g) || [];
        return steps.length >= 3 && commands.length >= 3;
      }
    }],

    ['modifiedFiles', {
      name: 'Modified Files',
      required: true,
      score: 15,
      validator: (content: string) => {
        const matches = content.match(/\d+\. `[^`]+` -/g);
        return content.includes('Files Modified') ||
               content.includes('modified:') ||
               (matches ? matches.length > 0 : false);
      }
    }],

    ['mentalModel', {
      name: 'Mental Model',
      required: true,
      score: 10,
      validator: (content: string) => {
        return content.includes('Mental Model') ||
               content.includes('Key Innovation') ||
               content.includes('Architecture');
      }
    }],

    ['knownIssues', {
      name: 'Known Issues',
      required: false,
      score: 10,
      validator: (content: string) => {
        return content.includes('Known Issues') ||
               content.includes('Blockers') ||
               content.includes('⚠️');
      }
    }],

    ['codeExamples', {
      name: 'Code Examples',
      required: false,
      score: 10,
      validator: (content: string) => {
        const codeBlocks = content.match(/```[\s\S]*?```/g);
        return codeBlocks ? codeBlocks.length >= 2 : false;
      }
    }]
  ]);

  static readonly MINIMUM_SCORE = 70;
  static readonly TARGET_SCORE = 85;

  /**
   * Score a handoff's quality
   */
  static score(content: string): QualityReport {
    const report: QualityReport = {
      score: 0,
      maxScore: 0,
      percentage: 0,
      missing: [],
      weak: [],
      suggestions: [],
      passed: false,
      confidence: 0
    };

    // Check each section
    for (const [key, section] of this.SECTIONS) {
      report.maxScore += section.score;

      if (section.validator(content)) {
        report.score += section.score;
      } else {
        if (section.required) {
          report.missing.push(section.name);
        } else {
          report.weak.push(section.name);
        }
      }
    }

    // Calculate percentage
    report.percentage = Math.round((report.score / report.maxScore) * 100);
    report.passed = report.percentage >= this.MINIMUM_SCORE;
    report.confidence = report.percentage / 100;

    // Generate suggestions
    if (report.percentage < this.TARGET_SCORE) {
      report.suggestions = this.generateSuggestions(content, report);
    }

    return report;
  }

  /**
   * Generate improvement suggestions
   */
  private static generateSuggestions(content: string, report: QualityReport): string[] {
    const suggestions: string[] = [];

    // Check content length
    const lines = content.split('\n').length;
    if (lines < 100) {
      suggestions.push('Handoff seems short. Add more context and details.');
    }

    // Check for specific commands
    const commands = content.match(/```bash[\s\S]*?```/g) || [];
    if (commands.length === 0) {
      suggestions.push('Add specific commands for next session');
    }

    // Check for time estimates
    if (!content.includes('min') && !content.includes('hour')) {
      suggestions.push('Add time estimates for next steps');
    }

    // Check for file paths
    const paths = content.match(/[a-zA-Z0-9/_-]+\.(ts|js|md|json)/g) || [];
    if (paths.length < 5) {
      suggestions.push('Add more specific file paths');
    }

    // Section-specific suggestions
    for (const missing of report.missing) {
      suggestions.push(`Add missing section: ${missing}`);
    }

    for (const weak of report.weak) {
      suggestions.push(`Enhance weak section: ${weak}`);
    }

    return suggestions;
  }

  /**
   * Display quality report with colors
   */
  static displayReport(report: QualityReport): void {
    console.log('\n📊 Handoff Quality Report\n');

    // Score bar
    const barLength = 30;
    const filledLength = Math.round((report.percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    const color = report.percentage >= this.TARGET_SCORE ? chalk.green :
                  report.percentage >= this.MINIMUM_SCORE ? chalk.yellow :
                  chalk.red;

    console.log(color(`  [${bar}] ${report.percentage}%`));
    console.log(color(`  Score: ${report.score}/${report.maxScore}\n`));

    // Status
    if (report.passed) {
      if (report.percentage >= this.TARGET_SCORE) {
        console.log(chalk.green('  ✅ Excellent handoff quality!'));
      } else {
        console.log(chalk.yellow('  ⚠️ Acceptable quality, but could be improved'));
      }
    } else {
      console.log(chalk.red('  ❌ Quality below minimum threshold'));
    }

    // Missing sections
    if (report.missing.length > 0) {
      console.log(chalk.red('\n  Missing Required Sections:'));
      report.missing.forEach(s => console.log(chalk.red(`    - ${s}`)));
    }

    // Weak sections
    if (report.weak.length > 0) {
      console.log(chalk.yellow('\n  Weak Optional Sections:'));
      report.weak.forEach(s => console.log(chalk.yellow(`    - ${s}`)));
    }

    // Suggestions
    if (report.suggestions.length > 0) {
      console.log(chalk.cyan('\n  Suggestions for Improvement:'));
      report.suggestions.forEach(s => console.log(chalk.cyan(`    • ${s}`)));
    }

    console.log('');
  }
}

// ==================================================
// CONTEXT AGGREGATOR
// ==================================================

export class HandoffContextAggregator {
  private git: SimpleGit;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.git = simpleGit(projectRoot);
  }

  /**
   * Gather comprehensive context from multiple sources
   */
  async gatherContext(): Promise<HandoffContext> {
    const context: HandoffContext = {
      commits: [],
      uncommittedChanges: null,
      branch: '',
      ahead: 0,
      behind: 0,
      sessionId: `session-${Date.now()}`,
      duration: '',
      startTime: new Date(),
      endTime: new Date(),
      prds: [],
      adrs: [],
      tasks: [],
      focus: '',
      modifiedFiles: [],
      newFiles: [],
      deletedFiles: [],
      todos: [],
      fixmes: [],
      patterns: [],
      achievements: [],
      decisions: [],
      nextSteps: [],
      knownIssues: [],
      insights: []
    };

    // Gather git context
    try {
      const status = await this.git.status();
      context.branch = status.current || 'main';
      context.ahead = status.ahead;
      context.behind = status.behind;
      context.uncommittedChanges = status;

      // Get recent commits (last 20 commits or last 3 hours)
      try {
        const log = await this.git.log({
          maxCount: 20
        });
        context.commits = [...log.all]; // Convert readonly to mutable array
      } catch (logError) {
        // Fallback if log fails
        context.commits = [];
      }

      // Extract modified files
      context.modifiedFiles = status.modified.map(f => ({
        path: f,
        changes: 'modified'
      }));
      context.newFiles = status.created;
      context.deletedFiles = status.deleted;

    } catch (error) {
      console.error('Error gathering git context:', error);
    }

    // Detect workstream from commits and files
    const workstream = await this.detectWorkstream(context);
    // workstream data is already assigned to context properties in detectWorkstream

    // Extract TODOs and FIXMEs
    context.todos = await this.findTodos();
    context.fixmes = await this.findFixmes();

    // Analyze session
    if (context.commits.length > 0) {
      context.startTime = new Date(context.commits[context.commits.length - 1].date);
      context.endTime = new Date(context.commits[0].date);
      const duration = context.endTime.getTime() - context.startTime.getTime();
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      context.duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    // Generate achievements from commits
    context.achievements = this.synthesizeAchievements(context);

    // Generate next steps
    context.nextSteps = await this.generateNextSteps(context);

    return context;
  }

  /**
   * Detect active workstream from git and files
   */
  private async detectWorkstream(context: HandoffContext): Promise<any> {
    const workstream = {
      prds: [] as any[],
      adrs: [] as any[],
      tasks: [] as any[],
      focus: 'General development'
    };

    // Scan commit messages
    const commitMessages = context.commits.map(c => c.message).join('\n');

    // Extract PRDs
    const prdMatches = commitMessages.matchAll(/PRD-(\d+)[:\s]+([^\n]+)/g);
    for (const match of prdMatches) {
      workstream.prds.push({ number: `PRD-${match[1]}`, title: match[2].trim() });
    }

    // Extract ADRs
    const adrMatches = commitMessages.matchAll(/ADR-(\d+)[:\s]+([^\n]+)/g);
    for (const match of adrMatches) {
      workstream.adrs.push({ number: `ADR-${match[1]}`, title: match[2].trim() });
    }

    // Extract tasks
    const taskMatches = commitMessages.matchAll(/TASK-(\d+)[:\s]+([^\n]+)/g);
    for (const match of taskMatches) {
      workstream.tasks.push({
        number: `TASK-${match[1]}`,
        title: match[2].trim(),
        priority: 'MEDIUM'
      });
    }

    // Determine focus
    if (commitMessages.includes('reflection') || commitMessages.includes('pipeline')) {
      workstream.focus = 'Pipeline Pattern Implementation';
    } else if (commitMessages.includes('handoff') || commitMessages.includes('start')) {
      workstream.focus = 'Session Management Enhancement';
    } else if (commitMessages.includes('business') || commitMessages.includes('strategy')) {
      workstream.focus = 'Business Strategy Development';
    }

    context.prds = workstream.prds;
    context.adrs = workstream.adrs;
    context.tasks = workstream.tasks;
    context.focus = workstream.focus;

    return workstream;
  }

  /**
   * Find TODO comments in code
   */
  private async findTodos(): Promise<any[]> {
    // In real implementation, scan files for TODO comments
    // For now, return empty array
    return [];
  }

  /**
   * Find FIXME comments in code
   */
  private async findFixmes(): Promise<any[]> {
    // In real implementation, scan files for FIXME comments
    // For now, return empty array
    return [];
  }

  /**
   * Synthesize achievements from context
   */
  private synthesizeAchievements(context: HandoffContext): string[] {
    const achievements: string[] = [];

    // Achievement from commits
    if (context.commits.length > 0) {
      const uniqueTypes = new Set(
        context.commits.map(c => c.message.split(':')[0])
      );

      if (uniqueTypes.has('feat')) {
        achievements.push('Implemented new features');
      }
      if (uniqueTypes.has('fix')) {
        achievements.push('Fixed critical bugs');
      }
      if (uniqueTypes.has('refactor')) {
        achievements.push('Refactored code for better maintainability');
      }
      if (uniqueTypes.has('docs')) {
        achievements.push('Enhanced documentation');
      }
    }

    // Achievement from files
    if (context.newFiles.length > 0) {
      achievements.push(`Created ${context.newFiles.length} new files`);
    }
    if (context.modifiedFiles.length > 5) {
      achievements.push(`Modified ${context.modifiedFiles.length} files across the codebase`);
    }

    // Achievement from workstream
    if (context.adrs.length > 0) {
      achievements.push(`Documented ${context.adrs.length} architecture decisions`);
    }
    if (context.prds.length > 0) {
      achievements.push(`Advanced ${context.prds.length} product requirements`);
    }

    return achievements;
  }

  /**
   * Generate next steps based on context
   */
  private async generateNextSteps(context: HandoffContext): Promise<any[]> {
    const steps: any[] = [];

    // Steps from TODOs
    if (context.todos.length > 0) {
      steps.push({
        title: 'Address TODO comments',
        command: 'grep -r "TODO" --include="*.ts"',
        location: 'Multiple files',
        estimate: '1 hour'
      });
    }

    // Steps from uncommitted changes
    if (context.uncommittedChanges?.modified?.length > 0) {
      steps.push({
        title: 'Review and commit changes',
        command: 'git status && git diff',
        location: 'Working directory',
        estimate: '15 mins'
      });
    }

    // Steps from failing tests (would need actual test runner)
    steps.push({
      title: 'Run tests',
      command: 'npm test',
      location: 'packages/cli',
      estimate: '5 mins'
    });

    // Steps from workstream
    if (context.tasks.length > 0) {
      const nextTask = context.tasks[0];
      steps.push({
        title: `Continue ${nextTask.number}`,
        command: 'ginko start',
        location: 'Project root',
        estimate: '2 hours'
      });
    }

    return steps;
  }
}

// ==================================================
// HANDOFF ENHANCER
// ==================================================

export class HandoffEnhancer {
  /**
   * Enhance a handoff to meet quality standards
   */
  static async enhance(content: string, context: HandoffContext): Promise<string> {
    const report = HandoffQualityScorer.score(content);

    if (report.percentage >= HandoffQualityScorer.TARGET_SCORE) {
      return content; // Already excellent
    }

    let enhanced = content;

    // Add missing sections
    for (const missing of report.missing) {
      enhanced = this.addMissingSection(enhanced, missing, context);
    }

    // Enhance weak sections
    for (const weak of report.weak) {
      enhanced = this.enhanceWeakSection(enhanced, weak, context);
    }

    // Add quality metadata
    enhanced = this.addQualityMetadata(enhanced, report);

    return enhanced;
  }

  /**
   * Add a missing section
   */
  private static addMissingSection(content: string, section: string, context: HandoffContext): string {
    const generators: Map<string, (ctx: HandoffContext) => string> = new Map([
      ['Session Achievements', (ctx) => this.generateAchievements(ctx)],
      ['Active Workstream', (ctx) => this.generateWorkstream(ctx)],
      ['Next Steps', (ctx) => this.generateNextSteps(ctx)],
      ['Modified Files', (ctx) => this.generateModifiedFiles(ctx)],
      ['Mental Model', (ctx) => this.generateMentalModel(ctx)]
    ]);

    const generator = generators.get(section);
    if (generator) {
      const newSection = generator(context);
      // Insert after header or at end
      const headerEnd = content.indexOf('\n## ');
      if (headerEnd > 0) {
        content = content.slice(0, headerEnd) + '\n' + newSection + content.slice(headerEnd);
      } else {
        content += '\n' + newSection;
      }
    }

    return content;
  }

  /**
   * Enhance a weak section
   */
  private static enhanceWeakSection(content: string, section: string, context: HandoffContext): string {
    // Add more details to existing sections
    // Implementation would analyze and enhance specific sections
    return content;
  }

  /**
   * Add quality metadata
   */
  private static addQualityMetadata(content: string, report: QualityReport): string {
    const metadata = `
<!-- Handoff Quality Metadata
Score: ${report.score}/${report.maxScore} (${report.percentage}%)
Confidence: ${report.confidence}
Generated: ${new Date().toISOString()}
Enhanced: true
-->`;

    return content + metadata;
  }

  // Section generators
  private static generateAchievements(ctx: HandoffContext): string {
    return `## 🎯 Session Achievements

### Major Accomplishments
${ctx.achievements.map((a, i) => `${i + 1}. ✅ **${a}**`).join('\n')}

### Session Statistics
- Duration: ${ctx.duration || 'Unknown'}
- Commits: ${ctx.commits.length}
- Files Modified: ${ctx.modifiedFiles.length}
`;
  }

  private static generateWorkstream(ctx: HandoffContext): string {
    return `## 🎯 Active Workstream

### Current Focus: ${ctx.focus}
${ctx.prds.length > 0 ? `
- **Primary PRDs**:
${ctx.prds.map(p => `  - ${p.number}: ${p.title}`).join('\n')}` : ''}
${ctx.adrs.length > 0 ? `
- **Architecture Decisions**:
${ctx.adrs.map(a => `  - ${a.number}: ${a.title}`).join('\n')}` : ''}
${ctx.tasks.length > 0 ? `
- **Active Tasks**:
${ctx.tasks.map(t => `  - ${t.number}: ${t.title} (${t.priority})`).join('\n')}` : ''}
`;
  }

  private static generateNextSteps(ctx: HandoffContext): string {
    return `## 📝 Specific Next Steps

${ctx.nextSteps.map((s, i) => `${i + 1}. **${s.title}**
   - Location: \`${s.location || 'TBD'}\`
   - Command: \`${s.command || 'TBD'}\`
   - Estimate: ${s.estimate || 'TBD'}`).join('\n\n')}
`;
  }

  private static generateModifiedFiles(ctx: HandoffContext): string {
    return `## 🔄 Files Modified

${ctx.modifiedFiles.map((f, i) => `${i + 1}. \`${f.path}\` - ${f.description || f.changes}`).join('\n')}
${ctx.newFiles.length > 0 ? `
### New Files Created
${ctx.newFiles.map(f => `- \`${f}\``).join('\n')}` : ''}
${ctx.deletedFiles.length > 0 ? `
### Files Deleted
${ctx.deletedFiles.map(f => `- \`${f}\``).join('\n')}` : ''}
`;
  }

  private static generateMentalModel(ctx: HandoffContext): string {
    return `## 🧠 Mental Model

### Architecture Understanding
- Pattern: Simple Builder Pattern chosen for simplicity
- Key Decision: Prioritize developer experience over theoretical power
- Innovation: Confidence tracking without complex type systems

### Conceptual Breakthroughs
- Reflection patterns enable AI reasoning about its own processes
- Handoff quality directly impacts session continuity
- Polyglot architecture enables best-tool-for-job approach
`;
  }
}

// ==================================================
// EXPORTS
// ==================================================

export default {
  HandoffQualityScorer,
  HandoffContextAggregator,
  HandoffEnhancer
};