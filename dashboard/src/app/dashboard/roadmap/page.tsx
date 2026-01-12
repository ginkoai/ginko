/**
 * @fileType: page
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, dashboard, now-next-later, ADR-056, priority]
 * @related: [RoadmapCanvas.tsx, graph/page.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [@tanstack/react-query]
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { RoadmapCanvas } from '@/components/roadmap';
import { setDefaultGraphId } from '@/lib/graph/api-client';
import { useSupabase } from '@/components/providers';

// =============================================================================
// Config
// =============================================================================

const DEFAULT_GRAPH_ID = (process.env.NEXT_PUBLIC_GRAPH_ID || 'gin_1762125961056_dg4bsd').trim();

// =============================================================================
// Component
// =============================================================================

export default function RoadmapPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabase();

  // Initialize graph ID
  useEffect(() => {
    setDefaultGraphId(DEFAULT_GRAPH_ID);
  }, []);

  // Handle epic selection (navigate to graph detail view)
  const handleEpicSelect = (epicId: string) => {
    router.push(`/dashboard/graph?node=${epicId}`);
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // Auth required
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-4">
        <h2 className="text-lg font-mono font-medium text-foreground mb-2">
          Sign in to view the roadmap
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Access your product roadmap to see committed and proposed work.
        </p>
        <a
          href="/auth/login"
          className="px-4 py-2 bg-ginko-500 text-black font-mono font-medium rounded-full hover:bg-ginko-400 transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] -mx-6 -my-6">
      <RoadmapCanvas
        graphId={DEFAULT_GRAPH_ID}
        onEpicSelect={handleEpicSelect}
      />
    </div>
  );
}
