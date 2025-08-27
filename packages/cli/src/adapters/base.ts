/**
 * @fileType: model
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, adapters, base-class]
 * @priority: high
 * @complexity: medium
 */

import chalk from 'chalk';

export interface OutputOptions {
  format: 'markdown' | 'json' | 'xml' | 'minimal' | 'text';
  colors: boolean;
  emojis: boolean;
  verbosity: 'minimal' | 'normal' | 'verbose' | 'structured' | 'compressed';
}

export interface SessionInfo {
  sessionId: string;
  mode: string;
  branch: string;
  lastUpdated: Date;
  summary: string;
}

export interface HandoffInfo {
  content: string;
  mode: string;
  filesModified: number;
  nextSteps: string[];
}

export abstract class AIAdapter {
  protected options: OutputOptions;
  
  constructor(options: OutputOptions) {
    this.options = options;
  }
  
  /**
   * Format session start message
   */
  abstract formatSessionStart(info: SessionInfo): string;
  
  /**
   * Format handoff creation message
   */
  abstract formatHandoffCreated(info: HandoffInfo): string;
  
  /**
   * Format status display
   */
  abstract formatStatus(status: any): string;
  
  /**
   * Format error messages
   */
  abstract formatError(error: Error): string;
  
  /**
   * Format success messages
   */
  abstract formatSuccess(message: string): string;
  
  /**
   * Apply formatting (colors, emojis) if enabled
   */
  protected format(text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): string {
    if (!this.options.colors) return text;
    
    switch (type) {
      case 'success':
        return chalk.green(text);
      case 'error':
        return chalk.red(text);
      case 'warning':
        return chalk.yellow(text);
      default:
        return chalk.cyan(text);
    }
  }
  
  /**
   * Add emoji if enabled
   */
  protected emoji(emoji: string): string {
    return this.options.emojis ? emoji + ' ' : '';
  }
  
  /**
   * Format timestamp
   */
  protected formatTime(date: Date): string {
    if (this.options.verbosity === 'minimal') {
      return date.toISOString().split('T')[0];
    }
    return date.toLocaleString();
  }
}