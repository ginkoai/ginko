/**
 * @fileType: service
 * @status: current
 * @updated: 2025-09-10
 * @tags: [statusline, phase-tracking, collaboration, ui]
 * @related: [active-context-manager.ts, ../utils/helpers.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, ../types/session.ts]
 */

import chalk from 'chalk';
import { ActiveContextManager, Phase, WorkMode } from './active-context-manager.js';

export interface StatuslineConfig {
  enabled: boolean;
  mode: 'compact' | 'verbose' | 'minimal';
  showPhase: boolean;
  showContext: boolean;
  showResources: boolean;
  showWarnings: boolean;
  updateInterval: number;
  theme: 'emoji' | 'ascii' | 'text';
}

export interface StatuslineState {
  phase: Phase;
  phaseTarget?: string;
  contextScore: number;
  loadedPatterns: number;
  loadedGotchas: number;
  hasArchitecture: boolean;
  hasPRD: boolean;
  hasPlan: boolean;
  warnings: string[];
  alignmentScore: number;
  lastActivity: Date;
  confidence: number;
}

export type WarningType = 'phase-jump' | 'low-context' | 'confusion' | 'drift' | 'misalignment';

/**
 * Tracks and displays collaboration phase status
 */
export class StatuslineTracker {
  private config: StatuslineConfig;
  private state: StatuslineState;
  private contextManager: ActiveContextManager | null = null;
  private workMode: WorkMode;
  private updateTimer: NodeJS.Timeout | null = null;
  private phaseHistory: Array<{ phase: Phase; timestamp: Date }> = [];
  
  constructor(config?: Partial<StatuslineConfig>, workMode: WorkMode = 'think-build') {
    this.config = {
      enabled: true,
      mode: 'compact',
      showPhase: true,
      showContext: true,
      showResources: true,
      showWarnings: true,
      updateInterval: 30,
      theme: 'emoji',
      ...config
    };
    
    this.workMode = workMode;
    
    this.state = {
      phase: 'understanding',
      contextScore: 0,
      loadedPatterns: 0,
      loadedGotchas: 0,
      hasArchitecture: false,
      hasPRD: false,
      hasPlan: false,
      warnings: [],
      alignmentScore: 100,
      lastActivity: new Date(),
      confidence: 50
    };
  }
  
  /**
   * Set the context manager for score calculation
   */
  setContextManager(manager: ActiveContextManager): void {
    this.contextManager = manager;
  }
  
  /**
   * Update the current phase
   */
  async setPhase(phase: Phase, target?: string): Promise<void> {
    // Track phase history for jump detection
    this.phaseHistory.push({ phase: this.state.phase, timestamp: new Date() });
    if (this.phaseHistory.length > 10) {
      this.phaseHistory.shift();
    }
    
    // Check for phase jumps
    if (this.detectPhaseJump(this.state.phase, phase)) {
      this.addWarning('phase-jump', `Phase jump detected: ${this.state.phase} → ${phase}`);
    }
    
    this.state.phase = phase;
    this.state.phaseTarget = target;
    this.state.lastActivity = new Date();
    
    // Update context manager
    if (this.contextManager) {
      await this.contextManager.setPhase(phase);
    }
    
    this.display();
  }
  
  /**
   * Update context score
   */
  updateContextScore(score: number): void {
    this.state.contextScore = Math.max(0, Math.min(100, score));
    
    // Check for low context warnings
    const threshold = this.getContextThreshold();
    if (this.state.contextScore < threshold) {
      this.addWarning('low-context', `Context score (${this.state.contextScore}%) below threshold (${threshold}%)`);
    }
  }
  
