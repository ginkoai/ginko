#!/usr/bin/env npx tsx

/**
 * Deduplicate events in current-events.jsonl
 *
 * Finds events with identical descriptions that occurred within a short time window
 * and removes duplicates, keeping only the first occurrence.
 */

import fs from 'fs-extra';
import path from 'path';

interface Event {
  id: string;
  timestamp: string;
  description: string;
  category?: string;
  [key: string]: any;
}

async function deduplicateEvents(filePath: string, timeWindowSeconds: number = 30) {
  console.log(`📖 Reading events from: ${filePath}`);

  // Read all events
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  const events: Event[] = lines.map(line => JSON.parse(line));

  console.log(`✅ Loaded ${events.length} events`);

  // Sort by timestamp
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Find duplicates
  const duplicates: Event[] = [];
  const kept: Event[] = [];
  const seen = new Map<string, Event>();

  for (const event of events) {
    const key = event.description;
    const existing = seen.get(key);

    if (existing) {
      // Check if within time window
      const timeDiff = Math.abs(
        new Date(event.timestamp).getTime() - new Date(existing.timestamp).getTime()
      ) / 1000;

      if (timeDiff <= timeWindowSeconds) {
        console.log(`🔍 Found duplicate:`);
        console.log(`   First:  ${existing.id} at ${existing.timestamp}`);
        console.log(`   Second: ${event.id} at ${event.timestamp}`);
        console.log(`   Time diff: ${timeDiff.toFixed(1)}s`);
        console.log(`   Description: ${event.description.substring(0, 80)}...`);
        duplicates.push(event);
        continue;
      }
    }

    seen.set(key, event);
    kept.push(event);
  }

  console.log(`\n📊 Results:`);
  console.log(`   Original: ${events.length} events`);
  console.log(`   Duplicates found: ${duplicates.length}`);
  console.log(`   Keeping: ${kept.length} events`);

  if (duplicates.length > 0) {
    // Create backup
    const backupPath = filePath + '.backup-' + Date.now();
    await fs.copy(filePath, backupPath);
    console.log(`\n💾 Backup created: ${backupPath}`);

    // Write deduplicated events
    const newContent = kept.map(e => JSON.stringify(e)).join('\n') + '\n';
    await fs.writeFile(filePath, newContent, 'utf-8');
    console.log(`✅ Wrote ${kept.length} deduplicated events`);

    // Show removed events
    console.log(`\n🗑️  Removed duplicates:`);
    for (const dup of duplicates) {
      console.log(`   - ${dup.id} | ${dup.timestamp} | ${dup.description.substring(0, 60)}...`);
    }
  } else {
    console.log(`\n✨ No duplicates found! File is already clean.`);
  }
}

// Main
const sessionDir = path.join(process.cwd(), '.ginko/sessions/chris-at-watchhill-ai');
const eventsFile = path.join(sessionDir, 'current-events.jsonl');

deduplicateEvents(eventsFile, 30)
  .then(() => {
    console.log(`\n✅ Deduplication complete!`);
    process.exit(0);
  })
  .catch(err => {
    console.error(`❌ Error:`, err);
    process.exit(1);
  });
