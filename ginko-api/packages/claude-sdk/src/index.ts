/**
 * @fileType: component
 * @status: current
 * @updated: 2025-08-15
 * @tags: [sdk, main, exports, api]
 * @related: [agents/, gamification/]
 * @priority: critical
 * @complexity: low
 * @dependencies: [all-internal-modules]
 */

// Export types
export * from './types.js';

// Export agents
export { BaseAgent } from './agents/base-agent.js';
export { SessionAgent } from './agents/session-agent.js';

// Export gamification
export { AchievementSystem } from './gamification/achievement-system.js';
export type { Achievement, AchievementMetrics } from './gamification/achievement-system.js';

// Main SDK client
export class GinkoSDK {
  static version = '0.1.0';
  
  /**
   * Create a new agent
   */
  static async createAgent(type: 'session' | 'review' | 'coaching' | 'onboarding', config: any) {
    switch (type) {
      case 'session':
        const { SessionAgent } = await import('./agents/session-agent.js');
        return new SessionAgent(config);
      
      // Other agents to be implemented
      default:
        throw new Error(`Agent type ${type} not yet implemented`);
    }
  }
  
  /**
   * Initialize gamification system
   */
  static createAchievementSystem() {
    const { AchievementSystem } = require('./gamification/achievement-system.js');
    return new AchievementSystem();
  }
  
  /**
   * Get SDK information
   */
  static getInfo() {
    return {
      version: this.version,
      agents: ['session', 'review', 'coaching', 'onboarding'],
      features: ['auto-handoff', 'achievements', 'pattern-detection', 'status-line-coaching']
    };
  }
}