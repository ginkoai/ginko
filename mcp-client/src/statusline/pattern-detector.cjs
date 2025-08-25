/**
 * Pattern Detection Engine
 * 
 * Analyzes collaboration patterns to provide intelligent coaching
 */

class PatternDetector {
  constructor() {
    this.patterns = {
      // Negative patterns (need intervention)
      thrashing: {
        name: 'thrashing',
        description: 'Multiple failed attempts at same task',
        indicators: {
          errorRate: (m) => m.errorRate > 0.6,
          progressVelocity: (m) => m.progressVelocity < 0.2,
          repeatedActions: (m) => m.repeatedActions > 3
        },
        coaching: 'Step back and reconsider approach',
        vibecheckTrigger: true,
        vibecheckMessage: 'overcomplicating this',
        severity: 'high'
      },
      
      rabbitHole: {
        name: 'rabbit-hole',
        description: 'Deep diving without progress',
        indicators: {
          focusStability: (m) => m.focusStability < 0.3,
          scopeCreep: (m) => m.scopeCreep > 0.7,
          timeSinceGoalCheck: (m) => m.timeSinceGoalCheck > 30
        },
        coaching: 'Return to original goal - avoid scope creep',
        vibecheckTrigger: true,
        vibecheckMessage: 'losing focus on the goal',
        severity: 'medium'
      },
      
      stuckOnDetails: {
        name: 'stuck-on-details',
        description: 'Excessive time on minor issues',
        indicators: {
          timeOnCurrentIssue: (m) => m.timeOnCurrentIssue > 45,
          issueComplexity: (m) => m.issueComplexity < 0.3,
          progressBlocked: (m) => m.progressBlocked === true
        },
        coaching: 'Mark as TODO and move forward',
        vibecheckTrigger: false,
        severity: 'low'
      },
      
      missingContext: {
        name: 'missing-context',
        description: 'Repeated searches for same information',
        indicators: {
          searchRepetition: (m) => m.searchRepetition > 3,
          contextSwitches: (m) => m.contextSwitches > 5,
          documentationChecks: (m) => m.documentationChecks > 4
        },
        coaching: 'Document findings for future reference',
        vibecheckTrigger: false,
        severity: 'medium'
      },
      
      // Positive patterns (celebrate)
      perfectFlow: {
        name: 'perfect-flow',
        description: 'Consistent progress with good momentum',
        indicators: {
          errorRate: (m) => m.errorRate < 0.1,
          progressVelocity: (m) => m.progressVelocity > 0.8,
          commitFrequency: (m) => m.commitFrequency > 0.7
        },
        coaching: 'Keep going - you\'re in the zone!',
        vibecheckTrigger: false,
        severity: 'positive'
      },
      
      rapidLearning: {
        name: 'rapid-learning',
        description: 'Quick pattern absorption and application',
        indicators: {
          newPatternApplication: (m) => m.newPatternApplication > 0.8,
          errorRecoveryTime: (m) => m.errorRecoveryTime < 5,
          adaptationSpeed: (m) => m.adaptationSpeed > 0.7
        },
        coaching: 'Excellent learning pace!',
        vibecheckTrigger: false,
        severity: 'positive'
      },
      
      effectiveDebuggin: {
        name: 'effective-debugging',
        description: 'Systematic problem-solving approach',
        indicators: {
          hypothesisFormation: (m) => m.hypothesisFormation === true,
          systematicApproach: (m) => m.systematicApproach > 0.8,
          debugSuccessRate: (m) => m.debugSuccessRate > 0.7
        },
        coaching: 'Great debugging methodology!',
        vibecheckTrigger: false,
        severity: 'positive'
      }
    };
  }
  
  /**
   * Detect patterns from session metrics
   */
  detectPattern(metrics) {
    const detectedPatterns = [];
    
    for (const [key, pattern] of Object.entries(this.patterns)) {
      if (this.matchesPattern(pattern, metrics)) {
        detectedPatterns.push({
          ...pattern,
          confidence: this.calculateConfidence(pattern, metrics),
          timestamp: Date.now()
        });
      }
    }
    
    // Check if any pattern suggests a vibecheck
    const vibecheckPattern = detectedPatterns.find(p => p.vibecheckTrigger);
    if (vibecheckPattern) {
      this.triggerVibecheck(vibecheckPattern);
    }
    
    // Return highest priority pattern
    return this.prioritizePatterns(detectedPatterns);
  }
  
  /**
   * Trigger vibecheck notification
   */
  triggerVibecheck(pattern) {
    const vibecheckFile = require('path').join(require('os').tmpdir(), 'watchhill-vibecheck.json');
    const fs = require('fs');
    
    try {
      fs.writeFileSync(vibecheckFile, JSON.stringify({
        active: true,
        pattern: pattern.name,
        message: pattern.vibecheckMessage || 'reconsider approach',
        timestamp: Date.now()
      }));
    } catch (e) {
      // Silent fail
    }
  }
  
  /**
   * Check if metrics match pattern indicators
   */
  matchesPattern(pattern, metrics) {
    const matches = Object.entries(pattern.indicators).map(([key, check]) => {
      return check(metrics);
    });
    
    // Pattern matches if majority of indicators are true
    const matchCount = matches.filter(m => m).length;
    return matchCount >= Math.ceil(matches.length * 0.6);
  }
  
  /**
   * Calculate confidence score for pattern match
   */
  calculateConfidence(pattern, metrics) {
    const scores = Object.entries(pattern.indicators).map(([key, check]) => {
      return check(metrics) ? 1 : 0;
    });
    
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  
  /**
   * Prioritize patterns by severity and confidence
   */
  prioritizePatterns(patterns) {
    if (patterns.length === 0) return null;
    
    // Sort by severity (high > medium > low > positive) and confidence
    const severityOrder = { high: 0, medium: 1, low: 2, positive: 3 };
    
    patterns.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
    
    return patterns[0];
  }
  
  /**
   * Get coaching recommendation for pattern
   */
  getCoachingForPattern(patternName) {
    const pattern = this.patterns[patternName];
    return pattern ? pattern.coaching : null;
  }
  
  /**
   * Check if pattern should trigger vibecheck
   */
  shouldTriggerVibecheck(patternName) {
    const pattern = this.patterns[patternName];
    return pattern ? pattern.vibecheckTrigger : false;
  }
}

module.exports = PatternDetector;