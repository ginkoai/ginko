/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-15
 * @tags: [example, demo, rapport, session, continuity]
 * @related: [session-agent.ts]
 * @priority: low
 * @complexity: low
 * @dependencies: [@ginko/claude-sdk]
 */

import { SessionAgent } from '../src/agents/session-agent.js';
import { SessionHandoff, RapportContext } from '../src/types.js';

// Simulate a handoff from a previous session
function createMockHandoff(): SessionHandoff {
  // Simulate different scenarios
  const scenario = process.argv[2] || 'good-progress';
  
  let rapportContext: RapportContext;
  let completedTasks: string[] = [];
  let currentTask: string = '';
  
  switch (scenario) {
    case 'good-progress':
      // Scenario 1: Made excellent progress
      completedTasks = [
        'Fixed authentication flow',
        'Added session persistence', 
        'Implemented auto-save feature',
        'Updated documentation'
      ];
      currentTask = 'Testing the new features';
      rapportContext = {
        personalizedGreeting: 'Good afternoon, Chris!',
        sharedHistory: "We've made excellent progress together - 4 tasks completed!",
        emotionalTone: 'excited',
        contextualMood: {
          situation: 'progressing_well',
          urgency: 'normal'
        }
      };
      break;
      
    case 'challenging':
      // Scenario 2: Hit some challenges
      completedTasks = ['Initial setup'];
      currentTask = 'Debugging TypeScript errors';
      rapportContext = {
        personalizedGreeting: 'Good afternoon, Chris.',
        sharedHistory: "We hit some challenges with the build system.",
        emotionalTone: 'determined',
        contextualMood: {
          situation: 'challenging',
          urgency: 'medium'
        }
      };
      break;
      
    case 'celebrating':
      // Scenario 3: Just shipped something
      completedTasks = [
        'Final bug fixes',
        'Performance optimization',
        'Deployed to production',
        'Verified everything works'
      ];
      currentTask = 'Monitoring post-deployment metrics';
      rapportContext = {
        personalizedGreeting: 'Good evening, Chris! 🎉',
        sharedHistory: "We successfully shipped the feature to production!",
        emotionalTone: 'celebratory',
        contextualMood: {
          situation: 'progressing_well',
          urgency: 'normal'
        }
      };
      break;
      
    default:
      // Default scenario
      completedTasks = ['Setup environment'];
      currentTask = 'Building new feature';
      rapportContext = {
        personalizedGreeting: 'Hello Chris!',
        sharedHistory: "Ready to continue our work.",
        emotionalTone: 'focused',
        contextualMood: {
          situation: 'steady_work',
          urgency: 'normal'
        }
      };
  }
  
  return {
    sessionId: 'session-123',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    currentTask,
    completedTasks,
    pendingTasks: ['Review PR comments', 'Update changelog'],
    filesModified: ['src/session-agent.ts', 'src/types.ts'],
    decisions: ['Use RapportContext for emotional continuity', 'Track accomplishments'],
    conversationMemory: {
      messages: [],
      context: {},
      decisions: []
    },
    rapportContext
  };
}

// Demo the rapport continuity
async function demoRapportContinuity() {
  console.log('\n=== Ginko Rapport Continuity Demo ===\n');
  
  const scenario = process.argv[2] || 'good-progress';
  console.log(`Scenario: ${scenario}\n`);
  console.log('Simulating session resume after 2 hours...\n');
  console.log('-------------------------------------------\n');
  
  // Create mock agent config
  const config = {
    userId: 'chris',
    teamId: 'ginko',
    ginkoKey: 'demo-key'
  };
  
  // Create agent and simulate resuming from handoff
  const agent = new SessionAgent(config);
  
  // Mock the handoff data
  const handoff = createMockHandoff();
  (agent as any).handoffData = handoff;
  
  // Trigger the continuity notification
  (agent as any).notifySessionContinuity();
  
  console.log('\n-------------------------------------------');
  console.log('\nThis personalized greeting provides:');
  console.log('✅ Emotional continuity based on progress');
  console.log('✅ Recognition of accomplishments');
  console.log('✅ Context-aware tone and messaging');
  console.log('✅ Clear focus for the resumed session');
  console.log('\nTry different scenarios:');
  console.log('  npm run demo:rapport good-progress');
  console.log('  npm run demo:rapport challenging');
  console.log('  npm run demo:rapport celebrating\n');
}

// Run the demo
demoRapportContinuity().catch(console.error);