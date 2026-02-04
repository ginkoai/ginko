/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-27
 * @tags: [graph, init, setup, cli]
 * @related: [api-client.ts, config.ts, load.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk, inquirer, api-client, config, fs-extra]
 */

import chalk from 'chalk';
import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';
import { GraphApiClient } from './api-client.js';
import { createDefaultConfig, saveGraphConfig, isGraphInitialized } from './config.js';
import { getCurrentUser } from '../../utils/auth-storage.js';
import glob from 'glob';
import { promisify } from 'util';

const globAsync = promisify(glob);

interface InitOptions {
  quick?: boolean;
  skipLoad?: boolean;
  visibility?: 'private' | 'organization' | 'public';
}

/**
 * Count documents in a directory
 */
async function countDocuments(pattern: string): Promise<number> {
  try {
    const files = await globAsync(pattern, { ignore: ['**/node_modules/**', '**/.git/**'] });
    return files.length;
  } catch {
    return 0;
  }
}

/**
 * Scan project for documents
 */
async function scanProject(): Promise<Record<string, number>> {
  console.log(chalk.dim('Scanning project for documents...'));

  const counts = {
    adr: await countDocuments('docs/adr/**/*.md'),
    prd: await countDocuments('docs/PRD/**/*.md'),
    patterns: await countDocuments('.ginko/context/modules/**/*pattern*.md'),
    gotchas: await countDocuments('.ginko/context/modules/**/*gotcha*.md'),
    sessions: await countDocuments('.ginko/sessions/**/*.md'),
  };

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  console.log(chalk.green('✓ Scan complete\n'));

  return { ...counts, total };
}

/**
 * Initialize knowledge graph for project
 */
export async function initCommand(options: InitOptions): Promise<void> {
  try {
    // Check if already initialized
    if (await isGraphInitialized()) {
      console.log(chalk.yellow('⚠️  Graph already initialized'));

      const { reinit } = await prompts({
        type: 'confirm',
        name: 'reinit',
        message: 'Do you want to reinitialize? This will create a new graph.',
        initial: false,
      });

      if (!reinit) {
        console.log(chalk.dim('Keeping existing graph configuration'));
        return;
      }
    }

    console.log(chalk.green('\n🌿 Ginko Knowledge Graph Initialization'));
    console.log(chalk.gray('─'.repeat(50)));

    // Scan for documents
    const documents = await scanProject();

    // Display found documents
    console.log(chalk.bold('\nFound documents in your project:'));
    console.log(`  📄 ADRs: ${chalk.cyan(documents.adr)} documents in docs/adr/`);
    console.log(`  📋 PRDs: ${chalk.cyan(documents.prd)} documents in docs/PRD/`);
    console.log(`  🎨 Patterns: ${chalk.cyan(documents.patterns)} documents in .ginko/context/modules/`);
    console.log(`  ⚠️  Gotchas: ${chalk.cyan(documents.gotchas)} documents in .ginko/context/modules/`);
    console.log(`  📝 Sessions: ${chalk.cyan(documents.sessions)} documents in .ginko/sessions/`);
    console.log(`\n  ${chalk.bold('Total')}: ${chalk.green(documents.total)} documents`);

    if (documents.total === 0 && !options.quick) {
      console.log(chalk.yellow('\n⚠️  No documents found'));
      console.log(chalk.dim('You can still initialize the graph and add documents later'));
      console.log(chalk.dim('Or add ADRs, PRDs, or other documentation first\n'));

      const { proceed } = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: 'Initialize empty graph anyway?',
        initial: true,
      });

      if (!proceed) {
        console.log(chalk.dim('\nGraph initialization cancelled'));
        return;
      }
    }

    // Quick mode with 0 docs: proceed silently (called from ginko init)
    if (documents.total === 0 && options.quick) {
      console.log(chalk.dim('  No documents to load yet - graph will be ready when you add them'));
    }

    const estimatedTime = Math.ceil(documents.total * 0.5); // Rough estimate
    console.log(chalk.dim(`  Estimated processing time: ${estimatedTime}-${estimatedTime * 2} seconds\n`));

    console.log(chalk.gray('─'.repeat(50)));

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      console.log(chalk.red('\n✗ Not authenticated'));
      console.log(chalk.dim('Run "ginko login" to authenticate with Ginko Cloud'));
      return;
    }

    console.log(`\n${chalk.green('✓')} Authenticated as: ${chalk.cyan(user.email)}`);

    // Get project info
    const projectPath = process.cwd();
    const projectName = path.basename(projectPath).toLowerCase().replace(/[^a-z0-9-]/g, '-');

    console.log(`${chalk.green('✓')} Project: ${chalk.cyan(projectName)}`);
    console.log(`${chalk.green('✓')} Cloud endpoint: ${chalk.dim(process.env.GINKO_API_URL || 'api.ginko.ai')}`);

    // Prompt for confirmation if not quick mode
    if (!options.quick) {
      console.log(chalk.gray('\n─'.repeat(50)));
      console.log(chalk.bold('\nReady to initialize knowledge graph?'));
      console.log('\nThis will:');
      console.log('  • Upload documents to your private graph namespace');
      console.log('  • Generate embeddings using cloud GPUs');
      console.log('  • Create intelligent relationships');
      console.log('  • Enable semantic search');

      const { proceed } = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed?',
        initial: true,
      });

      if (!proceed) {
        console.log(chalk.dim('\nInitialization cancelled'));
        return;
      }
    }

    // Initialize graph via API
    console.log(chalk.dim('\nInitializing graph namespace...'));

    const client = new GraphApiClient();
    const result = await client.initGraph({
      projectPath,
      projectName,
      visibility: options.visibility || 'private',
      documents: {
        adr: documents.adr,
        prd: documents.prd,
        patterns: documents.patterns,
        gotchas: documents.gotchas,
        sessions: documents.sessions,
      },
    });

    console.log(chalk.green('✓ Graph namespace created'));
    console.log(chalk.dim(`  Namespace: ${result.namespace}`));
    console.log(chalk.dim(`  Graph ID: ${result.graphId}`));

    // Team is now created server-side during graph init
    const teamId = result.teamId;
    if (teamId) {
      console.log(chalk.green('✓ Project team created'));
      console.log(chalk.dim(`  Team ID: ${teamId}`));
    } else {
      console.log(chalk.yellow('⚠ Team creation skipped'));
    }

    // Save configuration
    const config = createDefaultConfig(
      result.graphId,
      result.namespace,
      projectName,
      options.visibility || 'private',
      teamId
    );

    await saveGraphConfig(config);
    console.log(chalk.green('✓ Configuration saved\n'));

    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.green('✅ Initialization complete!'));

    // Suggest next steps
    console.log(chalk.dim('\nNext steps:'));
    console.log(chalk.dim('  ginko push --all       # Upload documents to graph'));

  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));

      if (error.message.includes('Not authenticated')) {
        console.log(chalk.dim('\nRun "ginko login" to authenticate with Ginko Cloud'));
      } else if (error.message.includes('already exists')) {
        console.log(chalk.dim('\nGraph already exists for this project'));
        console.log(chalk.dim('Use "ginko graph rebuild" to recreate'));
      }
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }
    process.exit(1);
  }
}
