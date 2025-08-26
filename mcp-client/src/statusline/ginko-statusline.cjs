#!/usr/bin/env node

/**
 * Ginko Status Line Coaching System
 * 
 * Provides real-time collaboration coaching through Claude Code's status line
 * Features progressive skill development, achievement tracking, and vibecheck detection
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const ConfigManager = require('./config-manager.cjs');
const SessionTracker = require('./session-tracker.cjs');
const PatternDetector = require('./pattern-detector.cjs');

// Read input from stdin (Claude Code provides session data as JSON)
let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', async () => {
  try {
    const sessionData = input ? JSON.parse(input) : {};
    const statusMessage = await generateStatusLine(sessionData);
    process.stdout.write(statusMessage);
  } catch (error) {
    // Fallback status on error
    process.stdout.write('🚀 Ginko Ready');
  }
});

/**
 * Main status line generation
 */
async function generateStatusLine(input) {
  // Check for rapport status from SessionAgent first
  const rapportStatus = await checkRapportStatus();
  if (rapportStatus) {
    return formatRapportStatus(rapportStatus);
  }
  
  // Fallback to regular coaching hints
  const context = await analyzeContext(input);
  const userProfile = await loadUserProfile(input.sessionId);
  const hint = generateCoachingHint(context, userProfile);
  
  return formatStatusLine(hint, context, userProfile);
}

/**
 * Analyze current session context
 */
async function analyzeContext(input) {
  const context = {
    sessionId: input.sessionId,
    currentDir: input.cwd || process.cwd(),
    model: input.model || 'unknown',
    sessionDuration: 0,
    currentPhase: 'implementing', // Default phase
    errorCount: 0,
    vibecheckNeeded: false,
    vibecheckActive: false,  // Currently in vibecheck
    vibecheckDecision: null, // Vibecheck resolution
    achievementUnlocked: null,
    inFlow: false,
    pattern: null,
    sessionResumed: false,
    agentActivity: null  // Track agent MCP calls
  };
  
  // Check for recent session start to detect fresh Claude Code launch
  try {
    const sessionCacheFile = path.join(os.homedir(), '.watchhill', 'session-start-time');
    let shouldShowResumption = false;
    
    if (fs.existsSync(sessionCacheFile)) {
      const lastStartTime = parseInt(fs.readFileSync(sessionCacheFile, 'utf8'));
      const timeSinceStart = Date.now() - lastStartTime;
      
      // If session started within last 2 minutes, show resumption message
      if (timeSinceStart < 2 * 60 * 1000) {
        shouldShowResumption = true;
        context.sessionDuration = timeSinceStart;
      }
    } else {
      // First time running, create the file
      shouldShowResumption = true;
      context.sessionDuration = 0;
      fs.writeFileSync(sessionCacheFile, Date.now().toString());
    }
    
    context.sessionResumed = shouldShowResumption;
  } catch (e) {
    // Silent fail for session detection
  }
  
  // Check for active vibecheck from conversation
  context.vibecheckActive = await detectActiveVibecheck(input);
  context.vibecheckDecision = await getVibecheckDecision(input);
  
  // Load session state if exists
  const stateFile = getStateFilePath(input.sessionId);
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      if (!context.sessionResumed) {
        context.sessionDuration = Date.now() - state.startTime;
      }
      context.errorCount = state.errorCount || 0;
      context.currentPhase = state.phase || 'implementing';
      
      // Pattern detection
      context.pattern = detectPattern(state);
      context.vibecheckNeeded = shouldSuggestVibecheck(state, context.pattern);
      context.inFlow = detectFlowState(state);
      
      // Check for achievements
      context.achievementUnlocked = checkAchievements(state);
      
      // Check for agent activity
      context.agentActivity = checkAgentActivity(state);
      
    } catch (e) {
      // Silent fail - use defaults
    }
  }
  
  // Check for recent agent activity
  const agentActivityFile = path.join(os.homedir(), '.watchhill', 'agent-activity.json');
  if (fs.existsSync(agentActivityFile)) {
    try {
      const activity = JSON.parse(fs.readFileSync(agentActivityFile, 'utf8'));
      const timeSinceActivity = Date.now() - activity.timestamp;
      
      // Show activity for 5 seconds
      if (timeSinceActivity < 5000) {
        context.agentActivity = activity;
      } else {
        // Clean up old activity
        fs.unlinkSync(agentActivityFile);
      }
    } catch (e) {
      // Silent fail
    }
  }
  
  return context;
}

