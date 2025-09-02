import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { ProjectAnalyzer } from '../analysis/project-analyzer.js';
import { CursorAdapter } from '../adapters/cursor-adapter.js';

export async function initCursorCommand(options: { preview?: boolean; apply?: boolean } = {}) {
  const spinner = ora('Preparing Cursor setup preview...').start();

  try {
    const projectRoot = process.cwd();
    const ginkoDir = path.join(projectRoot, '.ginko');
    const generatedDir = path.join(ginkoDir, 'generated');

    // Ensure .ginko exists but do not initialize if missing when previewing
    await fs.ensureDir(ginkoDir);
    await fs.ensureDir(generatedDir);

    // Quick analyze project (non-destructive)
    spinner.text = 'Analyzing project (quick)...';
    const projectContext = await ProjectAnalyzer.quickAnalyze(projectRoot);

    // Generate concise .cursorrules using Cursor adapter
    spinner.text = 'Generating concise .cursorrules...';
    const adapter = new CursorAdapter();
    const cursorrules = await adapter.generate({ ...projectContext });

    const cursorrulesPath = path.join(generatedDir, '.cursorrules');
    await fs.writeFile(cursorrulesPath, cursorrules, 'utf8');

    // Write setup steps (guide)
    const steps = `# Ginko × Cursor Setup (Preview)

This is a safe preview. No existing files were modified. Files were written to \`.ginko/generated/\`.

## Next steps in Cursor
- Open Settings → Custom Modes → "Create new mode"
- Name: Ginko
- Model: your preferred model (Claude, GPT, etc.)
- Paste the contents of .ginko/generated/.cursorrules into the System Prompt / Rules area
- Enable Auto-run if desired

## Repository changes (optional)
- Copy .ginko/generated/.cursorrules to your repo root if you want project-wide rules
- Commit .ginko (except .ginko/config.json as it may be local)
`;
    const stepsPath = path.join(generatedDir, 'CURSOR-SETUP-STEPS.md');
    await fs.writeFile(stepsPath, steps, 'utf8');

    // Apply mode: copy files to repo root and optionally commit
    if (options.apply) {
      spinner.text = 'Applying Cursor setup to repository...';
      
      // Copy .cursorrules to repo root
      const repoCursorrulesPath = path.join(projectRoot, '.cursorrules');
      await fs.copyFile(cursorrulesPath, repoCursorrulesPath);
      
      // Update .gitignore to exclude .ginko/config.json if it doesn't already
      const gitignorePath = path.join(projectRoot, '.gitignore');
      if (await fs.pathExists(gitignorePath)) {
        const gitignore = await fs.readFile(gitignorePath, 'utf8');
        if (!gitignore.includes('.ginko/config.json')) {
          await fs.appendFile(gitignorePath, '\n# Ginko local config (contains preferences)\n.ginko/config.json\n');
        }
      } else {
        // Create .gitignore if it doesn't exist
        await fs.writeFile(gitignorePath, '# Ginko local config (contains preferences)\n.ginko/config.json\n', 'utf8');
      }

      // Optionally commit changes
      try {
        const { execSync } = await import('child_process');
        execSync('git add .ginko .cursorrules .gitignore', { cwd: projectRoot, stdio: 'pipe' });
        execSync('git commit -m "feat: add Ginko Cursor integration"', { cwd: projectRoot, stdio: 'pipe' });
        spinner.succeed('Cursor setup applied and committed successfully!');
      } catch (gitError) {
        spinner.warn('Cursor setup applied but git commit failed (files are staged)');
        console.log(chalk.yellow('Run `git commit -m "feat: add Ginko Cursor integration"` to commit changes'));
      }

      console.log('\n' + chalk.bold('📋 Applied to repository:'));
      console.log(chalk.green('  ✓') + ' .cursorrules (repo root)');
      console.log(chalk.green('  ✓') + ' .ginko/ scaffolding');
      console.log(chalk.green('  ✓') + ' .gitignore updated');
      console.log(chalk.green('  ✓') + ' Changes staged/committed');
    } else {
      spinner.succeed('Cursor setup preview generated.');
    }

    console.log('\n' + chalk.bold('📋 Generated (preview only):'));
    console.log(chalk.green('  ✓') + ` ${path.relative(projectRoot, cursorrulesPath)}`);
    console.log(chalk.green('  ✓') + ` ${path.relative(projectRoot, stepsPath)}`);

    if (!options.apply) {
      console.log('\n' + chalk.dim('Note: This was non-destructive. You can safely review and copy these files.'));
      console.log(chalk.dim('Run with --apply to permanently set up the repository.'));
    }
  } catch (error: any) {
    spinner.fail('Failed to generate Cursor setup preview');
    console.error(chalk.red(error?.message || error));
    process.exitCode = 1;
  }
}
