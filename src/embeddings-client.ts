/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-03
 * @tags: embeddings, api-client, hetzner, semantic-search
 * @related: src/graph-embeddings.ts, api/v1/graph/embed/[documentId].ts
 * @priority: high
 * @complexity: low
 * @dependencies: none
 */

/**
 * Hetzner Self-Hosted Embeddings Client
 *
 * Provides a typed interface to the self-hosted text-embeddings-inference
 * service running on Hetzner infrastructure.
 *
 * Features:
 * - Single and batch embedding generation
 * - Automatic retry with exponential backoff
 * - Error handling with detailed diagnostics
 * - Connection pooling via fetch
 * - Health check validation
 * - Performance monitoring
 */

// Configuration
const EMBEDDINGS_API_URL =
  process.env.EMBEDDINGS_API_URL || 'http://178.156.182.99:8080';
const EMBEDDINGS_DIMENSIONS = parseInt(
  process.env.EMBEDDINGS_DIMENSIONS || '768',
  10
);
const EMBEDDINGS_MODEL =
  process.env.EMBEDDINGS_MODEL || 'sentence-transformers/all-mpnet-base-v2';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 10000;

// Types
export interface EmbeddingsClientConfig {
  apiUrl?: string;
  dimensions?: number;
  model?: string;
  timeout?: number; // milliseconds
  maxRetries?: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  latency: number; // milliseconds
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  dimensions: number;
  latency: number; // milliseconds
  count: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  latency: number;
  model: string;
  dimensions: number;
}

export class EmbeddingsError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'EmbeddingsError';
  }
}

/**
 * Client for interacting with self-hosted embeddings service
 */
