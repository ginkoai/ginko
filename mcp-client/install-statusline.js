#!/usr/bin/env node

/**
 * Ginko Status Line Installer
 * 
 * Sets up the gamified coaching status line in Claude Code
 * Usage: node install-statusline.js [--profile=gamer|balanced|professional|minimal]
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const profileArg = args.find(arg => arg.startsWith('--profile='));
const profile = profileArg ? profileArg.split('=')[1] : 'balanced';

// Validate profile
const validProfiles = ['gamer', 'balanced', 'professional', 'minimal'];
if (!validProfiles.includes(profile)) {
  console.error(`❌ Invalid profile: ${profile}`);
  console.error(`   Valid profiles: ${validProfiles.join(', ')}`);
  process.exit(1);
}

console.log('🚀 Ginko Status Line Installer');
console.log('===================================');
console.log(`Profile: ${profile}`);
console.log('');

// Paths
const homeDir = os.homedir();
const claudeSettingsPath = path.join(homeDir, '.claude', 'settings.json');
const ginkoDir = path.join(homeDir, '.ginko');
const statusLineScript = path.join(__dirname, 'src', 'statusline', 'ginko-statusline.cjs');

// Step 1: Create Ginko directory
console.log('📁 Creating Ginko directory...');
if (!fs.existsSync(ginkoDir)) {
  fs.mkdirSync(ginkoDir, { recursive: true });
  fs.mkdirSync(path.join(ginkoDir, 'sessions'), { recursive: true });
  console.log('   ✓ Created ~/.ginko/');
} else {
  console.log('   ✓ Directory exists');
}

// Step 2: Create user profile
console.log('👤 Setting up user profile...');
const profilePath = path.join(ginkoDir, 'profile.json');
const profileData = {
  level: 1,
  xp: 0,
  title: 'Apprentice',
  skillLevel: 'beginner',
  gamificationMode: profile === 'gamer' ? 'full-gamer' : profile,
  currentStreak: 0,
  achievements: [],
  installedAt: new Date().toISOString(),
  version: '0.1.0'
};

fs.writeFileSync(profilePath, JSON.stringify(profileData, null, 2));
console.log(`   ✓ Profile created (${profile} mode)`);

// Step 3: Check if Claude settings exists
console.log('⚙️  Configuring Claude Code...');
let settings = {};
let settingsExists = false;

if (fs.existsSync(claudeSettingsPath)) {
  try {
    settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
    settingsExists = true;
    console.log('   ✓ Found existing settings');
  } catch (error) {
    console.log('   ⚠️  Could not parse existing settings, creating new');
  }
} else {
  // Create .claude directory if it doesn't exist
  const claudeDir = path.dirname(claudeSettingsPath);
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
  console.log('   ✓ Creating new settings');
}

// Step 4: Add status line configuration
const statusLineConfig = {
  command: `node ${statusLineScript}`,
  refreshInterval: 5000 // Update every 5 seconds
};

// Check if status line is already configured
if (settings.statusLine && settings.statusLine.command?.includes('ginko')) {
  console.log('   ⚠️  Ginko status line already configured');
  console.log('      Would you like to update? (This will overwrite existing config)');
  // In a real implementation, we'd prompt for confirmation
}

settings.statusLine = statusLineConfig;

// Step 5: Save settings
fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));
console.log('   ✓ Status line configured');

// Step 6: Create welcome message based on profile
console.log('');
console.log('✨ Installation complete!');
console.log('');

const welcomeMessages = {
  'gamer': `🎮 Welcome to Ginko, Apprentice!
   
   Your journey begins now:
   • Level 1 (0 XP) - Ready to level up!
   • First achievement awaits: Call your first vibecheck
   • Daily quests available
   • Leaderboards ready
   
   The status line will show your progress and coaching hints.
   Say "vibecheck" anytime you feel stuck!`,
   
  'balanced': `🚀 Welcome to Ginko!
   
   You'll see contextual coaching in your status line:
   • Smart pattern detection
   • Vibecheck suggestions when needed
   • Achievement celebrations
   • Progress tracking
   
   Say "vibecheck" anytime to recalibrate.`,
   
  'professional': `Welcome to Ginko Professional
   
   Status line features:
   • Collaboration metrics
   • Pattern detection
   • Efficiency tracking
   • Vibecheck availability
   
   All gamification elements are subtle.`,
   
  'minimal': `Ginko installed.
   
   Status line active.
   Say "vibecheck" when needed.`
};

console.log(welcomeMessages[profile] || welcomeMessages['balanced']);

console.log('');
console.log('📝 Next steps:');
console.log('   1. Restart Claude Code to activate status line');
console.log('   2. Start a new session to see coaching hints');
console.log('   3. Try "vibecheck" when you feel stuck');

// Step 7: Verify installation
console.log('');
console.log('🔍 Verifying installation...');

// Check if status line script is executable
try {
  const testOutput = execSync(`echo '{"sessionId":"test","cwd":"${process.cwd()}","model":"test"}' | node ${statusLineScript}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  
  // Remove ANSI codes for checking
  const cleanOutput = testOutput.replace(/\x1b\[[0-9;]*m/g, '');
  
  if (cleanOutput.length > 0) {
    console.log('   ✓ Status line script working');
    console.log(`   Preview: "${cleanOutput.trim()}"`);
  } else {
    console.log('   ⚠️  Status line script returned no output');
  }
} catch (error) {
  console.log('   ❌ Status line script error:', error.message);
  console.log('      Please check the installation');
}

console.log('');
console.log('🎯 Installation complete! Happy vibecoding!');

// Create a quick reference card
const quickRefPath = path.join(ginkoDir, 'quick-reference.md');
const quickRef = `# Ginko Quick Reference

## Your Profile: ${profile}

## Status Line Icons
- 🎯 Vibecheck suggestion
- 🌊 Flow state
- ⚡ Implementation phase
- 📋 Planning phase
- 🔍 Debugging phase
- ✅ Review phase
- 🏆 Achievement unlocked
- ⚠️ Pattern detected

## Commands
- **vibecheck** - Pause and recalibrate with AI
- Status line updates automatically

## Achievements to Unlock
- 🎯 First Recalibration - Call your first vibecheck
- 🌊 Flow Initiate - Maintain flow for 15 minutes
- 📚 Context Keeper - Create 5 handoffs
- 🔍 Pattern Spotter - Recognize patterns early
- 🕵️ Debug Detective - Solve 10 errors systematically

## Profile Location
~/.ginko/profile.json

## Change Profile
Run: node install-statusline.js --profile=[gamer|balanced|professional|minimal]

---
Generated on ${new Date().toISOString()}
`;

fs.writeFileSync(quickRefPath, quickRef);
console.log(`📚 Quick reference saved to: ${quickRefPath}`);