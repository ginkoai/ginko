import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { execSync } from 'child_process';
import { ProjectAnalyzer } from '../analysis/project-analyzer.js';
import { CopilotAdapter } from '../adapters/copilot-adapter.js';

export async function initCopilotCommand(options: { preview?: boolean; apply?: boolean; workspace?: boolean } = {}) {
  const spinner = ora('Preparing GitHub Copilot setup...').start();

  try {
    const projectRoot = process.cwd();
    const ginkoDir = path.join(projectRoot, '.ginko');
    const generatedDir = path.join(ginkoDir, 'generated');
    const githubDir = path.join(projectRoot, '.github');
    const vscodeDir = path.join(projectRoot, '.vscode');

    // Ensure directories exist
    await fs.ensureDir(ginkoDir);
    await fs.ensureDir(generatedDir);

    // Quick analyze project
    spinner.text = 'Analyzing project for Copilot configuration...';
    const projectContext = await ProjectAnalyzer.quickAnalyze(projectRoot);

    // Generate copilot-instructions.md using Copilot adapter
    spinner.text = 'Generating copilot-instructions.md...';
    const adapter = new CopilotAdapter();
    const copilotInstructions = await adapter.generate({ ...projectContext });
    
    // Generate VS Code workspace settings for Copilot
    const workspaceSettings = await adapter.generateWorkspaceSettings({ ...projectContext });

    if (options.preview || (!options.apply && !options.workspace)) {
      // Preview mode - write to .ginko/generated
      const instructionsPath = path.join(generatedDir, 'copilot-instructions.md');
      await fs.writeFile(instructionsPath, copilotInstructions, 'utf8');

      const settingsPath = path.join(generatedDir, 'vscode-settings.json');
      await fs.writeFile(settingsPath, JSON.stringify(workspaceSettings, null, 2), 'utf8');

      // Write setup guide
      const setupGuide = `# Ginko × GitHub Copilot Setup (Preview)

This is a safe preview. No existing files were modified. Files were written to \`.ginko/generated/\`.

## Setup Options

### Option 1: Repository-wide Instructions (Recommended)
1. Copy \`.ginko/generated/copilot-instructions.md\` to \`.github/copilot-instructions.md\`
2. Commit to repository for team-wide consistency
3. All team members will automatically get these instructions

### Option 2: Workspace Settings (Local)
1. Copy settings from \`.ginko/generated/vscode-settings.json\` to \`.vscode/settings.json\`
2. Merge with existing settings if the file already exists
3. Optionally commit to repository for team consistency

### Option 3: Apply Automatically
Run \`ginko init-copilot --apply\` to:
- Create \`.github/copilot-instructions.md\` 
- Update \`.vscode/settings.json\` with Copilot settings
- Commit changes to repository

## Key Copilot Settings Applied
- Auto-completions optimized for your project
- Chat instructions tailored to your codebase
- Code review suggestions configured
- Custom patterns for your tech stack

## Testing Your Setup
1. Open VS Code with GitHub Copilot extension installed
2. Test inline suggestions with comments like \`// TODO: \`
3. Open Copilot Chat and ask about your project conventions
4. Check that suggestions follow your team's patterns

## Reverting Changes
Run \`ginko uninstall-copilot\` to remove all Copilot configurations
`;
      
      const guidePath = path.join(generatedDir, 'COPILOT-SETUP-GUIDE.md');
      await fs.writeFile(guidePath, setupGuide, 'utf8');

      spinner.succeed(chalk.green('✓ GitHub Copilot setup preview generated'));
      
      console.log('\n' + chalk.cyan('📝 Preview files created:'));
      console.log('  • .ginko/generated/copilot-instructions.md');
      console.log('  • .ginko/generated/vscode-settings.json');
      console.log('  • .ginko/generated/COPILOT-SETUP-GUIDE.md');
      console.log('\n' + chalk.yellow('Run with --apply to set up permanently'));
      
    } else if (options.apply) {
      // Apply mode - write to actual locations
      spinner.text = 'Applying GitHub Copilot configuration...';
      
      // Create .github directory and write instructions
      await fs.ensureDir(githubDir);
      const instructionsPath = path.join(githubDir, 'copilot-instructions.md');
      await fs.writeFile(instructionsPath, copilotInstructions, 'utf8');
      
      // Create/update .vscode/settings.json
      await fs.ensureDir(vscodeDir);
      const settingsPath = path.join(vscodeDir, 'settings.json');
      
      let existingSettings = {};
      if (await fs.pathExists(settingsPath)) {
        try {
          const content = await fs.readFile(settingsPath, 'utf8');
          existingSettings = JSON.parse(content);
        } catch (e) {
          console.warn(chalk.yellow('⚠ Could not parse existing settings.json, will create new'));
        }
      }
      
      // Merge settings
      const mergedSettings = { ...existingSettings, ...workspaceSettings };
      await fs.writeFile(settingsPath, JSON.stringify(mergedSettings, null, 2), 'utf8');
      
      // Update .gitignore if needed
      const gitignorePath = path.join(projectRoot, '.gitignore');
      if (await fs.pathExists(gitignorePath)) {
        let gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
        if (!gitignoreContent.includes('.ginko/config.json')) {
          gitignoreContent += '\n# Ginko local config\n.ginko/config.json\n';
          await fs.writeFile(gitignorePath, gitignoreContent, 'utf8');
        }
      }
      
      spinner.succeed(chalk.green('✓ GitHub Copilot configuration applied'));
      
      // Offer to commit changes
      console.log('\n' + chalk.cyan('📝 Files created/updated:'));
      console.log('  • .github/copilot-instructions.md');
      console.log('  • .vscode/settings.json');
      console.log('  • .gitignore (if updated)');
      
      const shouldCommit = await promptYesNo('\nCommit these changes?');
      if (shouldCommit) {
        try {
          execSync('git add .github/copilot-instructions.md .vscode/settings.json .gitignore', { stdio: 'pipe' });
          execSync(`git commit -m "feat: Add GitHub Copilot configuration via Ginko

- Added .github/copilot-instructions.md with project conventions
- Updated .vscode/settings.json with Copilot settings  
- Configured for optimal AI pair programming experience

Co-Authored-By: Ginko AI <cli@ginkoai.com>"`, { stdio: 'pipe' });
          
          console.log(chalk.green('\n✓ Changes committed successfully'));
        } catch (e) {
          console.log(chalk.yellow('\n⚠ Could not commit automatically. Please commit manually.'));
        }
      }
      
      console.log(chalk.green('\n✨ GitHub Copilot is now configured for your project!'));
      console.log(chalk.dim('Test it by opening VS Code and trying inline suggestions'));
    }
    
  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize GitHub Copilot setup'));
    console.error(error);
    process.exit(1);
  }
}

async function promptYesNo(question: string): Promise<boolean> {
  // Simple implementation - in production would use inquirer or similar
  console.log(chalk.cyan(question + ' (y/n)'));
  return true; // Default to yes for now
}