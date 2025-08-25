/**
 * @fileType: component
 * @status: current
 * @updated: 2025-08-15
 * @tags: [sdk, agents, coaching, real-time, hints]
 * @related: [base-agent.ts, types.ts, pattern-detector.cjs]
 * @priority: high
 * @complexity: high
 * @dependencies: [base-agent, pattern-analysis]
 */

import { BaseAgent } from './base-agent.js';
import { 
  AgentType, 
  AgentConfig, 
  AgentInput, 
  AgentOutput,
  CoachingHint 
} from '../types.js';

interface SessionMetrics {
  errorRate: number;
  progressVelocity: number;
  flowDuration: number;
  vibecheckCount: number;
  patternsSpotted: number;
  collaborationScore: number;
  timeSinceProgress: number;
  phase: 'planning' | 'implementing' | 'debugging' | 'reviewing';
}

interface CollaborationPattern {
  name: string;
  severity: 'positive' | 'low' | 'medium' | 'high';
  coaching: string;
  vibecheckTrigger: boolean;
}

export class CoachingAgent extends BaseAgent {
  private patterns: Map<string, CollaborationPattern> = new Map();
  private hints: Map<string, string[]> = new Map();
  private lastHintTime: number = 0;
  private hintCooldown: number = 30000; // 30 seconds between hints
  
  constructor(config: AgentConfig) {
    super(AgentType.COACHING, config);
    this.initializePatterns();
    this.initializeHints();
  }
  
  /**
   * Initialize collaboration patterns
   */
  private initializePatterns(): void {
    this.patterns = new Map([
      ['thrashing', {
        name: 'thrashing',
        severity: 'high',
        coaching: 'Step back and reconsider approach',
        vibecheckTrigger: true
      }],
      ['rabbit-hole', {
        name: 'rabbit-hole',
        severity: 'medium',
        coaching: 'Return to original goal - avoid scope creep',
        vibecheckTrigger: false
      }],
      ['stuck', {
        name: 'stuck',
        severity: 'medium',
        coaching: 'Consider taking a break or trying a different approach',
        vibecheckTrigger: true
      }],
      ['flow', {
        name: 'flow',
        severity: 'positive',
        coaching: 'Keep this momentum going!',
        vibecheckTrigger: false
      }],
      ['rapid-learning', {
        name: 'rapid-learning',
        severity: 'positive',
        coaching: 'Excellent learning pace!',
        vibecheckTrigger: false
      }]
    ]);
  }
  
  /**
   * Initialize contextual hints
   */
  private initializeHints(): void {
    this.hints = new Map([
      ['planning', [
        'Break down the task into smaller steps',
        'Consider edge cases early',
        'Check existing patterns in codebase',
        'Define success criteria first',
        'What\'s the simplest solution that could work?'
      ]],
      ['implementing', [
        'Test as you go',
        'Keep commits atomic and focused',
        'Follow team conventions',
        'Consider extracting reusable components',
        'Is this the right abstraction level?'
      ]],
      ['debugging', [
        'Form a hypothesis before changing code',
        'Check the simplest things first',
        'Read error messages completely',
        'Consider using binary search to isolate',
        'What changed since it last worked?'
      ]],
      ['reviewing', [
        'Run tests before committing',
        'Check for leftover debug code',
        'Verify all TODOs are addressed',
        'Consider documentation updates',
        'Would this make sense to someone else?'
      ]]
    ]);
  }
  
  /**
   * Build system prompt for coaching
   */
  buildSystemPrompt(): string {
    return `You are a collaboration coach helping developers work effectively with AI.
      
      Your role:
      - Detect collaboration patterns in real-time
      - Provide timely, contextual coaching hints
      - Suggest vibechecks when misalignment detected
      - Celebrate successes and flow states
      - Guide skill development progressively
      
      Coaching principles:
      - Be encouraging and supportive
      - Provide specific, actionable guidance
      - Respect developer autonomy
      - Adapt to skill level
      - Never interrupt deep flow states`;
  }
  
