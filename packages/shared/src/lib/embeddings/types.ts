/**
 * @fileType: types
 * @status: current
 * @updated: 2025-11-07
 * @tags: [embeddings, types, voyage-ai, similarity, adr-045]
 * @related: [voyage-client.ts, similarity-matcher.ts, config.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Embedding provider input types (Voyage AI)
 * Specifies whether content is a query or document for retrieval optimization
 */
export type EmbeddingInputType = 'query' | 'document';

/**
 * Supported output dimensions via Matryoshka learning
 */
export type EmbeddingDimension = 256 | 512 | 1024 | 2048;

/**
 * Output data types for embeddings
 */
export type EmbeddingDataType = 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary';

/**
 * Request to generate embeddings
 */
export interface EmbeddingRequest {
  input: string | string[];
  model: 'voyage-3.5' | 'voyage-3.5-lite';
  input_type: EmbeddingInputType;
  output_dimension?: EmbeddingDimension;
  output_dtype?: EmbeddingDataType;
  truncation?: boolean;
}

/**
 * Single embedding result
 */
export interface EmbeddingResult {
  object: 'embedding';
  embedding: number[];
  index: number;
}

/**
 * Embedding API response
 */
export interface EmbeddingResponse {
  object: 'list';
  data: EmbeddingResult[];
  model: string;
  usage: {
    total_tokens: number;
  };
}

/**
 * Node with similarity score
 */
export interface SimilarNode {
  node: any;  // Neo4j node object
  score: number;
  relationshipType: string;
}

/**
 * Relationship types based on similarity strength
 */
export type SimilarityRelationshipType =
  | 'DUPLICATE_OF'
  | 'HIGHLY_RELATED_TO'
  | 'RELATED_TO'
  | 'LOOSELY_RELATED_TO';

/**
 * Similarity search options
 */
export interface SimilaritySearchOptions {
  minScore?: number;
  limit?: number;
  projectId?: string;
  status?: 'active' | 'archived' | 'all';
  excludeIds?: string[];
}

/**
 * Similarity statistics
 */
export interface SimilarityStats {
  totalRelationships: number;
  averageScore: number;
  minScore: number;
  maxScore: number;
  byType: Record<SimilarityRelationshipType, number>;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ nodeId: string; error: string }>;
  relationshipsCreated: number;
}

/**
 * Percentile distribution for threshold tuning
 */
export interface SimilarityDistribution {
  p50: number;  // Median
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  recommendedThreshold: number;
}
