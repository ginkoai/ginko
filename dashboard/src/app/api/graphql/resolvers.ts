/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [graphql, resolvers, knowledge, task-024]
 * @related: [schema.ts, route.ts, _cloud-graph-client.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [graphql, neo4j-driver]
 */

/**
 * GraphQL Resolvers for Knowledge Graph API
 * TASK-024: GraphQL API Implementation
 */

import { CloudGraphClient } from '../v1/graph/_cloud-graph-client';
import { runQuery } from '../v1/graph/_neo4j';
import { getVoyageClient } from '@/lib/embeddings/voyage-client';
import { SIMILARITY_CONFIG } from '@/lib/embeddings/config';
import neo4j from 'neo4j-driver';

interface Context {
  token: string;
}

export const resolvers = {
  Query: {
    /**
     * Semantic search using vector similarity
     */
    search: async (
      _parent: any,
      args: {
        query: string;
        graphId: string;
        limit?: number;
        minScore?: number;
        type?: string;
        status?: string;
      },
      context: Context
    ) => {
      const { query, graphId, limit = 10, minScore = 0.75, type, status = 'active' } = args;

      // Generate query embedding
      const voyageClient = getVoyageClient();
      const embeddings = await voyageClient.embed([query], 'query');
      const queryEmbedding = embeddings[0];

      // Build Cypher query
      let cypherQuery = `
        CALL db.index.vector.queryNodes(
          'knowledge_embeddings',
          $limit,
          $queryEmbedding
        )
        YIELD node, score
        WHERE score >= $minScore
      `;

      const queryParams: Record<string, any> = {
        queryEmbedding,
        limit: neo4j.int(limit * 2),
        minScore,
      };

      // Add filters
      if (type) {
        cypherQuery += ` AND node:${type}`;
      }

      if (status) {
        cypherQuery += ` AND node.status = $status`;
        queryParams.status = status;
      }

      cypherQuery += `
        WITH node, score
        ORDER BY score DESC
        LIMIT $finalLimit
        RETURN node, score
      `;
      queryParams.finalLimit = neo4j.int(limit);

      const results = await runQuery<any>(cypherQuery, queryParams);

      return results.map((r: any) => {
        let relationshipType;
        if (r.score >= SIMILARITY_CONFIG.DUPLICATE_THRESHOLD) {
          relationshipType = 'DUPLICATE_OF';
        } else if (r.score >= SIMILARITY_CONFIG.HIGH_RELEVANCE_THRESHOLD) {
          relationshipType = 'HIGHLY_RELATED_TO';
        } else if (r.score >= SIMILARITY_CONFIG.MEDIUM_RELEVANCE_THRESHOLD) {
          relationshipType = 'RELATED_TO';
        } else {
          relationshipType = 'LOOSELY_RELATED_TO';
        }

        return {
          node: r.node.properties,
          score: r.score,
          relationshipType,
        };
      });
    },

    /**
     * Find nodes by tags
     */
    nodesByTag: async (
      _parent: any,
      args: {
        tags: string[];
        graphId: string;
        type?: string;
        status?: string;
        limit?: number;
      },
      context: Context
    ) => {
      const { tags, graphId, type, status = 'active', limit = 50 } = args;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);

      const filters: any = {
        limit: Math.min(limit, 100),
      };

      if (type) {
        filters.labels = [type];
      }

      if (status) {
        filters.properties = { status };
      }

      const result = await client.queryNodes(filters);

      // Filter by tags (post-query)
      const nodes = result.nodes.filter((node: any) => {
        const nodeTags = node.tags || [];
        return tags.some(tag => nodeTags.includes(tag));
      });

      return nodes;
    },

    /**
     * Get node with its relationship graph
     */
    nodeGraph: async (
      _parent: any,
      args: {
        nodeId: string;
        graphId: string;
        depth?: number;
        relationshipTypes?: string[];
      },
      context: Context
    ) => {
      const { nodeId, graphId, depth = 1, relationshipTypes } = args;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);

      // Get center node
      const centerNode = await client.getNode(nodeId);
      if (!centerNode) {
        throw new Error('Node not found');
      }

      // Build relationship type filter
      const relTypeFilter = relationshipTypes && relationshipTypes.length > 0
        ? relationshipTypes.map(t => `:${t}`).join('|')
        : '';

      // Query connected nodes
      const cypherQuery = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(center {id: $nodeId})
        MATCH path = (center)-[r${relTypeFilter}*1..${depth}]-(connected)
        WHERE (g)-[:CONTAINS]->(connected)
        WITH center, connected, relationships(path) as rels
        RETURN DISTINCT
          connected,
          [rel IN rels | {
            type: type(rel),
            fromId: startNode(rel).id,
            toId: endNode(rel).id,
            properties: properties(rel)
          }] as pathRels
      `;

      const results = await runQuery<any>(cypherQuery, {
        graphId,
        nodeId,
      });

      const connectedNodes = results.map((r: any) => r.connected);
      const relationships: any[] = [];

      // Collect all relationships
      results.forEach((r: any) => {
        r.pathRels.forEach((rel: any) => {
          relationships.push(rel);
        });
      });

      return {
        centerNode,
        connectedNodes,
        relationships,
        depth,
      };
    },

    /**
     * Get single node by ID
     */
    node: async (
      _parent: any,
      args: { id: string; graphId: string },
      context: Context
    ) => {
      const { id, graphId } = args;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);
      return await client.getNode(id);
    },

    /**
     * List nodes with filters
     */
    nodes: async (
      _parent: any,
      args: {
        graphId: string;
        type?: string;
        status?: string;
        tags?: string[];
        limit?: number;
        offset?: number;
      },
      context: Context
    ) => {
      const { graphId, type, status, tags, limit = 50, offset = 0 } = args;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);

      const filters: any = {
        limit: Math.min(limit, 100),
        offset,
      };

      if (type) {
        filters.labels = [type];
      }

      if (status) {
        filters.properties = { status };
      }

      const result = await client.queryNodes(filters);

      // Filter by tags if provided
      let nodes = result.nodes;
      if (tags && tags.length > 0) {
        nodes = nodes.filter((node: any) => {
          const nodeTags = node.tags || [];
          return tags.some(tag => nodeTags.includes(tag));
        });
      }

      return {
        nodes,
        pageInfo: {
          hasNextPage: nodes.length === limit,
          hasPreviousPage: offset > 0,
          totalCount: nodes.length,
        },
      };
    },

    /**
     * Context-aware queries for AI assistance
     */
    contextualNodes: async (
      _parent: any,
      args: {
        graphId: string;
        context: {
          projectId?: string;
          branch?: string;
          timeRange?: string;
          userId?: string;
        };
        limit?: number;
      },
      context: Context
    ) => {
      const { graphId, context: ctx, limit = 20 } = args;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);

      // Build context-aware query
      const filters: any = {
        limit: Math.min(limit, 50),
        properties: {},
      };

      if (ctx.projectId) {
        filters.properties.projectId = ctx.projectId;
      }

      const result = await client.queryNodes(filters);
      return result.nodes;
    },

    /**
     * Find ADRs implementing a specific PRD
     */
    adrsByPrd: async (
      _parent: any,
      args: { prdId: string; graphId: string },
      context: Context
    ) => {
      const { prdId, graphId } = args;

      const cypherQuery = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(prd:PRD {id: $prdId})
        MATCH (adr:ADR)-[:IMPLEMENTS]->(prd)
        WHERE (g)-[:CONTAINS]->(adr)
        RETURN adr
      `;

      const results = await runQuery<any>(cypherQuery, { graphId, prdId });
      return results.map((r: any) => r.adr);
    },

    /**
     * Track implementation progress
     */
    implementationProgress: async (
      _parent: any,
      args: { projectId: string; graphId: string },
      context: Context
    ) => {
      const { projectId, graphId } = args;

      // Query PRDs and ADRs
      const statsQuery = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(prd:PRD)
        WHERE prd.projectId = $projectId
        OPTIONAL MATCH (adr:ADR)-[:IMPLEMENTS]->(prd)
        WITH prd, count(adr) as adrCount
        RETURN
          count(prd) as totalPRDs,
          sum(CASE WHEN adrCount > 0 THEN 1 ELSE 0 END) as implementedPRDs,
          sum(CASE WHEN adrCount = 0 THEN 1 ELSE 0 END) as inProgressPRDs
      `;

      const adrCountQuery = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(adr:ADR)
        WHERE adr.projectId = $projectId
        RETURN count(adr) as totalADRs
      `;

      const recentDecisionsQuery = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(adr:ADR)
        WHERE adr.projectId = $projectId
        RETURN adr
        ORDER BY adr.createdAt DESC
        LIMIT 5
      `;

      const [stats, adrStats, recentDecisions] = await Promise.all([
        runQuery<any>(statsQuery, { graphId, projectId }),
        runQuery<any>(adrCountQuery, { graphId, projectId }),
        runQuery<any>(recentDecisionsQuery, { graphId, projectId }),
      ]);

      const totalPRDs = stats[0]?.totalPRDs || 0;
      const implementedPRDs = stats[0]?.implementedPRDs || 0;
      const inProgressPRDs = stats[0]?.inProgressPRDs || 0;
      const totalADRs = adrStats[0]?.totalADRs || 0;

      return {
        totalPRDs,
        implementedPRDs,
        inProgressPRDs,
        totalADRs,
        completionPercentage: totalPRDs > 0 ? (implementedPRDs / totalPRDs) * 100 : 0,
        recentDecisions: recentDecisions.map((r: any) => r.adr),
      };
    },
  },

  /**
   * Field resolvers for KnowledgeNode
   */
  KnowledgeNode: {
    relationships: async (parent: any, _args: any, context: Context) => {
      // Extract graphId from parent or context
      const graphId = parent.projectId; // Using projectId as graphId
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);
      return await client.getRelationships(parent.id);
    },

    relatedNodes: async (parent: any, _args: any, context: Context) => {
      const graphId = parent.projectId;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);

      const relationships = await client.getRelationships(parent.id);
      const relatedNodeIds = relationships.map((r: any) => r.toId);

      // Fetch related nodes
      const relatedNodes = await Promise.all(
        relatedNodeIds.map(id => client.getNode(id))
      );

      return relatedNodes.filter(node => node !== null);
    },
  },
};