/**
 * Detect collaboration patterns
 */
function detectPattern(state) {
  const patterns = {
    thrashing: {
      indicator: state.errorCount > 3 && state.progressRate < 0.2,
      name: 'thrashing',
      message: 'Multiple failed attempts detected'
    },
    rabbitHole: {
      indicator: state.timeSinceProgress > 30 * 60 * 1000, // 30 min
      name: 'rabbit-hole',
      message: 'Deep dive without progress'
    },
    flow: {
      indicator: state.progressRate > 0.7 && state.errorCount === 0,
      name: 'flow',
      message: 'Perfect momentum'
    },
    stuck: {
      indicator: state.timeSinceProgress > 15 * 60 * 1000 && state.errorCount > 1,
      name: 'stuck',
      message: 'Progress stalled'
    }
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    if (pattern.indicator) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Determine if vibecheck should be suggested
 */
function shouldSuggestVibecheck(state, pattern) {
  // Vibecheck triggers
  if (pattern && (pattern.name === 'thrashing' || pattern.name === 'stuck')) {
    return true;
  }
  
  if (state.errorCount > 5) {
    return true;
  }
  
  if (state.timeSinceProgress > 45 * 60 * 1000) { // 45 min
    return true;
  }
  
  return false;
}

/**
 * Detect flow state
 */
function detectFlowState(state) {
  return state.progressRate > 0.8 && 
         state.errorCount === 0 && 
         state.consistentCommits === true;
}

/**
 * Check for agent activity
 */
function checkAgentActivity(state) {
  // This would be populated by the agents
  if (state.lastAgentCall) {
    const activities = {
      'load_handoff': 'Loading session context...',
      'store_handoff': 'Saving session state...',
      'get_best_practices': 'Fetching best practices...',
      'suggest_best_practice': 'Getting AI guidance...',
      'score_collaboration': 'Analyzing collaboration metrics...'
    };
    
    return {
      action: state.lastAgentCall,
      message: activities[state.lastAgentCall] || 'Processing...',
      timestamp: state.lastAgentCallTime
    };
  }
  
  return null;
}

/**
 * Check for unlocked achievements
 */
function checkAchievements(state) {
  const achievements = {
    firstVibecheck: {
      condition: state.vibecheckCount === 1,
      name: 'First Vibecheck',
      icon: '🎯',
      xp: 50
    },
    patternSpotter: {
      condition: state.patternsSpotted > 5,
      name: 'Pattern Spotter',
      icon: '🔍',
      xp: 100
    },
    flowMaster: {
      condition: state.flowDuration > 2 * 60 * 60 * 1000, // 2 hours
      name: 'Flow Master',
      icon: '🌊',
      xp: 200
    }
  };
  
  for (const [key, achievement] of Object.entries(achievements)) {
    if (achievement.condition && !state.unlockedAchievements?.includes(key)) {
      return achievement;
    }
  }
  
  return null;
}

/**
 * Load user profile for personalized coaching
 */
async function loadUserProfile(sessionId) {
  const profilePath = path.join(os.homedir(), '.watchhill', 'profile.json');
  
  const defaultProfile = {
    level: 1,
    xp: 0,
    title: 'Apprentice',
    skillLevel: 'beginner',
    gamificationMode: 'balanced', // full-gamer, balanced, professional, minimal
    currentStreak: 0,
    achievements: []
  };
  
  if (fs.existsSync(profilePath)) {
    try {
      return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    } catch (e) {
      return defaultProfile;
    }
  }
  
  return defaultProfile;
}

/**
 * Generate contextual coaching hint
 */
function generateCoachingHint(context, profile) {
  // Agent activity takes highest priority (shows briefly)
  if (context.agentActivity) {
    return {
      message: context.agentActivity.message,
      icon: '⚡',
      type: 'agent-activity'
    };
  }
  
  // Session continuity takes priority for first few minutes
  if (context.sessionDuration < 2 * 60 * 1000 && context.sessionResumed) {
    return {
      message: "Session resumed - ready to continue!",
      icon: '🔄',
      type: 'continuity'
    };
  }
  
  // Achievement takes priority
  if (context.achievementUnlocked) {
    return {
      message: `${context.achievementUnlocked.name}!`,
      icon: context.achievementUnlocked.icon,
      type: 'achievement',
      xp: context.achievementUnlocked.xp
    };
  }
  
  // Active vibecheck in progress
  if (context.vibecheckActive) {
    return {
      message: "vibecheck...",
      icon: '🤔',
      type: 'vibecheck-active',
      animated: true
    };
  }
  
  // Vibecheck decision made
  if (context.vibecheckDecision) {
    return {
      message: `vibecheck: ${context.vibecheckDecision}`,
      icon: '✅',
      type: 'vibecheck-complete'
    };
  }
  
  // Vibecheck suggestion
  if (context.vibecheckNeeded) {
    return {
      message: "Vibecheck suggested - feeling stuck?",
      icon: '🎯',
      type: 'vibecheck'
    };
  }
  
  // Flow state celebration
  if (context.inFlow) {
    return {
      message: `Flow state ${Math.floor(context.sessionDuration / 60000)} min`,
      icon: '🌊',
      type: 'flow'
    };
  }
  
  // Pattern-based hints
  if (context.pattern) {
    const hints = {
      'thrashing': "Try a different approach?",
      'rabbit-hole': "Return to original goal?",
      'stuck': "Consider taking a break",
      'flow': "Keep this momentum!"
    };
    
    return {
      message: hints[context.pattern.name],
      icon: getPatternIcon(context.pattern.name),
      type: 'hint'
    };
  }
  
  // Default message - Ginko session capture active
  return {
    message: "Ginko session capture active",
    icon: '🎯',
    type: 'default'
  };
}

/**
 * Format the final status line message
 */
function formatStatusLine(hint, context, profile) {
  // ANSI color codes
  const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    brightBlue: '\x1b[1m\x1b[38;5;147m',  // Bold periwinkle blue (256-color)
    brightCyan: '\x1b[38;5;159m',  // Light blue for messages
    bold: '\x1b[1m',
    reset: '\x1b[0m'
  };
  
  // Different formats based on gamification mode
  switch (profile.gamificationMode) {
    case 'full-gamer':
      if (hint.type === 'achievement') {
        return `${colors.brightBlue}Ginko:${colors.reset} ${hint.icon} ${colors.yellow}ACHIEVEMENT! ${hint.message} +${hint.xp}XP${colors.reset}`;
      }
      return `${colors.brightBlue}Ginko:${colors.reset} Lvl ${profile.level} ${profile.title} | ${hint.icon} ${colors.brightCyan}${hint.message}${colors.reset}`;
      
    case 'professional':
      if (hint.type === 'vibecheck') {
        return `${colors.brightBlue}Ginko:${colors.reset} ${colors.yellow}⚠ Alignment check suggested${colors.reset}`;
      }
      return `${colors.brightBlue}Ginko:${colors.reset} ${hint.icon} ${hint.message}`;
      
    case 'minimal':
      if (hint.type === 'vibecheck') {
        return `${colors.brightBlue}Ginko:${colors.reset} Vibecheck?`;
      }
      return `${colors.brightBlue}Ginko:${colors.reset} ${hint.message}`;
      
    default: // balanced
      if (hint.type === 'achievement') {
        return `${colors.brightBlue}Ginko:${colors.reset} ${hint.icon} ${colors.green}${hint.message}${colors.reset}`;
      }
      if (hint.type === 'vibecheck') {
        return `${colors.brightBlue}Ginko:${colors.reset} ${hint.icon} ${colors.bold}${colors.yellow}${hint.message}${colors.reset}`;
      }
      if (hint.type === 'vibecheck-active') {
        // Animated dots for active vibecheck
        const dots = '.'.repeat(1 + (Date.now() % 3000) / 1000);
        return `${colors.brightBlue}Ginko:${colors.reset} ${hint.icon} ${colors.yellow}${hint.message}${dots}${colors.reset}`;
      }
      if (hint.type === 'vibecheck-complete') {
        return `${colors.brightBlue}Ginko:${colors.reset} ${hint.icon} ${colors.green}${hint.message}${colors.reset}`;
      }
      if (hint.type === 'flow') {
        return `${colors.brightBlue}Ginko:${colors.reset} ${hint.icon} ${colors.brightCyan}${hint.message}${colors.reset}`;
      }
      if (hint.type === 'agent-activity') {
        return `${colors.brightBlue}Ginko:${colors.reset} ${hint.icon} ${colors.brightCyan}${hint.message}${colors.reset}`;
      }
      return `${colors.brightBlue}Ginko:${colors.reset} ${hint.icon} ${colors.brightCyan}${hint.message}${colors.reset}`;
  }
}

/**
 * Helper functions
 */
function getStateFilePath(sessionId) {
  const stateDir = path.join(os.homedir(), '.watchhill', 'sessions');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  return path.join(stateDir, `${sessionId}.json`);
}

function getPhaseIcon(phase) {
  const icons = {
    'planning': '📋',
    'implementing': '⚡',
    'debugging': '🔍',
    'reviewing': '✅'
  };
  return icons[phase] || '💻';
}

function getPatternIcon(pattern) {
  const icons = {
    'thrashing': '⚠️',
    'rabbit-hole': '🕳️',
    'stuck': '🛑',
    'flow': '🌊'
  };
  return icons[pattern] || '🎯';
}

/**
 * Check for rapport status from SessionAgent
 */
async function checkRapportStatus() {
  const statusFile = path.join(os.tmpdir(), 'watchhill-status.json');
  
  try {
    if (fs.existsSync(statusFile)) {
      const stats = fs.statSync(statusFile);
      const age = Date.now() - stats.mtimeMs;
      
      // Only use if updated within last 10 seconds
      if (age < 10000) {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        return status;
      }
    }
  } catch (e) {
    // Silent fail - fallback to regular coaching
  }
  
  return null;
}

/**
 * Detect active vibecheck from conversation patterns
 */
async function detectActiveVibecheck(input) {
  // Check recent conversation file if available
  const vibecheckFile = path.join(os.tmpdir(), 'watchhill-vibecheck.json');
  
  try {
    if (fs.existsSync(vibecheckFile)) {
      const stats = fs.statSync(vibecheckFile);
      const age = Date.now() - stats.mtimeMs;
      
      // Active if updated within last 30 seconds
      if (age < 30000) {
        const vibecheck = JSON.parse(fs.readFileSync(vibecheckFile, 'utf8'));
        return vibecheck.active === true;
      }
    }
  } catch (e) {
    // Silent fail
  }
  
  // Check for vibecheck patterns in recent messages
  const patterns = [
    /vibecheck/i,
    /hold on.*actually/i,
    /wait.*thinking/i,
    /let's reconsider/i
  ];
  
  // This would ideally check actual conversation history
  // For now, we'll rely on the vibecheck file
  return false;
}

/**
 * Get vibecheck decision if one was made
 */
async function getVibecheckDecision(input) {
  const vibecheckFile = path.join(os.tmpdir(), 'watchhill-vibecheck.json');
  
  try {
    if (fs.existsSync(vibecheckFile)) {
      const vibecheck = JSON.parse(fs.readFileSync(vibecheckFile, 'utf8'));
      if (vibecheck.decision && vibecheck.timestamp) {
        const age = Date.now() - vibecheck.timestamp;
        // Show decision for 10 seconds after it's made
        if (age < 10000) {
          return vibecheck.decision;
        }
      }
    }
  } catch (e) {
    // Silent fail
  }
  
  return null;
}

/**
 * Format rapport status from SessionAgent
 */
function formatRapportStatus(status) {
  const brandPrefix = '\x1b[38;5;141m\x1b[1mGinko:\x1b[0m'; // Periwinkle blue + bold
  
  // Special handling for achievements (already has emoji in message)
  if (status.phase === 'achievement' && status.message.includes('🏆')) {
    return `${brandPrefix} ${status.message}`;
  }
  
  // Check if message already contains any emoji
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F900}-\u{1F9FF}]|❌|✅|⚠️|⚡|🔧|💡|🔍|✨|🌊|🎯|🚀|👋|💪|🎉|🏆/u;
  const hasEmoji = emojiRegex.test(status.message);
  
  // Build the message - only add emoji if message doesn't have one
  let message;
  if (hasEmoji) {
    message = `${brandPrefix} ${status.message}`;
  } else {
    const emoji = status.emoji || '🎯';
    message = `${brandPrefix} ${emoji} ${status.message}`;
  }
  
  // Add session duration for longer sessions
  if (status.metrics?.sessionMinutes > 5) {
    message += ` [${status.metrics.sessionMinutes}m]`;
  }
  
  return message;
}