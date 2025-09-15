/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [git, pipeline, builder, version-control, workflow]
 * @related: [../../core/simple-pipeline-base.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, simple-git, fs-extra]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { getGinkoDir } from '../../utils/helpers.js';

/**
 * Git pipeline using Simple Builder Pattern
 * Implements ADR-013 for consistent pipeline architecture
 * Generates git workflows, commit strategies, and branch management plans
 */
export class GitPipeline extends SimplePipelineBase {
  private git: any;
  private ginkoDir: string = '';
  private workflowType: string = 'feature';

  constructor(intent: string = 'Generate git workflow') {
    super(intent);
    this.withDomain('git');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    console.log(chalk.cyan('🌳 Initializing git pipeline...'));
    this.git = simpleGit();
    this.ginkoDir = await getGinkoDir();
    this.workflowType = this.detectWorkflowType(this.ctx.intent);
    this.adjustConfidence(0.9); // High confidence for git workflows
    return this;
  }

  /**
   * Load git workflow template
   */
  async loadTemplate(): Promise<this> {
    const templates: Record<string, any> = {
      feature: {
        requiredSections: [
          'branch_strategy',
          'commit_guidelines',
          'pr_template',
          'review_checklist',
          'merge_strategy'
        ],
        contextToConsider: [
          'current_branch',
          'uncommitted_changes',
          'recent_commits',
          'branch_protection'
        ]
      },
      release: {
        requiredSections: [
          'release_branch',
          'version_bump',
          'changelog',
          'release_notes',
          'tagging_strategy',
          'deployment_steps'
        ],
        contextToConsider: [
          'version_history',
          'pending_features',
          'breaking_changes',
          'deployment_targets'
        ]
      },
      hotfix: {
        requiredSections: [
          'hotfix_branch',
          'patch_description',
          'testing_requirements',
          'rollback_plan',
          'communication_plan'
        ],
        contextToConsider: [
          'production_version',
          'critical_issues',
          'affected_users',
          'deployment_window'
        ]
      },
      workflow: {
        requiredSections: [
          'workflow_name',
          'trigger_events',
          'jobs_definition',
          'steps_sequence',
          'environment_variables',
          'secrets_management'
        ],
        contextToConsider: [
          'ci_cd_requirements',
          'test_suites',
          'deployment_environments',
          'notification_channels'
        ]
      }
    };

    const template = templates[this.workflowType] || templates.feature;
    template.rulesAndConstraints = [
      'Follow conventional commits specification',
      'Branch names should be descriptive and follow naming convention',
      'All commits must be signed',
      'PR descriptions must be comprehensive',
      'CI/CD checks must pass before merge',
      'Code review required for all changes'
    ];

    this.withTemplate(template);
    console.log(chalk.gray(`  ✓ ${this.workflowType} workflow template loaded`));
    return this;
  }

