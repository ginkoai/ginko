/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-20
 * @tags: [test, project-analyzer, init, tech-stack-detection]
 * @related: [project-analyzer.ts]
 * @priority: critical
 * @complexity: medium
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ProjectAnalyzer } from '../../src/analysis/project-analyzer.js';

describe('ProjectAnalyzer', () => {
  let tempDir: string;
  let analyzer: ProjectAnalyzer;

  beforeEach(async () => {
    // Create temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-analyzer-test-'));
    analyzer = new ProjectAnalyzer(tempDir);
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.remove(tempDir);
  });

  describe('Package Manager Detection', () => {
    it('should detect npm from package-lock.json', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.writeFile(path.join(tempDir, 'package-lock.json'), '{}');

      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('npm');
    });

    it('should detect yarn from yarn.lock', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.writeFile(path.join(tempDir, 'yarn.lock'), '');

      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('yarn');
    });

    it('should detect pnpm from pnpm-lock.yaml', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), '');

      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('pnpm');
    });

    it('should detect bun from bun.lockb', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.writeFile(path.join(tempDir, 'bun.lockb'), '');

      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('bun');
    });

    it('should default to npm if no lock file exists', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });

      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('npm');
    });
  });

  describe('Language Detection', () => {
    it('should detect TypeScript from package.json dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        devDependencies: { typescript: '^5.0.0' }
      });

      const result = await analyzer.analyze();

      expect(result.languages).toContain('typescript');
    });

    it('should detect Python from requirements.txt', async () => {
      await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0\n');

      const result = await analyzer.analyze();

      expect(result.languages).toContain('python');
    });

    it('should detect Python from pyproject.toml', async () => {
      await fs.writeFile(path.join(tempDir, 'pyproject.toml'), '[tool.poetry]\n');

      const result = await analyzer.analyze();

      expect(result.languages).toContain('python');
    });

    it('should detect Go from go.mod', async () => {
      await fs.writeFile(path.join(tempDir, 'go.mod'), 'module example.com/project\n');

      const result = await analyzer.analyze();

      expect(result.languages).toContain('go');
    });

    it('should detect Rust from Cargo.toml', async () => {
      await fs.writeFile(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"\n');

      const result = await analyzer.analyze();

      expect(result.languages).toContain('rust');
    });
  });

  describe('Framework Detection', () => {
    it('should detect React from dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { react: '^18.0.0' }
      });

      const result = await analyzer.analyze();

      expect(result.frameworks).toContain('react');
    });

    it('should detect Next.js from dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { next: '^14.0.0' }
      });

      const result = await analyzer.analyze();

      expect(result.frameworks).toContain('nextjs');
    });

    it('should detect Express from dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { express: '^4.18.0' }
      });

      const result = await analyzer.analyze();

      expect(result.frameworks).toContain('express');
    });

    it('should detect NestJS from dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { '@nestjs/core': '^10.0.0' }
      });

      const result = await analyzer.analyze();

      expect(result.frameworks).toContain('nestjs');
    });
  });

  describe('Project Type Classification', () => {
    it('should classify as webapp when React detected', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' }
      });

      const result = await analyzer.analyze();

      expect(result.projectType).toBe('webapp');
    });

    it('should classify as api when Express detected without frontend', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { express: '^4.18.0' }
      });

      const result = await analyzer.analyze();

      expect(result.projectType).toBe('api');
    });

    it('should classify as cli when commander detected', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { commander: '^11.0.0' },
        bin: { 'my-cli': './dist/index.js' }
      });

      const result = await analyzer.analyze();

      expect(result.projectType).toBe('cli');
    });

    it('should classify as library when no main/bin entry points', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        main: 'dist/index.js',
        types: 'dist/index.d.ts'
      });

      const result = await analyzer.analyze();

      expect(result.projectType).toBe('library');
    });
  });

  describe('Test Setup Detection', () => {
    it('should detect Jest test setup', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        devDependencies: { jest: '^29.0.0' },
        scripts: { test: 'jest' }
      });

      const result = await analyzer.analyze();

      expect(result.hasTests).toBe(true);
    });

    it('should detect Vitest test setup', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        devDependencies: { vitest: '^1.0.0' },
        scripts: { test: 'vitest' }
      });

      const result = await analyzer.analyze();

      expect(result.hasTests).toBe(true);
    });

    it('should return false when no test setup detected', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test'
      });

      const result = await analyzer.analyze();

      expect(result.hasTests).toBe(false);
    });
  });

  describe('Command Extraction', () => {
    it('should extract test command from package.json scripts', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        scripts: {
          test: 'vitest',
          build: 'tsc',
          lint: 'eslint .'
        }
      });

      const result = await analyzer.analyze();

      expect(result.testCommand).toBe('npm test');
      expect(result.buildCommand).toBe('npm run build');
      expect(result.lintCommand).toBe('npm run lint');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing package.json gracefully', async () => {
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('unknown');
      expect(result.packageManager).toBe('unknown');
      expect(result.languages).toEqual([]);
    });

    it('should handle invalid JSON in package.json', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{invalid json}');

      const result = await analyzer.analyze();

      expect(result.projectType).toBe('unknown');
    });
  });

  describe('QuickAnalyze Static Method', () => {
    it('should perform quick analysis without full detection', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test-project',
        version: '1.0.0',
        dependencies: { react: '^18.0.0' }
      });

      const result = await ProjectAnalyzer.quickAnalyze(tempDir);

      expect(result.projectName).toBe('test-project');
      expect(result.frameworks).toBeDefined();
    });
  });
});
