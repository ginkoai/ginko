/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-30
 * @tags: [embeddings, transformers, semantic-search, ml, all-mpnet-base-v2]
 * @related: [neo4j-client.ts, schema/007-vector-indexes.cypher]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [@xenova/transformers]
 */

/**
 * Embeddings configuration
 */
interface EmbeddingsConfig {
  apiUrl: string;
  model: string;
  dimensions: number;
  timeout: number;
}

/**
 * Embedding result
 */
interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
}

/**
 * Embeddings service using self-hosted all-mpnet-base-v2 on Hetzner
 *
 * Self-hosted sentence embeddings for semantic search in Neo4j knowledge graph.
 *
 * Features:
 * - 768-dimensional embeddings
 * - Self-hosted on Hetzner (zero API costs)
 * - Batch processing support
 * - Compatible with Neo4j vector indexes
 *
 * Performance:
 * - Inference speed: ~50-100ms per request
 * - Model: sentence-transformers/all-mpnet-base-v2
 * - Endpoint: http://178.156.182.99:8080
 *
 * Architecture:
 * - Python Flask API with sentence-transformers library
 * - Docker container on Hetzner VM (same server as Neo4j)
 * - Low latency server-to-server communication
 */
export class EmbeddingsService {
  private config: EmbeddingsConfig;
  private isInitialized = false;

  constructor(config?: Partial<EmbeddingsConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || process.env.EMBEDDINGS_API_URL || 'http://178.156.182.99:8080',
      model: config?.model || 'sentence-transformers/all-mpnet-base-v2',
      dimensions: config?.dimensions || 768,
      timeout: config?.timeout || 10000,
    };
  }

  /**
   * Initialize the embeddings service
   * Validates connection to self-hosted API
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log(`Connecting to embeddings API: ${this.config.apiUrl}...`);

    const startTime = Date.now();

    try {
      // Test connection with health check
      const response = await fetch(`${this.config.apiUrl}/health`, {
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const health: any = await response.json();
      console.log(`✓ Connected to embeddings API in ${Date.now() - startTime}ms`);
      console.log(`  Model: ${health.model}, Dimensions: ${health.dimensions}`);

      this.isInitialized = true;
    } catch (error: any) {
      throw new Error(`Failed to connect to embeddings API: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a single text
   *
   * @param text - Text to embed (ADR, PRD, pattern, etc.)
   * @returns Embedding vector (768 dimensions)
   *
   * @example
   * ```typescript
   * const service = new EmbeddingsService();
   * await service.initialize();
   *
   * const result = await service.embed('Graph-based context discovery');
   * console.log(result.dimensions); // 768
   * console.log(result.embedding.length); // 768
   * ```
   */
  async embed(text: string): Promise<EmbeddingResult> {
    if (!this.isInitialized) {
      throw new Error('EmbeddingsService not initialized. Call initialize() first.');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Cannot embed empty text');
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.config.apiUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: any = await response.json();
      const embedding = Array.isArray(data[0]) ? data[0] : data;

      const inferenceTime = Date.now() - startTime;

      if (process.env.DEBUG) {
        console.log(`Embedding generated in ${inferenceTime}ms (${text.substring(0, 50)}...)`);
      }

      return {
        embedding,
        dimensions: embedding.length,
        model: this.config.model,
      };
    } catch (error: any) {
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * More efficient than calling embed() repeatedly
   *
   * @param texts - Array of texts to embed
   * @returns Array of embedding results
   *
   * @example
   * ```typescript
   * const adrs = [
   *   'ADR-001: Infrastructure selection',
   *   'ADR-039: Graph-based discovery',
   *   'ADR-020: CLI-first pivot'
   * ];
   *
   * const results = await service.embedBatch(adrs);
   * console.log(results.length); // 3
   * ```
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.isInitialized) {
      throw new Error('EmbeddingsService not initialized. Call initialize() first.');
    }

    if (texts.length === 0) {
      return [];
    }

    console.log(`Generating embeddings for ${texts.length} texts...`);
    const startTime = Date.now();

    // Process in batches to avoid overwhelming the API
    const BATCH_SIZE = 10;
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(text => this.embed(text))
      );
      results.push(...batchResults);

      const progress = Math.min(i + BATCH_SIZE, texts.length);
      console.log(`  Progress: ${progress}/${texts.length}`);
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / texts.length;

    console.log(`✓ Generated ${results.length} embeddings in ${totalTime}ms (avg: ${avgTime.toFixed(1)}ms per text)`);

    return results;
  }

  /**
   * Compute cosine similarity between two embeddings
   * Returns value between -1 and 1 (higher = more similar)
   *
   * @param embedding1 - First embedding vector
   * @param embedding2 - Second embedding vector
   * @returns Similarity score (0-1 range after normalization)
   */
  static cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    // Normalize to 0-1 range (from -1 to 1)
    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return (similarity + 1) / 2;
  }

  /**
   * Get service configuration
   */
  getConfig(): EmbeddingsConfig {
    return { ...this.config };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.isInitialized = false;
    console.log('✓ Embeddings service disposed');
  }
}

/**
 * Create a singleton instance for use across the application
 */
export const embeddingsService = new EmbeddingsService();

/**
 * Helper to ensure initialization
 */
export async function ensureEmbeddingsReady(): Promise<EmbeddingsService> {
  await embeddingsService.initialize();
  return embeddingsService;
}
