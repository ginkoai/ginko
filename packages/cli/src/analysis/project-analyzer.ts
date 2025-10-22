/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-28
 * @tags: [analysis, project-detection, tech-stack, patterns]
 * @related: [claude-md-template.ts, init.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs-extra, glob]
 */

import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import { ProjectContext } from '../templates/ai-instructions-template.js';

export class ProjectAnalyzer {
  private projectRoot: string;
  private context: Partial<ProjectContext> = {};

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async analyze(): Promise<ProjectContext> {
    // Detect package manager and read package.json
    await this.detectPackageManager();
    await this.analyzePackageJson();
    
    // Detect project type
    await this.detectProjectType();
    
    // Detect languages
    await this.detectLanguages();
    
    // Detect test setup
    await this.detectTestSetup();
    
    // Fill in defaults
    return {
      projectName: this.context.projectName || path.basename(this.projectRoot),
      techStack: this.context.techStack || [],
      projectType: this.context.projectType || 'unknown',
      hasTests: this.context.hasTests || false,
      testCommand: this.context.testCommand,
      buildCommand: this.context.buildCommand,
      lintCommand: this.context.lintCommand,
      packageManager: this.context.packageManager || 'unknown',
      frameworks: this.context.frameworks || [],
      languages: this.context.languages || [],
    };
  }

  private async detectPackageManager(): Promise<void> {
    const checks = [
      { file: 'bun.lockb', manager: 'bun' as const },
      { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
      { file: 'yarn.lock', manager: 'yarn' as const },
      { file: 'package-lock.json', manager: 'npm' as const },
    ];

    for (const check of checks) {
      if (await fs.pathExists(path.join(this.projectRoot, check.file))) {
        this.context.packageManager = check.manager;
        return;
      }
    }

    // Default to npm if package.json exists
    if (await fs.pathExists(path.join(this.projectRoot, 'package.json'))) {
      this.context.packageManager = 'npm';
    }
  }

  private async analyzePackageJson(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!await fs.pathExists(packageJsonPath)) {
      return;
    }

    try {
      const packageJson = await fs.readJSON(packageJsonPath);
      
      // Extract project name
      if (packageJson.name) {
        this.context.projectName = packageJson.name;
      }

      // Extract scripts
      if (packageJson.scripts) {
        this.context.testCommand = this.findScript(packageJson.scripts, ['test', 'test:unit', 'test:all']);
        this.context.buildCommand = this.findScript(packageJson.scripts, ['build', 'compile', 'dist']);
        this.context.lintCommand = this.findScript(packageJson.scripts, ['lint', 'eslint', 'tslint']);
      }

      // Detect frameworks and libraries
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const techStack: string[] = [];
      const frameworks: string[] = [];

      // React ecosystem
      if (deps['react']) {
        frameworks.push('react');
        techStack.push('React');
      }
      if (deps['next']) {
        frameworks.push('nextjs');
        techStack.push('Next.js');
      }
      
      // Vue ecosystem
      if (deps['vue']) {
        frameworks.push('vue');
        techStack.push('Vue');
      }
      if (deps['nuxt']) {
        frameworks.push('nuxt');
        techStack.push('Nuxt');
      }

      // Backend frameworks
      if (deps['express']) {
        frameworks.push('express');
        techStack.push('Express');
      }
      if (deps['fastify']) {
        frameworks.push('fastify');
        techStack.push('Fastify');
      }
      if (deps['@nestjs/core']) {
        frameworks.push('nestjs');
        techStack.push('NestJS');
      }

      // Testing frameworks
      if (deps['jest'] || deps['vitest'] || deps['mocha']) {
        this.context.hasTests = true;
      }

      // Databases
      if (deps['@supabase/supabase-js']) {
        techStack.push('Supabase');
      }
      if (deps['prisma'] || deps['@prisma/client']) {
        techStack.push('Prisma');
      }
      if (deps['mongoose']) {
        techStack.push('MongoDB');
      }
      if (deps['pg']) {
        techStack.push('PostgreSQL');
      }

      this.context.techStack = techStack;
      this.context.frameworks = frameworks;
    } catch (error) {
      // Failed to parse package.json, continue with detection
    }
  }

  private findScript(scripts: Record<string, string>, keys: string[]): string | undefined {
    for (const key of keys) {
      if (scripts[key]) {
        const pm = this.context.packageManager || 'npm';
        // npm has shortcuts for 'test', 'start', others need 'run'
        const npmShortcuts = ['test', 'start'];
        const needsRun = pm === 'npm' && !npmShortcuts.includes(key);
        return `${pm}${needsRun ? ' run' : ''} ${key}`;
      }
    }
    return undefined;
  }

  private async detectProjectType(): Promise<void> {
    // Check package.json for project type hints
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);

