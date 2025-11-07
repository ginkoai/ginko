/**
 * @fileType: page
 * @status: current
 * @updated: 2025-11-07
 * @tags: [discover, search, knowledge, graphql, task-027]
 * @related: [SearchResults.tsx, graphql-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, react]
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SearchResults } from '@/components/discover/SearchResults';
import { Badge } from '@/components/ui/badge';
import { createGraphQLClient, QUERIES, SearchResult } from '@/lib/graphql-client';

type NodeType = 'ADR' | 'PRD' | 'ContextModule' | 'All';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeType, setNodeType] = useState<NodeType>('All');
  const [minScore, setMinScore] = useState(0.75);

  // Debounced search
  useEffect(() => {
    if (!searchInput.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setQuery(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Perform search when query changes
  useEffect(() => {
    if (query.trim()) {
      performSearch();
    }
  }, [query, nodeType, minScore]);

  const performSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual GraphQL API call
      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Mock search results - replace with real API call
      const mockResults: SearchResult[] = [
        {
          node: {
            id: 'adr_001',
            type: 'ADR',
            title: 'ADR-043: Event-Based Context Loading',
            content:
              'This ADR documents the decision to implement event-based context loading for sub-second CLI startup. The implementation uses a cursor-based approach with JSONL event streams to load context progressively...',
            status: 'active',
            tags: ['performance', 'context-loading', 'events'],
            projectId: 'ginko',
            userId: 'user_1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          score: 0.92,
          relationshipType: 'HIGHLY_RELATED_TO',
        },
        {
          node: {
            id: 'adr_002',
            type: 'ADR',
            title: 'ADR-033: Context Pressure Mitigation',
            content:
              'Strategy for managing context pressure through defensive logging. This ADR introduces the concept of logging at optimal context pressure (20-80%) to enable high-quality handoffs...',
            status: 'active',
            tags: ['context', 'logging', 'session-management'],
            projectId: 'ginko',
            userId: 'user_1',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
          },
          score: 0.85,
          relationshipType: 'HIGHLY_RELATED_TO',
        },
        {
          node: {
            id: 'prd_001',
            type: 'PRD',
            title: 'GraphQL API for Knowledge Graph',
            content:
              'Product requirements for implementing a GraphQL API that provides semantic search, graph traversal, and context-aware queries for the knowledge graph...',
            status: 'active',
            tags: ['graphql', 'api', 'knowledge-graph'],
            projectId: 'ginko',
            userId: 'user_1',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date(Date.now() - 172800000).toISOString(),
          },
          score: 0.78,
          relationshipType: 'RELATED_TO',
        },
      ];

      // Filter by node type
      const filteredResults =
        nodeType === 'All'
          ? mockResults
          : mockResults.filter((r) => r.node.type === nodeType);

      setResults(filteredResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const nodeTypes: NodeType[] = ['All', 'ADR', 'PRD', 'ContextModule'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/discover"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Discover
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Search Knowledge Graphs
          </h1>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search across ADRs, PRDs, and modules..."
              className="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-4 top-3.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Type:</span>
              <div className="flex gap-2">
                {nodeTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setNodeType(type)}
                    className={`
                      px-3 py-1 rounded-full text-sm font-medium transition-colors
                      ${
                        nodeType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Min Relevance:</span>
              <select
                value={minScore}
                onChange={(e) => setMinScore(parseFloat(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="0.9">90%+</option>
                <option value="0.8">80%+</option>
                <option value="0.75">75%+</option>
                <option value="0.7">70%+</option>
                <option value="0.5">50%+</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Search Results */}
        <SearchResults results={results} query={query} loading={loading} />

        {/* Search Tips */}
        {!query && !loading && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Search Tips
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  Use natural language queries like "authentication patterns" or
                  "database migrations"
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  Filter by node type (ADR, PRD, Module) to narrow results
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  Adjust minimum relevance to control result precision
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  Click on tags in results to find related knowledge
                </span>
              </li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
