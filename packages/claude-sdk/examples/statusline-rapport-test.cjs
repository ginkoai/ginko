#!/usr/bin/env node

/**
 * Rapport-Enabled Statusline Test Agent
 * Simulates SessionAgent rapport context with dynamic emotional messaging
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class RapportStatuslineAgent {
  constructor() {
    this.sessionStartTime = Date.now();
    this.completedTasks = 0;
    this.errorCount = 0;
    this.currentPhase = 'starting';
    this.userName = 'Chris';
    this.lastAchievement = null;
    this.messageHistory = [];
  }

  /**
   * Generate rapport context based on session state
   */
  generateRapportContext() {
    const sessionMinutes = Math.floor((Date.now() - this.sessionStartTime) / 60000);
    
    // Determine emotional tone
    let emotionalTone = 'focused';
    let urgency = 'normal';
    
    if (this.completedTasks >= 3) {
      emotionalTone = 'excited';
    } else if (this.errorCount > 2) {
      emotionalTone = 'determined';
    } else if (this.completedTasks > 0 && this.errorCount === 0) {
      emotionalTone = 'celebratory';
    } else if (sessionMinutes < 1) {
      emotionalTone = 'welcoming';
    }
    
    // Time-based greeting
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    return {
      emotionalTone,
      urgency,
      sessionMinutes,
      timeOfDay,
      completedTasks: this.completedTasks,
      errorCount: this.errorCount,
      phase: this.currentPhase
    };
  }

  /**
   * Generate personalized message based on rapport context
   */
  generateMessage(context) {
    const messages = {
      welcoming: [
        `Good ${context.timeOfDay}, ${this.userName}! Ready to build something amazing?`,
        `Welcome back! Let's continue where we left off`,
        `Great to see you, ${this.userName}! Session initialized`
      ],
      focused: [
        `Deep focus mode - ${context.completedTasks} tasks completed`,
        `Making steady progress on task ${context.completedTasks + 1}`,
        `In the zone - maintaining momentum`
      ],
      excited: [
        `🔥 On fire! ${context.completedTasks} tasks crushed!`,
        `Incredible progress, ${this.userName}! Keep it up!`,
        `Productivity streak: ${context.completedTasks} in a row!`
      ],
      determined: [
        `Working through challenges - you've got this!`,
        `Persistence pays off - debugging error ${context.errorCount}`,
        `Every bug fixed makes us stronger`
      ],
      celebratory: [
        `🎉 Milestone reached! ${context.completedTasks} completed!`,
        `Victory! Another task down`,
        `Excellent work on that last one, ${this.userName}!`
      ]
    };
    
    const toneMessages = messages[context.emotionalTone] || messages.focused;
    const message = toneMessages[Math.floor(Math.random() * toneMessages.length)];
    
    return message;
  }

  /**
   * Get emoji for emotional tone
   */
  getEmoji(tone) {
    const emojis = {
      welcoming: '👋',
      focused: '🎯',
      excited: '🚀',
      determined: '💪',
      celebratory: '🎉'
    };
    return emojis[tone] || '✨';
  }

  /**
   * Simulate session events
   */
  simulateProgress() {
    const random = Math.random();
    
    // Simulate different events
    if (random < 0.2) {
      // Task completed
      this.completedTasks++;
      this.currentPhase = 'task-complete';
    } else if (random < 0.3) {
      // Error encountered
      this.errorCount++;
      this.currentPhase = 'debugging';
    } else if (random < 0.4) {
      // Achievement unlocked
      this.lastAchievement = 'Flow State Master';
      this.currentPhase = 'achievement';
    } else {
      // Normal work
      this.currentPhase = 'working';
    }
  }

  /**
   * Update statusline with rapport-aware message
   */
  updateStatus() {
    this.simulateProgress();
    
    const context = this.generateRapportContext();
    const message = this.generateMessage(context);
    const emoji = this.getEmoji(context.emotionalTone);
    
    // Special handling for achievements
    let displayMessage = message;
    if (this.currentPhase === 'achievement' && this.lastAchievement) {
      displayMessage = `🏆 Achievement: ${this.lastAchievement}!`;
      this.lastAchievement = null; // Clear after showing
    }
    
    // Build status object
    const status = {
      message: displayMessage,
      emoji: emoji,
      rapportContext: context,
      timestamp: Date.now(),
      phase: this.currentPhase,
      metrics: {
        tasksCompleted: this.completedTasks,
        errorCount: this.errorCount,
        sessionMinutes: context.sessionMinutes
      }
    };
    
    // Write to temp file
    const statusFile = path.join(os.tmpdir(), 'watchhill-rapport-status.json');
    
    try {
      fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
      
      // Console output for testing
      console.log(`[${context.sessionMinutes}m] ${emoji} ${displayMessage}`);
      console.log(`  └─ Tone: ${context.emotionalTone} | Tasks: ${this.completedTasks} | Errors: ${this.errorCount}\n`);
    } catch (error) {
      console.error('Failed to write status:', error);
    }
  }

  /**
   * Start the agent
   */
  start() {
    console.log('🚀 WatchHill Rapport Statusline Test Agent');
    console.log(`👤 User: ${this.userName}`);
    console.log(`📁 Status file: ${path.join(os.tmpdir(), 'watchhill-rapport-status.json')}`);
    console.log('Press Ctrl+C to stop\n');
    console.log('─'.repeat(60) + '\n');
    
    // Initial update
    this.updateStatus();
    
    // Update every 3 seconds
    const interval = setInterval(() => this.updateStatus(), 3000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n' + '─'.repeat(60));
      console.log(`\n📊 Session Summary:`);
      console.log(`  • Duration: ${Math.floor((Date.now() - this.sessionStartTime) / 60000)} minutes`);
      console.log(`  • Tasks Completed: ${this.completedTasks}`);
      console.log(`  • Errors Encountered: ${this.errorCount}`);
      console.log('\n👋 Thanks for the session, ' + this.userName + '!');
      
      clearInterval(interval);
      
      // Clean up
      const statusFile = path.join(os.tmpdir(), 'watchhill-rapport-status.json');
      try {
        fs.unlinkSync(statusFile);
      } catch (e) {
        // Ignore
      }
      
      process.exit(0);
    });
  }
}

// Run the agent
const agent = new RapportStatuslineAgent();
agent.start();