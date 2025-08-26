/**
 * Configuration Manager for Ginko Status Line
 * 
 * Handles user profiles, preferences, and gamification settings
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.watchhill');
    this.profilePath = path.join(this.configDir, 'profile.json');
    this.preferencesPath = path.join(this.configDir, 'preferences.json');
    this.achievementsPath = path.join(this.configDir, 'achievements.json');
    
    this.ensureConfigDir();
    this.loadConfig();
  }
  
  /**
   * Ensure config directory exists
   */
  ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      fs.mkdirSync(path.join(this.configDir, 'sessions'), { recursive: true });
    }
  }
  
  /**
   * Load all configuration
   */
  loadConfig() {
    this.profile = this.loadProfile();
    this.preferences = this.loadPreferences();
    this.achievements = this.loadAchievements();
  }
  
  /**
   * Load user profile
   */
  loadProfile() {
    const defaultProfile = {
      level: 1,
      xp: 0,
      title: 'Apprentice',
      skillLevel: 'beginner',
      gamificationMode: 'balanced',
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      totalVibechecks: 0,
      installedAt: new Date().toISOString()
    };
    
    if (fs.existsSync(this.profilePath)) {
      try {
        const profile = JSON.parse(fs.readFileSync(this.profilePath, 'utf8'));
        return { ...defaultProfile, ...profile };
      } catch (error) {
        console.error('[ConfigManager] Error loading profile:', error);
        return defaultProfile;
      }
    }
    
    // Create default profile
    this.saveProfile(defaultProfile);
    return defaultProfile;
  }
  
  /**
   * Save user profile
   */
  saveProfile(profile) {
    try {
      fs.writeFileSync(this.profilePath, JSON.stringify(profile, null, 2));
      this.profile = profile;
    } catch (error) {
      console.error('[ConfigManager] Error saving profile:', error);
    }
  }
  
  /**
   * Load preferences
   */
  loadPreferences() {
    const defaultPreferences = {
      statusLineEnabled: true,
      achievementNotifications: true,
      soundEffects: false,
      autoSave: true,
      autoSaveInterval: 5 * 60 * 1000, // 5 minutes
      vibecheckReminders: true,
      flowStateTracking: true,
      dailyQuests: true,
      teamFeatures: true
    };
    
    if (fs.existsSync(this.preferencesPath)) {
      try {
        const prefs = JSON.parse(fs.readFileSync(this.preferencesPath, 'utf8'));
        return { ...defaultPreferences, ...prefs };
      } catch (error) {
        return defaultPreferences;
      }
    }
    
    return defaultPreferences;
  }
  
  /**
   * Save preferences
   */
  savePreferences(preferences) {
    try {
      fs.writeFileSync(this.preferencesPath, JSON.stringify(preferences, null, 2));
      this.preferences = preferences;
    } catch (error) {
      console.error('[ConfigManager] Error saving preferences:', error);
    }
  }
  
  /**
   * Load achievements
   */
  loadAchievements() {
    if (fs.existsSync(this.achievementsPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.achievementsPath, 'utf8'));
      } catch (error) {
        return { unlocked: [], progress: {} };
      }
    }
    
    return { unlocked: [], progress: {} };
  }
  
  /**
   * Save achievements
   */
  saveAchievements(achievements) {
    try {
      fs.writeFileSync(this.achievementsPath, JSON.stringify(achievements, null, 2));
      this.achievements = achievements;
    } catch (error) {
      console.error('[ConfigManager] Error saving achievements:', error);
    }
  }
  
  /**
   * Update XP and level
   */
  addXP(amount) {
    this.profile.xp += amount;
    
    // Check for level up
    const newLevel = this.calculateLevel(this.profile.xp);
    if (newLevel.level > this.profile.level) {
      this.profile.level = newLevel.level;
      this.profile.title = newLevel.title;
      
      // Level up celebration
      console.log(`[Level Up] Congratulations! You're now level ${newLevel.level} - ${newLevel.title}`);
    }
    
    this.saveProfile(this.profile);
    return this.profile;
  }
  
  /**
   * Calculate level from XP
   */
  calculateLevel(xp) {
    const levels = [
      { threshold: 0, level: 1, title: 'Apprentice' },
      { threshold: 100, level: 2, title: 'Novice' },
      { threshold: 250, level: 3, title: 'Collaborator' },
      { threshold: 500, level: 4, title: 'Developer' },
      { threshold: 1000, level: 5, title: 'Engineer' },
      { threshold: 1750, level: 6, title: 'Architect' },
      { threshold: 2750, level: 7, title: 'Master' },
      { threshold: 4000, level: 8, title: 'Expert' },
      { threshold: 6000, level: 9, title: 'Sage' },
      { threshold: 10000, level: 10, title: 'Legend' }
    ];
    
    let result = levels[0];
    for (const level of levels) {
      if (xp >= level.threshold) {
        result = level;
      }
    }
    
    return result;
  }
  
  /**
   * Unlock achievement
   */
  unlockAchievement(achievementId, xpReward = 0) {
    if (!this.achievements.unlocked.includes(achievementId)) {
      this.achievements.unlocked.push(achievementId);
      this.achievements[achievementId] = {
        unlockedAt: new Date().toISOString(),
        xpEarned: xpReward
      };
      
      this.saveAchievements(this.achievements);
      
      if (xpReward > 0) {
        this.addXP(xpReward);
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Update achievement progress
   */
  updateAchievementProgress(achievementId, progress) {
    if (!this.achievements.progress) {
      this.achievements.progress = {};
    }
    
    this.achievements.progress[achievementId] = progress;
    this.saveAchievements(this.achievements);
  }
  
  /**
   * Get gamification profile settings
   */
  getGamificationSettings() {
    const profiles = {
      'full-gamer': {
        showLevel: true,
        showXP: true,
        showStreak: true,
        showAchievements: true,
        showQuests: true,
        showLeaderboard: true,
        celebrationStyle: 'epic',
        statusFormat: 'detailed'
      },
      'balanced': {
        showLevel: true,
        showXP: false,
        showStreak: true,
        showAchievements: true,
        showQuests: false,
        showLeaderboard: false,
        celebrationStyle: 'moderate',
        statusFormat: 'balanced'
      },
      'professional': {
        showLevel: false,
        showXP: false,
        showStreak: false,
        showAchievements: true,
        showQuests: false,
        showLeaderboard: false,
        celebrationStyle: 'subtle',
        statusFormat: 'minimal'
      },
      'minimal': {
        showLevel: false,
        showXP: false,
        showStreak: false,
        showAchievements: false,
        showQuests: false,
        showLeaderboard: false,
        celebrationStyle: 'none',
        statusFormat: 'minimal'
      }
    };
    
    return profiles[this.profile.gamificationMode] || profiles['balanced'];
  }
  
  /**
   * Track session
   */
  trackSession(sessionId) {
    this.profile.totalSessions++;
    
    // Update streak
    const lastSession = this.profile.lastSessionDate;
    const today = new Date().toDateString();
    
    if (lastSession) {
      const lastDate = new Date(lastSession).toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      
      if (lastDate === yesterday || lastDate === today) {
        // Continue streak
        if (lastDate !== today) {
          this.profile.currentStreak++;
        }
      } else {
        // Break streak
        this.profile.currentStreak = 1;
      }
    } else {
      this.profile.currentStreak = 1;
    }
    
    this.profile.lastSessionDate = new Date().toISOString();
    this.profile.longestStreak = Math.max(this.profile.longestStreak, this.profile.currentStreak);
    
    this.saveProfile(this.profile);
  }
  
  /**
   * Track vibecheck
   */
  trackVibecheck() {
    this.profile.totalVibechecks++;
    this.saveProfile(this.profile);
    
    // Check for first vibecheck achievement
    if (this.profile.totalVibechecks === 1) {
      this.unlockAchievement('first-vibecheck', 50);
      return {
        achievement: 'first-vibecheck',
        message: 'First Vibecheck - You learned to pause and recalibrate!'
      };
    }
    
    return null;
  }
}

module.exports = ConfigManager;