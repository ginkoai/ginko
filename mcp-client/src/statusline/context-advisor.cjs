/**
 * Context Advisor Module
 * Provides intelligent recommendations for /context, /compact, and handoff
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Calculate context pressure score from proxy metrics
 * @returns {number} Score from 0-5 indicating context pressure
 */
function calculateContextScore(state) {
  let score = 0;
  
  // Tool count contribution (max 2 points)
  const toolCount = state.toolCount || 0;
  score += Math.min(2, toolCount / 50);
  
  // Session duration contribution (max 1.5 points)
  const sessionHours = (Date.now() - (state.sessionStart || Date.now())) / (1000 * 60 * 60);
  score += Math.min(1.5, sessionHours / 3);
  
  // File operations contribution (max 1 point)
  const fileOps = (state.fileReads || 0) + (state.fileWrites || 0);
  score += Math.min(1, fileOps / 30);
  
  // Velocity contribution (max 0.5 points)
  const velocity = state.velocity || 0;
  if (velocity > 3) score += 0.5;
  
  return Math.min(5, score);
}

/**
 * Detect current work patterns
 */
function detectWorkPatterns(state) {
  const patterns = {
    debugging: false,
    implementing: false,
    exploring: false,
    stuck: false,
    taskComplete: false,
    blocked: false
  };
  
  // Check tool history for patterns
  const history = state.toolHistory || [];
  const recentTools = history.slice(-10);
  
  // Debugging pattern: errors + repeated edits
  if (state.errorCount > 2 || recentTools.filter(t => t === 'Edit').length > 3) {
    patterns.debugging = true;
  }
  
  // Exploring pattern: lots of reads/searches
  if (recentTools.filter(t => ['Read', 'Grep', 'Glob', 'WebSearch'].includes(t)).length > 5) {
    patterns.exploring = true;
  }
  
  // Implementing pattern: balanced reads and writes
  if (recentTools.filter(t => ['Write', 'Edit', 'MultiEdit'].includes(t)).length > 2) {
    patterns.implementing = true;
  }
  
  // Stuck pattern: repetition without progress
  if (state.timeSinceProgress > 15 * 60 * 1000 || state.repetitionCount > 3) {
    patterns.stuck = true;
  }
  
  // Task complete: recent successful operations
  if (state.recentSuccess || state.taskMarkedComplete) {
    patterns.taskComplete = true;
  }
  
  // Blocked: waiting on external dependency
  if (state.blockedTime > 5 * 60 * 1000) {
    patterns.blocked = true;
  }
  
  return patterns;
}

/**
 * Generate smart compact instructions based on patterns
 */
function generateCompactInstructions(state) {
  const patterns = detectWorkPatterns(state);
  const instructions = [];
  
  // Base instruction
  instructions.push("Preserve recent work context and active task");
  
  // Pattern-specific preservation
  if (patterns.debugging) {
    instructions.push("Keep all error messages, stack traces, and debugging attempts");
    instructions.push("Preserve the problem description and working hypothesis");
  }
  
  if (patterns.implementing) {
    instructions.push("Keep all modified files and architectural decisions");
    instructions.push("Preserve TODO items and the implementation plan");
  }
  
  if (patterns.exploring) {
    instructions.push("Keep search results and discovered file patterns");
    instructions.push("Preserve key findings and important file locations");
  }
  
  if (patterns.stuck || patterns.blocked) {
    instructions.push("Keep blocker descriptions and all attempted workarounds");
    instructions.push("Preserve investigation notes and context");
  }
  
  // Add current task if known
  if (state.currentTask) {
    instructions.push(`Maintain full context for: ${state.currentTask}`);
  }
  
  // Add file context if working on specific files
  if (state.activeFiles && state.activeFiles.length > 0) {
    instructions.push(`Keep context for files: ${state.activeFiles.slice(0, 3).join(', ')}`);
  }
  
  return instructions.join(". ");
}

/**
 * Get smart recommendation based on context and patterns
 */
