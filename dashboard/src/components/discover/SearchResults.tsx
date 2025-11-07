/**
 * @fileType: component
 * @status: current
 * @updated: 2025-11-07
 * @tags: [ui, discover, search, results, task-027]
 * @related: [KnowledgeNodeCard.tsx, discover/search/page.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react]
 */

'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SearchResult, KnowledgeNode } from '@/lib/graphql-client';

export interface SearchResultsProps {
  results: SearchResult[];
  query?: string;
  loading?: boolean;
}

export function SearchResults({ results, query, loading }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-gray-500">
          {query ? (
            <>
              <p className="text-lg mb-2">No results found for "{query}"</p>
              <p className="text-sm">Try adjusting your search terms or filters</p>
            </>
          ) : (
            <p>Enter a search query to find knowledge nodes</p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Found {results.length} result{results.length !== 1 ? 's' : ''}
        {query && ` for "${query}"`}
      </div>

      {/* Results List */}
      {results.map(({ node, score, relationshipType }) => (
        <SearchResultCard
          key={node.id}
          node={node}
          score={score}
          relationshipType={relationshipType}
          query={query}
        />
      ))}
    </div>
  );
}

interface SearchResultCardProps {
  node: KnowledgeNode;
  score: number;
  relationshipType: string;
  query?: string;
}

function SearchResultCard({
  node,
  score,
  relationshipType,
  query,
}: SearchResultCardProps) {
  const getRelevanceBadge = (relType: string) => {
    switch (relType) {
      case 'HIGHLY_RELATED_TO':
        return <Badge variant="success">Highly Relevant</Badge>;
      case 'RELATED_TO':
        return <Badge variant="default">Relevant</Badge>;
      case 'LOOSELY_RELATED_TO':
        return <Badge variant="secondary">Somewhat Relevant</Badge>;
      default:
        return null;
    }
  };

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case 'ADR':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'PRD':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'ContextModule':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const highlightText = (text: string, query?: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Extract first 200 characters of content
  const preview = node.content.slice(0, 200) + (node.content.length > 200 ? '...' : '');

  return (
    <Link href={`/discover/nodes/${node.id}`}>
      <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-gray-500 mt-1">
              {getNodeTypeIcon(node.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  {node.type}
                </Badge>
                {getRelevanceBadge(relationshipType)}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {node.title ? highlightText(node.title, query) : 'Untitled'}
              </h3>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {Math.round(score * 100)}% match
          </div>
        </div>

        {/* Content Preview */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-3">
          {highlightText(preview, query)}
        </p>

        {/* Tags */}
        {node.tags && node.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {node.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <span>Project: {node.projectId}</span>
          <span>Updated {new Date(node.updatedAt).toLocaleDateString()}</span>
        </div>
      </Card>
    </Link>
  );
}
