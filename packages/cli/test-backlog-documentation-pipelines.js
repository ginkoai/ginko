#!/usr/bin/env node
/**
 * Test script for refactored Backlog and Documentation pipeline implementations
 * Tests BacklogPipeline and DocumentationPipeline using Simple Builder Pattern
 */

import chalk from 'chalk';
import { BacklogPipeline } from './dist/commands/backlog/backlog-pipeline.js';
import { DocumentationPipeline } from './dist/commands/documentation/documentation-pipeline.js';
import fs from 'fs-extra';
import path from 'path';

console.log(chalk.bold.cyan('\n🧪 Testing Backlog and Documentation Pipeline Implementations\n'));

async function testBacklogPipeline() {
  console.log(chalk.yellow('1. Testing BacklogPipeline...'));

  try {
    const pipeline = new BacklogPipeline('Create a high priority bug fix for authentication system');

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
    if (content && content.includes('## Problem Statement') && content.includes('## Acceptance Criteria')) {
      console.log(chalk.green('   ✅ BacklogPipeline test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ Backlog content incomplete\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ BacklogPipeline test failed: ${error}\n`));
    return false;
  }
}

async function testDocumentationPipeline() {
  console.log(chalk.yellow('2. Testing DocumentationPipeline...'));

  try {
    const pipeline = new DocumentationPipeline('Generate comprehensive README documentation');

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
    if (content && content.includes('## Installation') && content.includes('## Usage')) {
      console.log(chalk.green('   ✅ DocumentationPipeline test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ Documentation content incomplete\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ DocumentationPipeline test failed: ${error}\n`));
    return false;
  }
}

async function testBacklogPipelineTypes() {
  console.log(chalk.yellow('3. Testing Backlog Pipeline with Different Types...'));

  try {
    const types = [
      { intent: 'Fix critical bug in payment processing', expectedType: 'bug' },
      { intent: 'Add new feature for user dashboard', expectedType: 'feature' },
      { intent: 'Refactor database connection pool', expectedType: 'refactor' },
      { intent: 'Write tests for authentication module', expectedType: 'test' },
      { intent: 'Document API endpoints', expectedType: 'docs' }
    ];

    let allPassed = true;

    for (const { intent, expectedType } of types) {
      const pipeline = new BacklogPipeline(intent);
      await pipeline.initialize();
      pipeline.loadTemplate();
      await pipeline.gatherContext();
      pipeline.generateContent();

      const content = pipeline.ctx.content || '';
      const hasType = content.toLowerCase().includes(expectedType);

      if (hasType) {
        console.log(chalk.gray(`   ✓ ${expectedType} type detected correctly`));
      } else {
        console.log(chalk.red(`   ✗ ${expectedType} type not detected`));
        allPassed = false;
      }
    }

    if (allPassed) {
      console.log(chalk.green('   ✅ Backlog type detection test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ Some backlog types not detected correctly\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ Backlog type test failed: ${error}\n`));
    return false;
  }
}

async function testDocumentationTypes() {
  console.log(chalk.yellow('4. Testing Documentation Pipeline with Different Types...'));

  try {
    const types = [
      { intent: 'Generate API documentation', expectedContent: '# API Documentation' },
      { intent: 'Create user guide', expectedContent: '# User Guide' },
      { intent: 'Generate changelog', expectedContent: '# Changelog' },
      { intent: 'Create README', expectedContent: '## Installation' }
    ];

    let allPassed = true;

    for (const { intent, expectedContent } of types) {
      const pipeline = new DocumentationPipeline(intent);
      await pipeline.initialize();
      pipeline.loadTemplate();
      await pipeline.gatherContext();
      pipeline.generateContent();

      const content = pipeline.ctx.content || '';
      const hasContent = content.includes(expectedContent);

      if (hasContent) {
        console.log(chalk.gray(`   ✓ ${intent} generated correctly`));
      } else {
        console.log(chalk.red(`   ✗ ${intent} missing expected content`));
        allPassed = false;
      }
    }

    if (allPassed) {
      console.log(chalk.green('   ✅ Documentation type test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ Some documentation types not generated correctly\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ Documentation type test failed: ${error}\n`));
    return false;
  }
}

async function testPipelineChaining() {
  console.log(chalk.yellow('5. Testing Pipeline Chaining...'));

  try {
    // Test Backlog pipeline chaining
    const backlogPipeline = new BacklogPipeline('Create task for refactoring');
    await backlogPipeline
      .initialize()
      .then(p => p.loadTemplate())
      .then(p => p.gatherContext())
      .then(p => {
        p.generateContent();
        p.validateContent();
        return p;
      });

    const backlogValid = backlogPipeline.isValid();
    console.log(chalk.gray(`   - Backlog Pipeline valid: ${backlogValid}`));

    // Test Documentation pipeline chaining
    const docPipeline = new DocumentationPipeline('Generate documentation');
    await docPipeline
      .initialize()
      .then(p => p.loadTemplate())
      .then(p => p.gatherContext())
      .then(p => {
        p.generateContent();
        p.validateContent();
        return p;
      });

    const docValid = docPipeline.isValid();
    console.log(chalk.gray(`   - Documentation Pipeline valid: ${docValid}`));

    if (backlogValid && docValid) {
      console.log(chalk.green('   ✅ Pipeline chaining test passed!\n'));
      return true;
    } else {
      console.log(chalk.red('   ❌ Pipeline chaining failed\n'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ Pipeline chaining test failed: ${error}\n`));
    return false;
  }
}

async function testBackwardCompatibility() {
  console.log(chalk.yellow('6. Testing Backward Compatibility...'));

  try {
    // Import the adapter classes
    const { BacklogReflectionCommand } = await import('./dist/commands/backlog/backlog-pipeline.js');
    const { DocumentationReflectionCommand } = await import('./dist/commands/documentation/documentation-pipeline.js');

    // Test Backlog adapter
    const backlogCommand = new BacklogReflectionCommand();
    console.log(chalk.gray('   - BacklogReflectionCommand adapter created'));

    // Test Documentation adapter
    const docCommand = new DocumentationReflectionCommand();
    console.log(chalk.gray('   - DocumentationReflectionCommand adapter created'));

    // Both adapters should have execute method
    const backlogHasExecute = typeof backlogCommand.execute === 'function';
    const docHasExecute = typeof docCommand.execute === 'function';

    console.log(chalk.gray(`   - Backlog has execute(): ${backlogHasExecute}`));
    console.log(chalk.gray(`   - Documentation has execute(): ${docHasExecute}`));

    if (backlogHasExecute && docHasExecute) {
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
  console.log(chalk.dim('Running tests on refactored Backlog and Documentation pipeline implementations...\n'));

  const results = [];

  // Run all tests
  results.push(await testBacklogPipeline());
  results.push(await testDocumentationPipeline());
  results.push(await testBacklogPipelineTypes());
  results.push(await testDocumentationTypes());
  results.push(await testPipelineChaining());
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
    console.log(chalk.bold.green('🎉 All Backlog and Documentation pipeline tests passed!\n'));
    console.log(chalk.gray('The Simple Builder Pattern has been successfully applied to:'));
    console.log(chalk.gray('  • BacklogPipeline - Task and issue tracking'));
    console.log(chalk.gray('  • DocumentationPipeline - Project documentation generation'));
    console.log(chalk.gray('  • Both maintain backward compatibility'));
    console.log(chalk.gray('  • Both follow the same pattern as other refactored pipelines\n'));
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