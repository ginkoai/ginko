/**
 * Session State Tracker
 * 
 * Monitors and tracks collaboration patterns in real-time
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class SessionTracker {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.stateDir = path.join(os.homedir(), '.watchhill', 'sessions');
    this.statePath = path.join(this.stateDir, `${sessionId}.json`);
    
    this.ensureStateDir();
    this.loadOrCreateState();
    this.startTracking();
  }
  
  /**
   * Ensure state directory exists
   */
  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }
  
  /**
   * Load existing state or create new
   */
  loadOrCreateState() {
    if (fs.existsSync(this.statePath)) {
      try {
        this.state = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
        console.log('[SessionTracker] Resumed session:', this.sessionId);
      } catch (error) {
        this.createNewState();
      }
    } else {
      this.createNewState();
    }
  }
  
  /**
   * Create new session state
   */
  createNewState() {
    this.state = {
      sessionId: this.sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      phase: 'planning',
      
      // Metrics
      errorCount: 0,
      progressRate: 0.5,
      commitCount: 0,
      vibecheckCount: 0,
      patternsSpotted: 0,
      
      // Time tracking
      totalDuration: 0,
      flowDuration: 0,
      debugDuration: 0,
      planningDuration: 0,
      
      // Pattern tracking
      lastError: null,
      lastProgress: Date.now(),
      timeSinceProgress: 0,
      repeatedActions: 0,
      searchRepetition: 0,
      contextSwitches: 0,
      
      // Flow state
      inFlow: false,
      flowStartTime: null,
      consistentCommits: false,
      
      // Collaboration metrics
      collaborationScore: 75,
      handoffQuality: 0,
      communicationClarity: 0,
      
      // Achievements progress
      unlockedAchievements: [],
      achievementProgress: {}
    };
    
    this.saveState();
    console.log('[SessionTracker] New session started:', this.sessionId);
  }
  
  /**
   * Start tracking session
   */
  startTracking() {
    // Auto-save every 30 seconds
    this.saveInterval = setInterval(() => {
      this.updateMetrics();
      this.saveState();
    }, 30000);
    
    // Track duration
    this.durationInterval = setInterval(() => {
      this.state.totalDuration = Date.now() - this.state.startTime;
      
      // Track phase duration
      switch (this.state.phase) {
        case 'planning':
          this.state.planningDuration += 1000;
          break;
        case 'debugging':
          this.state.debugDuration += 1000;
          break;
        case 'flow':
          this.state.flowDuration += 1000;
          break;
      }
    }, 1000);
  }
  
  /**
   * Update metrics based on current state
   */
  updateMetrics() {
    const now = Date.now();
    
    // Calculate time since progress
    this.state.timeSinceProgress = now - this.state.lastProgress;
    
    // Calculate progress rate (simplified)
    const recentProgress = this.state.commitCount > 0 || this.state.errorCount < 3;
    this.state.progressRate = recentProgress ? 
      Math.min(1, this.state.progressRate + 0.1) : 
      Math.max(0, this.state.progressRate - 0.05);
    
    // Detect flow state
    const wasInFlow = this.state.inFlow;
    this.state.inFlow = this.detectFlowState();
    
    if (this.state.inFlow && !wasInFlow) {
      // Entered flow state
      this.state.flowStartTime = now;
      console.log('[SessionTracker] Entered flow state');
    } else if (!this.state.inFlow && wasInFlow) {
      // Exited flow state
      const flowDuration = now - this.state.flowStartTime;
      this.state.flowDuration += flowDuration;
      console.log('[SessionTracker] Exited flow state, duration:', flowDuration);
    }
    
    // Calculate collaboration score
    this.updateCollaborationScore();
  }
  
  /**
   * Detect flow state
   */
  detectFlowState() {
    return (
      this.state.progressRate > 0.7 &&
      this.state.errorCount === 0 &&
      this.state.timeSinceProgress < 10 * 60 * 1000 && // Less than 10 min
      this.state.consistentCommits
    );
  }
  
  /**
   * Update collaboration score
   */
  updateCollaborationScore() {
    const factors = {
      progressRate: this.state.progressRate * 30,
      errorRecovery: Math.max(0, 20 - this.state.errorCount * 2),
      vibecheckTiming: this.state.vibecheckCount > 0 ? 15 : 5,
      flowState: this.state.inFlow ? 20 : 10,
      communication: 15 // Placeholder
    };
    
    this.state.collaborationScore = Math.round(
      Object.values(factors).reduce((a, b) => a + b, 0)
    );
    
    this.state.collaborationScore = Math.min(100, Math.max(0, this.state.collaborationScore));
  }
  
  /**
   * Track an event
   */
  trackEvent(eventType, data = {}) {
    this.state.lastActivity = Date.now();
    
    switch (eventType) {
      case 'error':
        this.trackError(data);
        break;
        
      case 'progress':
        this.trackProgress(data);
        break;
        
      case 'commit':
        this.trackCommit(data);
        break;
        
      case 'vibecheck':
        this.trackVibecheck(data);
        break;
        
      case 'search':
        this.trackSearch(data);
        break;
        
      case 'phase_change':
        this.changePhase(data.phase);
        break;
        
      case 'pattern_spotted':
        this.state.patternsSpotted++;
        break;
    }
    
    this.saveState();
  }
  
  /**
   * Track error
   */
  trackError(data) {
    this.state.errorCount++;
    this.state.lastError = Date.now();
    
    // Check for repeated errors
    if (this.state.lastError && (Date.now() - this.state.lastError) < 60000) {
      this.state.repeatedActions++;
    }
    
    // Break flow state on error
    if (this.state.inFlow) {
      this.state.inFlow = false;
    }
  }
  
  /**
   * Track progress
   */
  trackProgress(data) {
    this.state.lastProgress = Date.now();
    this.state.timeSinceProgress = 0;
    this.state.repeatedActions = Math.max(0, this.state.repeatedActions - 1);
  }
  
  /**
   * Track commit
   */
  trackCommit(data) {
    this.state.commitCount++;
    this.state.lastProgress = Date.now();
    
    // Check for consistent commits
    if (this.state.commitCount > 2) {
      this.state.consistentCommits = true;
    }
  }
  
  /**
   * Track vibecheck
   */
  trackVibecheck(data) {
    this.state.vibecheckCount++;
    
    // Reset error count after vibecheck
    this.state.errorCount = 0;
    this.state.repeatedActions = 0;
    
    // Vibecheck breaks flow but that's ok
    this.state.inFlow = false;
  }
  
  /**
   * Track search
   */
  trackSearch(data) {
    // Check for repeated searches
    if (data.query === this.state.lastSearch) {
      this.state.searchRepetition++;
    } else {
      this.state.searchRepetition = 0;
    }
    
    this.state.lastSearch = data.query;
    this.state.contextSwitches++;
  }
  
  /**
   * Change phase
   */
  changePhase(newPhase) {
    console.log(`[SessionTracker] Phase change: ${this.state.phase} -> ${newPhase}`);
    this.state.phase = newPhase;
  }
  
  /**
   * Save state to disk
   */
  saveState() {
    try {
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('[SessionTracker] Error saving state:', error);
    }
  }
  
  /**
   * Get current state
   */
  getState() {
    return this.state;
  }
  
  /**
   * Get metrics for pattern detection
   */
  getMetrics() {
    return {
      errorRate: this.state.errorCount / Math.max(1, this.state.commitCount + this.state.errorCount),
      progressVelocity: this.state.progressRate,
      repeatedActions: this.state.repeatedActions,
      focusStability: 1 - (this.state.contextSwitches / Math.max(1, this.state.totalDuration / 60000)),
      scopeCreep: this.state.contextSwitches > 10 ? 0.8 : 0.2,
      timeSinceGoalCheck: this.state.timeSinceProgress / 60000,
      timeOnCurrentIssue: this.state.timeSinceProgress / 60000,
      issueComplexity: 0.5, // Placeholder
      progressBlocked: this.state.timeSinceProgress > 15 * 60 * 1000,
      searchRepetition: this.state.searchRepetition,
      contextSwitches: this.state.contextSwitches,
      documentationChecks: 0, // Placeholder
      commitFrequency: this.state.commitCount / Math.max(1, this.state.totalDuration / 3600000),
      newPatternApplication: this.state.patternsSpotted / Math.max(1, this.state.totalDuration / 3600000),
      errorRecoveryTime: this.state.lastError ? (Date.now() - this.state.lastError) / 60000 : 0,
      adaptationSpeed: this.state.progressRate,
      hypothesisFormation: true, // Placeholder
      systematicApproach: 0.7, // Placeholder
      debugSuccessRate: this.state.errorCount > 0 ? 0.5 : 1
    };
  }
  
  /**
   * Cleanup
   */
  destroy() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
    
    this.saveState();
  }
}

module.exports = SessionTracker;