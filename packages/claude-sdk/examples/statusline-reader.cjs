#!/usr/bin/env node

/**
 * Statusline Reader for Claude Code
 * Reads status from test agent and formats for display
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Claude Code calls this with session data as stdin
let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  generateStatusLine();
});

// For testing without stdin
if (process.stdin.isTTY) {
  generateStatusLine();
}

function generateStatusLine() {
  const statusFile = path.join(os.tmpdir(), 'watchhill-status.json');
  
  try {
    // Read status from test agent
    if (fs.existsSync(statusFile)) {
      const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      
      // Apply priority-based formatting
      let prefix = '🎯';
      switch (status.priority) {
        case 'critical':
          prefix = '🚨';
          break;
        case 'urgent':
          prefix = '⚠️';
          break;
        case 'high':
          prefix = '⚡';
          break;
        case 'normal':
          prefix = '🎯';
          break;
        case 'low':
          prefix = '✨';
          break;
      }
      
      // Build formatted message
      let message = `${prefix} WatchHill: ${status.message}`;
      
      // Add session duration if significant
      if (status.sessionDuration > 60) {
        const minutes = Math.floor(status.sessionDuration / 60);
        message += ` (${minutes}m)`;
      }
      
      // Output for Claude Code
      process.stdout.write(message);
    } else {
      // Default message when no status available
      process.stdout.write('🎯 WatchHill: Session active');
    }
  } catch (error) {
    // Fallback on any error
    process.stdout.write('🎯 WatchHill: Ready');
  }
}

// For testing: watch mode
if (process.argv.includes('--watch')) {
  console.log('📺 Watching for status updates...\n');
  
  setInterval(() => {
    const statusFile = path.join(os.tmpdir(), 'watchhill-status.json');
    
    try {
      if (fs.existsSync(statusFile)) {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] ${status.message} (priority: ${status.priority})`);
      }
    } catch (e) {
      // Silent fail in watch mode
    }
  }, 1000);
}