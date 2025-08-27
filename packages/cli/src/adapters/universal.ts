/**
 * @fileType: adapter
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, adapter, universal, fallback]
 * @priority: medium
 * @complexity: low
 */

import { AIAdapter, SessionInfo, HandoffInfo } from './base.js';

export class UniversalAdapter extends AIAdapter {
  /**
   * Universal adapter with simple, clear output
   */
  formatSessionStart(info: SessionInfo): string {
    const lines: string[] = [];
    
    if (info.lastUpdated) {
      lines.push('SESSION RESUMED');
      lines.push(`ID: ${info.sessionId}`);
      lines.push(`Mode: ${info.mode}`);
      lines.push(`Branch: ${info.branch}`);
      if (info.summary) {
        lines.push(`Task: ${info.summary}`);
      }
    } else {
      lines.push('NEW SESSION');
      lines.push(`ID: ${info.sessionId}`);
    }
    
    lines.push('');
    lines.push('Commands: start, handoff, status, context, config');
    lines.push('Privacy: local-only (no data sent)');
    
    return lines.join('\n');
  }
  
  formatHandoffCreated(info: HandoffInfo): string {
    const lines: string[] = [
      'HANDOFF SAVED',
      `Mode: ${info.mode}`,
      `Files: ${info.filesModified}`,
      `Location: .ginko/sessions/`
    ];
    
    if (info.nextSteps.length > 0) {
      lines.push('');
      lines.push('Next:');
      info.nextSteps.slice(0, 3).forEach(step => {
        lines.push(`- ${step}`);
      });
    }
    
    return lines.join('\n');
  }
  
  formatStatus(status: any): string {
    const lines: string[] = [
      'GINKO STATUS',
      '',
      'Project:',
      `  Name: ${status.project.name}`,
      `  Type: ${status.project.type}`,
      '',
      'Session:',
      `  Active: ${status.session.active ? 'yes' : 'no'}`
    ];
    
    if (status.session.active) {
      lines.push(`  Mode: ${status.session.mode}`);
    }
    
    lines.push('');
    lines.push('Git:');
    lines.push(`  Branch: ${status.git.branch}`);
    lines.push(`  Modified: ${status.git.modified}`);
    
    lines.push('');
    lines.push('Privacy:');
    lines.push(`  Analytics: ${status.privacy.analytics ? 'on' : 'off'}`);
    
    return lines.join('\n');
  }
  
  formatError(error: Error): string {
    return `ERROR: ${error.message}`;
  }
  
  formatSuccess(message: string): string {
    return `SUCCESS: ${message}`;
  }
}