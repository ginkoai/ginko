#!/usr/bin/env node
/**
 * Test script for refactored PRD and Architecture pipeline implementations
 * Tests PRDPipeline and ArchitecturePipeline using Simple Builder Pattern
 */

import chalk from 'chalk';
import { PRDPipeline } from './dist/commands/prd/prd-pipeline.js';
import { ArchitecturePipeline } from './dist/commands/architecture/architecture-pipeline.js';
import fs from 'fs-extra';
import path from 'path';

console.log(chalk.bold.cyan('\n🧪 Testing PRD and Architecture Pipeline Implementations\n'));

async function testPRDPipeline() {
  console.log(chalk.yellow('1. Testing PRDPipeline...'));

  try {
    const pipeline = new PRDPipeline('Create a real-time collaboration feature for document editing');

    // Test individual pipeline steps
    console.log(chalk.gray('   - Initializing...'));
    await pipeline.initialize();

    console.log(chalk.gray('   - Loading template...'));
    pipeline.loadTemplate();

    console.log(chalk.gray('   - Gathering context...'));
    await pipeline.gatherContext();

    console.log(chalk.gray('   - Generating content...'));
    pipeline.generateContent();

    console.log(chalk.gray('   - Validating content...'));
    pipeline.validateContent();

    // Check confidence and validity
    const confidence = pipeline.getConfidence();
    const errors = pipeline.getErrors();
    const isValid = pipeline.isValid();

    console.log(chalk.gray(`   - Confidence: ${(confidence * 100).toFixed(0)}%`));
    console.log(chalk.gray(`   - Valid: ${isValid}`));
    if (errors.length > 0) {
      console.log(chalk.yellow(`   - Warnings: ${errors.join(', ')}`));
    }

    // Check content generation
    const content = pipeline.ctx.content;
    if (content && content.includes('## Problem Statement') && content.includes('## Success Metrics')) {
      console.log(chalk.green('   ✅ PRDPipeline test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ PRD content incomplete\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ PRDPipeline test failed: ${error}\n`));
    return false;
  }
}

async function testArchitecturePipeline() {
  console.log(chalk.yellow('2. Testing ArchitecturePipeline...'));

  try {
    const pipeline = new ArchitecturePipeline('Implement microservices architecture for better scalability');

    // Test individual pipeline steps
    console.log(chalk.gray('   - Initializing...'));
    await pipeline.initialize();

    console.log(chalk.gray('   - Loading template...'));
    pipeline.loadTemplate();

    console.log(chalk.gray('   - Gathering context...'));
    await pipeline.gatherContext();

    console.log(chalk.gray('   - Generating content...'));
    pipeline.generateContent();

    console.log(chalk.gray('   - Validating content...'));
    pipeline.validateContent();

    // Check confidence and validity
    const confidence = pipeline.getConfidence();
    const errors = pipeline.getErrors();
    const isValid = pipeline.isValid();

    console.log(chalk.gray(`   - Confidence: ${(confidence * 100).toFixed(0)}%`));
    console.log(chalk.gray(`   - Valid: ${isValid}`));
    if (errors.length > 0) {
      console.log(chalk.yellow(`   - Warnings: ${errors.join(', ')}`));
    }

    // Check content generation
    const content = pipeline.ctx.content;
    if (content && content.includes('## Context') && content.includes('## Alternatives Considered')) {
      console.log(chalk.green('   ✅ ArchitecturePipeline test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ ADR content incomplete\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ ArchitecturePipeline test failed: ${error}\n`));
    return false;
  }
}

async function testPipelineChaining() {
  console.log(chalk.yellow('3. Testing Pipeline Chaining for PRD...'));

  try {
    // Test fluent interface for PRD
    const prdPipeline = new PRDPipeline('Design a notification system');

    await prdPipeline
      .initialize()
      .then(p => p.loadTemplate())
      .then(p => p.gatherContext())
      .then(p => {
        p.generateContent();
        p.validateContent();
        return p;
      });

    const isValid = prdPipeline.isValid();
    console.log(chalk.gray(`   - PRD Pipeline valid: ${isValid}`));

    if (isValid) {
      console.log(chalk.green('   ✅ PRD Pipeline chaining test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ PRD Pipeline invalid after chaining\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ Pipeline chaining test failed: ${error}\n`));
    return false;
  }
}

async function testFileSaving() {
  console.log(chalk.yellow('4. Testing File Saving...'));

  try {
    // Test PRD file saving
    const prdPipeline = new PRDPipeline('Test PRD file saving functionality');
    await prdPipeline
      .initialize()
      .then(p => p.loadTemplate())
      .then(p => p.gatherContext())
      .then(p => {
        p.generateContent();
        return p;
      });

    // Check if save would work (without actually saving in test)
    const hasContent = !!prdPipeline.ctx.content;
    const contentLength = prdPipeline.ctx.content?.length || 0;

    console.log(chalk.gray(`   - PRD content generated: ${hasContent}`));
    console.log(chalk.gray(`   - Content length: ${contentLength} chars`));

    // Test Architecture file saving
    const adrPipeline = new ArchitecturePipeline('Test ADR file saving functionality');
    await adrPipeline
      .initialize()
      .then(p => p.loadTemplate())
      .then(p => p.gatherContext())
      .then(p => {
        p.generateContent();
        return p;
      });

    const adrHasContent = !!adrPipeline.ctx.content;
    const adrContentLength = adrPipeline.ctx.content?.length || 0;

    console.log(chalk.gray(`   - ADR content generated: ${adrHasContent}`));
    console.log(chalk.gray(`   - Content length: ${adrContentLength} chars`));

    if (hasContent && adrHasContent && contentLength > 1000 && adrContentLength > 1000) {
      console.log(chalk.green('   ✅ File saving test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ Content generation insufficient for saving\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ File saving test failed: ${error}\n`));
    return false;
  }
}

async function testBackwardCompatibility() {
  console.log(chalk.yellow('5. Testing Backward Compatibility...'));

  try {
    // Import the adapter classes
    const { PRDReflectionCommand } = await import('./dist/commands/prd/prd-pipeline.js');
    const { ArchitectureReflectionCommand } = await import('./dist/commands/architecture/architecture-pipeline.js');

    // Test PRD adapter
    const prdCommand = new PRDReflectionCommand();
    console.log(chalk.gray('   - PRDReflectionCommand adapter created'));

    // Test Architecture adapter
    const architectureCommand = new ArchitectureReflectionCommand();
    console.log(chalk.gray('   - ArchitectureReflectionCommand adapter created'));

    // Both adapters should have execute method
    const prdHasExecute = typeof prdCommand.execute === 'function';
    const archHasExecute = typeof architectureCommand.execute === 'function';

    console.log(chalk.gray(`   - PRD has execute(): ${prdHasExecute}`));
    console.log(chalk.gray(`   - Architecture has execute(): ${archHasExecute}`));

    if (prdHasExecute && archHasExecute) {
      console.log(chalk.green('   ✅ Backward compatibility test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ Adapters missing execute method\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ Backward compatibility test failed: ${error}\n`));
    return false;
  }
}

async function runTests() {
  console.log(chalk.dim('Running tests on refactored PRD and Architecture pipeline implementations...\n'));

  const results = [];

  // Run all tests
  results.push(await testPRDPipeline());
  results.push(await testArchitecturePipeline());
  results.push(await testPipelineChaining());
  results.push(await testFileSaving());
  results.push(await testBackwardCompatibility());

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
    console.log(chalk.bold.green('🎉 All PRD and Architecture pipeline tests passed!\n'));
    console.log(chalk.gray('The Simple Builder Pattern has been successfully applied to:'));
    console.log(chalk.gray('  • PRDPipeline - Product Requirements Documents'));
    console.log(chalk.gray('  • ArchitecturePipeline - Architecture Decision Records'));
    console.log(chalk.gray('  • Both maintain backward compatibility'));
    console.log(chalk.gray('  • Both follow the same pattern as Handoff and Start pipelines\n'));
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