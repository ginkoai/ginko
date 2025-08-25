#!/usr/bin/env node

/**
 * Test emoji fix in statusline
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Test cases with and without emojis
const testCases = [
  {
    message: "Working on authentication",
    emoji: "🔧",
    phase: "working"
  },
  {
    message: "❌ Error detected - recovery in progress",
    emoji: "🎯",  // Should be ignored since message has emoji
    phase: "debugging"
  },
  {
    message: "🏆 Achievement: Flow State Master!",
    emoji: "🎉",  // Should be ignored
    phase: "achievement"
  },
  {
    message: "Session active",
    emoji: "✨",
    phase: "working"
  }
];

console.log('Testing emoji handling in statusline...\n');
console.log('─'.repeat(60) + '\n');

testCases.forEach((testCase, index) => {
  // Create test status
  const status = {
    message: testCase.message,
    emoji: testCase.emoji,
    phase: testCase.phase,
    rapportContext: { emotionalTone: 'focused' },
    metrics: { sessionMinutes: 0 }
  };
  
  // Write to temp file
  const statusFile = path.join(os.tmpdir(), 'watchhill-status.json');
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  
  // Run statusline reader
  const output = execSync('node /Users/cnorton/Development/watchhill/mcp-client/src/statusline/watchhill-statusline.cjs', {
    input: JSON.stringify({ sessionId: 'test' }),
    encoding: 'utf8'
  });
  
  // Check for double emoji
  const emojiCount = (output.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu) || []).length;
  
  console.log(`Test ${index + 1}: ${testCase.message}`);
  console.log(`  Input emoji: ${testCase.emoji}`);
  console.log(`  Output: "${output}"`);
  console.log(`  Emoji count: ${emojiCount}`);
  console.log(`  Status: ${emojiCount <= 1 ? '✅ PASS' : '❌ FAIL - Multiple emojis detected'}\n`);
});

// Clean up
try {
  fs.unlinkSync(path.join(os.tmpdir(), 'watchhill-status.json'));
} catch (e) {}

console.log('─'.repeat(60));
console.log('\nTest complete!');