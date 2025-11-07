/**
 * @fileType: component
 * @status: current
 * @updated: 2025-11-07
 * @tags: [ui, discover, trending, projects, task-027]
 * @related: [ProjectCard.tsx, discover/page.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react]
 */

'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface TrendingProject {
  id: string;
  name: string;
  knowledgeCount: number;
  recentActivity: string;
  tags?: string[];
}

export interface TrendingProjectsProps {
  projects: TrendingProject[];
  title?: string;
  loading?: boolean;
}

export function TrendingProjects({
  projects,
  title = 'Trending Projects',
  loading,
}: TrendingProjectsProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-8">
          No trending projects yet
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      <div className="space-y-4">
        {projects.map((project, index) => (
          <Link
            key={project.id}
            href={`/discover/projects/${project.id}`}
            className="block group"
          >
            <div className="flex items-start gap-3 hover:bg-gray-50 p-3 rounded-lg transition-colors">
              {/* Rank Number */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                {index + 1}
              </div>

              {/* Project Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 group-hover:text-blue-600 truncate">
                    {project.name}
                  </h4>
                  {index === 0 && (
                    <Badge variant="warning" className="text-xs flex-shrink-0">
                      Hot
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
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
                    {project.knowledgeCount} nodes
                  </span>
                  <span>•</span>
                  <span>{project.recentActivity}</span>
                </div>

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {project.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Arrow Icon */}
              <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors">
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View All Link */}
      {projects.length >= 5 && (
        <Link
          href="/discover"
          className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium mt-4 pt-4 border-t border-gray-100"
        >
          View All Projects
        </Link>
      )}
    </Card>
  );
}
