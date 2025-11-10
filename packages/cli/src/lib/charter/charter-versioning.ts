/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-10
 * @tags: [charter, versioning, semantic-versioning, changelog]
 * @related: [charter-storage.ts, charter.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

import type {
  Charter,
  CharterVersion,
  VersionBump,
  ChangelogEntry,
} from '../../types/charter.js';

// ============================================================================
// Version Utilities
// ============================================================================

/**
 * Parse version string (e.g., "1.2.3") into CharterVersion
 */
export function parseVersion(versionString: string): CharterVersion {
  const parts = versionString.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${versionString}`);
  }
  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2],
  };
}

/**
 * Convert CharterVersion to string (e.g., "1.2.3")
 */
export function versionToString(version: CharterVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Create initial version (1.0.0)
 */
export function createInitialVersion(): CharterVersion {
  return { major: 1, minor: 0, patch: 0 };
}

/**
 * Bump version based on type
 */
export function bumpVersion(
  current: CharterVersion,
  bump: VersionBump
): CharterVersion {
  switch (bump) {
    case 'major':
      return { major: current.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: current.major, minor: current.minor + 1, patch: 0 };
    case 'patch':
      return { major: current.major, minor: current.minor, patch: current.patch + 1 };
  }
}

// ============================================================================
// Change Detection
// ============================================================================

/**
 * Detect appropriate version bump based on changes between charters
 */
export function detectVersionBump(
  oldCharter: Charter,
  newCharter: Charter
): VersionBump {
  // Major: Significant scope redefinition or work mode change
  if (hasMajorChanges(oldCharter, newCharter)) {
    return 'major';
  }

  // Minor: New details, refinements, additional sections
  if (hasMinorChanges(oldCharter, newCharter)) {
    return 'minor';
  }

  // Patch: Typo fixes, clarifications, minor wording changes
  return 'patch';
}

/**
 * Check for major changes (scope redefinition, work mode change)
 */
function hasMajorChanges(oldCharter: Charter, newCharter: Charter): boolean {
  // Work mode change is major
  if (oldCharter.workMode !== newCharter.workMode) {
    return true;
  }

  // Significant scope change (50%+ of in-scope items changed)
  const oldInScope = new Set(oldCharter.content.scope.inScope);
  const newInScope = new Set(newCharter.content.scope.inScope);
  const intersection = new Set(
    [...oldInScope].filter(x => newInScope.has(x))
  );
  const scopeChangePercent = 1 - (intersection.size / Math.max(oldInScope.size, 1));

  if (scopeChangePercent > 0.5) {
    return true;
  }

  // Purpose completely rewritten (>80% content change)
  const oldPurpose = oldCharter.content.purpose;
  const newPurpose = newCharter.content.purpose;
  const similarity = calculateSimilarity(oldPurpose, newPurpose);

  if (similarity < 0.2) {
    return true;
  }

  return false;
}

/**
 * Check for minor changes (new details, refinements)
 */
function hasMinorChanges(oldCharter: Charter, newCharter: Charter): boolean {
  // New sections added
  if (
    (!oldCharter.content.risks && newCharter.content.risks) ||
    (!oldCharter.content.alternatives && newCharter.content.alternatives) ||
    (!oldCharter.content.governance && newCharter.content.governance)
  ) {
    return true;
  }

  // New success criteria added
  if (newCharter.content.successCriteria.length > oldCharter.content.successCriteria.length) {
    return true;
  }

  // Significant TBD items resolved
  const oldTbdCount = oldCharter.content.scope.tbd.length;
  const newTbdCount = newCharter.content.scope.tbd.length;
  if (oldTbdCount > 0 && newTbdCount < oldTbdCount - 2) {
    return true;
  }

  return false;
}

/**
 * Calculate text similarity (simple Jaccard similarity on words)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// ============================================================================
// Change Summarization
// ============================================================================

/**
 * Generate list of changes between two charters
 */
export function generateChangeList(
  oldCharter: Charter,
  newCharter: Charter
): string[] {
  const changes: string[] = [];

  // Work mode change
  if (oldCharter.workMode !== newCharter.workMode) {
    changes.push(`Changed work mode from ${oldCharter.workMode} to ${newCharter.workMode}`);
  }

  // Purpose changes
  if (oldCharter.content.purpose !== newCharter.content.purpose) {
    changes.push('Updated purpose statement');
  }

  // Users changes
  if (JSON.stringify(oldCharter.content.users) !== JSON.stringify(newCharter.content.users)) {
    changes.push('Updated user personas');
  }

  // Success criteria changes
  const oldCriteria = oldCharter.content.successCriteria.length;
  const newCriteria = newCharter.content.successCriteria.length;
  if (newCriteria > oldCriteria) {
    changes.push(`Added ${newCriteria - oldCriteria} success criteria`);
  } else if (newCriteria < oldCriteria) {
    changes.push(`Removed ${oldCriteria - newCriteria} success criteria`);
  }

  // Scope changes
  const scopeChanges = detectScopeChanges(oldCharter.content.scope, newCharter.content.scope);
  changes.push(...scopeChanges);

  // New optional sections
  if (!oldCharter.content.risks && newCharter.content.risks) {
    changes.push('Added risks section');
  }
  if (!oldCharter.content.alternatives && newCharter.content.alternatives) {
    changes.push('Added alternatives section');
  }
  if (!oldCharter.content.governance && newCharter.content.governance) {
    changes.push('Added governance section');
  }

  // Confidence changes
  const oldConfidence = oldCharter.confidence.overall;
  const newConfidence = newCharter.confidence.overall;
  const confidenceDelta = newConfidence - oldConfidence;
  if (Math.abs(confidenceDelta) >= 5) {
    changes.push(`Confidence ${confidenceDelta > 0 ? 'increased' : 'decreased'} to ${newConfidence}%`);
  }

  return changes;
}

/**
 * Detect scope changes
 */
function detectScopeChanges(
  oldScope: Charter['content']['scope'],
  newScope: Charter['content']['scope']
): string[] {
  const changes: string[] = [];

  // In-scope additions/removals
  const oldInScope = new Set(oldScope.inScope);
  const newInScope = new Set(newScope.inScope);
  const addedInScope = [...newInScope].filter(x => !oldInScope.has(x));
  const removedInScope = [...oldInScope].filter(x => !newInScope.has(x));

  if (addedInScope.length > 0) {
    changes.push(`Added ${addedInScope.length} items to scope`);
  }
  if (removedInScope.length > 0) {
    changes.push(`Removed ${removedInScope.length} items from scope`);
  }

  // Out-of-scope changes
  const oldOutOfScope = oldScope.outOfScope.length;
  const newOutOfScope = newScope.outOfScope.length;
  if (newOutOfScope > oldOutOfScope) {
    changes.push(`Clarified ${newOutOfScope - oldOutOfScope} out-of-scope boundaries`);
  }

  // TBD resolution
  const oldTbd = oldScope.tbd.length;
  const newTbd = newScope.tbd.length;
  if (newTbd < oldTbd) {
    changes.push(`Resolved ${oldTbd - newTbd} TBD items`);
  }

  return changes;
}

// ============================================================================
// Changelog Generation
// ============================================================================

/**
 * Create initial changelog entry for new charter
 */
export function createInitialChangelog(
  charter: Charter,
  participants: string[]
): ChangelogEntry {
  return {
    version: versionToString(charter.version),
    date: new Date().toISOString().split('T')[0],
    changes: [
      'Created from conversation during ginko init',
      `Work mode: ${charter.workMode}`,
      `Confidence: ${charter.confidence.overall}%`,
    ],
    participants,
    confidence: charter.confidence.overall,
  };
}

/**
 * Create changelog entry for charter update
 */
export function createUpdateChangelog(
  oldCharter: Charter,
  newCharter: Charter,
  participants: string[]
): ChangelogEntry {
  const changes = generateChangeList(oldCharter, newCharter);

  return {
    version: versionToString(newCharter.version),
    date: new Date().toISOString().split('T')[0],
    changes,
    participants,
    confidence: newCharter.confidence.overall,
  };
}

/**
 * Format changelog for markdown display
 */
export function formatChangelogForMarkdown(changelog: ChangelogEntry[]): string {
  const lines: string[] = ['## Changelog', ''];
  lines.push('All changes to this charter are tracked here for transparency.');
  lines.push('');

  for (const entry of changelog) {
    lines.push(`### v${entry.version} - ${entry.date}`);
    for (const change of entry.changes) {
      lines.push(`- ${change}`);
    }
    if (entry.participants.length > 0) {
      lines.push(`- Participants: ${entry.participants.join(', ')}`);
    }
    if (entry.confidence !== undefined) {
      lines.push(`- Confidence: ${entry.confidence}%`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// Version Comparison
// ============================================================================

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: CharterVersion, v2: CharterVersion): number {
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.patch - v2.patch;
}

/**
 * Check if version is newer than another
 */
export function isNewerVersion(v1: CharterVersion, v2: CharterVersion): boolean {
  return compareVersions(v1, v2) > 0;
}
