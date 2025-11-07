/**
 * @fileType: page
 * @status: current
 * @updated: 2025-11-07
 * @tags: [discover, catalog, public, knowledge-graph, task-027]
 * @related: [ProjectCard.tsx, TagCloud.tsx, TrendingProjects.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, react]
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProjectCard, ProjectCardProps } from '@/components/discover/ProjectCard';
import { TagCloud, TagData } from '@/components/discover/TagCloud';
import { TrendingProjects, TrendingProject } from '@/components/discover/TrendingProjects';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function DiscoverPage() {
  const [projects, setProjects] = useState<ProjectCardProps[]>([]);
  const [trendingProjects, setTrendingProjects] = useState<TrendingProject[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [selectedTags]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call to fetch public projects
      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock data - replace with real API call
      const mockProjects: ProjectCardProps[] = [
        {
          id: 'proj_1',
          name: 'Ginko Knowledge Graph',
          description: 'Git-native CLI for intelligent context management in AI-assisted development. Includes ADRs for event-based loading, session management, and MCP integration.',
          githubRepo: 'https://github.com/watchhill/ginko',
          knowledgeCount: 45,
          tags: ['cli', 'git', 'context-management', 'typescript'],
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'proj_2',
          name: 'React Architecture Decisions',
          description: 'Collection of ADRs documenting React best practices, patterns, and architectural decisions for large-scale applications.',
          githubRepo: 'https://github.com/example/react-adrs',
          knowledgeCount: 32,
          tags: ['react', 'frontend', 'architecture', 'javascript'],
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'proj_3',
          name: 'Microservices Platform',
          description: 'Documentation and decisions for a cloud-native microservices platform built with Kubernetes and Go.',
          githubRepo: 'https://github.com/example/microservices',
          knowledgeCount: 67,
          tags: ['microservices', 'kubernetes', 'go', 'cloud'],
          updatedAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ];

      const mockTrending: TrendingProject[] = [
        {
          id: 'proj_1',
          name: 'Ginko Knowledge Graph',
          knowledgeCount: 45,
          recentActivity: 'Updated 2 hours ago',
          tags: ['cli', 'git'],
        },
        {
          id: 'proj_3',
          name: 'Microservices Platform',
          knowledgeCount: 67,
          recentActivity: 'Updated yesterday',
          tags: ['kubernetes', 'cloud'],
        },
        {
          id: 'proj_2',
          name: 'React Architecture Decisions',
          knowledgeCount: 32,
          recentActivity: 'Updated 2 days ago',
          tags: ['react', 'frontend'],
        },
      ];

      const mockTags: TagData[] = [
        { tag: 'cli', count: 45 },
        { tag: 'git', count: 38 },
        { tag: 'react', count: 32 },
        { tag: 'kubernetes', count: 28 },
        { tag: 'typescript', count: 25 },
        { tag: 'architecture', count: 22 },
        { tag: 'frontend', count: 20 },
        { tag: 'microservices', count: 18 },
        { tag: 'cloud', count: 15 },
        { tag: 'context-management', count: 12 },
      ];

      // Filter by selected tags
      const filteredProjects =
        selectedTags.length > 0
          ? mockProjects.filter((p) =>
              p.tags?.some((tag) => selectedTags.includes(tag))
            )
          : mockProjects;

      setProjects(filteredProjects);
      setTrendingProjects(mockTrending);
      setTags(mockTags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Discover Knowledge Graphs
              </h1>
              <p className="text-gray-600 mt-2">
                Explore public OSS knowledge graphs, ADRs, and architectural decisions
              </p>
            </div>
            <Link
              href="/discover/search"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search Knowledge
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Projects */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tag Cloud */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Popular Tags
              </h2>
              <TagCloud
                tags={tags}
                onTagClick={handleTagClick}
                selectedTags={selectedTags}
              />
            </div>

            {/* Projects Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={loadProjects}
                  className="mt-4 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedTags.length > 0 ? 'Filtered Projects' : 'All Projects'}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {projects.length} project{projects.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} {...project} />
                  ))}
                </div>

                {projects.length === 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <p className="text-gray-500">
                      No projects found with the selected tags
                    </p>
                    <button
                      onClick={() => setSelectedTags([])}
                      className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column: Trending */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <TrendingProjects projects={trendingProjects} loading={loading} />

              {/* Stats Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Community Stats
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {projects.length}
                    </div>
                    <div className="text-sm text-gray-500">Public Projects</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {projects.reduce((sum, p) => sum + (p.knowledgeCount || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-500">Knowledge Nodes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {tags.length}
                    </div>
                    <div className="text-sm text-gray-500">Tags</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
