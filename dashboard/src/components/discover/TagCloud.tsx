/**
 * @fileType: component
 * @status: current
 * @updated: 2025-11-07
 * @tags: [ui, discover, tags, cloud, interactive, task-027]
 * @related: [ProjectCard.tsx, discover/page.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react]
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export interface TagData {
  tag: string;
  count: number;
}

export interface TagCloudProps {
  tags: TagData[];
  onTagClick?: (tag: string) => void;
  selectedTags?: string[];
  maxTags?: number;
}

export function TagCloud({
  tags,
  onTagClick,
  selectedTags = [],
  maxTags = 20,
}: TagCloudProps) {
  const [expanded, setExpanded] = useState(false);

  // Sort by count and limit
  const sortedTags = [...tags]
    .sort((a, b) => b.count - a.count)
    .slice(0, expanded ? tags.length : maxTags);

  // Calculate size based on frequency
  const maxCount = Math.max(...sortedTags.map(t => t.count), 1);
  const minCount = Math.min(...sortedTags.map(t => t.count), 1);

  const getTagSize = (count: number): string => {
    if (maxCount === minCount) return 'text-sm';

    const normalized = (count - minCount) / (maxCount - minCount);

    if (normalized > 0.8) return 'text-lg';
    if (normalized > 0.6) return 'text-base';
    if (normalized > 0.4) return 'text-sm';
    return 'text-xs';
  };

  const isSelected = (tag: string) => selectedTags.includes(tag);

  if (tags.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No tags available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tag Cloud */}
      <div className="flex flex-wrap gap-2">
        {sortedTags.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => onTagClick?.(tag)}
            className={`
              inline-flex items-center gap-1 px-3 py-1.5 rounded-full
              transition-all duration-200
              ${getTagSize(count)}
              ${
                isSelected(tag)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              ${onTagClick ? 'cursor-pointer' : 'cursor-default'}
            `}
          >
            <span className="font-medium">{tag}</span>
            <span className={`
              text-xs
              ${isSelected(tag) ? 'text-blue-200' : 'text-gray-500'}
            `}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Show More/Less */}
      {tags.length > maxTags && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {expanded ? 'Show Less' : `Show ${tags.length - maxTags} More Tags`}
        </button>
      )}

      {/* Selected Tags Summary */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
          <span className="text-sm text-gray-600">Active filters:</span>
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="default" className="gap-1">
              {tag}
              {onTagClick && (
                <button
                  onClick={() => onTagClick(tag)}
                  className="ml-1 hover:text-white"
                >
                  ×
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
