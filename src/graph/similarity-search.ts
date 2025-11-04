/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-30
 * @tags: [semantic-search, similarity, vector-search, neo4j]
 * @related: [embeddings-service.ts, neo4j-client.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver, @xenova/transformers]
 */

import { neo4jClient } from './neo4j-client.js';
import { embeddingsService } from './embeddings-service.js';
import neo4j from 'neo4j-driver';

/**
 * Search result with similarity score
 */
export interface SimilarityResult {
  id: string;
  type: 'ADR' | 'PRD' | 'Pattern' | 'Gotcha' | 'Session' | 'CodeFile' | 'ContextModule';
  title: string;
  summary?: string;
  content?: string;
  similarity: number;
  tags?: string[];
  created_at?: string;
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Minimum similarity score (0-1) */
  threshold?: number;
  /** Maximum results to return */
  limit?: number;
  /** Filter by node types */
  nodeTypes?: string[];
  /** Filter by project ID */
  projectId?: string;
  /** Filter by tags */
  tags?: string[];
}

/**
 * Similarity search service
 *
 * Provides semantic search across knowledge graph using vector embeddings.
 *
 * Features:
 * - Text-to-vector embedding
 * - Vector similarity search in Neo4j
 * - Hybrid search (full-text + vector)
 * - Cross-type similarity queries
 *
 * Performance:
 * - Query embedding: ~10-20ms (local inference)
 * - Vector search: <50ms (Neo4j vector index)
 * - Total: <100ms end-to-end
 */
export class SimilaritySearch {
  /**
   * Find documents similar to a text query
   *
   * @param query - Natural language query
   * @param options - Search options
   * @returns Array of similar documents with scores
   *
   * @example
   * ```typescript
   * const search = new SimilaritySearch();
   * const results = await search.findSimilar('graph database design patterns');
   *
   * results.forEach(result => {
   *   console.log(`${result.type}: ${result.title} (${result.similarity.toFixed(2)})`);
   * });
   * ```
   */
  async findSimilar(query: string, options: SearchOptions = {}): Promise<SimilarityResult[]> {
    const {
      threshold = 0.7,
      limit = 10,
      nodeTypes = ['ADR', 'PRD', 'Pattern', 'Gotcha', 'ContextModule'],
      projectId,
      tags,
    } = options;

    // 1. Generate embedding for query
    await embeddingsService.initialize();
    const { embedding } = await embeddingsService.embed(query);

    // 2. Search each node type
    const allResults: SimilarityResult[] = [];

    for (const nodeType of nodeTypes) {
      const results = await this.searchNodeType(
        nodeType,
        embedding,
        threshold,
        limit,
        projectId,
        tags
      );
      allResults.push(...results);
    }

    // 3. Sort by similarity and limit
    allResults.sort((a, b) => b.similarity - a.similarity);
    return allResults.slice(0, limit);
  }

