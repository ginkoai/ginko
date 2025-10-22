/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [testing, pipeline, builder, quality, test-generation]
 * @related: [../../core/simple-pipeline-base.ts, ../sprint/sprint-pipeline.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, fs-extra]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { getGinkoDir, getProjectRoot } from '../../utils/helpers.js';

/**
 * Testing pipeline using Simple Builder Pattern
 * Implements ADR-013 for consistent pipeline architecture
 * Generates test plans, test cases, and testing strategies
 */
export class TestingPipeline extends SimplePipelineBase {
  private ginkoDir: string = '';
  private testType: string = 'unit';

  constructor(intent: string = 'Generate test plan') {
    super(intent);
    this.withDomain('testing');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    console.log(chalk.cyan('🧪 Initializing testing pipeline...'));
    this.ginkoDir = await getGinkoDir();
    this.testType = this.detectTestType(this.ctx.intent);
    this.adjustConfidence(0.95); // High confidence for testing
    return this;
  }

  /**
   * Load testing template based on test type
   */
  async loadTemplate(): Promise<this> {
    const templates: Record<string, any> = {
      unit: {
        requiredSections: [
          'test_objectives',
          'test_cases',
          'setup_teardown',
          'assertions',
          'mocking_strategy',
          'coverage_targets'
        ],
        contextToConsider: [
          'function_signatures',
          'dependencies',
          'edge_cases',
          'error_conditions'
        ]
      },
      integration: {
        requiredSections: [
          'integration_points',
          'test_scenarios',
          'data_flow',
          'api_contracts',
          'environment_setup',
          'rollback_plan'
        ],
        contextToConsider: [
          'service_boundaries',
          'api_endpoints',
          'database_state',
          'external_dependencies'
        ]
      },
      e2e: {
        requiredSections: [
          'user_journeys',
          'test_scenarios',
          'browser_matrix',
          'test_data',
          'performance_criteria',
          'accessibility_checks'
        ],
        contextToConsider: [
          'user_flows',
          'critical_paths',
          'ui_components',
          'responsive_breakpoints'
        ]
      },
      performance: {
        requiredSections: [
          'performance_goals',
          'load_scenarios',
          'metrics_to_measure',
          'baseline_benchmarks',
          'stress_test_limits',
          'optimization_targets'
        ],
        contextToConsider: [
          'current_performance',
          'bottlenecks',
          'resource_usage',
          'scaling_requirements'
        ]
      }
    };

    const template = templates[this.testType] || templates.unit;
    template.rulesAndConstraints = [
      'Tests must be deterministic and repeatable',
      'Each test should test one thing',
      'Test names should clearly describe what is being tested',
      'Use AAA pattern: Arrange, Act, Assert',
      'Mock external dependencies',
      'Tests should run in isolation'
    ];

    this.withTemplate(template);
    console.log(chalk.gray(`  ✓ ${this.testType} test template loaded`));
    return this;
  }

