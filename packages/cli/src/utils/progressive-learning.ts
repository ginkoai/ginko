/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-28
 * @tags: [learning, hints, ux, flow-state]
 * @related: [helpers.ts, init.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, chalk]
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getGinkoPath } from './ginko-root.js';

interface UserProgress {
  commandsUsed: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  hintsShown: string[];
  preferences: {
    showHints: boolean;
    verbosity: 'minimal' | 'normal' | 'verbose';
  };
}

interface Hint {
  id: string;
  trigger: HintTrigger;
  message: string;
  priority: 'low' | 'medium' | 'high';
  showOnce: boolean;
  dependencies?: string[]; // Other hints that should be shown first
}

interface HintTrigger {
  type: 'command' | 'state' | 'time' | 'error';
  condition: (context: HintContext) => boolean;
}

interface HintContext {
  command?: string;
  args?: string[];
  gitStatus?: any;
  sessionAge?: number;
  lastCommand?: string;
  errorType?: string;
  fileCount?: number;
}

export class ProgressiveLearning {
  private static hints: Hint[] = [
    // Beginner hints
    {
      id: 'first-handoff',
      trigger: {
        type: 'state',
        condition: (ctx) => ctx.sessionAge !== undefined && ctx.sessionAge > 30,
      },
      message: chalk.dim('💡 Tip: Use ') + chalk.cyan('ginko handoff') + chalk.dim(' to save your progress'),
      priority: 'high',
      showOnce: true,
    },
    {
      id: 'vibecheck-suggestion',
      trigger: {
        type: 'error',
        condition: (ctx) => ctx.errorType === 'confusion' || ctx.command === 'status',
      },
      message: chalk.dim('💡 Feeling stuck? Try ') + chalk.cyan('ginko vibecheck') + chalk.dim(' for a quick recalibration'),
      priority: 'medium',
      showOnce: true,
    },
    {
      id: 'capture-learning',
      trigger: {
        type: 'command',
        condition: (ctx) => ctx.command === 'handoff' && Math.random() > 0.7,
      },
      message: chalk.dim('💡 Discovered something? Use ') + chalk.cyan('ginko capture') + chalk.dim(' to save learnings'),
      priority: 'low',
      showOnce: true,
    },
    {
      id: 'ship-ready',
      trigger: {
        type: 'state',
        condition: (ctx) => ctx.gitStatus && ctx.gitStatus.staged?.length > 3,
      },
      message: chalk.dim('💡 Ready to ship? ') + chalk.cyan('ginko ship') + chalk.dim(' creates PR-ready branches'),
      priority: 'medium',
      showOnce: true,
    },
    {
      id: 'compact-suggestion',
      trigger: {
        type: 'state',
        condition: (ctx) => ctx.fileCount !== undefined && ctx.fileCount > 20,
      },
      message: chalk.dim('💡 Context growing large? Use ') + chalk.cyan('ginko compact') + chalk.dim(' to clean up'),
      priority: 'low',
      showOnce: true,
    },
    // Advanced hints
    {
      id: 'explore-mode',
      trigger: {
        type: 'command',
        condition: (ctx) => ctx.command === 'start' && Math.random() > 0.8,
      },
      message: chalk.dim('🚀 Try ') + chalk.cyan('ginko explore') + chalk.dim(' for collaborative problem-solving'),
      priority: 'low',
      showOnce: true,
      dependencies: ['first-handoff'],
    },
    {
      id: 'architecture-mode',
      trigger: {
        type: 'command',
        condition: (ctx) => ctx.command === 'explore',
      },
      message: chalk.dim('🏗️  For technical decisions, use ') + chalk.cyan('ginko architecture') + chalk.dim(' to create ADRs'),
      priority: 'low',
      showOnce: true,
      dependencies: ['explore-mode'],
    },
    {
      id: 'plan-sprints',
      trigger: {
        type: 'command',
        condition: (ctx) => ctx.command === 'architecture',
      },
      message: chalk.dim('📅 Plan implementation with ') + chalk.cyan('ginko plan') + chalk.dim(' for sprint planning'),
      priority: 'low',
      showOnce: true,
      dependencies: ['architecture-mode'],
    },
  ];

  static async getUserProgress(): Promise<UserProgress> {
    try {
      const progressPath = await getGinkoPath('user-progress.json');
      
      if (await fs.pathExists(progressPath)) {
        return await fs.readJSON(progressPath);
      }
    } catch (error) {
      // Fall through to create new progress
    }
    
    // Create new progress
    return {
      commandsUsed: {},
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      totalSessions: 0,
      hintsShown: [],
      preferences: {
        showHints: true,
        verbosity: 'normal',
      },
    };
  }

