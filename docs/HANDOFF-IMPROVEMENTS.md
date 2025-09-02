# Handoff Workflow Improvements

## Current Issues
1. **Archive collision**: Multiple handoffs on same day cause "dest already exists" error
2. **Poor naming**: Archives use `YYYY-MM-DD-handoff.md` without descriptive names
3. **Context loss**: AI doesn't read previous handoff for continuity
4. **Error output**: Some errors go to stderr instead of stdout

## Proposed Solution

### 1. Improved Archive Naming
```
YYYY-MM-DD-three-word-desc.md
```

Examples:
- `2025-09-02-copilot-integration-complete.md`
- `2025-09-02-fixed-auth-bug.md`
- `2025-09-02-refactored-api-routes.md`

### 2. Implementation Changes

#### A. Update archiveExistingHandoff function
```typescript
async function archiveExistingHandoff(sessionDir: string, message?: string): Promise<void> {
  const currentHandoff = path.join(sessionDir, 'current.md');
  
  if (await fs.pathExists(currentHandoff)) {
    const existing = await fs.readFile(currentHandoff, 'utf8');
    const timestampMatch = existing.match(/timestamp: ([^\n]+)/);
    const summaryMatch = existing.match(/## 📊 Session Summary\n([^\n]+)/);
    
    if (timestampMatch) {
      const timestamp = new Date(timestampMatch[1]);
      const date = timestamp.toISOString().split('T')[0];
      
      // Generate 3-word description from message or summary
      const description = generateThreeWordDesc(
        message || summaryMatch?.[1] || 'session handoff complete'
      );
      
      const archiveDir = path.join(sessionDir, 'archive');
      await fs.ensureDir(archiveDir);
      
      // Create unique filename with counter if needed
      let counter = 0;
      let archiveFile;
      do {
        const suffix = counter > 0 ? `-${counter}` : '';
        archiveFile = path.join(
          archiveDir,
          `${date}-${description}${suffix}.md`
        );
        counter++;
      } while (await fs.pathExists(archiveFile));
      
      await fs.move(currentHandoff, archiveFile);
    }
  }
}

function generateThreeWordDesc(text: string): string {
  // Remove common words and punctuation
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !COMMON_WORDS.includes(w));
  
  // Take first 3 meaningful words
  const desc = words.slice(0, 3).join('-');
  
  // Fallback if not enough words
  return desc || 'session-handoff-archive';
}
```

#### B. Add context reading for AI
```typescript
// In generateAiHandoffTemplate, add:
const previousHandoff = await getMostRecentHandoff(sessionDir);

// Add to template prompt:
if (previousHandoff) {
  prompt += `\n\nPrevious handoff for context:\n${previousHandoff}\n`;
}

async function getMostRecentHandoff(sessionDir: string): Promise<string | null> {
  const archiveDir = path.join(sessionDir, 'archive');
  
  // Check current.md first
  const currentPath = path.join(sessionDir, 'current.md');
  if (await fs.pathExists(currentPath)) {
    return fs.readFile(currentPath, 'utf8');
  }
  
  // Otherwise check archive
  if (await fs.pathExists(archiveDir)) {
    const files = await fs.readdir(archiveDir);
    const handoffs = files
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse(); // Most recent first
    
    if (handoffs.length > 0) {
      return fs.readFile(path.join(archiveDir, handoffs[0]), 'utf8');
    }
  }
  
  return null;
}
```

### 3. Benefits
- **No collisions**: Counter suffix handles multiple handoffs per day
- **Better organization**: Descriptive names make finding handoffs easier
- **Context preservation**: AI reads previous handoff for continuity
- **Git-friendly**: All versions preserved in version control
- **Simple recovery**: Easy to find and restore any handoff

### 4. Migration Path
1. Existing archives remain as-is (backward compatible)
2. New handoffs use improved naming
3. AI reads both old and new format handoffs
4. No data loss during transition