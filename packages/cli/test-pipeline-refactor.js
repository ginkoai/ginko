#!/usr/bin/env node
/**
 * Test script for refactored pipeline implementations
 * Tests HandoffPipeline and StartPipeline using Simple Builder Pattern
 */

import chalk from 'chalk';
import { HandoffPipeline } from './dist/commands/handoff/handoff-reflection-pipeline.js';
import { StartPipeline } from './dist/commands/start/start-reflection-pipeline.js';

console.log(chalk.bold.cyan('\n🧪 Testing Refactored Pipeline Implementations\n'));

async function testHandoffPipeline() {
  console.log(chalk.yellow('1. Testing HandoffPipeline...'));

  try {
    const pipeline = new HandoffPipeline('Testing the refactored handoff implementation');

    // Test individual pipeline steps
    console.log(chalk.gray('   - Initializing...'));
    await pipeline.initialize();

    console.log(chalk.gray('   - Loading template...'));
    pipeline.loadTemplate();

    console.log(chalk.gray('   - Gathering context...'));
    await pipeline.gatherContext();

    console.log(chalk.gray('   - Generating content...'));
    pipeline.generateContent();

    console.log(chalk.gray('   - Scoring quality...'));
    pipeline.scoreQuality();

    // Check confidence
    const confidence = pipeline.getConfidence();
    const errors = pipeline.getErrors();

    console.log(chalk.gray(`   - Confidence: ${(confidence * 100).toFixed(0)}%`));
    if (errors.length > 0) {
      console.log(chalk.red(`   - Errors: ${errors.join(', ')}`));
    }

    console.log(chalk.green('   ✅ HandoffPipeline test passed!\n'));
    return true;
  } catch (error) {
    console.log(chalk.red(`   ❌ HandoffPipeline test failed: ${error}\n`));
    return false;
  }
}

async function testStartPipeline() {
  console.log(chalk.yellow('2. Testing StartPipeline...'));

  try {
    const pipeline = new StartPipeline('Testing the refactored start implementation');

    // Test individual pipeline steps
    console.log(chalk.gray('   - Initializing...'));
    await pipeline.initialize();

    console.log(chalk.gray('   - Loading template...'));
    pipeline.loadTemplate();

    console.log(chalk.gray('   - Loading handoff...'));
    await pipeline.loadHandoff();

    console.log(chalk.gray('   - Gathering context...'));
    await pipeline.gatherContext();

    // Check validation
    console.log(chalk.gray('   - Validating...'));
    pipeline.validate();

    const confidence = pipeline.getConfidence();
    const errors = pipeline.getErrors();

    console.log(chalk.gray(`   - Confidence: ${(confidence * 100).toFixed(0)}%`));
    if (errors.length > 0) {
      console.log(chalk.yellow(`   - Warnings: ${errors.join(', ')}`));
    }

    console.log(chalk.green('   ✅ StartPipeline test passed!\n'));
    return true;
  } catch (error) {
    console.log(chalk.red(`   ❌ StartPipeline test failed: ${error}\n`));
    return false;
  }
}

async function testPipelineChaining() {
  console.log(chalk.yellow('3. Testing Pipeline Chaining...'));

  try {
    // Test fluent interface
    const pipeline = new HandoffPipeline('Testing fluent interface');

    await pipeline
      .initialize()
      .then(p => p.loadTemplate())
      .then(p => p.gatherContext())
      .then(p => {
        p.generateContent();
        p.scoreQuality();
        return p;
      });

    const isValid = pipeline.isValid();
    console.log(chalk.gray(`   - Pipeline valid: ${isValid}`));

    if (isValid) {
      console.log(chalk.green('   ✅ Pipeline chaining test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ Pipeline invalid after chaining\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ Pipeline chaining test failed: ${error}\n`));
    return false;
  }
}

async function runTests() {
  console.log(chalk.dim('Running tests on refactored pipeline implementations...\n'));

  const results = [];

  // Run all tests
  results.push(await testHandoffPipeline());
  results.push(await testStartPipeline());
  results.push(await testPipelineChaining());

  // Summary
  console.log(chalk.bold.cyan('📊 Test Summary:\n'));

  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;

  console.log(chalk.green(`   ✅ Passed: ${passed}`));
  if (failed > 0) {
    console.log(chalk.red(`   ❌ Failed: ${failed}`));
  }

  console.log('');

  if (failed === 0) {
    console.log(chalk.bold.green('🎉 All pipeline tests passed! The refactoring is successful.\n'));
  } else {
    console.log(chalk.bold.yellow('⚠️  Some tests failed. Review the errors above.\n'));
  }

  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error(chalk.red(`\nTest runner error: ${error}`));
  process.exit(1);
});