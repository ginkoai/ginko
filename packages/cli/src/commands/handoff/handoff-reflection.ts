/**
 * @fileType: command
 * @status: current
 * @updated: 2025-01-13
 * @tags: [handoff, reflection, session, context, workstream]
 * @related: [../../core/reflection-pattern.ts, ../start/start-reflection.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [reflection-pattern, simple-git, fs-extra]
 */

import { ReflectionCommand } from '../../core/reflection-pattern.js';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { getUserEmail, getGinkoDir } from '../../utils/helpers.js';

/**
 * Handoff domain reflection for comprehensive session preservation
 * Captures complete workstream context for instant flow state resumption
 */
export class HandoffReflectionCommand extends ReflectionCommand {
  constructor() {
    super('handoff');
  }

  /**
   * Load handoff-specific template with workstream awareness
   */
  async loadTemplate(): Promise<any> {
    return {
      requiredSections: [
        'session_summary',
        'active_workstream',
        'critical_context_modules',
        'key_achievements',
        'architectural_decisions',
        'in_progress_work',
        'next_session_instructions',
        'mental_model',
        'known_issues'
      ],
      contextToConsider: [
        'git_changes',
        'active_prds_adrs_tasks',
        'critical_modules',
        'test_results',
        'session_duration',
        'workstream_focus',
        'recent_commits',
        'uncommitted_changes'
      ],
      rulesAndConstraints: [
        'Reference ALL active PRDs/ADRs/Tasks by number and title',
        'List ESSENTIAL context modules with explicit filenames',
        'Provide SPECIFIC next actions with exact commands',
        'Preserve architectural rationale and decisions',
        'Enable <30 second flow state achievement',
        'Include command sequences for instant resumption',
        'Capture current mental model and understanding',
        'Note any blockers or issues that need resolution'
      ]
    };
  }

  /**
   * Gather comprehensive context including workstream detection
   */
  async gatherContext(parsedIntent: any): Promise<any> {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();

    // Detect workstream from recent activity
    const workstream = await this.detectWorkstream(git);
    const criticalModules = await this.identifyCriticalModules(ginkoDir, workstream);

    // Get git state
    const status = await git.status();
    const branch = await git.branchLocal();
    const recentCommits = await git.log({ maxCount: 20 });

    // Get previous handoff for continuity
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
    const previousHandoff = await this.getPreviousHandoff(sessionDir);

    // Calculate session metrics
    const sessionDuration = await this.calculateSessionDuration(previousHandoff);

    return {
      gitStatus: status,
      currentBranch: branch.current,
      activePRDs: workstream.prds,
      activeADRs: workstream.adrs,
      activeTasks: workstream.tasks,
      criticalModules: criticalModules,
      recentCommits: recentCommits.all,
      previousHandoff: previousHandoff,
      sessionDuration: sessionDuration,
      uncommittedFiles: [...status.modified, ...status.created, ...status.deleted],
      workstreamFocus: workstream.focus
    };
  }

  /**
   * Generate AI prompt with workstream context emphasis
   */
  async generatePrompt(intent: string, template: any, context: any): Promise<string> {
    const basePrompt = await super.generatePrompt(intent, template, context);

    const enhancedPrompt = `${basePrompt}

CRITICAL REQUIREMENTS FOR FLOW STATE PRESERVATION:

1. WORKSTREAM CONTEXT - List ALL active documents:
   - PRDs: ${context.activePRDs.map((p: any) => `${p.number} - ${p.title}`).join(', ') || 'None detected'}
   - ADRs: ${context.activeADRs.map((a: any) => `${a.number} - ${a.title}`).join(', ') || 'None detected'}
   - Tasks: ${context.activeTasks.map((t: any) => `${t.number} - ${t.title} (${t.priority})`).join(', ') || 'None detected'}

2. CRITICAL MODULES - These MUST be loaded next session:
   ${context.criticalModules.map((m: string) => `- ${m}`).join('\n   ')}

3. INSTANT RESUMPTION - Provide exact command sequences:
   Example format:
   \`\`\`bash
   ginko start                                    # Load this handoff
   ginko context pattern-reflection-pattern-as-dsl  # Load critical module
   head -50 docs/PRD/PRD-001-*.md                # Review active PRD
   cd packages/cli/src/commands/handoff          # Navigate to work location
   npm test -- handoff-reflection                # Run tests
   \`\`\`

4. MENTAL MODEL - Preserve deep understanding:
   - Current architecture decisions and rationale
   - Pattern implementations in progress
   - Key insights discovered this session

5. RAPPORT PRESERVATION - Maintain continuity:
   - Reference specific line numbers where work stopped
   - Note any decisions that were made but not implemented
   - Capture any "aha moments" or breakthroughs

Current workstream focus: ${context.workstreamFocus || 'General development'}
Session duration: ${context.sessionDuration} minutes
Uncommitted changes: ${context.uncommittedFiles.length} files

Remember: The next session (could be another AI) needs to achieve productive work in <30 seconds.`;

    return enhancedPrompt;
  }

  /**
   * Save handoff to filesystem
   */
  async saveArtifact(content: string, filename?: string): Promise<string> {
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);