  static async updateProgress(command: string, args?: string[]): Promise<void> {
    try {
      const progress = await this.getUserProgress();
      
      // Update command usage
      progress.commandsUsed[command] = (progress.commandsUsed[command] || 0) + 1;
      progress.lastSeen = new Date().toISOString();
      
      if (command === 'start') {
        progress.totalSessions++;
      }
      
      // Save progress
      const progressPath = await getGinkoPath('user-progress.json');
      await fs.writeJSON(progressPath, progress, { spaces: 2 });
    } catch (error) {
      // Silently fail - don't interrupt user flow
    }
  }

  static async getContextualHint(context: HintContext): Promise<string | null> {
    try {
      const progress = await this.getUserProgress();
      
      if (!progress.preferences.showHints) {
        return null;
      }
      
      // Find applicable hints
      const applicableHints = this.hints.filter(hint => {
        // Check if already shown (for showOnce hints)
        if (hint.showOnce && progress.hintsShown.includes(hint.id)) {
          return false;
        }
        
        // Check dependencies
        if (hint.dependencies) {
          const allDepsShown = hint.dependencies.every(dep => 
            progress.hintsShown.includes(dep)
          );
          if (!allDepsShown) {
            return false;
          }
        }
        
        // Check trigger condition
        return hint.trigger.condition(context);
      });
      
      if (applicableHints.length === 0) {
        return null;
      }
      
      // Sort by priority and pick the highest
      const sortedHints = applicableHints.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      const selectedHint = sortedHints[0];
      
      // Mark as shown
      if (selectedHint.showOnce) {
        progress.hintsShown.push(selectedHint.id);
        const progressPath = await getGinkoPath('user-progress.json');
        await fs.writeJSON(progressPath, progress, { spaces: 2 });
      }
      
      return selectedHint.message;
    } catch (error) {
      // Silently fail - don't interrupt user flow
      return null;
    }
  }

  static async showHint(context: HintContext): Promise<void> {
    const hint = await this.getContextualHint(context);
    
    if (hint) {
      // Add subtle delay to preserve flow
      setTimeout(() => {
        console.log('\n' + hint);
      }, 100);
    }
  }

  static getExperienceLevel(progress: UserProgress): 'beginner' | 'intermediate' | 'advanced' {
    const totalCommands = Object.values(progress.commandsUsed).reduce((a, b) => a + b, 0);
    const uniqueCommands = Object.keys(progress.commandsUsed).length;
    
    if (totalCommands < 10 || uniqueCommands < 3) {
      return 'beginner';
    } else if (totalCommands < 50 || uniqueCommands < 7) {
      return 'intermediate';
    } else {
      return 'advanced';
    }
  }

  static async getSmartSuggestions(gitStatus?: any): Promise<string[]> {
    const suggestions: string[] = [];
    const progress = await this.getUserProgress();
    const level = this.getExperienceLevel(progress);
    
    // Beginner suggestions
    if (level === 'beginner') {
      if (!progress.commandsUsed['handoff']) {
        suggestions.push('Try `ginko handoff` to save your progress');
      }
      if (!progress.commandsUsed['vibecheck']) {
        suggestions.push('Use `ginko vibecheck` when you need to recalibrate');
      }
    }
    
    // Intermediate suggestions
    if (level === 'intermediate') {
      if (!progress.commandsUsed['capture']) {
        suggestions.push('Capture learnings with `ginko capture`');
      }
      if (!progress.commandsUsed['explore']) {
        suggestions.push('Explore problems collaboratively with `ginko explore`');
      }
    }
    
    // Context-based suggestions
    if (gitStatus) {
      if (gitStatus.modified?.length > 5) {
        suggestions.push('Consider creating a handoff for this work');
      }
      if (gitStatus.staged?.length > 0) {
        suggestions.push('Ready to ship? Use `ginko ship` for PR creation');
      }
    }
    
    return suggestions.slice(0, 2); // Limit to 2 suggestions
  }

  static formatSuggestions(suggestions: string[]): string {
    if (suggestions.length === 0) return '';
    
    return '\n' + chalk.dim('💭 Suggestions:\n') + 
           suggestions.map(s => chalk.dim('  • ') + s).join('\n');
  }
}