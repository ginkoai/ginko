/**
 * @fileType: config
 * @status: current
 * @updated: 2025-10-01
 * @tags: [shortcuts, reflection, routing, universal-pattern]
 * @related: [../commands/reflect.ts, ../index.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [chalk, reflection-pattern]
 */

/**
 * Command Shortcuts Registry
 *
 * Maps direct commands to their reflector domains, enabling:
 * - ginko capture "description" → ginko reflect --domain capture "description"
 * - ginko ship "message" → ginko reflect --domain ship "message"
 *
 * This unified architecture means:
 * 1. All commands use the Universal Reflection Pattern
 * 2. Direct commands are convenience shortcuts
 * 3. Both syntaxes work identically
 * 4. Consistent quality templates and validation
 */

export interface ReflectorShortcut {
  /** Domain identifier for the reflector */
  domain: string;

  /** Function to transform command arguments into reflector intent */
  defaultIntent: (...args: any[]) => string;

  /** Default options to merge with user-provided options */
  options?: Record<string, any>;

  /** Description for help text */
  description?: string;

  /** Argument pattern for CLI (e.g., "[description]", "[message]") */
  argPattern?: string;
}

/**
 * Command Shortcuts Registry
 *
 * Maps command names to their reflector configurations
 */
export const COMMAND_SHORTCUTS: Record<string, ReflectorShortcut> = {
  // Session management
  start: {
    domain: 'start',
    defaultIntent: (sessionId?: string) => sessionId || 'load session context',
    options: { verbose: false },
    description: 'Start or resume a session with AI-enhanced reflection',
    argPattern: '[sessionId]'
  },

  handoff: {
    domain: 'handoff',
    defaultIntent: (message?: string) => message || 'preserve session state',
    options: { save: true },
    description: 'Create a session handoff with AI-enhanced reflection',
    argPattern: '[message]'
  },

  // Capture and document
  capture: {
    domain: 'capture',
    defaultIntent: (description?: string) => description || 'capture current context',
    options: { save: true },
    description: 'Capture a learning, discovery, or important context',
    argPattern: '[description]'
  },

  // Development workflow
  explore: {
    domain: 'explore',
    defaultIntent: (topic?: string) => topic || 'explore problem space',
    options: {},
    description: 'Collaborative thinking mode for exploring problems and solutions',
    argPattern: '[topic]'
  },

  architecture: {
    domain: 'architecture',
    defaultIntent: (decision?: string) => decision || 'document architecture decision',
    options: {},
    description: 'Design mode for crafting Architecture Decision Records (ADRs)',
    argPattern: '[decision]'
  },

  plan: {
    domain: 'plan',
    defaultIntent: (feature?: string) => feature || 'create implementation plan',
    options: { days: 5 },
    description: 'Create phased implementation plan with acceptance criteria',
    argPattern: '[feature]'
  },

  // Shipping and deployment
  ship: {
    domain: 'ship',
    defaultIntent: (message?: string) => message || 'prepare for deployment',
    options: { commit: true, push: true },
    description: 'AI-enhanced shipping with smart commit messages and PR descriptions',
    argPattern: '[message]'
  },

  // Backlog management (has subcommands, but can also be direct)
  backlog: {
    domain: 'backlog',
    defaultIntent: (description?: string) => description || 'manage backlog',
    options: {},
    description: 'Manage product backlog with AI assistance',
    argPattern: '[description]'
  }
};

/**
 * Execute a command shortcut by delegating to the Universal Reflection Pattern
 *
 * @param command - The command name (e.g., 'capture', 'ship')
 * @param args - Command arguments (last element is commander options object)
 * @returns Promise resolving when reflection completes
 */
export async function executeShortcut(
  command: string,
  args: any[]
): Promise<void> {
  const shortcut = COMMAND_SHORTCUTS[command];

  if (!shortcut) {
    throw new Error(`Unknown command shortcut: ${command}`);
  }

  // Last arg is always commander options object
  const options = args[args.length - 1] || {};
  const cmdArgs = args.slice(0, -1);

  // Build intent from arguments
  const intent = shortcut.defaultIntent(...cmdArgs);

  // Merge default options with user-provided options
  const mergedOptions = {
    ...shortcut.options,
    ...options,
    domain: shortcut.domain
  };

  // Delegate to universal reflect command
  const { reflectCommand } = await import('../commands/reflect.js');
  return reflectCommand(intent, mergedOptions);
}

/**
 * Check if a command has a shortcut registered
 */
export function hasShortcut(command: string): boolean {
  return command in COMMAND_SHORTCUTS;
}

/**
 * Get shortcut configuration for a command
 */
export function getShortcut(command: string): ReflectorShortcut | undefined {
  return COMMAND_SHORTCUTS[command];
}

/**
 * List all registered shortcut commands
 */
export function listShortcuts(): string[] {
  return Object.keys(COMMAND_SHORTCUTS);
}
