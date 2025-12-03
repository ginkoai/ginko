#!/usr/bin/env node

/**
 * @fileType: build-script
 * @status: current
 * @updated: 2025-12-03
 * @tags: [blog, watch, development]
 * @related: [build-blog.js]
 * @priority: medium
 * @complexity: low
 * @dependencies: [chokidar]
 */

/**
 * Watch Blog Script
 *
 * Watches for changes in content and templates directories and rebuilds automatically.
 *
 * Usage:
 *   npm run watch:blog
 */

import chokidar from 'chokidar';
import { build } from './build-blog.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, 'content', 'blog');
const templatesDir = path.join(__dirname, 'templates');

console.log('👀 Watching for changes...\n');
console.log(`   Content:   ${contentDir}`);
console.log(`   Templates: ${templatesDir}\n`);
console.log('Press Ctrl+C to stop\n');

// Debounce rebuild to avoid multiple rapid builds
let rebuildTimeout = null;
let isBuilding = false;

async function debouncedRebuild(changedFile) {
  if (rebuildTimeout) {
    clearTimeout(rebuildTimeout);
  }

  rebuildTimeout = setTimeout(async () => {
    if (isBuilding) {
      console.log('⏳ Build in progress, queuing...');
      return;
    }

    isBuilding = true;
    const filename = path.basename(changedFile);

    console.log(`\n📝 Changed: ${filename}`);
    console.log('🔄 Rebuilding...\n');

    try {
      await build();
    } catch (error) {
      console.error('❌ Build error:', error.message);
    } finally {
      isBuilding = false;
    }
  }, 300); // 300ms debounce
}

// Watch content and templates directories
const watcher = chokidar.watch([contentDir, templatesDir], {
  ignored: /(^|[\/\\])\../, // Ignore dotfiles
  persistent: true,
  ignoreInitial: true, // Don't trigger on startup
});

watcher
  .on('add', (path) => {
    console.log(`➕ File added: ${path}`);
    debouncedRebuild(path);
  })
  .on('change', (path) => debouncedRebuild(path))
  .on('unlink', (path) => {
    console.log(`➖ File removed: ${path}`);
    debouncedRebuild(path);
  })
  .on('error', (error) => console.error('❌ Watcher error:', error));

// Initial build
console.log('🚀 Running initial build...\n');
build().catch((error) => {
  console.error('❌ Initial build failed:', error.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping watcher...');
  watcher.close();
  process.exit(0);
});
