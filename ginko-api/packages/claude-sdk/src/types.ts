/**
 * @fileType: model
 * @status: current
 * @updated: 2025-08-15
 * @tags: [sdk, agents, types, gamification]
 * @related: [base-agent.ts, session-agent.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

export enum AgentType {
  SESSION = 'session',
  REVIEW = 'review',
  COACHING = 'coaching',
  ONBOARDING = 'onboarding'
}

export interface AgentConfig {
  userId: string;
  teamId: string;
  apiKey?: string;
  ginkoKey: string;
  streaming?: boolean;
  verbose?: boolean;
}

export interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
}

export interface ConversationMemory {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  context: Record<string, any>;
  decisions: string[];
}

export interface AgentMetrics {
  tokensUsed: number;
  executionTime: number;
  successRate: number;
  errorCount: number;
}

export interface RapportContext {
  personalizedGreeting: string;
  sharedHistory: string;
  emotionalTone: 'excited' | 'focused' | 'determined' | 'curious' | 'celebratory';
  contextualMood?: {
    situation: 'challenging' | 'progressing_well' | 'steady_work';
    urgency: 'high' | 'medium' | 'normal';
  };
}

export interface SessionHandoff {
  sessionId: string;
  timestamp: Date;
  currentTask: string;
  completedTasks: string[];
  pendingTasks: string[];
  filesModified: string[];
  decisions: string[];
  conversationMemory: ConversationMemory;
  metrics?: AgentMetrics;
  rapportContext?: RapportContext;
}

export interface AgentInput {
  type: string;
  data: any;
  context?: Record<string, any>;
}

export interface AgentOutput {
  success: boolean;
  result: any;
  metrics: AgentMetrics;
  error?: string;
}

export interface CoachingHint {
  message: string;
  type: 'suggestion' | 'warning' | 'celebration' | 'vibecheck';
  icon: string;
  priority: 'low' | 'medium' | 'high';
}