  /**
   * Find documents similar to an existing document
   *
   * @param documentId - ID of the document to find similarities for
   * @param options - Search options
   * @returns Array of similar documents
   *
   * @example
   * ```typescript
   * const similar = await search.findSimilarToDocument('adr-039');
   * // Returns: [{ type: 'ADR', title: 'ADR-001', similarity: 0.85 }, ...]
   * ```
   */
  async findSimilarToDocument(
    documentId: string,
    options: SearchOptions = {}
  ): Promise<SimilarityResult[]> {
    const { threshold = 0.7, limit = 10 } = options;

    // Get document embedding from Neo4j
    const result = await neo4jClient.queryRecords(`
      MATCH (n {id: $id})
      WHERE n.embedding IS NOT NULL
      RETURN n.embedding AS embedding, labels(n)[0] AS type
    `, { id: documentId });

    if (result.length === 0) {
      throw new Error(`Document not found or has no embedding: ${documentId}`);
    }

    const embedding = result[0].embedding;
    const sourceType = result[0].type;

    // Search across all node types
    const nodeTypes = ['ADR', 'PRD', 'Pattern', 'Gotcha', 'ContextModule'];
    const allResults: SimilarityResult[] = [];

    for (const nodeType of nodeTypes) {
      const results = await this.searchNodeType(
        nodeType,
        embedding,
        threshold,
        limit * 2 // Get more to filter out source doc
      );
      allResults.push(...results);
    }

    // Filter out the source document and sort
    return allResults
      .filter(r => r.id !== documentId)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Hybrid search: combine full-text and vector search
   *
   * @param query - Search query
   * @param options - Search options
   * @returns Combined results from both search methods
   *
   * @example
   * ```typescript
   * // Finds results that match keywords OR semantic meaning
   * const results = await search.hybridSearch('authentication oauth security');
   * ```
   */
  async hybridSearch(query: string, options: SearchOptions = {}): Promise<SimilarityResult[]> {
    const {
      threshold = 0.5,
      limit = 10,
      nodeTypes = ['ADR', 'PRD', 'Pattern'],
    } = options;

    // 1. Full-text search
    const fullTextResults = await this.fullTextSearch(query, {
      ...options,
      limit: limit * 2,
    });

    // 2. Vector search
    const vectorResults = await this.findSimilar(query, {
      ...options,
      limit: limit * 2,
    });

    // 3. Combine and deduplicate
    const combined = new Map<string, SimilarityResult>();

    // Add full-text results (weighted 30%)
    for (const result of fullTextResults) {
      combined.set(result.id, {
        ...result,
        similarity: result.similarity * 0.3,
      });
    }

    // Add/merge vector results (weighted 70%)
    for (const result of vectorResults) {
      const existing = combined.get(result.id);
      if (existing) {
        existing.similarity += result.similarity * 0.7;
      } else {
        combined.set(result.id, {
          ...result,
          similarity: result.similarity * 0.7,
        });
      }
    }

    // Sort and filter
    return Array.from(combined.values())
      .filter(r => r.similarity > threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Search a specific node type using vector similarity
   * @private
   */
  private async searchNodeType(
    nodeType: string,
    embedding: number[],
    threshold: number,
    limit: number,
    projectId?: string,
    tags?: string[]
  ): Promise<SimilarityResult[]> {
    const indexName = `${nodeType.toLowerCase()}_embedding_index`;

    // Build query with optional filters
    let query = `
      CALL db.index.vector.queryNodes($indexName, $limit, $embedding)
      YIELD node, score
      WHERE score > $threshold
    `;

    const params: any = {
      indexName,
      limit: neo4j.int(Math.floor(limit * 2)), // Neo4j requires explicit integer type
      embedding,
      threshold,
    };

    if (projectId) {
      query += ` AND node.project_id = $projectId`;
      params.projectId = projectId;
    }

    if (tags && tags.length > 0) {
      query += ` AND any(tag IN node.tags WHERE tag IN $tags)`;
      params.tags = tags;
    }

    query += `
      RETURN node.id AS id,
             node.title AS title,
             node.summary AS summary,
             node.content AS content,
             node.tags AS tags,
             node.created_at AS created_at,
             score AS similarity,
             '${nodeType}' AS type
      ORDER BY score DESC
      LIMIT $limit
    `;

    try {
      const results = await neo4jClient.queryRecords(query, params);

      return results.map(record => ({
        id: record.id,
        type: record.type,
        title: record.title,
        summary: record.summary,
        content: record.content?.substring(0, 500), // Truncate content
        similarity: record.similarity,
        tags: record.tags,
        created_at: record.created_at,
      }));
    } catch (error: any) {
      // Index might not exist yet
      if (error.code === 'Neo.ClientError.Procedure.ProcedureNotFound') {
        console.warn(`Vector index not found: ${indexName}`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Full-text search across nodes
   * @private
   */
  private async fullTextSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<SimilarityResult[]> {
    const { limit = 10, nodeTypes = ['ADR', 'PRD', 'Pattern'] } = options;

    const results: SimilarityResult[] = [];

    for (const nodeType of nodeTypes) {
      const indexName = `${nodeType.toLowerCase()}_fulltext`;

      try {
        const records = await neo4jClient.queryRecords(`
          CALL db.index.fulltext.queryNodes($indexName, $query)
          YIELD node, score
          RETURN node.id AS id,
                 node.title AS title,
                 node.summary AS summary,
                 node.tags AS tags,
                 score AS similarity,
                 '${nodeType}' AS type
          ORDER BY score DESC
          LIMIT $limit
        `, { indexName, query, limit });

        results.push(...records.map(r => ({
          id: r.id,
          type: r.type,
          title: r.title,
          summary: r.summary,
          similarity: r.similarity,
          tags: r.tags,
        })));
      } catch (error) {
        // Ignore if index doesn't exist
        continue;
      }
    }

    return results;
  }

  /**
   * Get graph of related documents via SIMILAR_TO relationships
   *
   * @param documentId - Starting document ID
   * @param depth - How many hops to traverse (default: 2)
   * @returns Graph of similar documents
   *
   * @example
   * ```typescript
   * const graph = await search.getSimilarityGraph('adr-039', 2);
   * // Returns: { nodes: [...], edges: [...] }
   * ```
   */
  async getSimilarityGraph(documentId: string, depth: number = 2) {
    const result = await neo4jClient.queryRecords(`
      MATCH path = (start {id: $id})-[:SIMILAR_TO*1..${depth}]-(related)
      WITH start, related, relationships(path) AS rels
      RETURN DISTINCT
        start.id AS startId,
        start.title AS startTitle,
        labels(start)[0] AS startType,
        related.id AS relatedId,
        related.title AS relatedTitle,
        labels(related)[0] AS relatedType,
        [r IN rels | r.similarity][0] AS similarity
      ORDER BY similarity DESC
    `, { id: documentId });

    const nodes = new Map();
    const edges = [];

    for (const record of result) {
      // Add nodes
      if (!nodes.has(record.startId)) {
        nodes.set(record.startId, {
          id: record.startId,
          title: record.startTitle,
          type: record.startType,
        });
      }
      if (!nodes.has(record.relatedId)) {
        nodes.set(record.relatedId, {
          id: record.relatedId,
          title: record.relatedTitle,
          type: record.relatedType,
        });
      }

      // Add edge
      edges.push({
        from: record.startId,
        to: record.relatedId,
        similarity: record.similarity,
      });
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
    };
  }
}

/**
 * Create singleton instance
 */
export const similaritySearch = new SimilaritySearch();

/**
 * Convenience function for quick searches
 */
export async function findSimilar(query: string, limit: number = 10): Promise<SimilarityResult[]> {
  return similaritySearch.findSimilar(query, { limit });
}
