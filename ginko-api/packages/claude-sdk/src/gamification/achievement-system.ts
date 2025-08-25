/**
 * @fileType: component
 * @status: current
 * @updated: 2025-08-15
 * @tags: [gamification, achievements, rewards, progression]
 * @related: [progression-tracker.ts, status-line]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: 'learning' | 'collaboration' | 'productivity' | 'mastery' | 'community';
  unlockCondition: (metrics: AchievementMetrics) => boolean;
  celebration: string;
  unlockedAt?: Date;
}

export interface AchievementMetrics {
  vibecheckCount: number;
  patternsSpotted: number;
  flowDuration: number;
  sessionsCompleted: number;
  handoffsCreated: number;
  errorsSolved: number;
  commitCount: number;
  collaborationScore: number;
  teachingMoments: number;
  customPatternShared: boolean;
}

export class AchievementSystem {
  private achievements: Map<string, Achievement>;
  private unlockedAchievements: Set<string>;
  private metrics: AchievementMetrics;
  
  constructor() {
    this.achievements = new Map();
    this.unlockedAchievements = new Set();
    this.metrics = this.initializeMetrics();
    this.registerAchievements();
  }
  
  /**
   * Register all available achievements
   */
  private registerAchievements(): void {
    // Early game achievements (common)
    this.register({
      id: 'first-vibecheck',
      name: 'First Recalibration',
      description: 'Called your first vibecheck',
      icon: '🎯',
      xp: 50,
      rarity: 'common',
      category: 'learning',
      unlockCondition: (m) => m.vibecheckCount === 1,
      celebration: "Nice! You've learned when to pause and reassess."
    });
    
    this.register({
      id: 'flow-initiate',
      name: 'Flow Initiate',
      description: 'Maintained flow state for 15 minutes',
      icon: '🌊',
      xp: 75,
      rarity: 'common',
      category: 'productivity',
      unlockCondition: (m) => m.flowDuration >= 15 * 60 * 1000,
      celebration: "You're finding your rhythm!"
    });
    
    this.register({
      id: 'handoff-apprentice',
      name: 'Context Keeper',
      description: 'Created 5 session handoffs',
      icon: '📚',
      xp: 100,
      rarity: 'common',
      category: 'collaboration',
      unlockCondition: (m) => m.handoffsCreated >= 5,
      celebration: "Great job maintaining context!"
    });
    
    // Mid game achievements (uncommon)
    this.register({
      id: 'pattern-spotter',
      name: 'Pattern Spotter',
      description: 'Recognized stuck pattern before system hint',
      icon: '🔍',
      xp: 150,
      rarity: 'uncommon',
      category: 'learning',
      unlockCondition: (m) => m.patternsSpotted >= 5,
      celebration: "Impressive! You saw that coming before I did."
    });
    
    this.register({
      id: 'debug-detective',
      name: 'Debug Detective',
      description: 'Solved 10 errors systematically',
      icon: '🕵️',
      xp: 200,
      rarity: 'uncommon',
      category: 'mastery',
      unlockCondition: (m) => m.errorsSolved >= 10,
      celebration: "Your debugging skills are improving rapidly!"
    });
    
    this.register({
      id: 'commit-champion',
      name: 'Commit Champion',
      description: 'Made 50 meaningful commits',
      icon: '💾',
      xp: 175,
      rarity: 'uncommon',
      category: 'productivity',
      unlockCondition: (m) => m.commitCount >= 50,
      celebration: "Excellent commit discipline!"
    });
    
    // Late game achievements (rare)
    this.register({
      id: 'flow-master',
      name: 'Flow Master',
      description: 'Maintained flow state for 2 hours',
      icon: '🌊',
      xp: 300,
      rarity: 'rare',
      category: 'productivity',
      unlockCondition: (m) => m.flowDuration >= 2 * 60 * 60 * 1000,
      celebration: "You're in the zone! Perfect collaboration rhythm."
    });
    
    this.register({
      id: 'collaboration-expert',
      name: 'Collaboration Expert',
      description: 'Achieved 90% collaboration score',
      icon: '🤝',
      xp: 350,
      rarity: 'rare',
      category: 'collaboration',
      unlockCondition: (m) => m.collaborationScore >= 90,
      celebration: "Outstanding human-AI collaboration!"
    });
    
    // Epic achievements
    this.register({
      id: 'pattern-creator',
      name: 'Pattern Creator',
      description: 'Shared a custom pattern with the community',
      icon: '🧙',
      xp: 500,
      rarity: 'epic',
      category: 'community',
      unlockCondition: (m) => m.customPatternShared === true,
      celebration: "Your wisdom helps everyone! Pattern added to library."
    });
    
    this.register({
      id: 'mentor',
      name: 'Mentor',
      description: 'Helped 5 other developers improve',
      icon: '🎓',
      xp: 600,
      rarity: 'epic',
      category: 'community',
      unlockCondition: (m) => m.teachingMoments >= 5,
      celebration: "You're making the community better!"
    });
    
    // Legendary achievements
    this.register({
      id: 'mind-meld',
      name: 'Mind Meld',
      description: 'Completed complex task with zero misalignment',
      icon: '🧠',
      xp: 1000,
      rarity: 'legendary',
      category: 'mastery',
      unlockCondition: (m) => m.collaborationScore === 100 && m.sessionsCompleted >= 50,
      celebration: "Legendary! Perfect human-AI synchronization achieved."
    });
    
    // Hidden/Easter egg achievements
    this.register({
      id: 'rubber-duck',
      name: 'Rubber Duck Debugging',
      description: 'Solved problem by explaining it clearly',
      icon: '🦆',
      xp: 150,
      rarity: 'uncommon',
      category: 'learning',
      unlockCondition: (m) => false, // Special trigger needed
      celebration: "You solved it by explaining! Classic rubber duck debugging."
    });
  }
  
  /**
   * Register a new achievement
   */
  private register(achievement: Omit<Achievement, 'unlockedAt'>): void {
    this.achievements.set(achievement.id, achievement as Achievement);
  }
  
  /**
   * Check for newly unlocked achievements
   */
  checkAchievements(metrics: Partial<AchievementMetrics>): Achievement[] {
    // Update metrics
    this.updateMetrics(metrics);
    
    const newlyUnlocked: Achievement[] = [];
    
    for (const [id, achievement] of this.achievements) {
      if (!this.unlockedAchievements.has(id)) {
        if (achievement.unlockCondition(this.metrics)) {
          this.unlockAchievement(achievement);
          newlyUnlocked.push(achievement);
        }
      }
    }
    
    return newlyUnlocked;
  }
  
  /**
   * Unlock an achievement
   */
  private unlockAchievement(achievement: Achievement): void {
    achievement.unlockedAt = new Date();
    this.unlockedAchievements.add(achievement.id);
    
    // Log for analytics
    console.log(`[Achievement] Unlocked: ${achievement.name} (+${achievement.xp} XP)`);
  }
  
  /**
   * Update metrics
   */
  private updateMetrics(updates: Partial<AchievementMetrics>): void {
    this.metrics = { ...this.metrics, ...updates };
  }
  
  /**
   * Initialize metrics with defaults
   */
  private initializeMetrics(): AchievementMetrics {
    return {
      vibecheckCount: 0,
      patternsSpotted: 0,
      flowDuration: 0,
      sessionsCompleted: 0,
      handoffsCreated: 0,
      errorsSolved: 0,
      commitCount: 0,
      collaborationScore: 0,
      teachingMoments: 0,
      customPatternShared: false
    };
  }
  
  /**
   * Get achievement progress
   */
  getProgress(): {
    total: number;
    unlocked: number;
    percentage: number;
    byCategory: Record<string, { total: number; unlocked: number }>;
  } {
    const total = this.achievements.size;
    const unlocked = this.unlockedAchievements.size;
    
    const byCategory: Record<string, { total: number; unlocked: number }> = {};
    
    for (const achievement of this.achievements.values()) {
      if (!byCategory[achievement.category]) {
        byCategory[achievement.category] = { total: 0, unlocked: 0 };
      }
      byCategory[achievement.category].total++;
      if (this.unlockedAchievements.has(achievement.id)) {
        byCategory[achievement.category].unlocked++;
      }
    }
    
    return {
      total,
      unlocked,
      percentage: Math.round((unlocked / total) * 100),
      byCategory
    };
  }
  
  /**
   * Get next achievable achievements
   */
  getNextAchievable(limit: number = 3): Achievement[] {
    const achievable: Achievement[] = [];
    
    for (const [id, achievement] of this.achievements) {
      if (!this.unlockedAchievements.has(id)) {
        // Check if close to unlocking (simplified check)
        achievable.push(achievement);
        if (achievable.length >= limit) break;
      }
    }
    
    return achievable;
  }
  
  /**
   * Calculate total XP earned
   */
  getTotalXP(): number {
    let totalXP = 0;
    
    for (const id of this.unlockedAchievements) {
      const achievement = this.achievements.get(id);
      if (achievement) {
        totalXP += achievement.xp;
      }
    }
    
    return totalXP;
  }
  
  /**
   * Get user level based on XP
   */
  getLevel(xp: number): { level: number; title: string; nextLevelXP: number } {
    const levels = [
      { threshold: 0, title: 'Apprentice' },
      { threshold: 100, title: 'Collaborator' },
      { threshold: 300, title: 'Developer' },
      { threshold: 600, title: 'Engineer' },
      { threshold: 1000, title: 'Architect' },
      { threshold: 1500, title: 'Master' },
      { threshold: 2500, title: 'Sage' },
      { threshold: 5000, title: 'Legend' }
    ];
    
    let currentLevel = 0;
    let currentTitle = 'Apprentice';
    let nextThreshold = 100;
    
    for (let i = 0; i < levels.length; i++) {
      if (xp >= levels[i].threshold) {
        currentLevel = i + 1;
        currentTitle = levels[i].title;
        nextThreshold = levels[i + 1]?.threshold || 999999;
      }
    }
    
    return {
      level: currentLevel,
      title: currentTitle,
      nextLevelXP: nextThreshold - xp
    };
  }
}