/**
 * @fileType: component
 * @status: current
 * @updated: 2025-08-15
 * @tags: [sdk, agents, session, handoff, continuity]
 * @related: [base-agent.ts, types.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [@anthropic-ai/claude-code, base-agent]
 */

import { BaseAgent } from './base-agent.js';
import { 
  AgentType, 
  AgentConfig, 
  AgentInput, 
  AgentOutput,
  SessionHandoff,
  RapportContext 
} from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class SessionAgent extends BaseAgent {
  private handoffData?: SessionHandoff;
  private autoHandoffEnabled: boolean = true;
  private handoffInterval?: NodeJS.Timeout;
  private statuslineInterval?: NodeJS.Timeout;
  private lastStatuslineUpdate: number = 0;
  private sessionStartTime: number = Date.now();

  constructor(config: AgentConfig) {
    super(AgentType.SESSION, config);
    this.startAutoHandoff();
    this.startStatuslineUpdates();
  }

  /**
   * Resume from a previous session handoff
   */
  async resumeFromHandoff(sessionId: string): Promise<void> {
    try {
      console.log(`[SessionAgent] Resuming from session: ${sessionId}`);
      
      // Load handoff from MCP server
      const handoffResponse = await this.callMCPTool('load_handoff', {
        sessionId
      });
      
      if (!handoffResponse.success) {
        throw new Error('Failed to load handoff');
      }
      
      this.handoffData = handoffResponse.handoff;
      this.sessionId = sessionId;
      
      // Reconstruct context
      this.memory = this.handoffData?.conversationMemory || this.memory;
      
      // Build system prompt with context
      this.systemPrompt = this.buildSystemPrompt();
      
      console.log('[SessionAgent] Successfully resumed session with context:');
      console.log(`- Current task: ${this.handoffData?.currentTask || 'None'}`);
      console.log(`- Completed: ${this.handoffData?.completedTasks?.length || 0} tasks`);
      console.log(`- Pending: ${this.handoffData?.pendingTasks?.length || 0} tasks`);
      
      // Provide user-facing continuity message
      this.notifySessionContinuity();
      
    } catch (error) {
      console.error('[SessionAgent] Failed to resume from handoff:', error);
      throw error;
    }
  }

  /**
   * Generate handoff for current session
   */
  async generateHandoff(): Promise<SessionHandoff> {
    const handoff: SessionHandoff = {
      sessionId: this.sessionId || this.generateSessionId(),
      timestamp: new Date(),
      currentTask: await this.getCurrentTask(),
      completedTasks: await this.getCompletedTasks(),
      pendingTasks: await this.getPendingTasks(),
      filesModified: await this.getModifiedFiles(),
      decisions: this.memory.decisions,
      conversationMemory: this.memory,
      metrics: this.metrics,
      rapportContext: await this.generateRapportContext()
    };
    
    // Store handoff via MCP
    await this.callMCPTool('store_handoff', {
      handoffContent: this.formatHandoffContent(handoff)
    });
    
    console.log('[SessionAgent] Handoff generated and stored');
    return handoff;
  }

  /**
   * Build system prompt with session context
   */
  buildSystemPrompt(): string {
    if (!this.handoffData) {
      return `You are a collaborative AI assistant helping with development tasks.
        Focus on maintaining context and continuity across sessions.`;
    }
    
    return `You are resuming a development session with the following context:
      
      Previous Tasks Completed:
      ${this.handoffData.completedTasks.map(t => `- ${t}`).join('\n')}
      
      Current Task: ${this.handoffData.currentTask}
      
      Pending Tasks:
      ${this.handoffData.pendingTasks.map(t => `- ${t}`).join('\n')}
      
      Files Modified in Previous Session:
      ${this.handoffData.filesModified.map(f => `- ${f}`).join('\n')}
      
      Key Decisions Made:
      ${this.handoffData.decisions.map(d => `- ${d}`).join('\n')}
      
      Continue where the previous session left off, maintaining the same
      working style and momentum. Reference previous work naturally.`;
  }

  /**
   * Execute session management tasks
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    
    try {
      switch (input.type) {
        case 'resume':
          await this.resumeFromHandoff(input.data.sessionId);
          return {
            success: true,
            result: { resumed: true, context: this.handoffData },
            metrics: this.metrics
          };
          
        case 'handoff':
          const handoff = await this.generateHandoff();
          return {
            success: true,
            result: handoff,
            metrics: this.metrics
          };
          
        case 'auto-save':
          await this.autoSave();
          return {
            success: true,
            result: { saved: true },
            metrics: this.metrics
          };
          
        default:
          throw new Error(`Unknown action type: ${input.type}`);
      }
    } catch (error) {
      this.metrics.errorCount++;
      return {
        success: false,
        result: null,
        metrics: this.metrics,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(0, executionTime, true);
    }
  }

  /**
   * Start automatic handoff generation
   */
  private startAutoHandoff(): void {
    if (this.autoHandoffEnabled) {
      // Auto-save every 5 minutes
      this.handoffInterval = setInterval(async () => {
        await this.autoSave();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Auto-save current session state
   */
  private async autoSave(): Promise<void> {
    try {
      console.log('[SessionAgent] Auto-saving session...');
      await this.generateHandoff();
    } catch (error) {
      console.error('[SessionAgent] Auto-save failed:', error);
    }
  }

  private getEmotionalEmoji(tone: string): string {
    switch (tone) {
      case 'excited': return '🚀';
      case 'focused': return '🎯';
      case 'determined': return '💪';
      case 'curious': return '🔍';
      case 'celebratory': return '🎉';
      default: return '✨';
    }
  }
  
  private async generateRapportContext(): Promise<RapportContext | undefined> {
    try {
      const completedCount = (await this.getCompletedTasks()).length;
      const pendingCount = (await this.getPendingTasks()).length;
      const currentTask = await this.getCurrentTask();
      
      // Determine emotional tone based on progress
      let emotionalTone: RapportContext['emotionalTone'] = 'focused';
      let situation: 'challenging' | 'progressing_well' | 'steady_work' = 'steady_work';
      
      if (completedCount >= 3) {
        emotionalTone = 'excited';
        situation = 'progressing_well';
      } else if (this.metrics.errorCount > 2) {
        emotionalTone = 'determined';
        situation = 'challenging';
      } else if (completedCount > 0 && this.metrics.errorCount === 0) {
        emotionalTone = 'celebratory';
        situation = 'progressing_well';
      }
      
      // Generate time-based greeting
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? 'Good morning' : 
                          hour < 17 ? 'Good afternoon' : 
                          'Good evening';
      
      // Build personalized greeting with Chris's name
      const greeting = `${timeGreeting}, Chris!`;
      
      // Generate shared history summary
      let sharedHistory = '';
      if (completedCount >= 3) {
        sharedHistory = `We've made excellent progress together - ${completedCount} tasks completed!`;
      } else if (completedCount > 0) {
        sharedHistory = `We've completed ${completedCount} task${completedCount > 1 ? 's' : ''} and have ${pendingCount} to go.`;
      } else if (currentTask) {
        sharedHistory = `We're working on ${currentTask}.`;
      } else {
        sharedHistory = `Ready to start our session.`;
      }
      
      return {
        personalizedGreeting: greeting,
        sharedHistory: sharedHistory,
        emotionalTone: emotionalTone,
        contextualMood: {
          situation: situation,
          urgency: pendingCount > 5 ? 'high' : pendingCount > 2 ? 'medium' : 'normal'
        }
      };
    } catch (error) {
      console.error('[SessionAgent] Failed to generate rapport context:', error);
      return undefined;
    }
  }

  /**
   * Helper methods for gathering session data
   */
  private async getCurrentTask(): Promise<string> {
    // In real implementation, this would analyze current context
    return this.memory.context.currentTask || 'Continuing development';
  }

  private async getCompletedTasks(): Promise<string[]> {
    // In real implementation, track completed tasks
    return this.memory.context.completedTasks || [];
  }

  private async getPendingTasks(): Promise<string[]> {
    // In real implementation, track pending tasks
    return this.memory.context.pendingTasks || [];
  }

  private async getModifiedFiles(): Promise<string[]> {
    // In real implementation, track file modifications
    return this.memory.context.modifiedFiles || [];
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatHandoffContent(handoff: SessionHandoff): string {
    return `# Session Handoff

**Session ID**: ${handoff.sessionId}
**Timestamp**: ${handoff.timestamp.toISOString()}

## Current Task
${handoff.currentTask}

## Completed Tasks
${handoff.completedTasks.map(t => `- ${t}`).join('\n')}

## Pending Tasks
${handoff.pendingTasks.map(t => `- ${t}`).join('\n')}

## Files Modified
${handoff.filesModified.map(f => `- ${f}`).join('\n')}

## Key Decisions
${handoff.decisions.map(d => `- ${d}`).join('\n')}

## Metrics
- Tokens Used: ${handoff.metrics?.tokensUsed}
- Execution Time: ${handoff.metrics?.executionTime}ms
- Success Rate: ${(handoff.metrics?.successRate ?? 1) * 100}%
`;
  }

  /**
   * Notify user of session continuity
   */
  private notifySessionContinuity(): void {
    if (!this.handoffData) return;
    
    const timeSince = new Date().getTime() - this.handoffData.timestamp.getTime();
    const hoursAgo = Math.floor(timeSince / (1000 * 60 * 60));
    const minutesAgo = Math.floor(timeSince / (1000 * 60));
    
    let continuityMessage: string;
    
    // Use rapport context if available for personalized greeting
    if (this.handoffData.rapportContext) {
      const rapport = this.handoffData.rapportContext;
      const emoji = this.getEmotionalEmoji(rapport.emotionalTone);
      
      continuityMessage = `${rapport.personalizedGreeting}\n\n`;
      continuityMessage += `${rapport.sharedHistory}\n\n`;
      
      // Add accomplishments if we made good progress
      if (this.handoffData.completedTasks.length > 0) {
        continuityMessage += `**What we accomplished:**\n`;
        this.handoffData.completedTasks.slice(-3).forEach(task => {
          continuityMessage += `✅ ${task}\n`;
        });
        continuityMessage += `\n`;
      }
      
      // Add current focus with emotional context
      if (this.handoffData.currentTask) {
        const focusEmoji = rapport.emotionalTone === 'determined' ? '💪' :
                          rapport.emotionalTone === 'excited' ? '🚀' :
                          rapport.emotionalTone === 'celebratory' ? '🎉' : '🎯';
        continuityMessage += `**Our focus now:** ${focusEmoji} ${this.handoffData.currentTask}\n\n`;
      }
      
      // Add contextual mood indicator if challenging
      if (rapport.contextualMood?.situation === 'challenging') {
        continuityMessage += `I see we hit some challenges last time. Let's tackle them together. ${emoji}\n`;
      } else if (rapport.contextualMood?.situation === 'progressing_well') {
        continuityMessage += `We're making great progress! Let's keep the momentum going. ${emoji}\n`;
      }
      
    } else {
      // Fallback to basic session restoration message
      const timePhrase = minutesAgo < 60 ? 'a few minutes ago' : 
                        hoursAgo === 1 ? 'an hour ago' : 
                        hoursAgo < 24 ? `${hoursAgo} hours ago` :
                        'yesterday';
      
      continuityMessage = `🔄 **Session resumed from ${timePhrase}**\n\n`;
      continuityMessage += `**Previous Context Restored:**\n`;
      continuityMessage += `- **Current focus:** ${this.handoffData.currentTask}\n`;
      continuityMessage += `- **Completed:** ${this.handoffData.completedTasks.length} tasks\n`;
      continuityMessage += `- **Pending:** ${this.handoffData.pendingTasks.length} tasks\n`;
      continuityMessage += `- **Files modified:** ${this.handoffData.filesModified.length} files\n\n`;
      continuityMessage += `Ready to continue where we left off! 🚀`;
    }

    // Store message for system to display (this would be handled by the agent runner)
    console.log(continuityMessage);
    this.memory.context.sessionContinuityMessage = continuityMessage;
  }

  /**
   * Start statusline updates with rapport context
   */
  private startStatuslineUpdates(): void {
    // Update statusline immediately on start
    this.updateStatusline();
    
    // Update every 3 seconds
    this.statuslineInterval = setInterval(() => {
      this.updateStatusline();
    }, 3000);
  }

  /**
   * Update statusline with rapport-aware message
   */
  private async updateStatusline(): Promise<void> {
    try {
      const rapportContext = await this.generateRapportContext();
      if (!rapportContext) return;
      
      // Generate appropriate message based on context
      const message = this.generateStatuslineMessage(rapportContext);
      const emoji = this.getEmotionalEmoji(rapportContext.emotionalTone);
      
      // Build status object
      const status = {
        message: message,
        emoji: emoji,
        rapportContext: rapportContext,
        timestamp: Date.now(),
        phase: this.determineCurrentPhase(),
        metrics: {
          tasksCompleted: this.memory.context.completedTasks?.length || 0,
          errorCount: this.metrics.errorCount,
          sessionMinutes: Math.floor((Date.now() - this.sessionStartTime) / 60000)
        }
      };
      
      // Write to temp file for statusline reader
      const statusFile = path.join(os.tmpdir(), 'ginko-status.json');
      await fs.promises.writeFile(statusFile, JSON.stringify(status, null, 2));
      
      this.lastStatuslineUpdate = Date.now();
    } catch (error) {
      // Silent fail - don't disrupt main functionality
      console.debug('[SessionAgent] Statusline update failed:', error);
    }
  }

  /**
   * Generate statusline message based on rapport context
   */
  private generateStatuslineMessage(context: RapportContext): string {
    // For initial greeting
    if (!this.memory.context.completedTasks?.length) {
      return context.personalizedGreeting || 'Session active';
    }
    
    // For ongoing work
    if (context.sharedHistory) {
      return context.sharedHistory;
    }
    
    // Fallback to current task
    const currentTask = this.memory.context.currentTask || 'Working';
    return `${currentTask} (${context.emotionalTone})`;
  }

  /**
   * Determine current work phase
   */
  private determineCurrentPhase(): string {
    if (this.metrics.errorCount > 0 && this.metrics.errorCount > this.memory.context.completedTasks?.length) {
      return 'debugging';
    }
    
    if (this.memory.context.completedTasks?.length > 0 && 
        (Date.now() - this.lastStatuslineUpdate) < 5000) {
      return 'task-complete';
    }
    
    return 'working';
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.handoffInterval) {
      clearInterval(this.handoffInterval);
    }
    
    if (this.statuslineInterval) {
      clearInterval(this.statuslineInterval);
    }
    
    // Clean up status file
    try {
      const statusFile = path.join(os.tmpdir(), 'ginko-status.json');
      fs.unlinkSync(statusFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}