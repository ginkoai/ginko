#!/usr/bin/env node

/**
 * Minimal Statusline Test Agent
 * Tests statusline updates with rotating messages every 3 seconds
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Simple message rotation
const messages = [
  { text: "🚀 Starting session...", priority: "high" },
  { text: "🎯 Analyzing code patterns", priority: "normal" },
  { text: "💡 Found optimization opportunity", priority: "high" },
  { text: "🔍 Scanning for issues", priority: "normal" },
  { text: "✨ All systems operational", priority: "low" },
  { text: "🌊 Flow state detected", priority: "high" },
  { text: "⚡ Processing changes", priority: "normal" },
  { text: "🎉 Great progress!", priority: "high" }
];

let messageIndex = 0;
let errorMode = false;
let sessionStartTime = Date.now();

/**
 * Write status to file that statusline can read
 */
function updateStatusline() {
  const currentMessage = messages[messageIndex];
  const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
  
  // Build status object
  const status = {
    message: currentMessage.text,
    priority: currentMessage.priority,
    sessionDuration: sessionDuration,
    timestamp: Date.now(),
    errorMode: errorMode,
    messageIndex: messageIndex
  };
  
  // Add conditional variations
  if (sessionDuration > 20 && sessionDuration < 30) {
    status.message = "⚠️ Attention needed";
    status.priority = "urgent";
  }
  
  if (errorMode) {
    status.message = "❌ Error detected - recovery in progress";
    status.priority = "critical";
  }
  
  // Write to temp file for statusline to read
  const statusFile = path.join(os.tmpdir(), 'watchhill-status.json');
  
  try {
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    console.log(`[${sessionDuration}s] Status: ${status.message}`);
  } catch (error) {
    console.error('Failed to write status:', error);
  }
  
  // Rotate to next message
  messageIndex = (messageIndex + 1) % messages.length;
  
  // Simulate error mode occasionally
  if (Math.random() < 0.1) {
    errorMode = !errorMode;
  }
}

/**
 * Main loop
 */
function main() {
  console.log('🚀 WatchHill Statusline Test Agent');
  console.log(`📁 Writing status to: ${path.join(os.tmpdir(), 'watchhill-status.json')}`);
  console.log('Press Ctrl+C to stop\n');
  
  // Initial update
  updateStatusline();
  
  // Update every 3 seconds
  const interval = setInterval(updateStatusline, 3000);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down test agent');
    clearInterval(interval);
    
    // Clean up status file
    const statusFile = path.join(os.tmpdir(), 'watchhill-status.json');
    try {
      fs.unlinkSync(statusFile);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    process.exit(0);
  });
}

// Run the test agent
main();