function getSmartRecommendation(state) {
  const contextScore = calculateContextScore(state);
  const patterns = detectWorkPatterns(state);
  const sessionHours = (Date.now() - (state.sessionStart || Date.now())) / (1000 * 60 * 60);
  
  // Check when user last checked context
  const timeSinceContextCheck = Date.now() - (state.lastContextCheck || 0);
  const checkedRecently = timeSinceContextCheck < 30 * 60 * 1000; // 30 min
  
  // Priority 1: Handle stuck/blocked situations
  if (patterns.stuck || patterns.blocked) {
    return {
      action: 'handoff',
      icon: '🤔',
      message: 'Seems stuck - capture handoff for fresh perspective?',
      confidence: 'high',
      reason: 'stuck-pattern'
    };
  }
  
  // Priority 2: Natural breakpoints
  if (patterns.taskComplete) {
    return {
      action: 'handoff',
      icon: '✅',
      message: 'Task complete - document with handoff?',
      confidence: 'high',
      reason: 'task-complete'
    };
  }
  
  // Priority 3: Session fatigue
  if (sessionHours > 3.5) {
    return {
      action: 'handoff',
      icon: '⏰',
      message: 'Long session - break with handoff?',
      confidence: 'medium',
      reason: 'session-fatigue'
    };
  }
  
  // Priority 4: Context management based on score
  if (contextScore >= 4) {
    // Critical - needs immediate action
    const instructions = generateCompactInstructions(state);
    return {
      action: 'compact',
      icon: '🚨',
      message: 'High context - /compact strongly recommended',
      helper: `/compact "${instructions}"`,
      confidence: 'high',
      reason: 'critical-context'
    };
  } else if (contextScore >= 3.5 && checkedRecently) {
    // High usage and user knows it
    const instructions = generateCompactInstructions(state);
    return {
      action: 'compact',
      icon: '📈',
      message: 'Context filling - /compact recommended',
      helper: `/compact "${instructions}"`,
      confidence: 'medium-high',
      reason: 'high-context'
    };
  } else if (contextScore >= 2.5 && !checkedRecently) {
    // Moderate usage, suggest checking
    return {
      action: 'context',
      icon: '📊',
      message: `${getActivityDescription(state)} - check /context`,
      confidence: 'medium',
      reason: 'check-context'
    };
  } else if (contextScore >= 2) {
    // Light reminder
    return {
      action: 'info',
      icon: '💡',
      message: 'Tip: /context shows usage, /compact available',
      confidence: 'low',
      reason: 'gentle-reminder'
    };
  }
  
  return null;
}

/**
 * Get human-readable activity description
 */
function getActivityDescription(state) {
  const fileOps = (state.fileReads || 0) + (state.fileWrites || 0);
  const toolCount = state.toolCount || 0;
  
  if (fileOps > 30) return "Many file operations";
  if (state.searchCount > 10) return "Extensive searching";
  if (toolCount > 50) return "Heavy tool usage";
  if (state.velocity > 3) return "Rapid activity";
  
  const sessionHours = (Date.now() - (state.sessionStart || Date.now())) / (1000 * 60 * 60);
  if (sessionHours > 2) return "Long session";
  
  return "Moderate activity";
}

/**
 * Write compact helper file for user
 */
function writeCompactHelper(recommendation) {
  if (!recommendation || recommendation.action !== 'compact' || !recommendation.helper) {
    return;
  }
  
  const ginkoDir = path.join(os.homedir(), '.ginko');
  if (!fs.existsSync(ginkoDir)) {
    fs.mkdirSync(ginkoDir, { recursive: true });
  }
  
  const helperContent = `# Compact Helper
Generated: ${new Date().toLocaleString()}

## Recommended Command
${recommendation.helper}

## Why This Recommendation?
- Reason: ${recommendation.reason}
- Confidence: ${recommendation.confidence}
- Pattern: ${recommendation.message}

## Alternative Usage
You can also use:
1. Run: /compact
2. When prompted, provide these instructions:
   ${recommendation.helper.replace('/compact "', '').replace('"', '')}

## What Will Be Preserved
Based on your current work pattern, the compact operation will preserve:
- Recent work context and active files
- Error messages and debugging context (if debugging)
- Search results and findings (if exploring)
- Implementation decisions and TODOs (if building)

## Next Steps After Compact
1. Verify important context is still available
2. Continue with your current task
3. Use /context to check new usage levels
`;
  
  fs.writeFileSync(
    path.join(ginkoDir, 'compact-helper.txt'),
    helperContent,
    'utf8'
  );
}

/**
 * Main advisor function to be called from statusline
 */
function getContextAdvice(state) {
  const recommendation = getSmartRecommendation(state);
  
  if (recommendation && recommendation.action === 'compact') {
    writeCompactHelper(recommendation);
  }
  
  return recommendation;
}

module.exports = {
  calculateContextScore,
  detectWorkPatterns,
  generateCompactInstructions,
  getSmartRecommendation,
  getContextAdvice,
  writeCompactHelper
};