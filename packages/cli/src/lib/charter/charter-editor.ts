/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-10
 * @tags: [charter, editing, conversational-refinement, versioning]
 * @related: [charter-storage.ts, charter-versioning.ts, charter.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [charter-versioning]
 */

import type {
  Charter,
  CharterDiff,
  CharterContent,
  CharterScope,
} from '../../types/charter.js';
import {
  detectVersionBump,
  bumpVersion,
  createUpdateChangelog,
  versionToString,
} from './charter-versioning.js';

// ============================================================================
// Edit Intent Types
// ============================================================================

/**
 * Type of edit being requested
 */
export type EditType =
  | 'add'
  | 'remove'
  | 'update'
  | 'clarify'
  | 'mark-tbd'
  | 'resolve-tbd';

/**
 * Charter section being edited
 */
export type EditableSection =
  | 'purpose'
  | 'users'
  | 'success-criteria'
  | 'in-scope'
  | 'out-of-scope'
  | 'tbd'
  | 'constraints'
  | 'timeline'
  | 'team'
  | 'risks'
  | 'alternatives'
  | 'governance';

/**
 * Parsed intent from user's edit request
 */
export interface EditIntent {
  type: EditType;
  section: EditableSection;
  content: string;
  context?: string; // Additional context for the edit
}

/**
 * Result of an edit operation
 */
export interface EditResult {
  success: boolean;
  updated?: Charter;
  updatedCharter?: Charter;
  diff?: CharterDiff;
  error?: string;
}

// ============================================================================
// Edit Pattern Matchers
// ============================================================================

/**
 * Patterns for matching edit requests
 */
const EDIT_PATTERNS = {
  // Add patterns: "Add X to Y", "Include X in Y"
  add: [
    /add\s+["']?(.+?)["']?\s+to\s+(\w+[-\w]*)/i,
    /include\s+["']?(.+?)["']?\s+in\s+(\w+[-\w]*)/i,
    /append\s+["']?(.+?)["']?\s+to\s+(\w+[-\w]*)/i,
  ],

  // Remove patterns: "Remove X from Y", "Delete X from Y"
  remove: [
    /remove\s+["']?(.+?)["']?\s+from\s+(\w+[-\w]*)/i,
    /delete\s+["']?(.+?)["']?\s+from\s+(\w+[-\w]*)/i,
    /drop\s+["']?(.+?)["']?\s+from\s+(\w+[-\w]*)/i,
  ],

  // Update patterns: "Update X to Y", "Change X to Y"
  update: [
    /update\s+(\w+[-\w]*)\s+to\s+["']?(.+?)["']?$/i,
    /change\s+(\w+[-\w]*)\s+to\s+["']?(.+?)["']?$/i,
    /set\s+(\w+[-\w]*)\s+to\s+["']?(.+?)["']?$/i,
  ],

  // Clarify patterns: "Clarify X", "Refine X"
  clarify: [
    /clarify\s+(\w+[-\w]*)\s*[:\-]?\s*["']?(.+?)["']?$/i,
    /refine\s+(\w+[-\w]*)\s*[:\-]?\s*["']?(.+?)["']?$/i,
    /improve\s+(\w+[-\w]*)\s*[:\-]?\s*["']?(.+?)["']?$/i,
  ],

  // Mark TBD patterns: "Mark X as TBD"
  markTbd: [
    /mark\s+(\w+[-\w]*)\s+as\s+tbd/i,
    /(\w+[-\w]*)\s+is\s+tbd/i,
  ],

  // Resolve TBD patterns: "Resolve X from TBD to Y"
  resolveTbd: [
    /resolve\s+["']?(.+?)["']?\s+(?:from\s+tbd\s+)?to\s+(\w+[-\w]*)/i,
    /move\s+["']?(.+?)["']?\s+from\s+tbd\s+to\s+(\w+[-\w]*)/i,
  ],
};

/**
 * Section name mappings (user-friendly -> internal)
 */
const SECTION_MAPPINGS: Record<string, EditableSection> = {
  purpose: 'purpose',
  users: 'users',
  'user personas': 'users',
  'target users': 'users',
  success: 'success-criteria',
  'success criteria': 'success-criteria',
  criteria: 'success-criteria',
  scope: 'in-scope',
  'in scope': 'in-scope',
  inscope: 'in-scope',
  'out of scope': 'out-of-scope',
  outofscope: 'out-of-scope',
  excluded: 'out-of-scope',
  tbd: 'tbd',
  'to be determined': 'tbd',
  constraints: 'constraints',
  timeline: 'timeline',
  schedule: 'timeline',
  team: 'team',
  risks: 'risks',
  alternatives: 'alternatives',
  options: 'alternatives',
  governance: 'governance',
};

// ============================================================================
// Edit Intent Parser
// ============================================================================

/**
 * Parse user's edit request into structured EditIntent
 */
export function parseEditIntent(editRequest: string): EditIntent | null {
  const normalized = editRequest.trim();

  // Try add patterns
  for (const pattern of EDIT_PATTERNS.add) {
    const match = normalized.match(pattern);
    if (match) {
      const [, content, sectionRaw] = match;
      const section = normalizeSection(sectionRaw);
      if (section) {
        return { type: 'add', section, content: content.trim() };
      }
    }
  }

  // Try remove patterns
  for (const pattern of EDIT_PATTERNS.remove) {
    const match = normalized.match(pattern);
    if (match) {
      const [, content, sectionRaw] = match;
      const section = normalizeSection(sectionRaw);
      if (section) {
        return { type: 'remove', section, content: content.trim() };
      }
    }
  }

  // Try update patterns
  for (const pattern of EDIT_PATTERNS.update) {
    const match = normalized.match(pattern);
    if (match) {
      const [, sectionRaw, content] = match;
      const section = normalizeSection(sectionRaw);
      if (section) {
        return { type: 'update', section, content: content.trim() };
      }
    }
  }

  // Try clarify patterns
  for (const pattern of EDIT_PATTERNS.clarify) {
    const match = normalized.match(pattern);
    if (match) {
      const [, sectionRaw, content] = match;
      const section = normalizeSection(sectionRaw);
      if (section) {
        return { type: 'clarify', section, content: content.trim() };
      }
    }
  }

  // Try mark TBD patterns
  for (const pattern of EDIT_PATTERNS.markTbd) {
    const match = normalized.match(pattern);
    if (match) {
      const sectionRaw = match[1];
      const section = normalizeSection(sectionRaw);
      if (section) {
        return { type: 'mark-tbd', section, content: '' };
      }
    }
  }

  // Try resolve TBD patterns
  for (const pattern of EDIT_PATTERNS.resolveTbd) {
    const match = normalized.match(pattern);
    if (match) {
      const [, content, targetSectionRaw] = match;
      const section = normalizeSection(targetSectionRaw);
      if (section) {
        return { type: 'resolve-tbd', section, content: content.trim() };
      }
    }
  }

  return null;
}

/**
 * Normalize section name to internal representation
 */
function normalizeSection(sectionName: string): EditableSection | null {
  const normalized = sectionName.toLowerCase().trim();
  return SECTION_MAPPINGS[normalized] || null;
}

// ============================================================================
// Edit Application
// ============================================================================

/**
 * Apply edit intent to charter, returning updated charter
 */
export function applyEdit(
  charter: Charter,
  intent: EditIntent
): Charter {
  // Clone charter for immutability
  const updated: Charter = JSON.parse(JSON.stringify(charter));

  // Update timestamp
  updated.updatedAt = new Date();

  // Apply edit based on type and section
  switch (intent.type) {
    case 'add':
      applyAddEdit(updated.content, intent);
      break;
    case 'remove':
      applyRemoveEdit(updated.content, intent);
      break;
    case 'update':
      applyUpdateEdit(updated.content, intent);
      break;
    case 'clarify':
      applyClarifyEdit(updated.content, intent);
      break;
    case 'mark-tbd':
      applyMarkTbdEdit(updated.content, intent);
      break;
    case 'resolve-tbd':
      applyResolveTbdEdit(updated.content, intent);
      break;
  }

  return updated;
}

/**
 * Add content to a section
 */
function applyAddEdit(content: CharterContent, intent: EditIntent): void {
  const { section, content: text } = intent;

  switch (section) {
    case 'purpose':
      // Append to purpose
      content.purpose += `\n\n${text}`;
      break;

    case 'users':
      if (!content.users.includes(text)) {
        content.users.push(text);
      }
      break;

    case 'success-criteria':
      if (!content.successCriteria.includes(text)) {
        content.successCriteria.push(text);
      }
      break;

    case 'in-scope':
      if (!content.scope.inScope.includes(text)) {
        content.scope.inScope.push(text);
      }
      break;

    case 'out-of-scope':
      if (!content.scope.outOfScope.includes(text)) {
        content.scope.outOfScope.push(text);
      }
      break;

    case 'tbd':
      if (!content.scope.tbd.includes(text)) {
        content.scope.tbd.push(text);
      }
      break;

    case 'constraints':
      content.constraints = content.constraints
        ? `${content.constraints}\n\n${text}`
        : text;
      break;

    case 'timeline':
      content.timeline = content.timeline
        ? `${content.timeline}\n\n${text}`
        : text;
      break;

    case 'team':
      if (!content.team) content.team = [];
      if (!content.team.includes(text)) {
        content.team.push(text);
      }
      break;

    case 'risks':
      if (!content.risks) content.risks = [];
      if (!content.risks.includes(text)) {
        content.risks.push(text);
      }
      break;

    case 'alternatives':
      if (!content.alternatives) content.alternatives = [];
      if (!content.alternatives.includes(text)) {
        content.alternatives.push(text);
      }
      break;

    case 'governance':
      content.governance = content.governance
        ? `${content.governance}\n\n${text}`
        : text;
      break;
  }
}

/**
 * Remove content from a section
 */
function applyRemoveEdit(content: CharterContent, intent: EditIntent): void {
  const { section, content: text } = intent;

  switch (section) {
    case 'users':
      content.users = content.users.filter(u => !matchesLoosely(u, text));
      break;

    case 'success-criteria':
      content.successCriteria = content.successCriteria.filter(
        c => !matchesLoosely(c, text)
      );
      break;

    case 'in-scope':
      content.scope.inScope = content.scope.inScope.filter(
        s => !matchesLoosely(s, text)
      );
      break;

    case 'out-of-scope':
      content.scope.outOfScope = content.scope.outOfScope.filter(
        s => !matchesLoosely(s, text)
      );
      break;

    case 'tbd':
      content.scope.tbd = content.scope.tbd.filter(
        t => !matchesLoosely(t, text)
      );
      break;

    case 'team':
      if (content.team) {
        content.team = content.team.filter(t => !matchesLoosely(t, text));
      }
      break;

    case 'risks':
      if (content.risks) {
        content.risks = content.risks.filter(r => !matchesLoosely(r, text));
      }
      break;

    case 'alternatives':
      if (content.alternatives) {
        content.alternatives = content.alternatives.filter(
          a => !matchesLoosely(a, text)
        );
      }
      break;
  }
}

/**
 * Update entire section content
 */
function applyUpdateEdit(content: CharterContent, intent: EditIntent): void {
  const { section, content: text } = intent;

  switch (section) {
    case 'purpose':
      content.purpose = text;
      break;

    case 'constraints':
      content.constraints = text;
      break;

    case 'timeline':
      content.timeline = text;
      break;

    case 'governance':
      content.governance = text;
      break;

    default:
      // For list sections, treat update as add
      applyAddEdit(content, intent);
      break;
  }
}

/**
 * Clarify (append clarification to) section content
 */
function applyClarifyEdit(content: CharterContent, intent: EditIntent): void {
  const { section, content: text } = intent;

  // Clarification is like adding, but with context prefix
  const clarification = `Clarification: ${text}`;

  switch (section) {
    case 'purpose':
      content.purpose += `\n\n${clarification}`;
      break;

    case 'constraints':
      content.constraints = content.constraints
        ? `${content.constraints}\n\n${clarification}`
        : clarification;
      break;

    case 'timeline':
      content.timeline = content.timeline
        ? `${content.timeline}\n\n${clarification}`
        : clarification;
      break;

    case 'governance':
      content.governance = content.governance
        ? `${content.governance}\n\n${clarification}`
        : clarification;
      break;

    default:
      // For other sections, add as new item
      applyAddEdit(content, { ...intent, content: text });
      break;
  }
}

/**
 * Mark an item as TBD
 */
function applyMarkTbdEdit(content: CharterContent, intent: EditIntent): void {
  const { section, content: text } = intent;

  // Add to TBD list with section context
  const tbdItem = text || `${section} details`;
  if (!content.scope.tbd.includes(tbdItem)) {
    content.scope.tbd.push(tbdItem);
  }
}

/**
 * Resolve TBD item by moving to target section
 */
function applyResolveTbdEdit(content: CharterContent, intent: EditIntent): void {
  const { section, content: text } = intent;

  // Remove from TBD
  content.scope.tbd = content.scope.tbd.filter(
    t => !matchesLoosely(t, text)
  );

  // Add to target section
  applyAddEdit(content, intent);
}

/**
 * Check if two strings match loosely (case-insensitive, trimmed)
 */
function matchesLoosely(str1: string, str2: string): boolean {
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();
  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}

// ============================================================================
// Diff Generation
// ============================================================================

/**
 * Generate diff between old and new charter
 */
export function generateDiff(
  oldCharter: Charter,
  newCharter: Charter
): CharterDiff {
  const additions: string[] = [];
  const deletions: string[] = [];
  const modifications: string[] = [];

  // Purpose changes
  if (oldCharter.content.purpose !== newCharter.content.purpose) {
    modifications.push(`Purpose: "${oldCharter.content.purpose}" → "${newCharter.content.purpose}"`);
  }

  // Users changes
  const oldUsers = new Set(oldCharter.content.users);
  const newUsers = new Set(newCharter.content.users);
  Array.from(newUsers).forEach(user => {
    if (!oldUsers.has(user)) {
      additions.push(`User: ${user}`);
    }
  });
  Array.from(oldUsers).forEach(user => {
    if (!newUsers.has(user)) {
      deletions.push(`User: ${user}`);
    }
  });

  // Success criteria changes
  const oldCriteria = new Set(oldCharter.content.successCriteria);
  const newCriteria = new Set(newCharter.content.successCriteria);
  Array.from(newCriteria).forEach(criterion => {
    if (!oldCriteria.has(criterion)) {
      additions.push(`Success criterion: ${criterion}`);
    }
  });
  Array.from(oldCriteria).forEach(criterion => {
    if (!newCriteria.has(criterion)) {
      deletions.push(`Success criterion: ${criterion}`);
    }
  });

  // Scope changes
  diffScopeSection(oldCharter.content.scope, newCharter.content.scope, additions, deletions);

  // Optional sections
  diffOptionalSection('Constraints', oldCharter.content.constraints, newCharter.content.constraints, modifications);
  diffOptionalSection('Timeline', oldCharter.content.timeline, newCharter.content.timeline, modifications);
  diffOptionalSection('Governance', oldCharter.content.governance, newCharter.content.governance, modifications);

  // Detect significant change
  const totalChanges = additions.length + deletions.length + modifications.length;
  const significantChange = totalChanges >= 5;

  return {
    versionFrom: versionToString(oldCharter.version),
    versionTo: versionToString(newCharter.version),
    additions,
    deletions,
    modifications,
    significantChange,
  };
}

/**
 * Diff scope section
 */
function diffScopeSection(
  oldScope: CharterScope,
  newScope: CharterScope,
  additions: string[],
  deletions: string[]
): void {
  // In-scope changes
  const oldInScope = new Set(oldScope.inScope);
  const newInScope = new Set(newScope.inScope);
  Array.from(newInScope).forEach(item => {
    if (!oldInScope.has(item)) {
      additions.push(`In-scope: ${item}`);
    }
  });
  Array.from(oldInScope).forEach(item => {
    if (!newInScope.has(item)) {
      deletions.push(`In-scope: ${item}`);
    }
  });

  // Out-of-scope changes
  const oldOutOfScope = new Set(oldScope.outOfScope);
  const newOutOfScope = new Set(newScope.outOfScope);
  Array.from(newOutOfScope).forEach(item => {
    if (!oldOutOfScope.has(item)) {
      additions.push(`Out-of-scope: ${item}`);
    }
  });
  Array.from(oldOutOfScope).forEach(item => {
    if (!newOutOfScope.has(item)) {
      deletions.push(`Out-of-scope: ${item}`);
    }
  });

  // TBD changes
  const oldTbd = new Set(oldScope.tbd);
  const newTbd = new Set(newScope.tbd);
  Array.from(newTbd).forEach(item => {
    if (!oldTbd.has(item)) {
      additions.push(`TBD: ${item}`);
    }
  });
  Array.from(oldTbd).forEach(item => {
    if (!newTbd.has(item)) {
      deletions.push(`TBD: ${item} (resolved)`);
    }
  });
}

/**
 * Diff optional text section
 */
function diffOptionalSection(
  label: string,
  oldValue: string | undefined,
  newValue: string | undefined,
  modifications: string[]
): void {
  if (oldValue !== newValue) {
    if (!oldValue && newValue) {
      modifications.push(`${label}: Added`);
    } else if (oldValue && !newValue) {
      modifications.push(`${label}: Removed`);
    } else if (oldValue && newValue) {
      modifications.push(`${label}: Updated`);
    }
  }
}

// ============================================================================
// Main Refine Function
// ============================================================================

/**
 * Refine charter based on natural language edit request
 *
 * @param existing - Current charter to refine
 * @param editRequest - Natural language edit request
 * @param participants - List of participants in this edit
 * @returns Updated charter with new version and changelog
 */
export async function refine(
  existing: Charter,
  editRequest: string,
  participants: string[] = []
): Promise<EditResult> {
  // Parse edit intent
  const intent = parseEditIntent(editRequest);
  if (!intent) {
    return {
      success: false,
      error: `Could not understand edit request: "${editRequest}". Try patterns like "Add X to Y", "Remove X from Y", "Update Y to X".`,
    };
  }

  try {
    // Apply edit to charter
    const updated = applyEdit(existing, intent);

    // Detect version bump type
    const versionBump = detectVersionBump(existing, updated);

    // Bump version
    updated.version = bumpVersion(existing.version, versionBump);

    // Generate changelog entry
    const changelogEntry = createUpdateChangelog(existing, updated, participants);
    updated.changelog = [...existing.changelog, changelogEntry];

    // Generate diff
    const diff = generateDiff(existing, updated);

    return {
      success: true,
      updated: updated,
      updatedCharter: updated,
      diff,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to apply edit: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
