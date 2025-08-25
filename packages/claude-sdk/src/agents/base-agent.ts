/**
 * @fileType: model
 * @status: current
 * @updated: 2025-08-15
 * @tags: [sdk, agents, base-class, architecture]
 * @related: [session-agent.ts, types.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [@anthropic-ai/claude-code, axios]
 */

import { 
  AgentType, 
  AgentConfig, 
  AgentCapability, 
  ConversationMemory,
  AgentMetrics,
  AgentInput,
  AgentOutput 
} from '../types.js';
import axios from 'axios';

export abstract class BaseAgent {
  protected id: string;
  protected type: AgentType;
  protected userId: string;
  protected teamId: string;
  protected sessionId?: string;
  protected systemPrompt: string = '';
  protected capabilities: AgentCapability[] = [];
  protected memory: ConversationMemory;
  protected metrics: AgentMetrics;
  protected config: AgentConfig;
  protected mcpBaseUrl: string = 'https://mcp.ginko.ai/api';

  constructor(type: AgentType, config: AgentConfig) {
    this.id = this.generateId();
    this.type = type;
    this.userId = config.userId;
    this.teamId = config.teamId;
    this.config = config;
    
    this.memory = {
      messages: [],
      context: {},
      decisions: []
    };
    
    this.metrics = {
      tokensUsed: 0,
      executionTime: 0,
      successRate: 1.0,
      errorCount: 0
    };
  }

  /**
   * Execute agent task - must be implemented by subclasses
   */
  abstract execute(input: AgentInput): Promise<AgentOutput>;
  
  /**
   * Build system prompt - must be implemented by subclasses
   */
  abstract buildSystemPrompt(): string;

  /**
   * Call MCP tools through Ginko server
   */
  protected async callMCPTool(toolName: string, args: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.mcpBaseUrl}/tools/call`,
        {
          tool: toolName,
          arguments: args
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.ginkoKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to call MCP tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Update conversation memory
   */
  protected updateMemory(role: 'user' | 'assistant', content: string): void {
    this.memory.messages.push({
      role,
      content,
      timestamp: new Date()
    });
    
    // Keep only last 20 messages for context window
    if (this.memory.messages.length > 20) {
      this.memory.messages = this.memory.messages.slice(-20);
    }
  }

  /**
   * Track decision made during session
   */
  protected trackDecision(decision: string): void {
    this.memory.decisions.push(decision);
  }

  /**
   * Update metrics
   */
  protected updateMetrics(tokens: number, time: number, success: boolean): void {
    this.metrics.tokensUsed += tokens;
    this.metrics.executionTime += time;
    if (!success) {
      this.metrics.errorCount++;
      this.metrics.successRate = 
        (this.metrics.successRate * (this.metrics.errorCount - 1) + 0) / 
        this.metrics.errorCount;
    }
  }

  /**
   * Generate unique agent ID
   */
  private generateId(): string {
    return `agent_${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current agent state
   */
  public getState() {
    return {
      id: this.id,
      type: this.type,
      userId: this.userId,
      teamId: this.teamId,
      sessionId: this.sessionId,
      metrics: this.metrics,
      memorySize: this.memory.messages.length,
      decisions: this.memory.decisions.length
    };
  }
}