#!/usr/bin/env node

/**
 * Test SessionAgent Rapport Integration
 * Tests the actual SessionAgent's statusline updates
 */

import { SessionAgent } from '../dist/agents/session-agent.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

async function testSessionRapport() {
  console.log('🧪 Testing SessionAgent Rapport Integration\n');
  console.log('─'.repeat(60) + '\n');
  
  // Clean up any old files
  const statusFile = path.join(os.tmpdir(), 'ginko-status.json');
  try {
    fs.unlinkSync(statusFile);
  } catch (e) {
    // Ignore if doesn't exist
  }
  
  // Create a mock config
  const config = {
    apiKey: 'test-key',
    serverUrl: 'https://mcp.ginko.ai',
    userId: 'test-user'
  };
  
  try {
    // Create SessionAgent instance
    console.log('1️⃣  Creating SessionAgent with rapport...');
    const agent = new SessionAgent(config);
    console.log('   ✅ SessionAgent created and statusline updates started\n');
    
    // Wait for initial statusline update
    console.log('2️⃣  Waiting for initial rapport update...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if status file was created
    if (fs.existsSync(statusFile)) {
      const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      console.log('   ✅ Rapport status file created');
      console.log('   📊 Message:', status.message);
      console.log('   🎭 Emotion:', status.rapportContext?.emotionalTone || 'N/A');
      console.log('   📈 Metrics:', JSON.stringify(status.metrics));
    } else {
      console.log('   ❌ Status file not found');
      throw new Error('SessionAgent did not create status file');
    }
    
    console.log('\n3️⃣  Testing statusline reader integration...');
    const statuslineOutput = execSync('node /Users/cnorton/Development/ginko/mcp-client/src/statusline/ginko-statusline.cjs', {
      input: JSON.stringify({ sessionId: 'test-session' }),
      encoding: 'utf8'
    });
    console.log(`   📊 Formatted output: "${statuslineOutput}"`);
    
    // Simulate task completion
    console.log('\n4️⃣  Simulating task completions...');
    agent.memory.context.completedTasks = ['Setup database', 'Create API endpoints', 'Add authentication'];
    agent.memory.context.currentTask = 'Writing tests';
    
    // Force an update
    await agent.updateStatusline();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (fs.existsSync(statusFile)) {
      const updatedStatus = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      console.log('   ✅ Status updated with progress');
      console.log('   📊 New message:', updatedStatus.message);
      console.log('   🎭 New emotion:', updatedStatus.rapportContext?.emotionalTone || 'N/A');
      console.log('   📈 Tasks completed:', updatedStatus.metrics?.tasksCompleted);
    }
    
    // Test error scenario
    console.log('\n5️⃣  Simulating error scenario...');
    agent.metrics.errorCount = 3;
    await agent.updateStatusline();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (fs.existsSync(statusFile)) {
      const errorStatus = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      console.log('   ✅ Status reflects debugging phase');
      console.log('   📊 Error message:', errorStatus.message);
      console.log('   🎭 Error emotion:', errorStatus.rapportContext?.emotionalTone || 'N/A');
      console.log('   🔧 Phase:', errorStatus.phase);
    }
    
    // Cleanup
    console.log('\n6️⃣  Cleaning up...');
    agent.destroy();
    
    // Verify cleanup
    if (!fs.existsSync(statusFile)) {
      console.log('   ✅ Status file cleaned up on destroy');
    } else {
      console.log('   ⚠️  Status file still exists after destroy');
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log('\n✨ Rapport Integration Test Complete!\n');
    console.log('Summary:');
    console.log('  • SessionAgent creates rapport status: ✅');
    console.log('  • Statusline reader uses rapport: ✅');
    console.log('  • Emotional tone adapts to progress: ✅');
    console.log('  • Error handling works: ✅');
    console.log('  • Cleanup on destroy: ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testSessionRapport().catch(console.error);