  /**
   * Update loaded resources
   */
  updateResources(resources: {
    patterns?: number;
    gotchas?: number;
    hasArchitecture?: boolean;
    hasPRD?: boolean;
    hasPlan?: boolean;
  }): void {
    if (resources.patterns !== undefined) {
      this.state.loadedPatterns = resources.patterns;
    }
    if (resources.gotchas !== undefined) {
      this.state.loadedGotchas = resources.gotchas;
    }
    if (resources.hasArchitecture !== undefined) {
      this.state.hasArchitecture = resources.hasArchitecture;
    }
    if (resources.hasPRD !== undefined) {
      this.state.hasPRD = resources.hasPRD;
    }
    if (resources.hasPlan !== undefined) {
      this.state.hasPlan = resources.hasPlan;
    }
  }
  
  /**
   * Add a warning
   */
  addWarning(type: WarningType, message: string): void {
    this.state.warnings.push(message);
    if (this.state.warnings.length > 5) {
      this.state.warnings.shift();
    }
    
    // Adjust alignment score based on warnings
    this.state.alignmentScore = Math.max(0, this.state.alignmentScore - 10);
  }
  
  /**
   * Clear warnings
   */
  clearWarnings(): void {
    this.state.warnings = [];
    this.state.alignmentScore = 100;
  }
  
  /**
   * Display the statusline
   */
  display(): string {
    if (!this.config.enabled) {
      return '';
    }
    
    switch (this.config.mode) {
      case 'compact':
        return this.displayCompact();
      case 'verbose':
        return this.displayVerbose();
      case 'minimal':
        return this.displayMinimal();
      default:
        return this.displayCompact();
    }
  }
  
  /**
   * Compact display mode
   */
  private displayCompact(): string {
    const parts: string[] = ['[ginko]'];
    
    // Phase indicator
    if (this.config.showPhase) {
      const phaseIcon = this.getPhaseIcon();
      const phaseText = this.state.phaseTarget 
        ? `${this.formatPhase(this.state.phase)}: ${this.state.phaseTarget}`
        : this.formatPhase(this.state.phase);
      parts.push(`${phaseIcon} ${phaseText}`);
    }
    
    // Context score
    if (this.config.showContext) {
      const contextIcon = this.config.theme === 'emoji' ? '📚' : 'CTX';
      const contextColor = this.getContextColor();
      parts.push(chalk[contextColor](`${contextIcon} ${this.state.contextScore}%`));
    }
    
    // Resources
    if (this.config.showResources && (this.state.loadedPatterns > 0 || this.state.loadedGotchas > 0)) {
      const patternIcon = this.config.theme === 'emoji' ? '🔧' : 'P';
      const gotchaIcon = this.config.theme === 'emoji' ? '⚡' : 'G';
      
      if (this.state.loadedPatterns > 0) {
        parts.push(`${patternIcon} ${this.state.loadedPatterns}`);
      }
      if (this.state.loadedGotchas > 0) {
        parts.push(`${gotchaIcon} ${this.state.loadedGotchas}`);
      }
    }
    
    // Warnings
    if (this.config.showWarnings && this.state.warnings.length > 0) {
      const warningIcon = this.config.theme === 'emoji' ? '⚠️' : '!';
      parts.push(chalk.yellow(`${warningIcon} ${this.state.warnings[0]}`));
    }
    
    const output = parts.join(' | ');
    console.log(output);
    return output;
  }
  
  /**
   * Verbose display mode
   */
  private displayVerbose(): string {
    const lines: string[] = [];
    
    lines.push(chalk.cyan('[ginko] Collaboration Status'));
    lines.push(`        Phase: ${this.formatPhase(this.state.phase)}${this.state.phaseTarget ? ` - ${this.state.phaseTarget}` : ''}`);
    
    const contextColor = this.getContextColor();
    const contextStatus = this.getContextStatus();
    lines.push(`        Context: ${chalk[contextColor](`${this.state.contextScore}%`)} (${contextStatus})`);
    
    const resources: string[] = [];
    if (this.state.hasPRD) resources.push('PRD ✓');
    if (this.state.hasArchitecture) resources.push('Arch ✓');
    if (this.state.hasPlan) resources.push('Plan ✓');
    if (this.state.loadedPatterns > 0) resources.push(`Patterns: ${this.state.loadedPatterns}`);
    if (this.state.loadedGotchas > 0) resources.push(`Gotchas: ${this.state.loadedGotchas}`);
    
    if (resources.length > 0) {
      lines.push(`        Resources: ${resources.join(' | ')}`);
    }
    
    if (this.state.warnings.length > 0) {
      lines.push(chalk.yellow(`        Warnings: ${this.state.warnings[0]}`));
    } else {
      lines.push(chalk.green('        Status: Aligned and ready'));
    }
    
    const output = lines.join('\n');
    console.log(output);
    return output;
  }
  
