/**
 * @fileType: utility
 * @status: deprecated
 * @updated: 2026-01-30
 * @tags: [write-dispatch, logging, session-log, adr-041, deprecated-by-adr-077]
 * @deprecated WriteDispatcher replaced by ginko push/pull (ADR-077). Falls through to SessionLogManager directly.
 * @related: [../core/session-log-manager.ts, ../../../../src/write-dispatcher.ts, ../../../../src/adapters/graph-adapter.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

import {
  SessionLogManager,
  type LogEntry,
} from '../core/session-log-manager.js';
import {
  getDispatcher,
  isDispatcherInitialized,
  type KnowledgeDocument,
} from '../lib/write-dispatcher/write-dispatcher.js';

/**
 * Write log entry using WriteDispatcher if available, fallback to SessionLogManager
 *
 * Strategy:
 * 1. If dispatcher is initialized and enabled, use it for dual-write
 * 2. Otherwise, use SessionLogManager directly (legacy mode)
 *
 * This enables gradual migration to graph-first writes while maintaining
 * backward compatibility.
 */
export async function appendLogEntry(
  sessionDir: string,
  entry: LogEntry,
  userEmail?: string
): Promise<void> {
  // Check if dispatcher is available
  if (isDispatcherInitialized()) {
    try {
      const dispatcher = getDispatcher();

      // Convert LogEntry to KnowledgeDocument
      const document: KnowledgeDocument = convertLogEntryToDocument(entry, userEmail);

      // Dispatch write (will route to graph and/or local based on config)
      await dispatcher.dispatch(document);

      return; // Success via dispatcher
    } catch (error) {
      // Log dispatcher error but don't block
      console.warn(
        '[DispatcherLogger] Dispatcher write failed, falling back to local:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Fallback to SessionLogManager (legacy mode or dispatcher failure)
  await SessionLogManager.appendEntry(sessionDir, entry);
}

/**
 * Convert LogEntry to KnowledgeDocument for dispatcher
 */
function convertLogEntryToDocument(
  entry: LogEntry,
  userEmail?: string
): KnowledgeDocument {
  // Generate unique ID for log entry
  const timestamp = new Date(entry.timestamp).getTime();
  const id = `log_${timestamp}_${entry.category}`;

  // Generate title from description (first 60 chars)
  const title = entry.description.substring(0, 60).trim() + (entry.description.length > 60 ? '...' : '');

  // Format content with all entry details
  const content = formatLogEntryContent(entry);

  return {
    type: 'LogEntry',
    id,
    title,
    content,
    data: {
      category: entry.category,
      impact: entry.impact,
      timestamp: entry.timestamp,
    },
    metadata: {
      category: entry.category,
      impact: entry.impact,
      files: entry.files || [],
      timestamp: entry.timestamp,
      userEmail,
      tags: [entry.category, entry.impact],
    },
  };
}

/**
 * Format log entry content as markdown
 */
function formatLogEntryContent(entry: LogEntry): string {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const filesSection = entry.files && entry.files.length > 0
    ? `\n\n**Files:**\n${entry.files.map(f => `- ${f}`).join('\n')}`
    : '';

  return `# [${entry.category.toUpperCase()}] ${timestamp}

${entry.description}${filesSection}

**Impact:** ${entry.impact}
**Timestamp:** ${entry.timestamp}
`;
}

/**
 * Initialize WriteDispatcher for CLI commands
 *
 * Call this at the start of commands that need write dispatch.
 * Safe to call multiple times (idempotent).
 */
export async function initializeWriteDispatcher(ginkoDir: string): Promise<void> {
  if (isDispatcherInitialized()) {
    return; // Already initialized
  }

  try {
    const {
      initializeDispatcher,
    } = await import('../lib/write-dispatcher/write-dispatcher.js');
    const {
      createGraphAdapterFromEnv,
    } = await import('../lib/write-dispatcher/adapters/graph-adapter.js');
    const {
      createLocalAdapterFromEnv,
    } = await import('../lib/write-dispatcher/adapters/local-adapter.js');

    // Initialize dispatcher with graph as primary
    const dispatcher = initializeDispatcher({
      primaryAdapter: 'graph',
      dualWrite: process.env.GINKO_DUAL_WRITE === 'true',
    });

    // Register adapters
    const graphAdapter = await createGraphAdapterFromEnv();
    const localAdapter = await createLocalAdapterFromEnv(ginkoDir);

    dispatcher.registerAdapter(graphAdapter);
    dispatcher.registerAdapter(localAdapter);

    // Validate configuration
    const validation = dispatcher.validate();
    if (!validation.valid) {
      console.warn('[DispatcherLogger] Dispatcher validation warnings:', validation.errors);
    }
  } catch (error) {
    // Dispatcher initialization failed - will fallback to SessionLogManager
    console.warn(
      '[DispatcherLogger] Failed to initialize dispatcher, using local writes only:',
      error instanceof Error ? error.message : String(error)
    );
  }
}
