/**
 * Test script for frontmatter reading functionality
 *
 * Tests the readFrontmatter function from the files API route
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

interface FileFrontmatter {
  fileType?: string;
  status?: string;
  updated?: string;
  tags?: string[];
  related?: string[];
  priority?: string;
  complexity?: string;
  dependencies?: string[];
}

async function readFrontmatter(filePath: string): Promise<FileFrontmatter | null> {
  try {
    // Resolve to absolute path from project root
    const projectRoot = process.cwd();
    const absolutePath = join(projectRoot, filePath);

    // Read first 12 lines (ADR-002 standard)
    const content = await readFile(absolutePath, 'utf-8');
    const lines = content.split('\n').slice(0, 12);

    const metadata: FileFrontmatter = {};

    for (const line of lines) {
      // Parse @key: value patterns
      const match = line.match(/@(\w+):\s*(.+)/);
      if (!match) continue;

      const [, key, value] = match;
      const trimmedValue = value.trim();

      // Parse arrays: [item1, item2, item3]
      if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
        const arrayValue = trimmedValue
          .slice(1, -1)
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);

        metadata[key as keyof FileFrontmatter] = arrayValue as any;
      } else {
        // Store as string
        metadata[key as keyof FileFrontmatter] = trimmedValue as any;
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : null;

  } catch (error) {
    console.warn(`Could not read ${filePath}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  console.log('Testing frontmatter reading...\n');

  // Test files with known frontmatter
  const testFiles = [
    'dashboard/src/app/api/v1/task/[id]/files/route.ts',
    'packages/cli/src/commands/start/start-reflection.ts',
    'scripts/create-user-graph-mapping.ts',
  ];

  for (const filePath of testFiles) {
    console.log(`\n📄 ${filePath}`);
    console.log('─'.repeat(80));

    const metadata = await readFrontmatter(filePath);

    if (metadata) {
      console.log('✓ Frontmatter found:');
      console.log(JSON.stringify(metadata, null, 2));
    } else {
      console.log('✗ No frontmatter found');
    }
  }

  // Test non-existent file
  console.log(`\n\n📄 non-existent-file.ts`);
  console.log('─'.repeat(80));
  const nonExistent = await readFrontmatter('non-existent-file.ts');
  console.log(nonExistent ? '✗ Should return null' : '✓ Correctly returned null for missing file');
}

main().catch(console.error);
