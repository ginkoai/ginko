/**
 * @fileType: model
 * @status: current
 * @updated: 2025-11-10
 * @tags: [types, charter, project-charter, conversation, confidence-scoring]
 * @related: [charter-storage.ts, conversation-facilitator.ts, charter-synthesizer.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

// ============================================================================
// Core Charter Types
// ============================================================================

/**
 * Work modes determine charter depth and conversation style
 */
export type WorkMode = 'hack-ship' | 'think-build' | 'full-planning';

/**
 * Charter status lifecycle
 */
export type CharterStatus = 'draft' | 'active' | 'archived';

/**
 * Charter aspects tracked for confidence scoring
 */
export type CharterAspect = 'purpose' | 'users' | 'success' | 'scope';

/**
 * Version bump types for semantic versioning
 */
export type VersionBump = 'major' | 'minor' | 'patch';

// ============================================================================
// Charter Content Structure
// ============================================================================

/**
 * Scope boundaries: what's in, out, and to be determined
 */
export interface CharterScope {
  inScope: string[];
  outOfScope: string[];
  tbd: string[];
}

/**
 * Main charter content
 */
export interface CharterContent {
  purpose: string;
  users: string[];
  successCriteria: string[];
  scope: CharterScope;
  constraints?: string;
  timeline?: string;
  team?: string[];
  risks?: string[];
  alternatives?: string[];
  governance?: string;
}

// ============================================================================
// Confidence Scoring
// ============================================================================

/**
 * Score for a single charter aspect (0-100)
 */
export interface AspectScore {
  score: number;
  signals: string[];
  missing: string[];
}

/**
 * Confidence metrics for charter completeness
 */
export interface CharterConfidence {
  purpose: AspectScore;
  users: AspectScore;
  success: AspectScore;
  scope: AspectScore;
  overall: number;
}

/**
 * Confidence thresholds for decision-making
 */
export const CONFIDENCE_THRESHOLDS = {
  CRITICAL: 40,   // Below this needs gentle probing
  WORKABLE: 70,   // Above this is good enough to start
  EXCELLENT: 90,  // Very comprehensive
} as const;

// ============================================================================
// Versioning & Changelog
// ============================================================================

/**
 * Semantic version structure
 */
export interface CharterVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Single changelog entry
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  participants: string[];
  confidence?: number;
}

// ============================================================================
// Main Charter Structure
// ============================================================================

/**
 * Complete project charter
 */
export interface Charter {
  // Metadata
  id: string;
  projectId: string;
  status: CharterStatus;
  workMode: WorkMode;
  version: CharterVersion;
  createdAt: Date;
  updatedAt: Date;

  // Content
  content: CharterContent;

  // Quality metrics
  confidence: CharterConfidence;

  // Version history
  changelog: ChangelogEntry[];

  // Graph integration
  graphNodeId?: string;
  embedding?: number[];
}

// ============================================================================
// Conversation Context
// ============================================================================

/**
 * A single conversation exchange
 */
export interface ConversationExchange {
  question: string;
  response: string;
  timestamp: Date;
  aspectsAddressed: CharterAspect[];
}

/**
 * Work mode detection signals
 */
export interface WorkModeSignals {
  hackShip: number;
  thinkBuild: number;
  fullPlanning: number;
}

/**
 * Full conversation context during charter creation
 */
export interface ConversationContext {
  exchanges: ConversationExchange[];
  workModeSignals: WorkModeSignals;
  tbdAspects: Set<CharterAspect>;
  nudgeCount: number;
  lastNudgeTime?: Date;
  stopSignals: boolean;
}

/**
 * Extracted content from conversation
 */
export interface ExtractedContent {
  problemStatements: string[];
  valueStatements: string[];
  userTypes: string[];
  successCriteria: string[];
  inScope: string[];
  outOfScope: string[];
  constraints: string[];
  timeline: string[];
  team: string[];
  risks?: string[];
  alternatives?: string[];
}

// ============================================================================
// Question Templates
// ============================================================================

/**
 * Question template for a specific aspect
 */
export interface QuestionTemplate {
  aspect: CharterAspect;
  question: string;
  followUps: string[];
  keywords: string[];
  weight: number;
}

/**
 * Question selection context
 */
export interface QuestionContext {
  previousQuestions: string[];
  aspectsCovered: Set<CharterAspect>;
  responseDepth: 'shallow' | 'moderate' | 'deep';
  userTone: 'urgent' | 'exploratory' | 'methodical';
}