    // Ensure directory exists
    await fs.ensureDir(sessionDir);

    // Archive existing handoff if present
    await this.archiveExistingHandoff(sessionDir);

    // Save new handoff
    const handoffPath = path.join(sessionDir, 'current.md');
    await fs.writeFile(handoffPath, content, 'utf-8');

    console.log(chalk.green(`\n✅ Handoff saved to: ${path.relative(process.cwd(), handoffPath)}`));
    console.log(chalk.cyan('   Next session will load this automatically with ginko start'));

    return handoffPath;
  }

  /**
   * Detect active workstream from git and file patterns
   */
  private async detectWorkstream(git: any): Promise<any> {
    const recentCommits = await git.log({ maxCount: 30 });
    const commitMessages = recentCommits.all.map((c: any) => c.message).join(' ');

    // Pattern matching for PRDs, ADRs, Tasks
    const prdPattern = /PRD-(\d+)[:\s-]*([\w\s-]+)/gi;
    const adrPattern = /ADR-(\d+)[:\s-]*([\w\s-]+)/gi;
    const taskPattern = /TASK-(\d+)[:\s-]*([\w\s-]+)/gi;

    const prds = [];
    const adrs = [];
    const tasks = [];

    let match;
    while ((match = prdPattern.exec(commitMessages)) !== null) {
      prds.push({ number: `PRD-${match[1]}`, title: match[2].trim() });
    }
    while ((match = adrPattern.exec(commitMessages)) !== null) {
      adrs.push({ number: `ADR-${match[1]}`, title: match[2].trim() });
    }
    while ((match = taskPattern.exec(commitMessages)) !== null) {
      tasks.push({ number: `TASK-${match[1]}`, title: match[2].trim(), priority: 'MEDIUM' });
    }

    // Determine focus from patterns
    let focus = 'General development';
    if (prds.length > 0 || adrs.length > 0) {
      if (commitMessages.includes('reflection') || commitMessages.includes('domain')) {
        focus = 'Reflection domain implementation';
      } else if (commitMessages.includes('handoff') || commitMessages.includes('start')) {
        focus = 'Session management enhancement';
      }
    }

    return {
      prds: [...new Set(prds.map(p => JSON.stringify(p)))].map(p => JSON.parse(p)),
      adrs: [...new Set(adrs.map(a => JSON.stringify(a)))].map(a => JSON.parse(a)),
      tasks: [...new Set(tasks.map(t => JSON.stringify(t)))].map(t => JSON.parse(t)),
      focus
    };
  }

  /**
   * Identify critical context modules based on workstream
   */
  private async identifyCriticalModules(ginkoDir: string, workstream: any): Promise<string[]> {
    const modules: string[] = [];

    // Always critical for reflection work
    if (workstream.focus.includes('Reflection') || workstream.focus.includes('domain')) {
      modules.push('pattern-reflection-pattern-as-dsl.md');
      modules.push('universal-reflection-pattern.md');
    }

    // Add modules based on active PRDs/ADRs
    if (workstream.prds.some((p: any) => p.number === 'PRD-001')) {
      modules.push('reflection-pattern-enhancements.md');
    }

    // Add modules for specific work areas
    if (workstream.focus.includes('Session management')) {
      modules.push('human-ai-collaboration-advantages.md');
    }

    // Check for existing modules in context directory
    const contextDir = path.join(ginkoDir, 'context', 'modules');
    if (await fs.pathExists(contextDir)) {
      const files = await fs.readdir(contextDir);

      // Add any pattern-related modules
      files.filter(f => f.includes('pattern') && f.endsWith('.md'))
        .forEach(f => {
          if (!modules.includes(f)) {
            modules.push(f);
          }
        });
    }

    return modules.slice(0, 5); // Limit to top 5 most critical
  }

  /**
   * Get previous handoff for context
   */
  private async getPreviousHandoff(sessionDir: string): Promise<string | null> {
    const currentPath = path.join(sessionDir, 'current.md');
    if (await fs.pathExists(currentPath)) {
      return fs.readFile(currentPath, 'utf-8');
    }
    return null;
  }

  /**
   * Calculate session duration from previous handoff
   */
  private async calculateSessionDuration(previousHandoff: string | null): Promise<number> {
    if (!previousHandoff) return 0;

    const timestampMatch = previousHandoff.match(/timestamp:\s*(\d+)/);
    if (timestampMatch) {
      const previousTime = parseInt(timestampMatch[1], 10);
      const currentTime = Date.now();
      return Math.round((currentTime - previousTime) / 60000); // Convert to minutes
    }

    return 0;
  }

  /**
   * Archive existing handoff
   */
  private async archiveExistingHandoff(sessionDir: string): Promise<void> {
    const currentPath = path.join(sessionDir, 'current.md');
    if (await fs.pathExists(currentPath)) {
      const archiveDir = path.join(sessionDir, 'archive');
      await fs.ensureDir(archiveDir);

      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const archivePath = path.join(archiveDir, `${date}-${time}-handoff.md`);

      await fs.move(currentPath, archivePath);
    }
  }
}

// Export for CLI use
export default HandoffReflectionCommand;