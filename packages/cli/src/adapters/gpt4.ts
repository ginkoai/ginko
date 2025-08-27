/**
 * @fileType: adapter
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, adapter, gpt4, json]
 * @priority: high
 * @complexity: low
 */

import { AIAdapter, SessionInfo, HandoffInfo } from './base.js';

export class GPT4Adapter extends AIAdapter {
  /**
   * GPT-4 prefers structured JSON for function calling
   */
  formatSessionStart(info: SessionInfo): string {
    const response = {
      status: 'session_started',
      session: {
        id: info.sessionId,
        mode: info.mode,
        branch: info.branch,
        resumed: !!info.lastUpdated,
        last_updated: info.lastUpdated?.toISOString() || null,
        summary: info.summary || null
      },
      actions: {
        save_progress: 'ginko handoff [message]',
        check_status: 'ginko status',
        manage_context: 'ginko context'
      },
      privacy: {
        data_location: 'local',
        analytics: false,
        network_required: false
      }
    };
    
    if (this.options.format === 'json') {
      return JSON.stringify(response, null, 2);
    }
    
    // Fallback to structured text
    return [
      `Session: ${info.sessionId}`,
      `Mode: ${info.mode}`,
      `Branch: ${info.branch}`,
      info.summary ? `Task: ${info.summary}` : '',
      'Privacy: local-only'
    ].filter(Boolean).join('\n');
  }
  
  formatHandoffCreated(info: HandoffInfo): string {
    const response = {
      status: 'handoff_created',
      handoff: {
        mode: info.mode,
        files_modified: info.filesModified,
        next_steps: info.nextSteps,
        location: '.ginko/sessions/current.md'
      },
      privacy: {
        stored_locally: true,
        sent_to_server: false
      }
    };
    
    if (this.options.format === 'json') {
      return JSON.stringify(response, null, 2);
    }
    
    return [
      'Handoff created',
      `Mode: ${info.mode}`,
      `Files: ${info.filesModified}`,
      'Location: .ginko/sessions/'
    ].join('\n');
  }
  
  formatStatus(status: any): string {
    const response = {
      project: status.project,
      session: status.session,
      git: status.git,
      privacy: status.privacy,
      commands: {
        start: 'ginko start',
        handoff: 'ginko handoff',
        status: 'ginko status'
      }
    };
    
    if (this.options.format === 'json') {
      return JSON.stringify(response, null, 2);
    }
    
    return [
      `Project: ${status.project.name}`,
      `Session: ${status.session.active ? 'active' : 'none'}`,
      `Git: ${status.git.branch} (${status.git.modified} modified)`,
      `Privacy: ${status.privacy.analytics ? 'analytics on' : 'all local'}`
    ].join('\n');
  }
  
  formatError(error: Error): string {
    if (this.options.format === 'json') {
      return JSON.stringify({
        error: true,
        message: error.message,
        type: error.name
      }, null, 2);
    }
    
    return `ERROR: ${error.message}`;
  }
  
  formatSuccess(message: string): string {
    if (this.options.format === 'json') {
      return JSON.stringify({
        success: true,
        message: message
      }, null, 2);
    }
    
    return `SUCCESS: ${message}`;
  }
}