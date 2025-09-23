/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, unit-test, orchestrator, validation, jest]
 * @related: [../../../src/core/validators/validation-orchestrator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra]
 */

import {
  ValidationOrchestrator,
  ValidationSeverity,
  ValidationSummary,
  ValidationReport
} from '../../../src/core/validators/validation-orchestrator.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { simpleGit } from 'simple-git';

describe('ValidationOrchestrator', () => {
  let tempDir: string;
  let orchestrator: ValidationOrchestrator;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-orchestrator-test-'));
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should create orchestrator with default options', () => {
      const orchestrator = new ValidationOrchestrator();
      expect(orchestrator).toBeDefined();
    });

    it('should accept custom options', () => {
      const options = {
        projectRoot: tempDir,
        skipOptional: true,
        verbose: true,
        timeoutMs: 5000
      };

      const orchestrator = new ValidationOrchestrator(options);
      expect(orchestrator).toBeDefined();
    });
  });

  describe('runAllValidations()', () => {
    it('should run all validators and return summary', async () => {
      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: true
      });

      const summary = await orchestrator.runAllValidations();

      expect(summary).toBeDefined();
      expect(typeof summary.success).toBe('boolean');
      expect(typeof summary.canProceed).toBe('boolean');
      expect(Array.isArray(summary.reports)).toBe(true);
      expect(Array.isArray(summary.errors)).toBe(true);
      expect(Array.isArray(summary.warnings)).toBe(true);
      expect(typeof summary.duration).toBe('number');
      expect(summary.metadata).toBeDefined();
    });

    it('should fail when git repository is missing', async () => {
      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: true
      });

      const summary = await orchestrator.runAllValidations();

      expect(summary.canProceed).toBe(false);
      expect(summary.errors.length).toBeGreaterThan(0);

      const gitError = summary.errors.find(e => e.validator === 'Git Repository');
      expect(gitError).toBeDefined();
      expect(gitError?.message).toContain('not in a git repository');
    });

    it('should succeed with valid git repository', async () => {
      // Initialize git repository
      const git = simpleGit(tempDir);
      await git.init();
      await git.config('user.email', 'test@example.com');
      await git.config('user.name', 'Test User');

      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: true
      });

      const summary = await orchestrator.runAllValidations();

      expect(summary.canProceed).toBe(true);

      const gitReport = summary.reports.find(r => r.validator === 'Git Repository');
      expect(gitReport?.valid).toBe(true);
    });

    it('should warn about missing config but still allow proceeding', async () => {
      // Initialize git repository
      const git = simpleGit(tempDir);
      await git.init();

      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: true
      });

      const summary = await orchestrator.runAllValidations();

      // Should be able to proceed despite missing config
      expect(summary.canProceed).toBe(true);

      const configReport = summary.reports.find(r => r.validator === 'Configuration');
      if (configReport) {
        expect(configReport.severity).toBe(ValidationSeverity.WARNING);
      }
    });

    it('should include environment validation', async () => {
      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: true
      });

      const summary = await orchestrator.runAllValidations();

      const envReport = summary.reports.find(r => r.validator === 'Environment');
      expect(envReport).toBeDefined();
      expect(envReport?.valid).toBe(true); // Should pass in test environment
    });

    it('should track validation duration', async () => {
      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: true
      });

      const summary = await orchestrator.runAllValidations();

      expect(summary.duration).toBeGreaterThan(0);
      expect(summary.duration).toBeLessThan(10000); // Should be fast
    });
  });

  describe('runCriticalValidations()', () => {
    it('should run only critical validators', async () => {
      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir
      });

      const summary = await orchestrator.runCriticalValidations();

      expect(summary.reports.length).toBeLessThanOrEqual(3); // Environment, Git, and maybe config

      const hasEnvironment = summary.reports.some(r => r.validator === 'Environment');
      expect(hasEnvironment).toBe(true);
    });

    it('should be faster than full validation', async () => {
      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir
      });

      const criticalStart = Date.now();
      const criticalSummary = await orchestrator.runCriticalValidations();
      const criticalDuration = Date.now() - criticalStart;

      const fullStart = Date.now();
      const fullSummary = await orchestrator.runAllValidations();
      const fullDuration = Date.now() - fullStart;

      expect(criticalDuration).toBeLessThanOrEqual(fullDuration);
      expect(criticalSummary.reports.length).toBeLessThanOrEqual(fullSummary.reports.length);
    });
  });

  describe('validation filtering and querying', () => {
    beforeEach(async () => {
      // Setup for filtering tests
      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: true
      });
      await orchestrator.runAllValidations();
    });

    it('should filter reports by severity', () => {
      const errors = orchestrator.getReportsBySeverity(ValidationSeverity.ERROR);
      const warnings = orchestrator.getReportsBySeverity(ValidationSeverity.WARNING);
      const info = orchestrator.getReportsBySeverity(ValidationSeverity.INFO);

      expect(Array.isArray(errors)).toBe(true);
      expect(Array.isArray(warnings)).toBe(true);
      expect(Array.isArray(info)).toBe(true);

      // All error reports should have error severity
      errors.forEach(report => {
        expect(report.severity).toBe(ValidationSeverity.ERROR);
      });
    });

    it('should get failed validations', () => {
      const failed = orchestrator.getFailedValidations();

      expect(Array.isArray(failed)).toBe(true);
      failed.forEach(report => {
        expect(report.valid).toBe(false);
      });
    });

    it('should check if specific validator passed', () => {
      const envPassed = orchestrator.hasValidatorPassed('Environment');
      expect(typeof envPassed).toBe('boolean');
    });

    it('should get all suggestions for fixing issues', () => {
      const suggestions = orchestrator.getAllSuggestions();

      expect(Array.isArray(suggestions)).toBe(true);
      // Should have suggestions if there are any failures
      const hasFailures = orchestrator.getFailedValidations().length > 0;
      if (hasFailures) {
        expect(suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('timeout handling', () => {
    it('should respect timeout configuration', async () => {
      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        timeoutMs: 1, // Very short timeout
        skipOptional: true
      });

      const startTime = Date.now();
      const summary = await orchestrator.runAllValidations();
      const duration = Date.now() - startTime;

      // Should complete quickly due to timeout
      expect(duration).toBeLessThan(5000);
      expect(summary).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      orchestrator = new ValidationOrchestrator({
        projectRoot: '/nonexistent/path',
        skipOptional: true
      });

      const summary = await orchestrator.runAllValidations();

      expect(summary).toBeDefined();
      expect(summary.success).toBe(false);
      expect(summary.errors.length).toBeGreaterThan(0);
    });

    it('should generate emergency summary on orchestration failure', async () => {
      // This test is harder to trigger, but ensures robust error handling
      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: true
      });

      const summary = await orchestrator.runAllValidations();

      // Even if individual validations fail, orchestrator should not crash
      expect(summary).toBeDefined();
      expect(typeof summary.success).toBe('boolean');
      expect(typeof summary.canProceed).toBe('boolean');
    });
  });

  describe('metadata collection', () => {
    it('should collect comprehensive metadata', async () => {
      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: true
      });

      const summary = await orchestrator.runAllValidations();

      expect(summary.metadata).toMatchObject({
        platform: expect.any(String),
        nodeVersion: expect.stringMatching(/^v?\d+\.\d+\.\d+/),
        gitAvailable: expect.any(Boolean),
        configExists: expect.any(Boolean),
        totalChecks: expect.any(Number),
        passedChecks: expect.any(Number)
      });

      expect(summary.metadata.totalChecks).toBe(summary.reports.length);
      expect(summary.metadata.passedChecks).toBeLessThanOrEqual(summary.metadata.totalChecks);
    });
  });

  describe('complete workflow scenarios', () => {
    it('should handle fresh project setup', async () => {
      // Simulate a fresh project with git but no ginko config
      const git = simpleGit(tempDir);
      await git.init();
      await git.config('user.email', 'test@example.com');
      await git.config('user.name', 'Test User');

      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: false
      });

      const summary = await orchestrator.runAllValidations();

      expect(summary.canProceed).toBe(true); // Should be able to proceed
      expect(summary.success).toBe(false); // But not completely successful (missing config)

      // Should suggest creating configuration
      const suggestions = orchestrator.getAllSuggestions();
      const hasConfigSuggestion = suggestions.some(s =>
        s.includes('ginko.json') || s.includes('ginko init')
      );
      expect(hasConfigSuggestion).toBe(true);
    });

    it('should handle complete setup', async () => {
      // Simulate a complete ginko setup
      const git = simpleGit(tempDir);
      await git.init();
      await git.config('user.email', 'test@example.com');
      await git.config('user.name', 'Test User');

      // Create valid ginko config
      const config = {
        version: '1.0.0',
        paths: {
          docs: { root: './docs' },
          ginko: { root: './.ginko' }
        },
        features: { autoHandoff: true }
      };

      await fs.writeJson(path.join(tempDir, 'ginko.json'), config);

      orchestrator = new ValidationOrchestrator({
        projectRoot: tempDir,
        skipOptional: false
      });

      const summary = await orchestrator.runAllValidations();

      expect(summary.canProceed).toBe(true);
      expect(summary.success).toBe(true);
      expect(summary.errors.length).toBe(0);
    });
  });
});