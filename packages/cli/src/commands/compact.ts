/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, compact, context, optimization]
 * @priority: medium
 * @complexity: medium
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../utils/helpers.js';

interface CompactOptions {
  preserve?: string[];
  aggressive?: boolean;
}

export async function compactCommand(options: CompactOptions = {}) {
  try {
    const ginkoDir = await getGinkoDir();
    
    console.log(chalk.yellow('\n📦 Context Compaction\n'));
    console.log(chalk.dim('Note: This manages Ginko\'s tracking, not AI model context'));
    console.log(chalk.dim('For AI context, use your AI\'s built-in commands (e.g., /compact in Claude)\n'));
    
    // Analyze current context
    const contextFile = path.join(ginkoDir, 'context', 'current.json');
    let context = { files: [], patterns: [], boundaries: [] };
    
    if (await fs.pathExists(contextFile)) {
      context = await fs.readJSON(contextFile);
    }
    
    console.log(chalk.dim('Current Ginko context:'));
    console.log(chalk.dim(`  Files tracked: ${context.files.length}`));
    
    // Archive old sessions
    const sessionDir = path.join(ginkoDir, 'sessions');
    const userDirs = await fs.readdir(sessionDir).catch(() => []);
    let totalArchived = 0;
    
    for (const userDir of userDirs) {
      const archiveDir = path.join(sessionDir, userDir, 'archive');
      if (await fs.pathExists(archiveDir)) {
        const archives = await fs.readdir(archiveDir);
        const oldArchives = archives
          .filter(f => f.endsWith('.md'))
          .sort()
          .slice(0, -5); // Keep last 5 sessions
        
        if (options.aggressive) {
          // In aggressive mode, keep only last 3
          oldArchives.push(...archives.slice(-5, -3));
        }
        
        for (const archive of oldArchives) {
          const archivePath = path.join(archiveDir, archive);
          const stats = await fs.stat(archivePath);
          const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
          
          // Remove if older than 7 days (or 3 days in aggressive mode)
          if (ageInDays > (options.aggressive ? 3 : 7)) {
            await fs.remove(archivePath);
            totalArchived++;
          }
        }
      }
    }
    
    // Compact context file list
    const preserved = new Set(options.preserve || []);
    preserved.add('package.json');
    preserved.add('README.md');
    
    const originalCount = context.files.length;
    context.files = context.files.filter((file: string) => preserved.has(file));
    const removed = originalCount - context.files.length;
    
    if (removed > 0) {
      await fs.writeJSON(contextFile, context, { spaces: 2 });
    }
    
    // Clean up temp files
    const tempPatterns = ['*.tmp', '*.log', '.DS_Store'];
    let tempCleaned = 0;
    
    for (const pattern of tempPatterns) {
      const files = await fs.readdir(process.cwd()).catch(() => []);
      for (const file of files) {
        if (file.endsWith(pattern.replace('*', ''))) {
          try {
            await fs.remove(path.join(process.cwd(), file));
            tempCleaned++;
          } catch {
            // Ignore permission errors
          }
        }
      }
    }
    
    // Report results
    if (totalArchived > 0 || removed > 0 || tempCleaned > 0) {
      console.log(chalk.green('\n✨ Compaction complete:'));
      if (totalArchived > 0) {
        console.log(chalk.dim(`  Archived: ${totalArchived} old sessions`));
      }
      if (removed > 0) {
        console.log(chalk.dim(`  Removed: ${removed} tracked files`));
      }
      if (tempCleaned > 0) {
        console.log(chalk.dim(`  Cleaned: ${tempCleaned} temp files`));
      }
    } else {
      console.log(chalk.yellow('\n✅ Already optimized'));
      console.log(chalk.dim('  No changes needed'));
    }
    
    // Provide AI-specific guidance
    console.log(chalk.cyan('\n💡 To reduce AI context:'));
    console.log(chalk.dim('  Claude: Use /compact command'));
    console.log(chalk.dim('  GPT-4: Start new conversation'));
    console.log(chalk.dim('  General: Clear chat history'));
    
    if (options.aggressive) {
      console.log(chalk.yellow('\n⚠️  Aggressive mode used'));
      console.log(chalk.dim('  Kept only last 3 sessions'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error during compaction:'), error instanceof Error ? error.message : String(error));
  }
}