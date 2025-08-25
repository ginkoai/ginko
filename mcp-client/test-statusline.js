#!/usr/bin/env node

/**
 * Test script for Ginko status line coaching
 * 
 * Usage: node test-statusline.js
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test data simulating different Claude Code session states
const testScenarios = [
  {
    name: "New Session",
    input: {
      sessionId: "test-session-001",
      cwd: "/Users/test/project",
      model: "claude-sonnet-4",
      workspace: "test-project"
    },
    expected: "Tutorial: Try 'vibecheck' to practice alignment"
  },
  
  {
    name: "Flow State",
    input: {
      sessionId: "test-session-002",
      cwd: "/Users/test/project",
      model: "claude-sonnet-4"
    },
    setupState: {
      startTime: Date.now() - 45 * 60 * 1000, // 45 min ago
      errorCount: 0,
      progressRate: 0.9,
      consistentCommits: true
    },
    expected: "Flow state"
  },
  
  {
    name: "Vibecheck Needed",
    input: {
      sessionId: "test-session-003",
      cwd: "/Users/test/project",
      model: "claude-sonnet-4"
    },
    setupState: {
      startTime: Date.now() - 30 * 60 * 1000,
      errorCount: 6,
      progressRate: 0.1,
      timeSinceProgress: 25 * 60 * 1000
    },
    expected: "Vibecheck suggested"
  },
  
  {
    name: "Achievement Unlocked",
    input: {
      sessionId: "test-session-004",
      cwd: "/Users/test/project",
      model: "claude-sonnet-4"
    },
    setupState: {
      startTime: Date.now() - 10 * 60 * 1000,
      vibecheckCount: 1,
      errorCount: 0,
      progressRate: 0.5
    },
    expected: "First Vibecheck"
  }
];

// Helper to setup test state
function setupTestState(sessionId, state) {
  const stateDir = path.join(os.homedir(), '.ginko', 'sessions');
  
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  
  const stateFile = path.join(stateDir, `${sessionId}.json`);
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

// Run test scenario
async function runTest(scenario) {
  console.log(`\n📋 Testing: ${scenario.name}`);
  console.log(`Input: ${JSON.stringify(scenario.input, null, 2)}`);
  
  // Setup state if needed
  if (scenario.setupState) {
    setupTestState(scenario.input.sessionId, scenario.setupState);
  }
  
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'src/statusline/ginko-statusline.cjs');
    const child = spawn('node', [scriptPath]);
    
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', () => {
      // Remove ANSI color codes for comparison
      const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
      
      console.log(`Output: "${cleanOutput}"`);
      
      if (scenario.expected && cleanOutput.includes(scenario.expected)) {
        console.log(`✅ Test passed!`);
      } else if (scenario.expected) {
        console.log(`❌ Test failed. Expected to contain: "${scenario.expected}"`);
      } else {
        console.log(`ℹ️ Output received (no expected value set)`);
      }
      
      resolve();
    });
    
    // Send input
    child.stdin.write(JSON.stringify(scenario.input));
    child.stdin.end();
  });
}

// Main test runner
async function main() {
  console.log('🚀 Ginko Status Line Test Suite');
  console.log('====================================');
  
  for (const scenario of testScenarios) {
    await runTest(scenario);
  }
  
  console.log('\n✨ All tests completed!');
  
  // Cleanup test files
  const testDir = path.join(os.homedir(), '.ginko', 'sessions');
  if (fs.existsSync(testDir)) {
    const files = fs.readdirSync(testDir);
    files.forEach(file => {
      if (file.startsWith('test-session')) {
        fs.unlinkSync(path.join(testDir, file));
      }
    });
  }
}

// Run tests
main().catch(console.error);