  /**
   * Gather context for test generation
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering testing context...'));

    // Analyze codebase for testing needs
    const codeAnalysis = await this.analyzeCodebase();

    // Get existing test coverage
    const coverage = await this.getTestCoverage();

    // Identify critical paths
    const criticalPaths = await this.identifyCriticalPaths();

    const context = {
      testType: this.testType,
      targetFiles: codeAnalysis.files,
      existingTests: codeAnalysis.existingTests,
      coverage: coverage,
      criticalPaths: criticalPaths,
      framework: await this.detectTestFramework(),
      packageJson: await this.getPackageJson()
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Context gathered'));
    return this;
  }

  /**
   * Generate test content
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating test content...'));

    const context = this.ctx.context;
    const intent = this.parseTestIntent(this.ctx.intent);

    const sections: string[] = [];

    // Header
    sections.push(`# ${this.capitalize(this.testType)} Test Plan: ${intent.target || 'Application'}\n`);
    sections.push(`**Test Type**: ${this.capitalize(this.testType)}`);
    sections.push(`**Framework**: ${context.framework || 'Jest'}`);
    sections.push(`**Coverage Target**: ${intent.coverage || 80}%\n`);

    // Test Objectives
    sections.push(`## 🎯 Test Objectives\n`);
    sections.push(this.generateObjectives(this.testType, intent));

    // Test Cases
    sections.push(`## 📋 Test Cases\n`);
    sections.push(this.generateTestCases(this.testType, context, intent));

    // Setup and Configuration
    sections.push(`## ⚙️ Setup & Configuration\n`);
    sections.push(this.generateSetupInstructions(this.testType, context));

    // Test Implementation
    sections.push(`## 💻 Test Implementation\n`);
    sections.push(this.generateTestCode(this.testType, context, intent));

    // Coverage Strategy
    sections.push(`## 📊 Coverage Strategy\n`);
    sections.push(this.generateCoverageStrategy(context));

    // CI/CD Integration
    sections.push(`## 🔄 CI/CD Integration\n`);
    sections.push('```yaml');
    sections.push('# GitHub Actions example');
    sections.push('- name: Run tests');
    sections.push(`  run: npm run test:${this.testType}`);
    sections.push('- name: Upload coverage');
    sections.push('  uses: codecov/codecov-action@v3');
    sections.push('```\n');

    // Best Practices
    sections.push(`## 📚 Best Practices\n`);
    sections.push(this.generateBestPractices(this.testType));

    // Footer
    sections.push('---');
    sections.push(`**Generated**: ${new Date().toISOString()}`);
    sections.push(`**Pipeline**: TestingPipeline v1.0`);
    sections.push(`**Confidence**: ${Math.round(this.ctx.confidence * 100)}%`);

    this.ctx.content = sections.join('\n');
    console.log(chalk.gray('  ✓ Test content generated'));
    return this;
  }

  /**
   * Validate test content
   */
  validateContent(): this {
    if (!this.ctx.content) {
      this.ctx.errors.push('No test content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    // Check for required sections
    const requiredPatterns = [
      /Test Objectives/i,
      /Test Cases/i,
      /Setup/i,
      /Implementation/i
    ];

    for (const pattern of requiredPatterns) {
      if (!pattern.test(this.ctx.content)) {
        this.ctx.errors.push(`Missing required section: ${pattern.source}`);
        this.adjustConfidence(0.8);
      }
    }

    console.log(chalk.gray('  ✓ Content validated'));
    return this;
  }

  /**
   * Save test plan/code
   */
  async save(): Promise<this> {
    if (!this.ctx.content) {
      console.error(chalk.red('No content to save'));
      return this;
    }

    console.log(chalk.cyan('💾 Saving test content...'));

    const testsDir = path.join(this.ginkoDir, 'tests');
    await fs.ensureDir(testsDir);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${this.testType}-test-${timestamp}.md`;
    const filepath = path.join(testsDir, filename);

    await fs.writeFile(filepath, this.ctx.content, 'utf-8');

    console.log(chalk.green(`  ✅ Test content saved to: ${path.relative(process.cwd(), filepath)}`));
    if (!this.ctx.metadata) {
      this.ctx.metadata = {};
    }
    this.ctx.metadata.savedPath = filepath;

    return this;
  }

  /**
   * Execute final pipeline actions
   */
  async execute(): Promise<PipelineContext> {
    if (!this.ctx.metadata?.savedPath) {
      throw new Error('Test content was not saved');
    }

    console.log(chalk.green('\n✨ Testing pipeline completed successfully!'));
    return this.ctx;
  }

  /**
   * Main build method using fluent interface
   */
  async build(): Promise<string> {
    try {
      return await this.initialize()
        .then(p => p.loadTemplate())
        .then(p => p.gatherContext())
        .then(p => {
          p.generateContent();
          p.validateContent();
          return p;
        })
        .then(p => p.validate())
        .then(p => p.recover())
        .then(p => p.save())
        .then(p => p.execute())
        .then(ctx => ctx.metadata?.savedPath || '');
    } catch (error) {
      console.error(chalk.red(`Testing pipeline failed: ${error}`));
      throw error;
    }
  }

  // Helper methods

  private detectTestType(intent: string): string {
    const lower = intent.toLowerCase();
    if (lower.includes('integration')) return 'integration';
    if (lower.includes('e2e') || lower.includes('end-to-end')) return 'e2e';
    if (lower.includes('performance') || lower.includes('load')) return 'performance';
    return 'unit';
  }

  private async analyzeCodebase(): Promise<any> {
    // Simplified codebase analysis
    return {
      files: ['src/index.ts', 'src/utils.ts'],
      existingTests: ['src/index.test.ts'],
      untested: ['src/utils.ts']
    };
  }

  private async getTestCoverage(): Promise<any> {
    // Simplified coverage data
    return {
      statements: 75,
      branches: 65,
      functions: 80,
      lines: 75
    };
  }

  private async identifyCriticalPaths(): Promise<string[]> {
    return [
      'User authentication flow',
      'Payment processing',
      'Data validation',
      'Error handling'
    ];
  }

  private async detectTestFramework(): Promise<string> {
    const projectRoot = await getProjectRoot();
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const pkg = await fs.readJson(packageJsonPath);
      if (pkg.devDependencies?.jest) return 'Jest';
      if (pkg.devDependencies?.mocha) return 'Mocha';
      if (pkg.devDependencies?.vitest) return 'Vitest';
    }
    return 'Jest';
  }

  private async getPackageJson(): Promise<any> {
    const projectRoot = await getProjectRoot();
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      return fs.readJson(packageJsonPath);
    }
    return {};
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private parseTestIntent(intent: string): any {
    return {
      target: intent.match(/test\s+(\w+)/i)?.[1] || 'application',
      coverage: 80,
      focus: 'comprehensive'
    };
  }

  private generateObjectives(testType: string, intent: any): string {
    const objectives: Record<string, string[]> = {
      unit: [
        '- Verify individual functions work correctly',
        '- Test edge cases and error conditions',
        '- Ensure proper input validation',
        '- Validate return values and side effects'
      ],
      integration: [
        '- Verify components work together correctly',
        '- Test data flow between services',
        '- Validate API contracts',
        '- Ensure proper error propagation'
      ],
      e2e: [
        '- Validate complete user workflows',
        '- Test critical business paths',
        '- Verify UI responsiveness',
        '- Ensure accessibility compliance'
      ],
      performance: [
        '- Measure response times under load',
        '- Identify performance bottlenecks',
        '- Validate scalability limits',
        '- Ensure resource optimization'
      ]
    };

    return objectives[testType]?.join('\n') || '- Ensure code quality';
  }

  private generateTestCases(testType: string, context: any, intent: any): string {
    const cases: string[] = [];

    if (testType === 'unit') {
      cases.push('### Happy Path Tests');
      cases.push('- ✅ Function returns expected value for valid input');
      cases.push('- ✅ Calculations produce correct results');
      cases.push('');
      cases.push('### Edge Case Tests');
      cases.push('- ✅ Handle empty input gracefully');
      cases.push('- ✅ Manage boundary values correctly');
      cases.push('');
      cases.push('### Error Handling Tests');
      cases.push('- ✅ Throw appropriate errors for invalid input');
      cases.push('- ✅ Handle null/undefined values');
    } else if (testType === 'integration') {
      cases.push('### API Integration Tests');
      cases.push('- ✅ Successful API calls return expected data');
      cases.push('- ✅ Failed API calls handle errors gracefully');
      cases.push('');
      cases.push('### Database Integration Tests');
      cases.push('- ✅ CRUD operations work correctly');
      cases.push('- ✅ Transactions rollback on error');
    }

    return cases.join('\n');
  }

  private generateSetupInstructions(testType: string, context: any): string {
    const setup: string[] = [];

    setup.push('```bash');
    setup.push('# Install test dependencies');
    setup.push(`npm install --save-dev ${context.framework?.toLowerCase() || 'jest'}`);

    if (testType === 'e2e') {
      setup.push('npm install --save-dev playwright');
    }

    setup.push('');
    setup.push('# Configure test script in package.json');
    setup.push(`"test:${testType}": "${context.framework?.toLowerCase() || 'jest'} --coverage"`);
    setup.push('```');

    return setup.join('\n');
  }

  private generateTestCode(testType: string, context: any, intent: any): string {
    const code: string[] = [];

    code.push('```typescript');
    code.push(`// ${testType}.test.ts`);
    code.push(`import { describe, it, expect${testType === 'unit' ? ', jest' : ''} } from '${context.framework?.toLowerCase() || 'jest'}';`);
    code.push('');

    if (testType === 'unit') {
      code.push('describe(\'Component Tests\', () => {');
      code.push('  it(\'should return expected value\', () => {');
      code.push('    // Arrange');
      code.push('    const input = \'test\';');
      code.push('    ');
      code.push('    // Act');
      code.push('    const result = myFunction(input);');
      code.push('    ');
      code.push('    // Assert');
      code.push('    expect(result).toBe(\'expected\');');
      code.push('  });');
      code.push('});');
    }

    code.push('```');

    return code.join('\n');
  }

  private generateCoverageStrategy(context: any): string {
    const strategy: string[] = [];

    strategy.push(`**Current Coverage**: ${context.coverage?.statements || 0}%`);
    strategy.push(`**Target Coverage**: 80%`);
    strategy.push('');
    strategy.push('### Coverage Goals');
    strategy.push('- Statements: > 80%');
    strategy.push('- Branches: > 75%');
    strategy.push('- Functions: > 80%');
    strategy.push('- Lines: > 80%');

    return strategy.join('\n');
  }

  private generateBestPractices(testType: string): string {
    const practices: string[] = [
      '1. **Test Isolation**: Each test should run independently',
      '2. **Clear Naming**: Test names should describe what is being tested',
      '3. **Single Responsibility**: Each test should verify one behavior',
      '4. **Fast Execution**: Tests should run quickly',
      '5. **Deterministic**: Tests should produce consistent results',
      '6. **Maintainable**: Tests should be easy to understand and update'
    ];

    return practices.join('\n');
  }
}

/**
 * Adapter for CLI command usage
 */
export class TestingReflectionCommand {
  private pipeline: TestingPipeline;

  constructor() {
    this.pipeline = new TestingPipeline();
  }

  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      if (intent && intent.trim() !== '') {
        this.pipeline = new TestingPipeline(intent);
      }
      await this.pipeline.build();
    } catch (error) {
      console.error(chalk.red(`Testing pipeline failed: ${error}`));
      throw error;
    }
  }
}

export default TestingPipeline;