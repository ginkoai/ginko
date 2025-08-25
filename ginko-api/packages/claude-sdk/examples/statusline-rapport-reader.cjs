#!/usr/bin/env node

/**
 * Rapport-Aware Statusline Reader for Claude Code
 * Reads rapport context and formats emotional statusline messages
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class RapportStatuslineReader {
  constructor() {
    this.lastStatus = null;
    this.brandPrefix = '\x1b[38;5;141m\x1b[1mWatchHill:\x1b[0m'; // Periwinkle blue + bold
  }

  /**
   * Format message for Claude Code statusline
   */
  formatMessage(status) {
    if (!status) {
      return `${this.brandPrefix} 🎯 Session active`;
    }
    
    // Priority-based formatting
    let prefix = status.emoji || '🎯';
    
    // Special formatting for different phases
    if (status.phase === 'achievement') {
      // Achievement messages get special treatment
      return `${this.brandPrefix} ${status.message}`;
    }
    
    if (status.phase === 'debugging' && status.metrics?.errorCount > 0) {
      // Error messages with context
      prefix = '🔧';
    }
    
    // Build the message
    let message = `${this.brandPrefix} ${prefix} ${status.message}`;
    
    // Add session duration for longer sessions
    if (status.metrics?.sessionMinutes > 5) {
      message += ` [${status.metrics.sessionMinutes}m]`;
    }
    
    return message;
  }

  /**
   * Read and format status for Claude Code
   */
  generateStatusLine() {
    const statusFile = path.join(os.tmpdir(), 'watchhill-rapport-status.json');
    
    try {
      if (fs.existsSync(statusFile)) {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        const message = this.formatMessage(status);
        
        // Output for Claude Code
        process.stdout.write(message);
        
        // Store for comparison
        this.lastStatus = status;
      } else {
        // Default when no status available
        process.stdout.write(`${this.brandPrefix} 🎯 Initializing session...`);
      }
    } catch (error) {
      // Fallback message
      process.stdout.write(`${this.brandPrefix} 🎯 WatchHill ready`);
    }
  }

  /**
   * Watch mode for testing
   */
  watchMode() {
    console.log('📺 Watching rapport status updates...\n');
    console.log('─'.repeat(60) + '\n');
    
    let lastMessage = '';
    
    setInterval(() => {
      const statusFile = path.join(os.tmpdir(), 'watchhill-rapport-status.json');
      
      try {
        if (fs.existsSync(statusFile)) {
          const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
          const formatted = this.formatMessage(status);
          
          // Only print if message changed
          if (formatted !== lastMessage) {
            const time = new Date().toLocaleTimeString();
            
            // Clear line and print new message
            process.stdout.write('\r' + ' '.repeat(80) + '\r');
            process.stdout.write(`[${time}] ${formatted}`);
            
            lastMessage = formatted;
            
            // Show context on new line for debugging
            if (status.rapportContext) {
              console.log(`\n  └─ Context: ${JSON.stringify({
                tone: status.rapportContext.emotionalTone,
                phase: status.phase,
                tasks: status.metrics?.tasksCompleted,
                errors: status.metrics?.errorCount
              })}\n`);
            }
          }
        }
      } catch (e) {
        // Silent fail in watch mode
      }
    }, 500); // Check more frequently for smoother updates
  }
}

// Main execution
const reader = new RapportStatuslineReader();

// Check if we're in watch mode (for testing)
if (process.argv.includes('--watch')) {
  reader.watchMode();
} else {
  // Claude Code mode - read stdin and generate statusline
  let input = '';
  process.stdin.on('data', (chunk) => {
    input += chunk;
  });
  
  process.stdin.on('end', () => {
    reader.generateStatusLine();
  });
  
  // For testing without stdin
  if (process.stdin.isTTY) {
    reader.generateStatusLine();
  }
}