  /**
   * Gather git context
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering git context...'));

    // Get git status and branch info
    const status = await this.git.status();
    const branches = await this.git.branchLocal();
    const remotes = await this.git.getRemotes(true);

    // Get recent commits
    const log = await this.git.log({ maxCount: 20 });

    // Analyze commit patterns
    const commitPatterns = this.analyzeCommitPatterns(log.all);

    // Get repository info
    const repoInfo = await this.getRepositoryInfo();

    const context = {
      workflowType: this.workflowType,
      currentBranch: branches.current,
      branches: branches.all,
      status: {
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        staged: status.staged,
        ahead: status.ahead,
        behind: status.behind
      },
      recentCommits: log.all,
      commitPatterns,
      remotes,
      repoInfo
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Context gathered'));
    return this;
  }

  /**
   * Generate git workflow content
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating git workflow...'));

    const context = this.ctx.context;
    const intent = this.parseGitIntent(this.ctx.intent);

    const sections: string[] = [];

    // Generate content based on workflow type
    switch (this.workflowType) {
      case 'feature':
        sections.push(...this.generateFeatureWorkflow(context, intent));
        break;
      case 'release':
        sections.push(...this.generateReleaseWorkflow(context, intent));
        break;
      case 'hotfix':
        sections.push(...this.generateHotfixWorkflow(context, intent));
        break;
      case 'workflow':
        sections.push(...this.generateCIWorkflow(context, intent));
        break;
      default:
        sections.push(...this.generateGeneralWorkflow(context, intent));
    }

    // Footer
    sections.push('');
    sections.push('---');
    sections.push(`**Generated**: ${new Date().toISOString()}`);
    sections.push(`**Pipeline**: GitPipeline v1.0`);
    sections.push(`**Confidence**: ${Math.round(this.ctx.confidence * 100)}%`);

    this.ctx.content = sections.join('\n');
    console.log(chalk.gray('  ✓ Workflow generated'));
    return this;
  }

  /**
   * Validate git workflow content
   */
  validateContent(): this {
    if (!this.ctx.content) {
      this.ctx.errors.push('No workflow content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    // Check for required sections based on workflow type
    const requiredPatterns = this.getRequiredPatterns(this.workflowType);

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
   * Save git workflow
   */
  async save(): Promise<this> {
    if (!this.ctx.content) {
      console.error(chalk.red('No content to save'));
      return this;
    }

    console.log(chalk.cyan('💾 Saving git workflow...'));

    const workflowsDir = path.join(this.ginkoDir, 'workflows');
    await fs.ensureDir(workflowsDir);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${this.workflowType}-workflow-${timestamp}.md`;
    const filepath = path.join(workflowsDir, filename);

    await fs.writeFile(filepath, this.ctx.content, 'utf-8');

    console.log(chalk.green(`  ✅ Workflow saved to: ${path.relative(process.cwd(), filepath)}`));
    if (!this.ctx.metadata) {
      this.ctx.metadata = {};
    }
    this.ctx.metadata.savedPath = filepath;

    // If this is a CI workflow, also save as GitHub Actions YAML
    if (this.workflowType === 'workflow' && this.ctx.metadata?.yamlContent) {
      const actionsDir = path.join(process.cwd(), '.github', 'workflows');
      await fs.ensureDir(actionsDir);
      const yamlPath = path.join(actionsDir, `generated-${timestamp}.yml`);
      await fs.writeFile(yamlPath, this.ctx.metadata.yamlContent, 'utf-8');
      console.log(chalk.green(`  ✅ GitHub Actions workflow saved to: ${path.relative(process.cwd(), yamlPath)}`));
    }

    return this;
  }

  /**
   * Execute final pipeline actions
   */
  async execute(): Promise<PipelineContext> {
    if (!this.ctx.metadata?.savedPath) {
      throw new Error('Workflow was not saved');
    }

    console.log(chalk.green('\n✨ Git pipeline completed successfully!'));
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
      console.error(chalk.red(`Git pipeline failed: ${error}`));
      throw error;
    }
  }

  // Helper methods

  private detectWorkflowType(intent: string): string {
    const lower = intent.toLowerCase();
    if (lower.includes('release')) return 'release';
    if (lower.includes('hotfix') || lower.includes('patch')) return 'hotfix';
    if (lower.includes('ci') || lower.includes('action') || lower.includes('workflow')) return 'workflow';
    return 'feature';
  }

  private analyzeCommitPatterns(commits: any[]): any {
    const patterns = {
      conventional: 0,
      features: 0,
      fixes: 0,
      docs: 0,
      refactors: 0
    };

    commits.forEach(commit => {
      const msg = commit.message.toLowerCase();
      if (msg.match(/^(feat|fix|docs|style|refactor|test|chore):/)) patterns.conventional++;
      if (msg.includes('feat')) patterns.features++;
      if (msg.includes('fix')) patterns.fixes++;
      if (msg.includes('docs')) patterns.docs++;
      if (msg.includes('refactor')) patterns.refactors++;
    });

    return patterns;
  }

  private async getRepositoryInfo(): Promise<any> {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find((r: any) => r.name === 'origin');

      return {
        url: origin?.refs?.fetch || '',
        name: origin?.refs?.fetch?.split('/').pop()?.replace('.git', '') || 'repository',
        hasRemote: remotes.length > 0
      };
    } catch {
      return { url: '', name: 'repository', hasRemote: false };
    }
  }

  private parseGitIntent(intent: string): any {
    return {
      action: this.workflowType,
      target: intent.match(/for\s+(\w+)/i)?.[1] || 'feature',
      urgency: intent.includes('urgent') || intent.includes('hotfix') ? 'high' : 'normal'
    };
  }

  private generateFeatureWorkflow(context: any, intent: any): string[] {
    const sections: string[] = [];

    sections.push(`# Feature Development Workflow\n`);
    sections.push(`**Current Branch**: ${context.currentBranch}`);
    sections.push(`**Feature**: ${intent.target || 'New Feature'}\n`);

    sections.push(`## 🌿 Branch Strategy\n`);
    sections.push('```bash');
    sections.push('# Create feature branch from main');
    sections.push('git checkout main');
    sections.push('git pull origin main');
    sections.push(`git checkout -b feature/${intent.target?.toLowerCase().replace(/\s+/g, '-') || 'new-feature'}`);
    sections.push('```\n');

    sections.push(`## 📝 Commit Guidelines\n`);
    sections.push('Follow conventional commits:');
    sections.push('- `feat:` New feature');
    sections.push('- `fix:` Bug fix');
    sections.push('- `docs:` Documentation');
    sections.push('- `style:` Formatting');
    sections.push('- `refactor:` Code restructuring');
    sections.push('- `test:` Tests');
    sections.push('- `chore:` Maintenance\n');

    sections.push(`## 🔄 Pull Request Template\n`);
    sections.push('```markdown');
    sections.push('## Description');
    sections.push('Brief description of changes');
    sections.push('');
    sections.push('## Type of Change');
    sections.push('- [ ] Bug fix');
    sections.push('- [ ] New feature');
    sections.push('- [ ] Breaking change');
    sections.push('');
    sections.push('## Testing');
    sections.push('- [ ] Unit tests pass');
    sections.push('- [ ] Integration tests pass');
    sections.push('- [ ] Manual testing completed');
    sections.push('');
    sections.push('## Checklist');
    sections.push('- [ ] Code follows style guidelines');
    sections.push('- [ ] Self-review completed');
    sections.push('- [ ] Documentation updated');
    sections.push('```\n');

    sections.push(`## ✅ Review Checklist\n`);
    sections.push('- [ ] Code quality and style');
    sections.push('- [ ] Test coverage');
    sections.push('- [ ] Performance impact');
    sections.push('- [ ] Security considerations');
    sections.push('- [ ] Documentation completeness\n');

    sections.push(`## 🔀 Merge Strategy\n`);
    sections.push('```bash');
    sections.push('# After approval, merge via squash');
    sections.push('git checkout main');
    sections.push('git pull origin main');
    sections.push(`git merge --squash feature/${intent.target?.toLowerCase().replace(/\s+/g, '-') || 'new-feature'}`);
    sections.push('git commit -m "feat: Add new feature"');
    sections.push('git push origin main');
    sections.push('```');

    return sections;
  }

  private generateReleaseWorkflow(context: any, intent: any): string[] {
    const sections: string[] = [];

    sections.push(`# Release Workflow\n`);
    sections.push(`**Current Version**: ${context.repoInfo?.version || '1.0.0'}`);
    sections.push(`**Release Type**: ${intent.target || 'minor'}\n`);

    sections.push(`## 🏷️ Version Bump\n`);
    sections.push('```bash');
    sections.push('# Update version');
    sections.push(`npm version ${intent.target || 'minor'}`);
    sections.push('```\n');

    sections.push(`## 📋 Changelog\n`);
    sections.push('### Added');
    sections.push('- New features from this release\n');
    sections.push('### Changed');
    sections.push('- Updates and improvements\n');
    sections.push('### Fixed');
    sections.push('- Bug fixes\n');

    sections.push(`## 🚀 Deployment Steps\n`);
    sections.push('1. Create release branch');
    sections.push('2. Run full test suite');
    sections.push('3. Update documentation');
    sections.push('4. Create release tag');
    sections.push('5. Deploy to production');
    sections.push('6. Monitor for issues');

    return sections;
  }

  private generateHotfixWorkflow(context: any, intent: any): string[] {
    const sections: string[] = [];

    sections.push(`# Hotfix Workflow\n`);
    sections.push(`**Urgency**: ${intent.urgency || 'HIGH'}`);
    sections.push(`**Issue**: ${intent.target || 'Critical Bug'}\n`);

    sections.push(`## 🚨 Hotfix Branch\n`);
    sections.push('```bash');
    sections.push('# Create hotfix from production');
    sections.push('git checkout production');
    sections.push('git pull origin production');
    sections.push(`git checkout -b hotfix/${intent.target?.toLowerCase().replace(/\s+/g, '-') || 'critical-fix'}`);
    sections.push('```\n');

    sections.push(`## 🧪 Testing Requirements\n`);
    sections.push('- [ ] Reproduce issue');
    sections.push('- [ ] Verify fix locally');
    sections.push('- [ ] Run regression tests');
    sections.push('- [ ] Test in staging\n');

    sections.push(`## 🔄 Rollback Plan\n`);
    sections.push('```bash');
    sections.push('# If issues arise, revert immediately');
    sections.push('git revert HEAD');
    sections.push('git push origin production');
    sections.push('```');

    return sections;
  }

  private generateCIWorkflow(context: any, intent: any): string[] {
    const sections: string[] = [];

    sections.push(`# CI/CD Workflow Configuration\n`);

    sections.push(`## 🔧 GitHub Actions Workflow\n`);

    const yamlContent = this.generateYAML(context, intent);
    if (!this.ctx.metadata) {
      this.ctx.metadata = {};
    }
    this.ctx.metadata.yamlContent = yamlContent;

    sections.push('```yaml');
    sections.push(yamlContent);
    sections.push('```\n');

    sections.push(`## 📊 Pipeline Stages\n`);
    sections.push('1. **Checkout** - Get latest code');
    sections.push('2. **Setup** - Install dependencies');
    sections.push('3. **Lint** - Check code style');
    sections.push('4. **Test** - Run test suite');
    sections.push('5. **Build** - Compile application');
    sections.push('6. **Deploy** - Push to environment');

    return sections;
  }

  private generateGeneralWorkflow(context: any, intent: any): string[] {
    return this.generateFeatureWorkflow(context, intent);
  }

  private generateYAML(context: any, intent: any): string {
    return `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run tests
      run: npm test

    - name: Build
      run: npm run build`;
  }

  private getRequiredPatterns(workflowType: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      feature: [/Branch Strategy/i, /Commit Guidelines/i, /Pull Request/i],
      release: [/Version Bump/i, /Changelog/i, /Deployment/i],
      hotfix: [/Hotfix Branch/i, /Testing/i, /Rollback/i],
      workflow: [/GitHub Actions/i, /Pipeline/i]
    };

    return patterns[workflowType] || patterns.feature;
  }
}

/**
 * Adapter for CLI command usage
 */
export class GitReflectionCommand {
  private pipeline: GitPipeline;

  constructor() {
    this.pipeline = new GitPipeline();
  }

  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      if (intent && intent.trim() !== '') {
        this.pipeline = new GitPipeline(intent);
      }
      await this.pipeline.build();
    } catch (error) {
      console.error(chalk.red(`Git workflow generation failed: ${error}`));
      throw error;
    }
  }
}

export default GitPipeline;