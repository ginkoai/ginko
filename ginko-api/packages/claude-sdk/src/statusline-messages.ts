/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-17
 * @tags: statusline, vibecheck, collaboration
 * @related: session-agent.ts, ginko-statusline.cjs
 * @priority: high
 * @complexity: medium
 * @dependencies: none
 */

/**
 * Statusline messages for collaborative moments
 */

export interface VibecheckStatus {
  state: 'detected' | 'in-progress' | 'complete';
  message: string;
  decision?: string;
  timestamp: Date;
}

export class CollaborativeStatusMessages {
  private static animationFrames = ['.', '..', '...', '..'];
  private static frameIndex = 0;

  /**
   * Get animated vibecheck detection message
   */
  static getVibecheckDetected(): string {
    const dots = this.animationFrames[this.frameIndex];
    this.frameIndex = (this.frameIndex + 1) % this.animationFrames.length;
    return `🤔 vibecheck${dots}`;
  }

  /**
   * Get vibecheck complete message
   */
  static getVibecheckComplete(decision: string): string {
    // Truncate decision to fit statusline
    const shortDecision = decision.length > 40 
      ? decision.substring(0, 37) + '...'
      : decision;
    return `✅ vibecheck: ${shortDecision}`;
  }

  /**
   * Get various collaborative moment messages
   */
  static getCollaborativeMessages(): Record<string, string> {
    return {
      // Vibecheck moments
      'vibecheck.start': '🤔 vibecheck...',
      'vibecheck.complete': '✅ vibecheck complete',
      
      // Decision moments
      'decision.considering': '🧭 Considering options...',
      'decision.made': '🎯 Decision: ',
      
      // Course corrections
      'correction.needed': '🔄 Adjusting approach...',
      'correction.complete': '✨ Back on track',
      
      // Collaboration quality
      'collaboration.smooth': '🚀 In the flow',
      'collaboration.stuck': '🤷 Need input',
      'collaboration.breakthrough': '💡 Breakthrough!',
      
      // Git-native handoff states
      'handoff.draft': '📝 Handoff draft',
      'handoff.reviewing': '👀 Reviewing handoff',
      'handoff.updated': '✏️ Handoff updated',
      'handoff.committed': '✅ Handoff saved',
      
      // Session momentum
      'momentum.building': '📈 Building momentum',
      'momentum.high': '🔥 On fire!',
      'momentum.paused': '⏸️ Paused for thought',
      
      // Problem solving
      'solving.exploring': '🔍 Exploring solution...',
      'solving.testing': '🧪 Testing approach...',
      'solving.solved': '🎉 Problem solved!'
    };
  }

  /**
   * Format a vibecheck decision for the statusline
   */
  static formatVibecheckDecision(category: string, decision: string): string {
    const icons: Record<string, string> = {
      'structure': '📁',
      'approach': '🧭',
      'safety': '🛡️',
      'performance': '⚡',
      'cleanup': '🧹',
      'feature': '✨',
      'refactor': '🔄'
    };

    const icon = icons[category] || '🎯';
    return `${icon} ${decision}`;
  }

  /**
   * Get contextual message based on session state
   */
  static getContextualMessage(
    filesChanged: number,
    testsStatus: 'passing' | 'failing' | 'unknown',
    lastCommitMinutes: number
  ): string {
    // Vibecheck trigger conditions
    if (filesChanged > 20 && lastCommitMinutes > 60) {
      return '🤔 Consider a vibecheck?';
    }

    if (testsStatus === 'failing' && filesChanged > 5) {
      return '🔄 Vibecheck: refocus on tests?';
    }

    // Normal status
    if (testsStatus === 'passing' && filesChanged > 0) {
      return `✅ ${filesChanged} files, tests passing`;
    }

    if (lastCommitMinutes > 120) {
      return '💾 Time to commit?';
    }

    return '⚡ Ready';
  }
}