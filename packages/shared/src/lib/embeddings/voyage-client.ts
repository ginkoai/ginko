/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [embeddings, voyage-ai, api-client, retry-logic, adr-045]
 * @related: [types.ts, config.ts, similarity-matcher.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

import type {
  EmbeddingInputType,
  EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingDimension,
  EmbeddingDataType,
} from './types';
import { VOYAGE_CONFIG } from './config';

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Error thrown when API request fails
 */
export class VoyageAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'VoyageAPIError';
  }
}

/**
 * Voyage AI Embedding Client
 *
 * Handles all interactions with Voyage AI embeddings API per ADR-045:
 * - Authentication via API key
 * - Batch processing with size limits
 * - Exponential backoff retry for rate limits
 * - input_type specification (query vs document)
 * - Configurable dimensions and truncation
 *
 * @example
 * ```typescript
 * const client = new VoyageEmbeddingClient(process.env.VOYAGE_API_KEY);
 *
 * // Generate embeddings for knowledge nodes (documents)
 * const docEmbeddings = await client.embed(['node content...'], 'document');
 *
 * // Generate embeddings for search queries
 * const queryEmbedding = await client.embed(['search term'], 'query');
 * ```
 */
export class VoyageEmbeddingClient {
  private apiKey: string;
  private baseURL: string;
  private model: 'voyage-3.5' | 'voyage-3.5-lite';
  private defaultDimension: EmbeddingDimension;