  /**
   * Execute coaching analysis
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    
    try {
      switch (input.type) {
        case 'analyze':
          const hint = await this.analyzeAndCoach(input.data.metrics);
          return {
            success: true,
            result: hint,
            metrics: this.metrics
          };
          
        case 'detect-pattern':
          const pattern = await this.detectPattern(input.data.metrics);
          return {
            success: true,
            result: pattern,
            metrics: this.metrics
          };
          
        case 'suggest-vibecheck':
          const shouldVibecheck = await this.shouldSuggestVibecheck(input.data);
          return {
            success: true,
            result: { suggest: shouldVibecheck },
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
   * Analyze metrics and generate coaching hint
   */
  private async analyzeAndCoach(metrics: SessionMetrics): Promise<CoachingHint> {
    // Check for patterns first
    const pattern = await this.detectPattern(metrics);
    
    if (pattern) {
      // Pattern-based coaching
      if (pattern.vibecheckTrigger) {
        return {
          message: 'Vibecheck suggested - feeling stuck?',
          type: 'vibecheck',
          icon: '🎯',
          priority: 'high'
        };
      }
      
      return {
        message: pattern.coaching,
        type: pattern.severity === 'positive' ? 'celebration' : 'suggestion',
        icon: this.getIconForPattern(pattern.name),
        priority: pattern.severity === 'high' ? 'high' : 'medium'
      };
    }
    
    // Check for flow state
    if (metrics.flowDuration > 15 * 60 * 1000) {
      return {
        message: `Flow state ${Math.floor(metrics.flowDuration / 60000)} min`,
        type: 'celebration',
        icon: '🌊',
        priority: 'low'
      };
    }
    
    // Time-based suggestions
    if (metrics.timeSinceProgress > 30 * 60 * 1000) {
      return {
        message: 'No progress for 30 min - consider a break?',
        type: 'suggestion',
        icon: '☕',
        priority: 'medium'
      };
    }
    
    // Phase-based hints
    const phaseHints = this.hints.get(metrics.phase) || [];
    const hint = this.selectContextualHint(phaseHints, metrics);
    
    return {
      message: hint,
      type: 'suggestion',
      icon: this.getPhaseIcon(metrics.phase),
      priority: 'low'
    };
  }
  
  /**
   * Detect collaboration pattern
   */
  private async detectPattern(metrics: SessionMetrics): Promise<CollaborationPattern | null> {
    // Thrashing pattern
    if (metrics.errorRate > 0.6 && metrics.progressVelocity < 0.2) {
      return this.patterns.get('thrashing') || null;
    }
    
    // Stuck pattern
    if (metrics.timeSinceProgress > 45 * 60 * 1000 && metrics.errorRate > 0.3) {
      return this.patterns.get('stuck') || null;
    }
    
    // Flow pattern
    if (metrics.progressVelocity > 0.8 && metrics.errorRate < 0.1) {
      return this.patterns.get('flow') || null;
    }
    
    // Rapid learning
    if (metrics.patternsSpotted > 3 && metrics.collaborationScore > 80) {
      return this.patterns.get('rapid-learning') || null;
    }
    
    return null;
  }
  
  /**
   * Determine if vibecheck should be suggested
   */
  private async shouldSuggestVibecheck(data: any): Promise<boolean> {
    const metrics = data.metrics as SessionMetrics;
    
    // High error rate
    if (metrics.errorRate > 0.7) return true;
    
    // Long time without progress
    if (metrics.timeSinceProgress > 45 * 60 * 1000) return true;
    
    // Low collaboration score with errors
    if (metrics.collaborationScore < 50 && metrics.errorRate > 0.3) return true;
    
    // Pattern indicates vibecheck
    const pattern = await this.detectPattern(metrics);
    if (pattern && pattern.vibecheckTrigger) return true;
    
    return false;
  }
  
  /**
   * Select contextual hint based on metrics
   */
  private selectContextualHint(hints: string[], metrics: SessionMetrics): string {
    // Don't repeat hints too quickly
    const now = Date.now();
    if (now - this.lastHintTime < this.hintCooldown) {
      return 'Keep going!';
    }
    
    this.lastHintTime = now;
    
    // Select hint based on context
    if (metrics.phase === 'debugging' && metrics.errorRate > 0.5) {
      return hints.find(h => h.includes('hypothesis')) || hints[0];
    }
    
    if (metrics.phase === 'implementing' && metrics.progressVelocity > 0.7) {
      return hints.find(h => h.includes('test')) || hints[0];
    }
    
    // Random hint from phase
    return hints[Math.floor(Math.random() * hints.length)];
  }
  
  /**
   * Get icon for pattern
   */
  private getIconForPattern(pattern: string): string {
    const icons: Record<string, string> = {
      'thrashing': '⚠️',
      'rabbit-hole': '🕳️',
      'stuck': '🛑',
      'flow': '🌊',
      'rapid-learning': '🚀'
    };
    
    return icons[pattern] || '🎯';
  }
  
  /**
   * Get icon for phase
   */
  private getPhaseIcon(phase: string): string {
    const icons: Record<string, string> = {
      'planning': '📋',
      'implementing': '⚡',
      'debugging': '🔍',
      'reviewing': '✅'
    };
    
    return icons[phase] || '💻';
  }
  
  /**
   * Generate personalized coaching based on skill level
   */
  async generatePersonalizedCoaching(
    metrics: SessionMetrics, 
    skillLevel: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<CoachingHint> {
    const hint = await this.analyzeAndCoach(metrics);
    
    // Adjust based on skill level
    switch (skillLevel) {
      case 'beginner':
        // More explicit guidance
        hint.message = `💡 Tip: ${hint.message}`;
        hint.priority = 'high';
        break;
        
      case 'intermediate':
        // Balanced guidance
        hint.message = `🎯 ${hint.message}`;
        break;
        
      case 'advanced':
        // Subtle hints only
        if (hint.priority === 'low') {
          hint.message = hint.message;
        } else {
          // Only show high-priority hints for advanced users
          return {
            message: '',
            type: 'suggestion',
            icon: '',
            priority: 'low'
          };
        }
        break;
    }
    
    return hint;
  }
}