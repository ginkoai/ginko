/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, context, management, local]
 * @priority: medium
 * @complexity: medium
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../utils/helpers.js';

interface ContextOptions {
  add?: string[];
  remove?: string[];
  show?: boolean;
}

export async function contextCommand(options: ContextOptions) {
  try {
    const ginkoDir = await getGinkoDir();
    const contextFile = path.join(ginkoDir, 'context', 'current.json');
    
    // Load existing context
    let context: { files: string[]; patterns: string[]; boundaries: string[] } = {
      files: [],
      patterns: [],
      boundaries: ['module']
    };
    
    if (await fs.pathExists(contextFile)) {
      context = await fs.readJSON(contextFile);
    }
    
    // Handle operations
    if (options.add) {
      for (const pattern of options.add) {
        if (!context.files.includes(pattern)) {
          context.files.push(pattern);
          console.log(chalk.green(`✅ Added to context: ${pattern}`));
        }
      }
      await fs.writeJSON(contextFile, context, { spaces: 2 });
    }
    
    if (options.remove) {
      for (const pattern of options.remove) {
        const index = context.files.indexOf(pattern);
        if (index > -1) {
          context.files.splice(index, 1);
          console.log(chalk.yellow(`❌ Removed from context: ${pattern}`));
        }
      }
      await fs.writeJSON(contextFile, context, { spaces: 2 });
    }
    
    // Show context (default or explicit)
    if (options.show || (!options.add && !options.remove)) {
      console.log(chalk.green('\n📚 Current Context\n'));
      
      if (context.files.length === 0) {
        console.log(chalk.dim('No files in context'));
        console.log(chalk.dim('Add files with: ginko context --add <files>'));
      } else {
        console.log(chalk.cyan('Files:'));
        context.files.forEach(file => {
          console.log(`  - ${file}`);
        });
        
        // Calculate estimated size
        let totalSize = 0;
        for (const file of context.files) {
          if (await fs.pathExists(file)) {
            const stats = await fs.stat(file);
            totalSize += stats.size;
          }
        }
        
        console.log(chalk.dim(`\nEstimated size: ${Math.round(totalSize / 1024)}KB`));
        console.log(chalk.dim('Note: Context stays local, never sent to servers'));
      }
      
      // Show rules
      const rulesFile = path.join(ginkoDir, 'context', 'rules.md');
      if (await fs.pathExists(rulesFile)) {
        console.log(chalk.cyan('\nRules:'));
        console.log(chalk.dim('  Defined in .ginko/context/rules.md'));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}