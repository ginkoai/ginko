/**
 * @fileType: page
 * @status: current
 * @updated: 2025-11-07
 * @tags: [discover, project, detail, knowledge-graph, task-027]
 * @related: [graphql-client.ts, TagCloud.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, react]
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TagCloud, TagData } from '@/components/discover/TagCloud';
import type { KnowledgeNode } from '@/lib/graphql-client';

interface ProjectDetails {
  id: string;
  name: string;
  description?: string;
  githubRepo?: string;
  knowledgeCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [selectedNodeType, setSelectedNodeType] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock data - replace with real API call
      const mockProject: ProjectDetails = {
        id: projectId,
        name: 'Ginko Knowledge Graph',
        description:
          'Git-native CLI for intelligent context management in AI-assisted development. Includes comprehensive documentation of architectural decisions, product requirements, and implementation patterns.',
        githubRepo: 'https://github.com/watchhill/ginko',
        knowledgeCount: 45,
        tags: ['cli', 'git', 'context-management', 'typescript', 'ai-tools'],
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockNodes: KnowledgeNode[] = [
        {
          id: 'adr_043',
          type: 'ADR',
          title: 'ADR-043: Event-Based Context Loading',
          content:
            'Decision to implement event-based context loading for sub-second CLI startup using cursor-based JSONL event streams.',
          status: 'active',
          tags: ['performance', 'context-loading', 'events'],
          projectId: projectId,
          userId: 'user_1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'adr_033',
          type: 'ADR',
          title: 'ADR-033: Context Pressure Mitigation',
          content:
            'Strategy for managing context pressure through defensive logging at optimal context pressure (20-80%).',
          status: 'active',
          tags: ['context', 'logging', 'session-management'],
          projectId: projectId,
          userId: 'user_1',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'prd_024',
          type: 'PRD',
          title: 'PRD-024: GraphQL API Implementation',
          content:
            'Product requirements for GraphQL API providing semantic search, graph traversal, and context-aware queries.',
          status: 'active',
          tags: ['graphql', 'api', 'knowledge-graph'],
          projectId: projectId,
          userId: 'user_1',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          updatedAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: 'adr_002',
          type: 'ADR',
          title: 'ADR-002: AI-Optimized File Discovery',
          content:
            'Standardized frontmatter for 70% faster context discovery using head -12 pattern.',
          status: 'active',
          tags: ['ai-optimization', 'file-discovery', 'frontmatter'],
          projectId: projectId,
          userId: 'user_1',
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          updatedAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ];

      const mockTags: TagData[] = [
        { tag: 'performance', count: 12 },
        { tag: 'context-loading', count: 8 },
        { tag: 'logging', count: 7 },
        { tag: 'graphql', count: 6 },
        { tag: 'api', count: 5 },
      ];

      setProject(mockProject);
      setNodes(mockNodes);
      setTags(mockTags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const filteredNodes =
    selectedNodeType === 'All'
      ? nodes
      : nodes.filter((n) => n.type === selectedNodeType);

  const nodeTypes = ['All', 'ADR', 'PRD', 'ContextModule'];
  const nodeCounts = {
    All: nodes.length,
    ADR: nodes.filter((n) => n.type === 'ADR').length,
    PRD: nodes.filter((n) => n.type === 'PRD').length,
    ContextModule: nodes.filter((n) => n.type === 'ContextModule').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-800 mb-4">{error || 'Project not found'}</p>
          <Link
            href="/discover"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to Discover
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

            {project.githubRepo && (
              <a
                href={project.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                View on GitHub
              </a>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {project.name}
          </h1>

          {project.description && (
            <p className="text-gray-600 mb-4 max-w-3xl">{project.description}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Knowledge Nodes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Node Type Filter */}
            <div className="flex items-center gap-2">
              {nodeTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedNodeType(type)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      selectedNodeType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }
                  `}
                >
                  {type} ({nodeCounts[type as keyof typeof nodeCounts]})
                </button>
              ))}
            </div>

            {/* Knowledge Nodes List */}
            <div className="space-y-4">
              {filteredNodes.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                  No {selectedNodeType !== 'All' ? selectedNodeType : ''} nodes found
                </Card>
              ) : (
                filteredNodes.map((node) => (
                  <Card key={node.id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge variant="secondary">{node.type}</Badge>
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">
                        {node.title || 'Untitled'}
                      </h3>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {node.content}
                    </p>

                    {node.tags && node.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {node.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                      Updated {new Date(node.updatedAt).toLocaleDateString()}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Stats & Tags */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Project Stats */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Project Stats
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {project.knowledgeCount}
                    </div>
                    <div className="text-sm text-gray-500">Total Nodes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {nodeCounts.ADR}
                    </div>
                    <div className="text-sm text-gray-500">ADRs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {nodeCounts.PRD}
                    </div>
                    <div className="text-sm text-gray-500">PRDs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {tags.length}
                    </div>
                    <div className="text-sm text-gray-500">Tags</div>
                  </div>
                </div>
              </Card>

              {/* Tag Cloud */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Popular Tags
                </h3>
                <TagCloud tags={tags} maxTags={10} />
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