        // Check for CLI (has bin property)
        if (packageJson.bin) {
          this.context.projectType = 'cli';
          return;
        }

        // Check for webapp (React/Vue/Next.js)
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        if (deps['react'] || deps['vue']) {
          this.context.projectType = 'webapp';
          return;
        }

        // Check for API (Express/Fastify/NestJS without frontend frameworks)
        if (deps['express'] || deps['fastify'] || deps['@nestjs/core']) {
          if (!deps['react'] && !deps['vue'] && !deps['next']) {
            this.context.projectType = 'api';
            return;
          }
        }

        // Check for library (has main/types but no bin)
        if ((packageJson.main || packageJson.types) && !packageJson.bin) {
          this.context.projectType = 'library';
          return;
        }
      }
    } catch (error) {
      // Failed to read package.json, fall back to directory detection
    }

    // Fall back to directory-based detection
    // Check for Next.js
    if (await fs.pathExists(path.join(this.projectRoot, 'next.config.js')) ||
        await fs.pathExists(path.join(this.projectRoot, 'next.config.mjs'))) {
      this.context.projectType = 'webapp';
      return;
    }

    // Check for API patterns
    const apiDirs = ['api', 'src/api', 'routes', 'src/routes', 'controllers'];
    for (const dir of apiDirs) {
      if (await fs.pathExists(path.join(this.projectRoot, dir))) {
        this.context.projectType = 'api';
        return;
      }
    }

    // Check for CLI patterns
    if (await fs.pathExists(path.join(this.projectRoot, 'bin')) ||
        await fs.pathExists(path.join(this.projectRoot, 'src/commands'))) {
      this.context.projectType = 'cli';
      return;
    }

    // Check for library patterns (no main entry point, has index)
    if (await fs.pathExists(path.join(this.projectRoot, 'src/index.ts')) ||
        await fs.pathExists(path.join(this.projectRoot, 'index.js'))) {
      // Check if it's not a webapp
      const hasPublicDir = await fs.pathExists(path.join(this.projectRoot, 'public'));
      if (!hasPublicDir) {
        this.context.projectType = 'library';
        return;
      }
    }

    // Check for monorepo
    if (await fs.pathExists(path.join(this.projectRoot, 'packages')) ||
        await fs.pathExists(path.join(this.projectRoot, 'apps'))) {
      this.context.projectType = 'monorepo';
      return;
    }

    // Default to webapp if has public directory
    if (await fs.pathExists(path.join(this.projectRoot, 'public'))) {
      this.context.projectType = 'webapp';
      return;
    }
  }

  private async detectLanguages(): Promise<void> {
    const languages: string[] = [];

    // TypeScript - check dependencies first, then config file
    let hasTypeScript = false;
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        if (deps['typescript']) {
          hasTypeScript = true;
        }
      }
    } catch (error) {
      // Failed to read package.json, fall back to file check
    }

    if (!hasTypeScript && await fs.pathExists(path.join(this.projectRoot, 'tsconfig.json'))) {
      hasTypeScript = true;
    }

    if (hasTypeScript) {
      languages.push('typescript');
    }

    // JavaScript (always present if package.json exists)
    if (await fs.pathExists(path.join(this.projectRoot, 'package.json'))) {
      languages.push('javascript');
    }

    // Python
    if (await fs.pathExists(path.join(this.projectRoot, 'requirements.txt')) ||
        await fs.pathExists(path.join(this.projectRoot, 'pyproject.toml')) ||
        await fs.pathExists(path.join(this.projectRoot, 'setup.py'))) {
      languages.push('python');
    }

    // Go
    if (await fs.pathExists(path.join(this.projectRoot, 'go.mod'))) {
      languages.push('go');
    }

    // Rust
    if (await fs.pathExists(path.join(this.projectRoot, 'Cargo.toml'))) {
      languages.push('rust');
    }

    this.context.languages = languages;
  }

  private async detectTestSetup(): Promise<void> {
    // Check for test directories
    const testDirs = ['test', 'tests', '__tests__', 'src/__tests__', 'spec'];
    for (const dir of testDirs) {
      if (await fs.pathExists(path.join(this.projectRoot, dir))) {
        this.context.hasTests = true;
        return;
      }
    }

    // Check for test files
    try {
      const testFiles = glob.sync('**/*.{test,spec}.{js,jsx,ts,tsx}', {
        cwd: this.projectRoot,
        ignore: ['node_modules/**'],
      });
      if (testFiles.length > 0) {
        this.context.hasTests = true;
      }
    } catch (error) {
      // Glob failed, continue
    }
  }

  // Quick analysis for basic detection
  static async quickAnalyze(projectRoot: string): Promise<ProjectContext> {
    const analyzer = new ProjectAnalyzer(projectRoot);
    return analyzer.analyze();
  }
}