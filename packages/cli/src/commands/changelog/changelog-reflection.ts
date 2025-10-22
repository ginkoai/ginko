/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-29
 * @tags: [changelog, reflection, versioning, keep-a-changelog]
 * @related: [../../core/reflection-pattern.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [reflection-pattern, fs, path, chalk, semver]
 */

import { ReflectionCommand } from '../../core/reflection-pattern.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { getProjectRoot } from '../../utils/helpers.js';

interface ChangelogOptions {
  type?: 'Added' | 'Changed' | 'Fixed' | 'Removed' | 'Deprecated' | 'Security';
  version?: string;
  breaking?: boolean;
  scope?: string;
  ticket?: string;
  save?: boolean;
  verbose?: boolean;
}

/**
 * Changelog-specific implementation of the Reflection Pattern
 * Generates Keep a Changelog compliant entries with version management
 */
export class ChangelogReflectionCommand extends ReflectionCommand {
  constructor() {
    super('changelog');
  }

  /**
   * Execute changelog reflection
   */
  async execute(intent: string, options: ChangelogOptions = {}): Promise<void> {
    console.log(chalk.blue('📊 Analyzing change impact...\n'));

    // Auto-detect change type
    const changeType = options.type || this.detectChangeType(intent);

    // Get current version
    const currentVersion = await this.getCurrentVersion();

    // Calculate next version
    const nextVersion = options.version || this.calculateNextVersion(currentVersion, changeType, options.breaking);

    // Detect scope from git changes
    const scope = options.scope || await this.detectScope(intent);

    if (options.verbose) {
      console.log(chalk.green('   ✓ Detected type: ' + changeType));
      console.log(chalk.green('   ✓ Version impact: ' + this.getVersionImpact(changeType, options.breaking)));
      console.log(chalk.green('   ✓ Scope: ' + scope));
      console.log(chalk.green('   ✓ Breaking changes: ' + (options.breaking ? 'Yes' : 'No')));
      console.log();
    }

    // Generate changelog entry
    const entry = await this.generateChangelogEntry({
      type: changeType,
      description: intent,
      version: nextVersion,
      scope,
      breaking: options.breaking || false,
      ticket: options.ticket
    });

    console.log(chalk.blue('📝 Changelog Entry:'));
    console.log(chalk.dim(`   Version: ${currentVersion} → ${nextVersion}`));
    console.log(chalk.dim(`   Category: ${changeType}`));
    if (options.breaking) {
      console.log(chalk.yellow('   ⚠️  Breaking Change'));
    }
    console.log();

    // Save to CHANGELOG.md
    if (options.save !== false) {
      await this.updateChangelog(entry, nextVersion);
      await this.saveVersionEntry(nextVersion, entry);

      console.log(chalk.green('💾 Updated: CHANGELOG.md'));
      console.log(chalk.green(`💾 Created: .ginko/changelog/v${nextVersion}.md`));
    } else {
      console.log(chalk.dim('Preview (use --save to persist):'));
      console.log();
      console.log(entry);
    }
  }

  /**
   * Auto-detect change type from description
   */
  private detectChangeType(description: string): string {
    const lower = description.toLowerCase();

    if (lower.match(/\b(add|new|implement|create|introduce)\b/)) {
      return 'Added';
    }
    if (lower.match(/\b(fix|resolve|correct|repair|patch)\b/)) {
      return 'Fixed';
    }
    if (lower.match(/\b(update|modify|change|improve|enhance|refactor)\b/)) {
      return 'Changed';
    }
    if (lower.match(/\b(remove|delete|drop)\b/)) {
      return 'Removed';
    }
    if (lower.match(/\b(deprecate|obsolete)\b/)) {
      return 'Deprecated';
    }
    if (lower.match(/\b(security|vulnerability|exploit|cve)\b/)) {
      return 'Security';
    }

    return 'Changed';  // Default
  }

  /**
   * Get current version from package.json
   */
  private async getCurrentVersion(): Promise<string> {
    try {
      const projectRoot = await getProjectRoot();
      const packagePath = path.join(projectRoot, 'package.json');
      const pkg = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      return pkg.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * Calculate next version based on change type (SemVer)
   */
  private calculateNextVersion(current: string, type: string, breaking?: boolean): string {
    const [major, minor, patch] = current.split('.').map(Number);

    if (breaking || type === 'Removed') {
      return `${major + 1}.0.0`;  // Major
    }

    if (type === 'Added') {
      return `${major}.${minor + 1}.0`;  // Minor
    }

    if (type === 'Fixed' || type === 'Security') {
      return `${major}.${minor}.${patch + 1}`;  // Patch
    }

    // Changed, Deprecated - Minor bump
    return `${major}.${minor + 1}.0`;
  }

  /**
   * Get version impact description
   */
  private getVersionImpact(type: string, breaking?: boolean): string {
    if (breaking) return 'Major (x.0.0)';
    if (type === 'Added') return 'Minor (0.x.0)';
    if (type === 'Fixed' || type === 'Security') return 'Patch (0.0.x)';
    return 'Minor (0.x.0)';
  }

  /**
   * Detect scope from git diff or description
   */
  private async detectScope(description: string): Promise<string> {
    try {
      // Try to get changed files from git
      const files = execSync('git diff --name-only HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();

      if (files) {
        const firstFile = files.split('\n')[0];
        const parts = firstFile.split('/');

        if (parts.length > 1) {
          return parts[0] === 'src' ? parts[1] : parts[0];
        }
      }
    } catch {
      // Fall back to description analysis
    }

    // Extract scope from description
    const keywords = ['api', 'cli', 'ui', 'database', 'auth', 'config', 'core'];
    const lower = description.toLowerCase();

    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return keyword;
      }
    }

    return 'general';
  }

  /**
   * Generate changelog entry content
   */
  private async generateChangelogEntry(data: any): Promise<string> {
    const date = new Date().toISOString().split('T')[0];
    let entry = `## [${data.version}] - ${date}\n\n`;

    if (data.breaking) {
      entry += `### ⚠️  Breaking Changes\n\n`;
    }

    entry += `### ${data.type}\n\n`;

    // Format description
    const description = data.description.trim();
    const lines = description.split('\n');

    lines.forEach((line: string) => {
      if (line.trim()) {
        entry += `- ${line.trim()}`;

        // Add scope if provided
        if (data.scope && data.scope !== 'general') {
          entry += ` (${data.scope})`;
        }

        // Add ticket reference
        if (data.ticket) {
          entry += ` [${data.ticket}]`;
        }

        entry += '\n';
      }
    });

    entry += '\n';

    // Add breaking change details if needed
    if (data.breaking) {
      entry += `**Migration Guide**:\n`;
      entry += `- Review breaking changes above\n`;
      entry += `- Update code to match new API\n`;
      entry += `- Test thoroughly before deploying\n\n`;
    }

    return entry;
  }

  /**
   * Update CHANGELOG.md file
   */
  private async updateChangelog(entry: string, version: string): Promise<void> {
    const projectRoot = await getProjectRoot();
    const changelogPath = path.join(projectRoot, 'CHANGELOG.md');

    try {
      let content = await fs.readFile(changelogPath, 'utf-8');

      // Find insertion point (after header, before first version)
      const headerEnd = content.indexOf('\n## [');
      if (headerEnd !== -1) {
        content = content.slice(0, headerEnd + 1) + '\n' + entry + content.slice(headerEnd + 1);
      } else {
        // No existing versions, add after header
        const lines = content.split('\n');
        const insertIndex = lines.findIndex(l => l.trim() === '') + 1;
        lines.splice(insertIndex, 0, '', entry);
        content = lines.join('\n');
      }

      await fs.writeFile(changelogPath, content, 'utf-8');
    } catch {
      // Create new CHANGELOG.md
      const header = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
      await fs.writeFile(changelogPath, header + entry, 'utf-8');
    }
  }

  /**
   * Save detailed version entry
   */
  private async saveVersionEntry(version: string, entry: string): Promise<void> {
    const projectRoot = await getProjectRoot();
    const changelogDir = path.join(projectRoot, '.ginko', 'changelog');
    await fs.mkdir(changelogDir, { recursive: true });

    const versionFile = path.join(changelogDir, `v${version}.md`);
    await fs.writeFile(versionFile, entry, 'utf-8');
  }
}