export class EmbeddingsClient {
  private readonly apiUrl: string;
  private readonly dimensions: number;
  private readonly model: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: EmbeddingsClientConfig = {}) {
    this.apiUrl = config.apiUrl || EMBEDDINGS_API_URL;
    this.dimensions = config.dimensions || EMBEDDINGS_DIMENSIONS;
    this.model = config.model || EMBEDDINGS_MODEL;
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.maxRetries = config.maxRetries ?? MAX_RETRIES;
  }

  /**
   * Generate embedding for a single text input
   *
   * @param text - Text to embed
   * @returns Embedding vector and metadata
   * @throws EmbeddingsError if generation fails
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    if (!text || text.trim().length === 0) {
      throw new EmbeddingsError('Input text cannot be empty');
    }

    const startTime = Date.now();

    try {
      const response = await this.fetchWithRetry(`${this.apiUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      });

      const data = await response.json();

      // Validate response format
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new EmbeddingsError(
          'Invalid response format from embeddings service',
          response.status,
          data
        );
      }

      const embedding = data[0];

      // Validate dimensions
      if (embedding.length !== this.dimensions) {
        throw new EmbeddingsError(
          `Dimension mismatch: expected ${this.dimensions}, got ${embedding.length}`,
          response.status
        );
      }

      const latency = Date.now() - startTime;

      return {
        embedding,
        dimensions: embedding.length,
        latency,
      };
    } catch (error) {
      if (error instanceof EmbeddingsError) {
        throw error;
      }

      throw new EmbeddingsError(
        `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error
      );
    }
  }

  /**
   * Generate embeddings for multiple text inputs in a single request
   *
   * @param texts - Array of texts to embed
   * @param options - Batch options
   * @returns Array of embedding vectors and metadata
   * @throws EmbeddingsError if generation fails
   */
  async generateBatchEmbeddings(
    texts: string[],
    options: { maxBatchSize?: number } = {}
  ): Promise<BatchEmbeddingResponse> {
    const maxBatchSize = options.maxBatchSize || 100;

    if (texts.length === 0) {
      throw new EmbeddingsError('Input texts array cannot be empty');
    }

    if (texts.length > maxBatchSize) {
      // Process in chunks if batch exceeds max size
      return this.generateChunkedBatchEmbeddings(texts, maxBatchSize);
    }

    // Validate all inputs
    const validTexts = texts.filter((text) => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      throw new EmbeddingsError('All input texts are empty');
    }

    if (validTexts.length !== texts.length) {
      console.warn(
        `Filtered out ${texts.length - validTexts.length} empty texts from batch`
      );
    }

    const startTime = Date.now();

    try {
      const response = await this.fetchWithRetry(`${this.apiUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: validTexts }),
      });

      const data = await response.json();

      // Validate response format
      if (!Array.isArray(data)) {
        throw new EmbeddingsError(
          'Invalid response format from embeddings service',
          response.status,
          data
        );
      }

      // Validate all embeddings have correct dimensions
      for (let i = 0; i < data.length; i++) {
        if (!Array.isArray(data[i]) || data[i].length !== this.dimensions) {
          throw new EmbeddingsError(
            `Invalid embedding at index ${i}: expected ${this.dimensions} dimensions, got ${data[i]?.length || 0}`,
            response.status
          );
        }
      }

      const latency = Date.now() - startTime;

      return {
        embeddings: data,
        dimensions: this.dimensions,
        latency,
        count: data.length,
      };
    } catch (error) {
      if (error instanceof EmbeddingsError) {
        throw error;
      }

      throw new EmbeddingsError(
        `Failed to generate batch embeddings: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error
      );
    }
  }

  /**
   * Generate embeddings for large batches by chunking requests
   */
  private async generateChunkedBatchEmbeddings(
    texts: string[],
    chunkSize: number
  ): Promise<BatchEmbeddingResponse> {
    const startTime = Date.now();
    const allEmbeddings: number[][] = [];

    // Process in chunks
    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      const chunkResult = await this.generateBatchEmbeddings(chunk, {
        maxBatchSize: chunkSize,
      });
      allEmbeddings.push(...chunkResult.embeddings);
    }

    const latency = Date.now() - startTime;

    return {
      embeddings: allEmbeddings,
      dimensions: this.dimensions,
      latency,
      count: allEmbeddings.length,
    };
  }

  /**
   * Check health of embeddings service
   *
   * @returns Health status and metrics
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          status: 'ok',
          latency,
          model: this.model,
          dimensions: this.dimensions,
        };
      } else if (response.status >= 500) {
        return {
          status: 'down',
          latency,
          model: this.model,
          dimensions: this.dimensions,
        };
      } else {
        return {
          status: 'degraded',
          latency,
          model: this.model,
          dimensions: this.dimensions,
        };
      }
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        model: this.model,
        dimensions: this.dimensions,
      };
    }
  }

  /**
   * Fetch with automatic retry and exponential backoff
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          const errorBody = await response.text();
          throw new EmbeddingsError(
            `Embeddings API error: ${response.statusText}`,
            response.status,
            errorBody
          );
        }

        // Retry server errors (5xx)
        if (retryCount < this.maxRetries) {
          const delay = Math.min(
            INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
            MAX_RETRY_DELAY_MS
          );

          console.warn(
            `Embeddings API error (${response.status}), retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.maxRetries})`
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.fetchWithRetry(url, options, retryCount + 1);
        }

        throw new EmbeddingsError(
          `Embeddings API error after ${this.maxRetries} retries: ${response.statusText}`,
          response.status
        );
      }

      return response;
    } catch (error) {
      // Handle network errors with retry
      if (
        retryCount < this.maxRetries &&
        (error instanceof TypeError || error.name === 'AbortError')
      ) {
        const delay = Math.min(
          INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
          MAX_RETRY_DELAY_MS
        );

        console.warn(
          `Network error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.maxRetries})`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Get client configuration
   */
  getConfig() {
    return {
      apiUrl: this.apiUrl,
      dimensions: this.dimensions,
      model: this.model,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
    };
  }
}

// Export singleton instance
export const embeddingsClient = new EmbeddingsClient();

// Convenience functions
export async function generateEmbedding(
  text: string
): Promise<EmbeddingResponse> {
  return embeddingsClient.generateEmbedding(text);
}

export async function generateBatchEmbeddings(
  texts: string[]
): Promise<BatchEmbeddingResponse> {
  return embeddingsClient.generateBatchEmbeddings(texts);
}

export async function checkEmbeddingsHealth(): Promise<HealthCheckResponse> {
  return embeddingsClient.healthCheck();
}
