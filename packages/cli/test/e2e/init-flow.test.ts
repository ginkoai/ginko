/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-21
 * @tags: [test, e2e, init, integration]
 * @related: [init.ts]
 * @priority: critical
 * @complexity: medium
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper to run ginko commands
async function runGinko(args: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  const ginkoPath = path.join(__dirname, '../../dist/index.js');
  return execAsync(`node ${ginkoPath} ${args}`, { cwd });
}

describe('Init Flow E2E Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-e2e-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.remove(tempDir);
  });

  describe('Complete Init Flow', () => {
    it('should initialize ginko in empty directory', async () => {
      await runGinko('init --quick', tempDir);

      // Verify directory structure
      expect(await fs.pathExists(path.join(tempDir, '.ginko'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.ginko', 'sessions'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.ginko', 'context'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.ginko', 'context', 'modules'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.ginko', 'patterns'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.ginko', 'best-practices'))).toBe(true);

      // Verify config file
      const configPath = path.join(tempDir, '.ginko', 'config.json');
      expect(await fs.pathExists(configPath)).toBe(true);
      const config = await fs.readJSON(configPath);
      expect(config.version).toBeDefined();
      expect(config.privacy).toBeDefined();
      expect(config.privacy.shareAnonymizedUsage).toBe(false); // Privacy-first

      // Verify .gitignore
      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(true);
      const gitignore = await fs.readFile(gitignorePath, 'utf8');
      expect(gitignore).toContain('.ginko/config.json');
      expect(gitignore).toContain('.ginko/.temp/');

      // Verify context files
      expect(await fs.pathExists(path.join(tempDir, '.ginko', 'context', 'rules.md'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.ginko', 'best-practices', 'local.md'))).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      // First init
      await runGinko('init --quick', tempDir);

      const configPath = path.join(tempDir, '.ginko', 'config.json');
      const originalConfig = await fs.readJSON(configPath);
      const originalTime = (await fs.stat(configPath)).mtime;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second init should warn and not recreate
      try {
        await runGinko('init --quick', tempDir);
      } catch (error) {
        // Expected to warn/error on reinit
      }

      const newTime = (await fs.stat(configPath)).mtime;
      expect(newTime.getTime()).toBe(originalTime.getTime()); // File not modified
    });
  });

  describe('React Project Initialization', () => {
    beforeEach(async () => {
      // Create a React project structure
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test-react-app',
        version: '1.0.0',
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          jest: '^29.0.0',
        },
        scripts: {
          test: 'jest',
          build: 'react-scripts build',
        },
      });
      await fs.writeFile(path.join(tempDir, 'package-lock.json'), '{}');
    });

    it('should detect React webapp project type', async () => {
      await runGinko("init", tempDir);

      const analysisPath = path.join(tempDir, '.ginko', 'context', 'project-analysis.json');
      expect(await fs.pathExists(analysisPath)).toBe(true);

      const analysis = await fs.readJSON(analysisPath);
      expect(analysis.projectType).toBe('webapp');
      expect(analysis.frameworks).toContain('react');
      expect(analysis.languages).toContain('typescript');
      expect(analysis.packageManager).toBe('npm');
      expect(analysis.hasTests).toBe(true);
    });

    it('should generate appropriate CLAUDE.md for React project', async () => {
      await runGinko("init", tempDir);

      const claudePath = path.join(tempDir, 'CLAUDE.md');
      expect(await fs.pathExists(claudePath)).toBe(true);

      const content = await fs.readFile(claudePath, 'utf8');
      expect(content).toContain('React');
      expect(content).toContain('TypeScript');
      expect(content).toContain('webapp');
    });
  });

  describe('API Project Initialization', () => {
    beforeEach(async () => {
      // Create an Express API project
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test-api',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
        },
        scripts: {
          test: 'jest',
          build: 'tsc',
        },
      });
      await fs.writeFile(path.join(tempDir, 'yarn.lock'), '');
    });

    it('should detect API project type', async () => {
      await runGinko("init", tempDir);

      const analysisPath = path.join(tempDir, '.ginko', 'context', 'project-analysis.json');
      const analysis = await fs.readJSON(analysisPath);

      expect(analysis.projectType).toBe('api');
      expect(analysis.frameworks).toContain('express');
      expect(analysis.packageManager).toBe('yarn');
    });
  });

  describe('CLI Project Initialization', () => {
    beforeEach(async () => {
      // Create a CLI project
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test-cli',
        version: '1.0.0',
        bin: {
          'my-cli': './dist/index.js',
        },
        dependencies: {
          commander: '^11.0.0',
        },
      });
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), '');
    });

    it('should detect CLI project type', async () => {
      await runGinko("init", tempDir);

      const analysisPath = path.join(tempDir, '.ginko', 'context', 'project-analysis.json');
      const analysis = await fs.readJSON(analysisPath);

      expect(analysis.projectType).toBe('cli');
      expect(analysis.packageManager).toBe('pnpm');
    });
  });

  describe('Quick Mode', () => {
    it('should skip analysis in quick mode', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { react: '^18.0.0' },
      });

      await runGinko("init --quick", tempDir);

      // Analysis file should NOT exist in quick mode
      const analysisPath = path.join(tempDir, '.ginko', 'context', 'project-analysis.json');
      expect(await fs.pathExists(analysisPath)).toBe(false);

      // But directory structure should still be created
      expect(await fs.pathExists(path.join(tempDir, '.ginko'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.ginko', 'config.json'))).toBe(true);
    });
  });

  describe('Python Project', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0\npytest==7.0.0\n');
      await fs.writeFile(path.join(tempDir, 'setup.py'), '# Python setup');
    });

    it('should detect Python project', async () => {
      await runGinko("init", tempDir);

      const analysisPath = path.join(tempDir, '.ginko', 'context', 'project-analysis.json');
      const analysis = await fs.readJSON(analysisPath);

      expect(analysis.languages).toContain('python');
    });
  });

  describe('Go Project', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(tempDir, 'go.mod'), 'module example.com/project\n\ngo 1.21\n');
    });

    it('should detect Go project', async () => {
      await runGinko("init", tempDir);

      const analysisPath = path.join(tempDir, '.ginko', 'context', 'project-analysis.json');
      const analysis = await fs.readJSON(analysisPath);

      expect(analysis.languages).toContain('go');
    });
  });

  describe('.gitignore Handling', () => {
    it('should not duplicate entries on multiple inits', async () => {
      // First init
      await runGinko("init --quick", tempDir);

      // Manually run init again (simulating user error)
      await fs.remove(path.join(tempDir, '.ginko'));
      await runGinko("init --quick", tempDir);

      const gitignore = await fs.readFile(path.join(tempDir, '.gitignore'), 'utf8');
      const matches = (gitignore.match(/\.ginko\/config\.json/g) || []).length;

      // Should only appear once even after multiple inits
      expect(matches).toBe(1);
    });

    it('should preserve existing .gitignore content', async () => {
      // Create existing .gitignore
      await fs.writeFile(path.join(tempDir, '.gitignore'), 'node_modules/\n.env\n');

      await runGinko("init --quick", tempDir);

      const gitignore = await fs.readFile(path.join(tempDir, '.gitignore'), 'utf8');
      expect(gitignore).toContain('node_modules/');
      expect(gitignore).toContain('.env');
      expect(gitignore).toContain('.ginko/config.json');
    });
  });

  describe('Model Configuration', () => {
    it('should use custom model when specified', async () => {
      await runGinko("init --model gpt-4o --quick", tempDir);

      const config = await fs.readJSON(path.join(tempDir, '.ginko', 'config.json'));
      expect(config.ai.defaultModel).toBe('gpt-4o');
    });

    it('should use default Claude model when not specified', async () => {
      await runGinko("init --quick", tempDir);

      const config = await fs.readJSON(path.join(tempDir, '.ginko', 'config.json'));
      expect(config.ai.defaultModel).toBe('claude-3-5-sonnet-20241022');
    });
  });

  describe('User Session Directory', () => {
    it('should create user session directory with email slug', async () => {
      await runGinko("init --quick", tempDir);

      // Check that a user session directory exists
      const sessionsDir = path.join(tempDir, '.ginko', 'sessions');
      const userDirs = await fs.readdir(sessionsDir);

      expect(userDirs.length).toBeGreaterThan(0);
      expect(userDirs[0]).toMatch(/.*-at-.*/); // Should contain email slug format

      // Verify archive subdirectory exists
      const archiveDir = path.join(sessionsDir, userDirs[0], 'archive');
      expect(await fs.pathExists(archiveDir)).toBe(true);
    });
  });

  describe('Content Quality', () => {
    it('should generate meaningful context rules', async () => {
      await runGinko("init --quick", tempDir);

      const rulesContent = await fs.readFile(
        path.join(tempDir, '.ginko', 'context', 'rules.md'),
        'utf8'
      );

      expect(rulesContent).toContain('Privacy');
      expect(rulesContent).toContain('Security');
      expect(rulesContent).toContain('Best Practices');
      expect(rulesContent).toContain('ginko handoff');
      expect(rulesContent).toContain('ginko start');
    });

    it('should generate helpful best practices', async () => {
      await runGinko("init --quick", tempDir);

      const bestPracticesContent = await fs.readFile(
        path.join(tempDir, '.ginko', 'best-practices', 'local.md'),
        'utf8'
      );

      expect(bestPracticesContent).toContain('Session Management');
      expect(bestPracticesContent).toContain('Development Workflow');
      expect(bestPracticesContent).toContain('ginko start');
      expect(bestPracticesContent).toContain('ginko handoff');
      expect(bestPracticesContent).toContain('ginko vibecheck');
    });
  });
});
