/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-20
 * @tags: [synthesis, session-resumption, flow-state, context]
 * @related: [../core/session-log-manager.ts, ../commands/start/start-reflection.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [fs, path, simple-git, session-log-manager]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { SessionLogManager, LogEntry } from '../core/session-log-manager.js';

/**
 * Quality tier for progressive fail-safe
 */
export type QualityTier = 'rich' | 'medium' | 'basic' | 'minimal';

/**
 * Flow state assessment (1-10 scale)
 */
export interface FlowState {
  score: number; // 1-10
  energy: string; // "Fresh start" | "Mid-stride" | "Needs break"
  emotionalTone: string; // For AI to match human's state
  indicators: {
    positive: string[];
    negative: string[];
  };
  timeContext: string; // "15 minutes ago" | "2 hours ago" | "2 days ago"
}

/**
 * Work context from session
 */
export interface WorkContext {
  completed: string[];
  inProgress: string[];
  blocked: string[];
}

/**
 * Sprint context information
 */
export interface SprintContext {
  goal: string;
  progress: number; // 0-100
  tasksCompleted: string[];
  tasksRemaining: string[];
  estimatedCompletion: string;
}

/**
 * Discoveries made during session
 */
export interface Discoveries {
  decisions: LogEntry[];
  insights: LogEntry[];
  gotchas: string[];
}

/**
 * Resume point with actionable next step
 */
export interface ResumePoint {
  summary: string;
  nextAction: string;
  suggestedCommand: string;
  contextFiles: string[];
}

/**
 * Complete synthesis output
 */
export interface SynthesisOutput {
  qualityTier: QualityTier;
  workPerformed: WorkContext;
  discoveries: Discoveries;
  sprintContext: SprintContext | null;
  flowState: FlowState;
  resumePoint: ResumePoint;
  warnings: string[];
}

/**
 * Session Synthesis Engine
 *
 * Reads session logs and context to synthesize a complete picture
 * for instant flow state on session resumption.
 */
export class SessionSynthesizer {
  private git: SimpleGit;
  private sessionDir: string;
  private projectRoot: string;

  constructor(sessionDir: string, projectRoot: string) {
    this.sessionDir = sessionDir;
    this.projectRoot = projectRoot;
    this.git = simpleGit(projectRoot);
  }

  /**
   * Main synthesis method with progressive fail-safe
   */
  async synthesize(): Promise<SynthesisOutput> {
    // Tier 1: Try session log (rich quality)
    const sessionLog = await this.trySessionLog();
    if (sessionLog) {
      return sessionLog;
    }

    // Tier 2: Try handoff (medium quality)
    const handoffSynthesis = await this.tryHandoff();
    if (handoffSynthesis) {
      return handoffSynthesis;
    }

    // Tier 3: Try git log (basic quality)
    const gitSynthesis = await this.tryGitLog();
    if (gitSynthesis) {
      return gitSynthesis;
    }

    // Tier 4: Git status only (minimal quality)
    return this.gitStatusFallback();
  }

  /**
   * Tier 1: Synthesize from session log (rich quality)
   */
  private async trySessionLog(): Promise<SynthesisOutput | null> {
    try {
      const hasLog = await SessionLogManager.hasSessionLog(this.sessionDir);
      if (!hasLog) {
        return null;
      }

      const logContent = await SessionLogManager.loadSessionLog(this.sessionDir);
      const metadata = SessionLogManager.parseMetadata(logContent);

      if (!metadata) {
        return null;
      }

      // Extract all entries
      const timeline = SessionLogManager.extractEntries(logContent, 'Timeline');
      const decisions = SessionLogManager.extractEntries(logContent, 'Key Decisions');
      const insights = SessionLogManager.extractEntries(logContent, 'Insights');
      const gitOps = SessionLogManager.extractEntries(logContent, 'Git Operations');
      const achievements = SessionLogManager.extractEntries(logContent, 'Achievements');

      // Analyze work performed
      const workPerformed = this.analyzeWorkPerformed(timeline, achievements);

      // Extract discoveries
      const discoveries: Discoveries = {
        decisions,
        insights,
        gotchas: insights
          .filter(i => i.description.toLowerCase().includes('gotcha') ||
                      i.description.toLowerCase().includes('watch out') ||
                      i.description.toLowerCase().includes('careful'))
          .map(i => i.description)
      };

      // Load sprint context
      const sprintContext = await this.loadSprintContext();

      // Assess flow state
      const flowState = this.assessFlowState(metadata.started, timeline, achievements);

      // Generate resume point
      const resumePoint = this.generateResumePoint(timeline, workPerformed, sprintContext);

      // Check for warnings
      const warnings = await this.checkWarnings(logContent);

      return {
        qualityTier: 'rich',
        workPerformed,
        discoveries,
        sprintContext,
        flowState,
        resumePoint,
        warnings
      };

    } catch (error) {
      console.error('Failed to synthesize from session log:', error);
      return null;
    }
  }

  /**
   * Tier 2: Synthesize from handoff file (medium quality)
   */
  private async tryHandoff(): Promise<SynthesisOutput | null> {
    try {
      const currentPath = path.join(this.sessionDir, 'current.md');

      try {
        await fs.access(currentPath);
      } catch {
        // Check archive
        const archiveDir = path.join(this.sessionDir, 'archive');
        const files = await fs.readdir(archiveDir);
        const handoffs = files
          .filter(f => f.endsWith('-handoff.md'))
          .sort()
          .reverse();

        if (handoffs.length === 0) {
          return null;
        }
      }

      const handoffContent = await fs.readFile(currentPath, 'utf-8');

      // Parse handoff for context (simplified)
      const workPerformed: WorkContext = {
        completed: this.extractSection(handoffContent, 'Completed') || [],
        inProgress: this.extractSection(handoffContent, 'In Progress') || [],
        blocked: []
      };

      const sprintContext = await this.loadSprintContext();
      const flowState = this.assessFlowStateFromHandoff(handoffContent);
      const resumePoint = this.generateResumePointFromHandoff(handoffContent);

      return {
        qualityTier: 'medium',
        workPerformed,
        discoveries: { decisions: [], insights: [], gotchas: [] },
        sprintContext,
        flowState,
        resumePoint,
        warnings: ['Using handoff file - session log not found']
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Tier 3: Synthesize from git log (basic quality)
   */
  private async tryGitLog(): Promise<SynthesisOutput | null> {
    try {
      const log = await this.git.log({ maxCount: 10 });

      const workPerformed: WorkContext = {
        completed: log.all.map(commit => commit.message.split('\n')[0]),
        inProgress: [],
        blocked: []
      };

      const sprintContext = await this.loadSprintContext();
      const flowState: FlowState = {
        score: 5,
        energy: 'Mid-stride',
        emotionalTone: 'Continuing previous work from git history',
        indicators: { positive: ['Recent commits found'], negative: ['No session log or handoff'] },
        timeContext: this.formatTimeAgo(new Date(log.latest?.date || ''))
      };

      const resumePoint: ResumePoint = {
        summary: `Last commit: ${log.latest?.message.split('\n')[0] || 'Unknown'}`,
        nextAction: 'Review recent changes and continue',
        suggestedCommand: 'git log -5 --oneline',
        contextFiles: []
      };

      return {
        qualityTier: 'basic',
        workPerformed,
        discoveries: { decisions: [], insights: [], gotchas: [] },
        sprintContext,
        flowState,
        resumePoint,
        warnings: ['No session log or handoff - using git history only']
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Tier 4: Git status only (minimal quality)
   */
  private async gitStatusFallback(): Promise<SynthesisOutput> {
    const status = await this.git.status();

    const workPerformed: WorkContext = {
      completed: [],
      inProgress: status.modified.concat(status.created),
      blocked: []
    };

    const flowState: FlowState = {
      score: 3,
      energy: 'Fresh start',
      emotionalTone: 'Starting with minimal context',
      indicators: {
        positive: status.files.length > 0 ? ['Uncommitted work found'] : [],
        negative: ['No session history available']
      },
      timeContext: 'Unknown'
    };

    const resumePoint: ResumePoint = {
      summary: 'Starting session with minimal context',
      nextAction: 'Review uncommitted changes',
      suggestedCommand: 'git status',
      contextFiles: []
    };

    return {
      qualityTier: 'minimal',
      workPerformed,
      discoveries: { decisions: [], insights: [], gotchas: [] },
      sprintContext: await this.loadSprintContext(),
      flowState,
      resumePoint,
      warnings: ['Minimal context - no session log, handoff, or git history found']
    };
  }

  /**
   * Analyze work performed from timeline entries
   */
  private analyzeWorkPerformed(timeline: LogEntry[], achievements: LogEntry[]): WorkContext {
    const completed: string[] = [];
    const inProgress: string[] = [];
    const blocked: string[] = [];

    // Extract completed items from achievements
    for (const achievement of achievements) {
      completed.push(achievement.description);
    }

    // Extract in-progress from recent timeline entries
    const recentEntries = timeline.slice(-5);
    for (const entry of recentEntries) {
      if (entry.category === 'feature' || entry.category === 'fix') {
        if (!achievements.find(a => a.description.includes(entry.description))) {
          inProgress.push(entry.description);
        }
      }
    }

    // Extract blocked items (look for keywords)
    for (const entry of timeline) {
      if (entry.description.toLowerCase().includes('blocked') ||
          entry.description.toLowerCase().includes('waiting') ||
          entry.description.toLowerCase().includes('stuck')) {
        blocked.push(entry.description);
      }
    }

    return { completed, inProgress, blocked };
  }

  /**
   * Load sprint context from docs/sprints/
   */
  private async loadSprintContext(): Promise<SprintContext | null> {
    try {
      const sprintsDir = path.join(this.projectRoot, 'docs', 'sprints');
      const currentSprintPath = path.join(sprintsDir, 'CURRENT-SPRINT.md');

      // Check if CURRENT-SPRINT.md exists
      try {
        await fs.access(currentSprintPath);
        const content = await fs.readFile(currentSprintPath, 'utf-8');

        // CURRENT-SPRINT.md has all readiness info (WHY, WHAT, HOW, status)
        // No need to read full sprint file - parse CURRENT-SPRINT.md directly
        return this.parseSprintContent(content);
      } catch {
        // No CURRENT-SPRINT.md, look for most recent sprint
        const files = await fs.readdir(sprintsDir);
        const sprints = files.filter(f => f.startsWith('SPRINT-') && f.endsWith('.md'));

        if (sprints.length > 0) {
          const latest = sprints.sort().reverse()[0];
          const sprintContent = await fs.readFile(path.join(sprintsDir, latest), 'utf-8');
          return this.parseSprintContent(sprintContent);
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse sprint markdown content
   */
  private parseSprintContent(content: string): SprintContext | null {
    // Extract goal from "Sprint Goal" or "Overview" sections
    const goalMatch = content.match(/##\s+Sprint Goal[\s\S]*?\n\n([^\n]+)/i) ||
                      content.match(/##\s+Overview[\s\S]*?Goal:\s*(.+)/i) ||
                      content.match(/##\s+Success Criteria[\s\S]*?-\s+\[.\]\s+(.+)/i);

    const goal = goalMatch ? goalMatch[1].trim() : 'Continue sprint work';

    // Count completed vs total tasks (support both [x] and ✅ styles)
    const taskMatches = content.match(/- \[.\]/g);
    const completedMatches = content.match(/- \[x\]/gi);
    const emojiCompletedMatches = content.match(/- ✅/g);

    const total = taskMatches?.length || 0;
    const completed = (completedMatches?.length || 0) + (emojiCompletedMatches?.length || 0);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      goal,
      progress,
      tasksCompleted: [], // Could parse from markdown
      tasksRemaining: [], // Could parse from markdown
      estimatedCompletion: progress > 75 ? 'Nearly complete' : 'In progress'
    };
  }

  /**
   * Assess flow state from session log metadata and entries
   */
  private assessFlowState(startedAt: string, timeline: LogEntry[], achievements: LogEntry[]): FlowState {
    // Use the most recent activity time, not session start time
    const lastActivity = timeline.length > 0
      ? new Date(timeline[timeline.length - 1].timestamp)
      : new Date(startedAt);

    const now = new Date();
    const hoursAgo = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    // Calculate score (1-10)
    let score = 7; // Default mid-high score

    // Positive indicators
    const positive: string[] = [];
    const negative: string[] = [];

    if (achievements.length > 0) {
      score += 1;
      positive.push('Recent achievements');
    }

    if (timeline.length > 5) {
      score += 1;
      positive.push('Active session with multiple events');
    }

    // Time-based adjustments
    let energy: string;
    let emotionalTone: string;

    if (hoursAgo < 1) {
      energy = 'Mid-stride';
      emotionalTone = 'You were just working on this - momentum is hot';
      positive.push('Recent activity');
    } else if (hoursAgo < 8) {
      energy = 'Fresh return';
      emotionalTone = 'Back after a break - context still warm';
      score -= 1;
    } else if (hoursAgo < 48) {
      energy = 'Needs warmup';
      emotionalTone = 'Day or two away - needs context refresh';
      score -= 2;
      negative.push('Been away for a while');
    } else {
      energy = 'Fresh start';
      emotionalTone = 'Extended break - treat as fresh start';
      score -= 3;
      negative.push('Long gap since last session');
    }

    // Clamp score
    score = Math.max(1, Math.min(10, score));

    return {
      score,
      energy,
      emotionalTone,
      indicators: { positive, negative },
      timeContext: this.formatTimeAgo(lastActivity)
    };
  }

  /**
   * Generate resume point from timeline and work context
   */
  private generateResumePoint(
    timeline: LogEntry[],
    workPerformed: WorkContext,
    sprintContext: SprintContext | null
  ): ResumePoint {
    // Get most recent entry
    const latest = timeline[timeline.length - 1];

    if (!latest) {
      return {
        summary: 'No recent work logged',
        nextAction: 'Review sprint goals and begin work',
        suggestedCommand: 'git status',
        contextFiles: []
      };
    }

    // Generate summary
    let summary = latest.description;
    if (latest.files && latest.files.length > 0) {
      summary += ` (${latest.files[0]})`;
    }

    // Determine next action based on latest entry
    let nextAction: string;
    let suggestedCommand: string;

    if (latest.category === 'achievement') {
      nextAction = sprintContext
        ? `Begin next task: ${sprintContext.goal}`
        : 'Review backlog for next task';
      suggestedCommand = 'ginko backlog list --status=proposed';
    } else if (latest.category === 'fix') {
      nextAction = 'Verify fix and run tests';
      suggestedCommand = 'npm test';
    } else if (latest.category === 'feature') {
      nextAction = 'Continue implementing feature';
      suggestedCommand = latest.files?.[0]
        ? `code ${latest.files[0]}`
        : 'git status';
    } else {
      nextAction = 'Continue where you left off';
      suggestedCommand = 'git status';
    }

    const contextFiles = latest.files || [];

    return {
      summary,
      nextAction,
      suggestedCommand,
      contextFiles
    };
  }

  /**
   * Check for warnings based on session state
   */
  private async checkWarnings(logContent: string): Promise<string[]> {
    const warnings: string[] = [];

    // Check for blocked items
    if (logContent.toLowerCase().includes('blocked')) {
      warnings.push('Session has blocked items - may need assistance');
    }

    // Check for failed tests
    if (logContent.toLowerCase().includes('test fail') ||
        logContent.toLowerCase().includes('tests fail')) {
      warnings.push('Tests were failing in last session');
    }

    // Check for uncommitted work
    const status = await this.git.status();
    if (status.files.length > 5) {
      warnings.push(`${status.files.length} uncommitted files - consider committing`);
    }

    return warnings;
  }

  /**
   * Helper: Format time ago
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
  }

  /**
   * Helper: Extract section from handoff markdown
   */
  private extractSection(content: string, sectionName: string): string[] | null {
    const regex = new RegExp(`##\\s+${sectionName}[\\s\\S]*?([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = content.match(regex);

    if (!match) return null;

    const items = match[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim());

    return items.length > 0 ? items : null;
  }

  /**
   * Helper: Assess flow state from handoff
   */
  private assessFlowStateFromHandoff(content: string): FlowState {
    // Simplified flow assessment
    return {
      score: 6,
      energy: 'Mid-stride',
      emotionalTone: 'Resuming from handoff',
      indicators: {
        positive: ['Handoff found'],
        negative: ['Session log not available']
      },
      timeContext: 'Unknown'
    };
  }

  /**
   * Helper: Generate resume point from handoff
   */
  private generateResumePointFromHandoff(content: string): ResumePoint {
    const nextMatch = content.match(/Next Session[:\s]+(.+)/i);

    return {
      summary: 'Resuming from handoff',
      nextAction: nextMatch ? nextMatch[1].trim() : 'Continue previous work',
      suggestedCommand: 'git status',
      contextFiles: []
    };
  }
}
