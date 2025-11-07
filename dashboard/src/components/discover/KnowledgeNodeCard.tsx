/**
 * @fileType: component
 * @status: current
 * @updated: 2025-11-07
 * @tags: [ui, discover, knowledge, node, card, task-027]
 * @related: [SearchResults.tsx, projects/[id]/page.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react]
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { KnowledgeNode } from '@/lib/graphql-client';

export interface KnowledgeNodeCardProps {
  node: KnowledgeNode;
  showProject?: boolean;
}

export function KnowledgeNodeCard({
  node,
  showProject = false,
}: KnowledgeNodeCardProps) {
  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case 'ADR':
        return (
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case 'PRD':
        return (
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        );
      case 'ContextModule':
        return (
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
    }
  };

  const preview =
    node.content.slice(0, 150) + (node.content.length > 150 ? '...' : '');

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {getNodeTypeIcon(node.type)}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              {node.type}
            </Badge>
            <Badge
              variant={
                node.status === 'active'
                  ? 'success'
                  : node.status === 'draft'
                  ? 'warning'
                  : 'secondary'
              }
              className="text-xs"
            >
              {node.status}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {node.title || 'Untitled'}
          </h3>
        </div>
      </div>

      {/* Content Preview */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-3">{preview}</p>

      {/* Tags */}
      {node.tags && node.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {node.tags.slice(0, 5).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {node.tags.length > 5 && (
            <Badge variant="secondary" className="text-xs">
              +{node.tags.length - 5} more
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        {showProject && <span>Project: {node.projectId}</span>}
        <span className={showProject ? '' : 'ml-auto'}>
          Updated {new Date(node.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </Card>
  );
}