  constructor(
    apiKey?: string,
    options?: {
      baseURL?: string;
      model?: 'voyage-3.5' | 'voyage-3.5-lite';
      defaultDimension?: EmbeddingDimension;
    }
  ) {
    this.apiKey = apiKey || process.env.VOYAGE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        'VOYAGE_API_KEY is required. Set environment variable or pass to constructor.'
      );
    }

    this.baseURL = options?.baseURL || VOYAGE_CONFIG.API_URL;
    this.model = options?.model || VOYAGE_CONFIG.DEFAULT_MODEL;
    this.defaultDimension = options?.defaultDimension || VOYAGE_CONFIG.DEFAULT_DIMENSION;
  }

  /**
   * Generate embeddings for text(s)
   *
   * @param texts - Single text or array of texts to embed
   * @param inputType - 'query' for search queries, 'document' for content indexing
   * @param options - Optional configuration overrides
   * @returns Array of embedding vectors
   *
   * @throws {RateLimitError} When rate limit is exceeded (429)
   * @throws {VoyageAPIError} When API request fails
   *
   * CRITICAL: Always specify input_type for retrieval use cases (ADR-045)
   */
  async embed(
    texts: string | string[],
    inputType: EmbeddingInputType,
    options?: {
      dimension?: EmbeddingDimension;
      dataType?: EmbeddingDataType;
      truncation?: boolean;
      model?: 'voyage-3.5' | 'voyage-3.5-lite';
    }
  ): Promise<number[][]> {
    const textsArray = Array.isArray(texts) ? texts : [texts];

    // Validate batch size
    if (textsArray.length > VOYAGE_CONFIG.BATCH_SIZE_MAX) {
      throw new Error(
        `Batch size ${textsArray.length} exceeds maximum ${VOYAGE_CONFIG.BATCH_SIZE_MAX}`
      );
    }

    // Prepare request
    const request: EmbeddingRequest = {
      input: textsArray,
      model: options?.model || this.model,
      input_type: inputType, // CRITICAL: Required for retrieval (ADR-045)
      output_dimension: options?.dimension || this.defaultDimension,
      output_dtype: options?.dataType || 'float',
      truncation: options?.truncation ?? VOYAGE_CONFIG.DEFAULT_TRUNCATION,
    };

    // Execute with retry logic
    const response = await this.executeWithRetry(async () => {
      return await this.makeRequest('/embeddings', request);
    });

    // Extract embedding vectors
    return response.data.map((item) => item.embedding);
  }

  /**
   * Generate embeddings with manual retry control
   * Useful for batch processing with custom retry logic
   */
  async embedWithoutRetry(
    texts: string | string[],
    inputType: EmbeddingInputType,
    options?: {
      dimension?: EmbeddingDimension;
      truncation?: boolean;
    }
  ): Promise<number[][]> {
    const textsArray = Array.isArray(texts) ? texts : [texts];

    const request: EmbeddingRequest = {
      input: textsArray,
      model: this.model,
      input_type: inputType,
      output_dimension: options?.dimension || this.defaultDimension,
      truncation: options?.truncation ?? VOYAGE_CONFIG.DEFAULT_TRUNCATION,
    };

    const response = await this.makeRequest('/embeddings', request);
    return response.data.map((item) => item.embedding);
  }

  /**
   * Process texts in batches
   * Automatically splits large arrays into smaller batches
   *
   * @param texts - Array of texts to embed
   * @param inputType - 'query' or 'document'
   * @param batchSize - Batch size (default: 128 recommended)
   * @param delayMs - Delay between batches to respect rate limits
   * @returns Array of all embedding vectors
   */
  async embedBatch(
    texts: string[],
    inputType: EmbeddingInputType,
    options?: {
      batchSize?: number;
      delayMs?: number;
      dimension?: EmbeddingDimension;
      onProgress?: (processed: number, total: number) => void;
    }
  ): Promise<number[][]> {
    const batchSize = options?.batchSize || VOYAGE_CONFIG.BATCH_SIZE_RECOMMENDED;
    const delayMs = options?.delayMs || 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      // Generate embeddings for batch
      const embeddings = await this.embed(batch, inputType, {
        dimension: options?.dimension,
      });

      allEmbeddings.push(...embeddings);

      // Progress callback
      if (options?.onProgress) {
        options.onProgress(Math.min(i + batchSize, texts.length), texts.length);
      }

      // Delay between batches (rate limit protection)
      if (i + batchSize < texts.length) {
        await this.sleep(delayMs);
      }
    }

    return allEmbeddings;
  }

  /**
   * Make HTTP request to Voyage AI API
   */
  private async makeRequest(
    endpoint: string,
    body: EmbeddingRequest
  ): Promise<EmbeddingResponse> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();

      // Handle rate limit errors (429)
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        throw new RateLimitError(
          `Rate limit exceeded. Retry after ${retryAfter}s`,
          retryAfter
        );
      }

      throw new VoyageAPIError(
        `Voyage AI API error: ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    return (await response.json()) as EmbeddingResponse;
  }

  /**
   * Execute function with exponential backoff retry
   * Retries on rate limit errors (429) with backoff
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      // Retry only on rate limit errors
      if (error instanceof RateLimitError && attempt < VOYAGE_CONFIG.MAX_RETRIES) {
        const delay = VOYAGE_CONFIG.RETRY_INITIAL_DELAY * Math.pow(
          VOYAGE_CONFIG.RETRY_BACKOFF_FACTOR,
          attempt - 1
        );

        console.log(
          `[VoyageClient] Rate limited. Retrying in ${delay}ms (attempt ${attempt}/${VOYAGE_CONFIG.MAX_RETRIES})`
        );

        await this.sleep(delay);
        return this.executeWithRetry(fn, attempt + 1);
      }

      // Rethrow if not rate limit or max retries exceeded
      throw error;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate API key is configured
   */
  static validateConfig(): boolean {
    return !!process.env.VOYAGE_API_KEY;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      model: this.model,
      defaultDimension: this.defaultDimension,
      baseURL: this.baseURL,
      apiKeyConfigured: !!this.apiKey,
    };
  }
}

/**
 * Create singleton instance for application-wide use
 */
let instance: VoyageEmbeddingClient | null = null;

export function getVoyageClient(): VoyageEmbeddingClient {
  if (!instance) {
    instance = new VoyageEmbeddingClient();
  }
  return instance;
}

export function resetVoyageClient(): void {
  instance = null;
}
