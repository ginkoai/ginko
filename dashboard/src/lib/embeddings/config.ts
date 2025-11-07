/**
 * @fileType: config
 * @status: current
 * @updated: 2025-11-07
 * @tags: [embeddings, config, similarity, tuning, adr-045]
 * @related: [types.ts, voyage-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import type { EmbeddingDimension } from './types';

/**
 * Voyage AI Configuration (ADR-045)
 */
export const VOYAGE_CONFIG = {
  API_URL: 'https://api.voyageai.com/v1',
  DEFAULT_MODEL: 'voyage-3.5' as const,
  LITE_MODEL: 'voyage-3.5-lite' as const,

  // API Limits
  BATCH_SIZE_RECOMMENDED: 128,  // Recommended batch size
  BATCH_SIZE_MAX: 1000,          // Maximum batch size
  MAX_TOKENS_PER_BATCH: 320000,  // 320K tokens for voyage-3.5
  MAX_TOKENS_PER_TEXT: 32000,    // 32K tokens per text

  // Rate Limits (Tier 1)
  RATE_LIMIT_RPM: 2000,          // Requests per minute
  RATE_LIMIT_TPM: 8000000,       // Tokens per minute (8M)

  // Retry Configuration
  MAX_RETRIES: 3,
  RETRY_BACKOFF_FACTOR: 2,       // Exponential: 1s, 2s, 4s
  RETRY_INITIAL_DELAY: 1000,     // 1 second

  // Default Settings
  DEFAULT_DIMENSION: 1024 as EmbeddingDimension,
  DEFAULT_TRUNCATION: true,
} as const;

/**
 * Similarity Matching Configuration (ADR-045 Phase 4)
 * Conservative thresholds to prevent over-connected graphs
 */
export const SIMILARITY_CONFIG = {
  // Primary Thresholds
  MIN_SCORE: 0.75,               // Only create relationships above 75% similarity
  TOP_K: 10,                     // Max neighbors per node
  SAME_PROJECT_ONLY: true,       // Don't compare across projects initially

  // Relationship Type Thresholds
  DUPLICATE_THRESHOLD: 0.95,     // Near-identical content
  HIGH_RELEVANCE_THRESHOLD: 0.85, // Strong conceptual match
  MEDIUM_RELEVANCE_THRESHOLD: 0.75, // Good recommendation
  LOW_RELEVANCE_THRESHOLD: 0.65, // Exploratory search

  // Quality Gates
  MIN_AVG_SCORE: 0.80,           // Skip nodes with weak average similarity
  MAX_RELATIONSHIPS_PER_NODE: 20, // Hard cap to prevent over-connection

  // Query Configuration
  SEARCH_LIMIT_DEFAULT: 10,
  SEARCH_LIMIT_MAX: 50,

  // Performance Targets
  TARGET_RELATIONSHIPS_PER_NODE_MIN: 5,
  TARGET_RELATIONSHIPS_PER_NODE_MAX: 15,
  TARGET_AVG_SCORE: 0.80,
  TARGET_P95_SCORE: 0.85,
} as const;