  /**
   * Minimal display mode
   */
  private displayMinimal(): string {
    const phaseIcon = this.getPhaseIcon();
    const output = `[ginko] ${phaseIcon} ${this.state.phase}`;
    console.log(output);
    return output;
  }
  
  /**
   * Get phase icon
   */
  private getPhaseIcon(): string {
    if (this.config.theme !== 'emoji') {
      return this.state.phase.substring(0, 3).toUpperCase();
    }
    
    switch (this.state.phase) {
      case 'understanding':
        return '🔍';
      case 'designing':
        return '🎨';
      case 'implementing':
        return '📍';
      case 'testing':
        return '🧪';
      case 'debugging':
        return '🐛';
      default:
        return '📍';
    }
  }
  
  /**
   * Format phase name
   */
  private formatPhase(phase: Phase): string {
    return phase.charAt(0).toUpperCase() + phase.slice(1);
  }
  
  /**
   * Get context color based on score
   */
  private getContextColor(): 'green' | 'yellow' | 'red' {
    const threshold = this.getContextThreshold();
    
    if (this.state.contextScore >= threshold) {
      return 'green';
    } else if (this.state.contextScore >= threshold * 0.6) {
      return 'yellow';
    } else {
      return 'red';
    }
  }
  
  /**
   * Get context threshold based on work mode
   */
  private getContextThreshold(): number {
    switch (this.workMode) {
      case 'hack-ship':
        return 40;
      case 'think-build':
        return 70;
      case 'full-planning':
        return 90;
      default:
        return 70;
    }
  }
  
  /**
   * Get context status message
   */
  private getContextStatus(): string {
    const threshold = this.getContextThreshold();
    
    if (this.state.contextScore >= threshold) {
      return '✅ Ready';
    } else if (this.state.contextScore >= threshold * 0.6) {
      return '⚠️ Need patterns';
    } else {
      return '🔴 Missing context';
    }
  }
  
  /**
   * Detect phase jumps
   */
  private detectPhaseJump(from: Phase, to: Phase): boolean {
    const expectedFlow: Record<Phase, Phase[]> = {
      'understanding': ['designing', 'implementing'],
      'designing': ['implementing', 'understanding'],
      'implementing': ['testing', 'debugging', 'designing'],
      'testing': ['debugging', 'implementing', 'understanding'],
      'debugging': ['implementing', 'testing', 'designing']
    };
    
    const expected = expectedFlow[from] || [];
    return !expected.includes(to);
  }
  
  /**
   * Start automatic updates
   */
  startAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.updateTimer = setInterval(() => {
      this.checkForDrift();
      this.display();
    }, this.config.updateInterval * 1000);
  }
  
  /**
   * Stop automatic updates
   */
  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
  
  /**
   * Check for context drift
   */
  private checkForDrift(): void {
    const timeSinceActivity = Date.now() - this.state.lastActivity.getTime();
    const driftThreshold = 30 * 60 * 1000; // 30 minutes
    
    if (timeSinceActivity > driftThreshold) {
      this.addWarning('drift', 'Context drift detected - consider a vibecheck');
    }
  }
  
  /**
   * Get current state for external use
   */
  getState(): StatuslineState {
    return { ...this.state };
  }
  
  /**
   * Set confidence level
   */
  setConfidence(confidence: number): void {
    this.state.confidence = Math.max(0, Math.min(100, confidence));
    
    if (this.state.confidence < 60) {
      this.addWarning('confusion', `Low confidence (${this.state.confidence}%)`);
    }
  }
}