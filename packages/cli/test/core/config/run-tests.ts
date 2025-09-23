/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, runner, config-system, testing]
 * @related: [config-schema.test.ts, path-resolver.test.ts, config-loader.test.ts, config-migrator.test.ts, integration.test.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: []
 */

/**
 * Test Runner for Configuration System
 * Runs all configuration system tests in sequence
 */

import { execSync } from 'child_process';
import * as path from 'path';

const TEST_FILES = [
  'config-schema.test.ts',
  'path-resolver.test.ts',
  'config-loader.test.ts',
  'config-migrator.test.ts',
  'integration.test.ts'
];

async function runTests() {
  console.log('🧪 Ginko Configuration System Test Suite');
  console.log('==========================================\n');

  const testDir = __dirname;
  let passedTests = 0;
  let failedTests = 0;

  for (const testFile of TEST_FILES) {
    const testPath = path.join(testDir, testFile);
    const testName = testFile.replace('.test.ts', '');

    console.log(`📋 Running ${testName} tests...`);

    try {
      // Run the test file directly with Node.js
      const output = execSync(`node "${testPath}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      console.log(output);
      passedTests++;
      console.log(`✅ ${testName} tests completed successfully\n`);

    } catch (error) {
      console.error(`❌ ${testName} tests failed:`);
      if (error instanceof Error && 'stdout' in error) {
        console.error((error as any).stdout);
      }
      if (error instanceof Error && 'stderr' in error) {
        console.error((error as any).stderr);
      }
      failedTests++;
      console.log('');
    }
  }

  console.log('==========================================');
  console.log(`📊 Test Results:`);
  console.log(`   ✅ Passed: ${passedTests}/${TEST_FILES.length}`);
  console.log(`   ❌ Failed: ${failedTests}/${TEST_FILES.length}`);

  if (failedTests === 0) {
    console.log('\n🎉 All configuration system tests passed!');
    console.log('The configuration system is ready for integration.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Additional utility functions for test management

/**
 * Check if all required dependencies are available
 */
function checkTestDependencies(): boolean {
  try {
    require('assert');
    require('fs/promises');
    require('path');
    require('os');
    return true;
  } catch (error) {
    console.error('❌ Missing test dependencies:', error);
    return false;
  }
}

/**
 * Get test file information
 */
function getTestInfo() {
  return {
    totalTests: TEST_FILES.length,
    testFiles: TEST_FILES,
    testDirectory: __dirname,
    estimatedRunTime: '30-60 seconds'
  };
}

/**
 * Quick validation of test files
 */
async function validateTestFiles(): Promise<boolean> {
  const fs = await import('fs/promises');

  for (const testFile of TEST_FILES) {
    const testPath = path.join(__dirname, testFile);
    try {
      await fs.access(testPath);
    } catch (error) {
      console.error(`❌ Test file not found: ${testFile}`);
      return false;
    }
  }

  return true;
}

// Main execution
if (require.main === module) {
  console.log('Validating test environment...');

  if (!checkTestDependencies()) {
    process.exit(1);
  }

  validateTestFiles().then(valid => {
    if (!valid) {
      process.exit(1);
    }

    const info = getTestInfo();
    console.log(`Found ${info.totalTests} test files`);
    console.log(`Estimated run time: ${info.estimatedRunTime}\n`);

    runTests().catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
  });
}

export { runTests, checkTestDependencies, getTestInfo, validateTestFiles };