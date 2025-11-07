/**
 * @fileType: config
 * @status: current
 * @updated: 2025-11-07
 * @tags: [embeddings, config, similarity, tuning, adr-045]
 * @related: [types.ts, similarity-matcher.ts, voyage-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import type { EmbeddingDimension, SimilarityRelationshipType } from './types';

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

/**
 * Map similarity scores to relationship types
 */
export function getRelationshipType(score: number): SimilarityRelationshipType {
  if (score >= SIMILARITY_CONFIG.DUPLICATE_THRESHOLD) {
    return 'DUPLICATE_OF';
  }
  if (score >= SIMILARITY_CONFIG.HIGH_RELEVANCE_THRESHOLD) {
    return 'HIGHLY_RELATED_TO';
  }
  if (score >= SIMILARITY_CONFIG.MEDIUM_RELEVANCE_THRESHOLD) {
    return 'RELATED_TO';
  }
  return 'LOOSELY_RELATED_TO';
}

/**
 * Get relationship score threshold by type
 */
export function getScoreThreshold(type: SimilarityRelationshipType): number {
  switch (type) {
    case 'DUPLICATE_OF':
      return SIMILARITY_CONFIG.DUPLICATE_THRESHOLD;
    case 'HIGHLY_RELATED_TO':
      return SIMILARITY_CONFIG.HIGH_RELEVANCE_THRESHOLD;
    case 'RELATED_TO':
      return SIMILARITY_CONFIG.MEDIUM_RELEVANCE_THRESHOLD;
    case 'LOOSELY_RELATED_TO':
      return SIMILARITY_CONFIG.LOW_RELEVANCE_THRESHOLD;
  }
}

/**
 * Neo4j Vector Index Configuration
 */
export const VECTOR_INDEX_CONFIG = {
  INDEX_NAME: 'knowledge_embeddings',
  NODE_LABEL: 'KnowledgeNode',
  PROPERTY_NAME: 'embedding',
  DIMENSIONS: SIMILARITY_CONFIG.MIN_SCORE === 0.75 ? 1024 : 2048, // Start with 1024
  SIMILARITY_FUNCTION: 'cosine' as const,
} as const;

/**
 * Batch Processing Configuration
 */
export const BATCH_PROCESSING_CONFIG = {
  BATCH_SIZE: VOYAGE_CONFIG.BATCH_SIZE_RECOMMENDED,
  DELAY_BETWEEN_BATCHES: 100,    // 100ms delay (~600 req/min)
  CHECKPOINT_INTERVAL: 100,       // Save progress every 100 nodes
  MAX_CONCURRENT_REQUESTS: 5,     // Parallel request limit
  RESUME_ON_FAILURE: true,        // Continue from last checkpoint
} as const;

/**
 * Environment Variable Keys
 */
export const ENV_KEYS = {
  VOYAGE_API_KEY: 'VOYAGE_API_KEY',
  NEO4J_URI: 'NEO4J_URI',
  NEO4J_USER: 'NEO4J_USER',
  NEO4J_PASSWORD: 'NEO4J_PASSWORD',
} as const;