// ============================================================================
// Storage & Sync
// ============================================================================

/**
 * File storage metadata
 */
export interface FileStorageMetadata {
  path: string;
  exists: boolean;
  lastModified?: Date;
  size?: number;
}

/**
 * Graph storage metadata
 */
export interface GraphStorageMetadata {
  nodeId?: string;
  synced: boolean;
  lastSyncedAt?: Date;
  syncError?: string;
}

/**
 * Complete storage status
 */
export interface CharterStorageStatus {
  file: FileStorageMetadata;
  graph: GraphStorageMetadata;
  inSync: boolean;
}

/**
 * Storage operation result
 */
export interface CharterStorageResult {
  success: boolean;
  charter?: Charter;
  error?: string;
  storageStatus: CharterStorageStatus;
}

// ============================================================================
// Command Options
// ============================================================================

/**
 * Options for ginko charter command
 */
export interface CharterOptions {
  view?: boolean;
  edit?: boolean;
  mode?: WorkMode;
  skipConversation?: boolean;
  outputPath?: string;
}

/**
 * Options for charter creation
 */
export interface CharterCreateOptions {
  workMode?: WorkMode;
  skipGraphSync?: boolean;
  customPath?: string;
}

/**
 * Options for charter editing
 */
export interface CharterEditOptions {
  conversational?: boolean;
  directEdit?: boolean;
  aspectToEdit?: CharterAspect;
}

// ============================================================================
// Preview & Display
// ============================================================================

/**
 * Charter preview summary
 */
export interface CharterPreview {
  title: string;
  purpose: string;
  keyPoints: string[];
  confidence: number;
  workMode: WorkMode;
}

/**
 * Diff between two charter versions
 */
export interface CharterDiff {
  versionFrom: string;
  versionTo: string;
  additions: string[];
  deletions: string[];
  modifications: string[];
  significantChange: boolean;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Charter validation result
 */
export interface CharterValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Validation rules
 */
export interface ValidationRule {
  name: string;
  description: string;
  check: (charter: Charter) => boolean;
  severity: 'error' | 'warning' | 'info';
}

// ============================================================================
// Helper Functions & Constants
// ============================================================================

/**
 * Default charter file path
 */
export const DEFAULT_CHARTER_PATH = 'docs/PROJECT-CHARTER.md';

/**
 * Work mode characteristics
 */
export const WORK_MODE_CHARACTERISTICS = {
  'hack-ship': {
    name: 'Hack & Ship',
    description: 'Quick prototype, MVP, weekend project',
    conversationDepth: 'light',
    targetTime: 5, // minutes
    requiredSections: ['purpose', 'scope'],
    keywords: ['quick', 'prototype', 'MVP', 'weekend', 'validate'],
  },
  'think-build': {
    name: 'Think & Build',
    description: 'Team project with process and testing',
    conversationDepth: 'standard',
    targetTime: 15, // minutes
    requiredSections: ['purpose', 'users', 'success', 'scope', 'constraints'],
    keywords: ['team', 'process', 'testing', 'architecture'],
  },
  'full-planning': {
    name: 'Full Planning',
    description: 'Enterprise project with stakeholders and governance',
    conversationDepth: 'comprehensive',
    targetTime: 30, // minutes
    requiredSections: ['purpose', 'users', 'success', 'scope', 'constraints', 'risks', 'alternatives', 'governance'],
    keywords: ['stakeholders', 'governance', 'risks', 'alternatives', 'compliance'],
  },
} as const;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid WorkMode
 */
export function isWorkMode(value: any): value is WorkMode {
  return ['hack-ship', 'think-build', 'full-planning'].includes(value);
}

/**
 * Check if value is a valid CharterStatus
 */
export function isCharterStatus(value: any): value is CharterStatus {
  return ['draft', 'active', 'archived'].includes(value);
}

/**
 * Check if value is a valid CharterAspect
 */
export function isCharterAspect(value: any): value is CharterAspect {
  return ['purpose', 'users', 'success', 'scope'].includes(value);
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Partial charter for updates
 */
export type CharterUpdate = Partial<Pick<Charter, 'content' | 'status' | 'workMode' | 'confidence'>>;

/**
 * Charter summary for listings
 */
export type CharterSummary = Pick<Charter, 'id' | 'status' | 'workMode' | 'version' | 'updatedAt'> & {
  title: string;
  confidenceOverall: number;
};
