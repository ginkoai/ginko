/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-23
 * @tags: [test, analysis, project-analyzer, detection]
 * @related: [project-analyzer.ts]
 * @priority: high
 * @complexity: medium
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ProjectAnalyzer } from '../../src/analysis/project-analyzer.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('ProjectAnalyzer', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `ginko-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('Package Manager Detection', () => {
    it('should detect bun from bun.lockb', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.writeFile(path.join(tempDir, 'bun.lockb'), '');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('bun');
    });

    it('should detect pnpm from pnpm-lock.yaml', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), '');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('pnpm');
    });

    it('should detect yarn from yarn.lock', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.writeFile(path.join(tempDir, 'yarn.lock'), '');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('yarn');
    });

    it('should detect npm from package-lock.json', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.writeFile(path.join(tempDir, 'package-lock.json'), '');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('npm');
    });

    it('should default to npm when only package.json exists', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('npm');
    });

    it('should return unknown when no package files exist', async () => {
      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('unknown');
    });
  });

  describe('Project Type Classification', () => {
    it('should detect CLI from bin property in package.json', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test-cli',
        bin: { 'my-cli': './bin/cli.js' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('cli');
    });

    it('should detect webapp from React dependency', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test-webapp',
        dependencies: { react: '^18.0.0' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('webapp');
    });

    it('should detect webapp from Vue dependency', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test-webapp',
        dependencies: { vue: '^3.0.0' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('webapp');
    });

    it('should detect API from Express without frontend framework', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test-api',
        dependencies: { express: '^4.18.0' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('api');
    });

    it('should detect library from main property without bin', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test-lib',
        main: './dist/index.js'
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('library');
    });

    it('should detect monorepo from packages directory', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.ensureDir(path.join(tempDir, 'packages'));

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('monorepo');
    });

    it('should detect Next.js webapp from next.config.js', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.writeFile(path.join(tempDir, 'next.config.js'), 'module.exports = {}');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('webapp');
    });

    it('should default to unknown for ambiguous projects', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('unknown');
    });
  });

  describe('Framework Detection', () => {
    it('should detect React from dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { react: '^18.0.0' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.frameworks).toContain('react');
      expect(result.techStack).toContain('React');
    });

    it('should detect Next.js from dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { next: '^14.0.0' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.frameworks).toContain('nextjs');
      expect(result.techStack).toContain('Next.js');
    });

    it('should detect Vue from dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { vue: '^3.0.0' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.frameworks).toContain('vue');
      expect(result.techStack).toContain('Vue');
    });

    it('should detect Express from dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { express: '^4.18.0' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.frameworks).toContain('express');
      expect(result.techStack).toContain('Express');
    });

    it('should detect NestJS from dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: { '@nestjs/core': '^10.0.0' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.frameworks).toContain('nestjs');
      expect(result.techStack).toContain('NestJS');
    });

    it('should detect multiple frameworks correctly', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: {
          react: '^18.0.0',
          express: '^4.18.0'
        }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.frameworks).toContain('react');
      expect(result.frameworks).toContain('express');
      expect(result.techStack).toContain('React');
      expect(result.techStack).toContain('Express');
    });

    it('should add database frameworks to techStack', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        dependencies: {
          '@supabase/supabase-js': '^2.0.0',
          prisma: '^5.0.0'
        }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.techStack).toContain('Supabase');
      expect(result.techStack).toContain('Prisma');
    });

    it('should handle missing package.json gracefully', async () => {
      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.frameworks).toEqual([]);
      expect(result.techStack).toEqual([]);
    });
  });

  describe('Language Detection', () => {
    it('should detect TypeScript from dependency', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        devDependencies: { typescript: '^5.0.0' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.languages).toContain('typescript');
    });

    it('should detect TypeScript from tsconfig.json', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.writeJSON(path.join(tempDir, 'tsconfig.json'), {});

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.languages).toContain('typescript');
    });

    it('should detect JavaScript from package.json', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.languages).toContain('javascript');
    });

    it('should detect Python from requirements.txt', async () => {
      await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.languages).toContain('python');
    });

    it('should detect Go from go.mod', async () => {
      await fs.writeFile(path.join(tempDir, 'go.mod'), 'module example.com/myapp');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.languages).toContain('go');
    });

    it('should detect Rust from Cargo.toml', async () => {
      await fs.writeFile(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "myapp"');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.languages).toContain('rust');
    });
  });

  describe('Test Setup Detection', () => {
    it('should detect tests from test directory', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.ensureDir(path.join(tempDir, 'test'));
      await fs.writeFile(path.join(tempDir, 'test/example.test.ts'), '');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.hasTests).toBe(true);
    });

    it('should detect tests from __tests__ directory', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.ensureDir(path.join(tempDir, '__tests__'));

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.hasTests).toBe(true);
    });

    it('should detect tests from test files pattern', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });
      await fs.ensureDir(path.join(tempDir, 'src'));
      await fs.writeFile(path.join(tempDir, 'src/example.test.ts'), '');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.hasTests).toBe(true);
    });

    it('should set hasTests from test framework dependencies', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        devDependencies: { vitest: '^1.0.0' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.hasTests).toBe(true);
    });

    it('should handle projects with no tests', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.hasTests).toBe(false);
    });
  });

  describe('Command Extraction', () => {
    it('should find test command from package.json scripts', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        scripts: { test: 'vitest' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.testCommand).toBe('npm test');
    });

    it('should find build command from package.json scripts', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        scripts: { build: 'tsc' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.buildCommand).toBe('npm run build');
    });

    it('should find lint command from package.json scripts', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        scripts: { lint: 'eslint .' }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.lintCommand).toBe('npm run lint');
    });

    it('should format npm test command without run prefix', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        scripts: { test: 'vitest' }
      });
      await fs.writeFile(path.join(tempDir, 'package-lock.json'), '');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.testCommand).toBe('npm test');
    });

    it('should format yarn commands correctly', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        scripts: {
          test: 'vitest',
          build: 'tsc'
        }
      });
      await fs.writeFile(path.join(tempDir, 'yarn.lock'), '');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.testCommand).toBe('yarn test');
      expect(result.buildCommand).toBe('yarn build');
    });

    it('should format pnpm commands correctly', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        scripts: {
          test: 'vitest',
          build: 'tsc'
        }
      });
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), '');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.testCommand).toBe('pnpm test');
      expect(result.buildCommand).toBe('pnpm build');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing package.json gracefully', async () => {
      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectName).toBe(path.basename(tempDir));
      expect(result.packageManager).toBe('unknown');
      expect(result.techStack).toEqual([]);
    });

    it('should handle invalid JSON in package.json', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), 'invalid json{]');

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      // Should not crash and return defaults
      expect(result.projectName).toBe(path.basename(tempDir));
    });

    it('should handle missing directories without crashing', async () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');

      const analyzer = new ProjectAnalyzer(nonExistentDir);
      const result = await analyzer.analyze();

      expect(result.packageManager).toBe('unknown');
    });

    it('should handle glob errors in test detection gracefully', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'test' });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      // Should complete without crashing
      expect(result).toBeDefined();
    });
  });

  describe('quickAnalyze Static Method', () => {
    it('should return complete ProjectContext', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'quick-test',
        dependencies: { react: '^18.0.0' }
      });

      const result = await ProjectAnalyzer.quickAnalyze(tempDir);

      expect(result.projectName).toBe('quick-test');
      expect(result.frameworks).toContain('react');
      expect(result.projectType).toBe('webapp');
    });

    it('should work without instantiation', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        bin: { 'mycli': './cli.js' }
      });
      await fs.writeFile(path.join(tempDir, 'package-lock.json'), '');

      const result = await ProjectAnalyzer.quickAnalyze(tempDir);

      expect(result.projectType).toBe('cli');
      expect(result.packageManager).toBe('npm');
    });
  });

  describe('Complex Project Scenarios', () => {
    it('should detect monorepo with multiple package managers', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), { name: 'monorepo' });
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), '');
      await fs.ensureDir(path.join(tempDir, 'packages'));

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('monorepo');
      expect(result.packageManager).toBe('pnpm');
    });

    it('should detect webapp with multiple frameworks', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'fullstack',
        dependencies: {
          react: '^18.0.0',
          next: '^14.0.0',
          '@supabase/supabase-js': '^2.0.0'
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0'
        }
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectType).toBe('webapp');
      expect(result.frameworks).toContain('react');
      expect(result.frameworks).toContain('nextjs');
      expect(result.techStack).toContain('Supabase');
      expect(result.languages).toContain('typescript');
      expect(result.hasTests).toBe(true);
    });

    it('should prefer package.json hints over directory structure', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: 'test',
        bin: { cli: './bin/cli.js' }
      });
      await fs.ensureDir(path.join(tempDir, 'public')); // webapp hint

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      // bin property should take precedence
      expect(result.projectType).toBe('cli');
    });

    it('should extract project name from package.json', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {
        name: '@company/my-project'
      });

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectName).toBe('@company/my-project');
    });

    it('should fallback to directory name when package.json has no name', async () => {
      await fs.writeJSON(path.join(tempDir, 'package.json'), {});

      const analyzer = new ProjectAnalyzer(tempDir);
      const result = await analyzer.analyze();

      expect(result.projectName).toBe(path.basename(tempDir));
    });
  });
});
