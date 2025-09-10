#!/usr/bin/env node

/**
 * Test script for AI service integration
 * Usage: node test-ai-integration.js
 */

import { InsightExtractor } from './dist/services/insight-extractor.js';
import { createAIService } from './dist/services/ai-service.js';
import chalk from 'chalk';

async function testAIIntegration() {
  console.log(chalk.cyan('🧪 Testing AI Service Integration\n'));
  
  // Check for API keys
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasGrokKey = !!(process.env.GROK_API_KEY || process.env.XAI_API_KEY);
  
  console.log(chalk.dim('API Keys detected:'));
  console.log(chalk.dim(`  Anthropic: ${hasAnthropicKey ? '✅' : '❌'}`));
  console.log(chalk.dim(`  OpenAI: ${hasOpenAIKey ? '✅' : '❌'}`));
  console.log(chalk.dim(`  Grok (xAI): ${hasGrokKey ? '✅' : '❌'}`));
  console.log();
  
  // Create AI service (will use mock if no keys)
  const aiService = createAIService();
  console.log(chalk.cyan(`Using AI service: ${aiService.constructor.name}\n`));
  
  // Create InsightExtractor with AI service
  const extractor = new InsightExtractor(aiService);
  
  // Create mock session data
  const mockSessionData = {
    userEmail: 'test@example.com',
    sessionStart: new Date(Date.now() - 3600000), // 1 hour ago
    sessionEnd: new Date(),
    duration: 60,
    branch: 'main',
    workMode: 'feature-development',
    filesChanged: [
      {
        path: 'src/components/Button.tsx',
        status: 'modified',
        insertions: 25,
        deletions: 10
      },
      {
        path: 'src/api/auth.ts',
        status: 'added',
        insertions: 150,
        deletions: 0
      }
    ],
    commits: [
      {
        hash: 'abc123',
        message: 'Fix authentication bug in login flow',
        author: 'Test User',
        date: new Date()
      },
      {
        hash: 'def456',
        message: 'Add new button component with proper typing',
        author: 'Test User',
        date: new Date()
      }
    ],
    testResults: [
      {
        framework: 'jest',
        passed: 45,
        failed: 2,
        skipped: 3,
        duration: 12.5
      }
    ],
    errorLogs: [
      {
        level: 'error',
        message: 'TypeError: Cannot read property of undefined',
        timestamp: new Date(),
        stack: 'at Button.tsx:42'
      }
    ],
    diff: 'mock diff content',
    stagedDiff: 'mock staged diff'
  };
  
  console.log(chalk.cyan('Extracting insights from mock session...\n'));
  
  try {
    const result = await extractor.extractInsights(mockSessionData, {
      maxInsights: 3,
      verbose: true
    });
    
    console.log(chalk.green('\n✅ Extraction successful!\n'));
    console.log(chalk.cyan('Summary:'), result.summary);
    console.log(chalk.cyan(`Processing time: ${result.processingTime}ms`));
    console.log(chalk.cyan(`Insights found: ${result.insights.length}\n`));
    
    result.insights.forEach((insight, i) => {
      console.log(chalk.yellow(`\nInsight ${i + 1}:`));
      console.log(`  Type: ${insight.type}`);
      console.log(`  Title: ${insight.title}`);
      console.log(`  Problem: ${insight.problem}`);
      console.log(`  Solution: ${insight.solution}`);
      console.log(`  Time saving: ${insight.timeSavingPotential} minutes`);
      console.log(`  Reusability: ${(insight.reusabilityScore * 100).toFixed(0)}%`);
      if (insight.tags && insight.tags.length > 0) {
        console.log(`  Tags: ${insight.tags.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error.message);
    process.exit(1);
  }
  
  console.log(chalk.green('\n✅ All tests passed!'));
  
  if (!hasAnthropicKey && !hasOpenAIKey && !hasGrokKey) {
    console.log(chalk.yellow('\n⚠️  Note: Using mock AI service. To test with real AI:'));
    console.log(chalk.dim('  export ANTHROPIC_API_KEY=your-key'));
    console.log(chalk.dim('  export OPENAI_API_KEY=your-key'));
    console.log(chalk.dim('  export GROK_API_KEY=your-key  # or XAI_API_KEY'));
  }
}

// Run the test
testAIIntegration().catch(console.error);