/**
 * @fileType: adapter
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, adapter, claude, markdown]
 * @priority: high
 * @complexity: low
 */

import { AIAdapter, SessionInfo, HandoffInfo } from './base.js';
import chalk from 'chalk';

export class ClaudeAdapter extends AIAdapter {
  /**
   * Claude prefers narrative markdown with colors and emojis
   */
  formatSessionStart(info: SessionInfo): string {
    const output: string[] = [];
    
    if (info.lastUpdated) {
      output.push(this.format(`${this.emoji('✨')}Welcome back!`, 'success'));
      output.push(this.format(`${this.emoji('📅')}Last session: ${this.formatTime(info.lastUpdated)}`, 'info'));
      output.push(this.format(`${this.emoji('🌿')}Branch: ${info.branch}`, 'info'));
      output.push(this.format(`${this.emoji('📝')}Mode: ${info.mode}`, 'info'));
      
      if (info.summary) {
        output.push('');
        output.push(this.format(`${this.emoji('🎯')}Continue with: ${info.summary}`, 'warning'));
      }
    } else {
      output.push(this.format(`${this.emoji('🌱')}Starting fresh session`, 'success'));
      output.push(chalk.dim('No previous handoff found'));
    }
    
    output.push('');
    output.push(chalk.dim(`${this.emoji('🔐')}Privacy: All data stored locally in git`));
    output.push(chalk.dim(`${this.emoji('💡')}Tip: Run \`ginko handoff\` to save progress`));
    
    return output.join('\n');
  }
  
  formatHandoffCreated(info: HandoffInfo): string {
    const output: string[] = [];
    
    output.push(this.format(`${this.emoji('✅')}Session saved`, 'success'));
    output.push(this.format(`${this.emoji('📁')}Location: .ginko/sessions/`, 'info'));
    output.push(chalk.dim(`${this.emoji('🎯')}Mode detected: ${info.mode}`));
    output.push(chalk.dim(`${this.emoji('📝')}Files modified: ${info.filesModified}`));
    
    if (info.nextSteps.length > 0) {
      output.push('');
      output.push(this.format('Next steps:', 'info'));
      info.nextSteps.slice(0, 3).forEach(step => {
        output.push(chalk.dim(`  - ${step}`));
      });
    }
    
    output.push('');
    output.push(chalk.dim(`${this.emoji('🔐')}Privacy: All data stored locally`));
    
    return output.join('\n');
  }
  
  formatStatus(status: any): string {
    const output: string[] = [];
    
    output.push(this.format(`\n${this.emoji('🌿')}Ginko Status\n`, 'success'));
    
    // Project info
    output.push(this.format(`${this.emoji('📦')}Project`, 'info'));
    output.push(`  Name: ${status.project.name}`);
    output.push(`  Type: ${status.project.type}`);
    output.push(`  User: ${status.user}`);
    
    // Session info
    output.push('');
    output.push(this.format(`${this.emoji('📝')}Session`, 'info'));
    if (status.session.active) {
      output.push(`  Status: Active`);
      output.push(`  Mode: ${status.session.mode}`);
      output.push(`  Last saved: ${status.session.lastSaved}`);
    } else {
      output.push(`  Status: No active session`);
      output.push(chalk.dim(`  Run 'ginko start' to begin`));
    }
    
    // Git info
    output.push('');
    output.push(this.format(`${this.emoji('🌳')}Git`, 'info'));
    output.push(`  Branch: ${status.git.branch}`);
    output.push(`  Modified: ${status.git.modified} files`);
    
    // Privacy info
    output.push('');
    output.push(this.format(`${this.emoji('🔐')}Privacy`, 'info'));
    output.push(`  Analytics: ${status.privacy.analytics ? chalk.yellow('Enabled (anonymous)') : chalk.green('Disabled')}`);
    
    return output.join('\n');
  }
  
  formatError(error: Error): string {
    return `${this.emoji('❌')}${this.format(`Error: ${error.message}`, 'error')}`;
  }
  
  formatSuccess(message: string): string {
    return `${this.emoji('✅')}${this.format(message, 'success')}`;
  }
}