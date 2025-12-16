/**
 * @fileType: page
 * @status: current
 * @updated: 2025-12-11
 * @tags: [graph, visualization, dashboard, exploration]
 * @related: [tree-explorer.tsx, card-grid.tsx, node-detail-panel.tsx]
 * @priority: high
 * @complexity: high
 * @dependencies: [@tanstack/react-query, lucide-react]
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { TreeExplorer } from '@/components/graph/tree-explorer';
import { CardGrid } from '@/components/graph/card-grid';
import { NodeDetailPanel } from '@/components/graph/node-detail-panel';
import { useGraphNodes } from '@/lib/graph/hooks';
import { setDefaultGraphId } from '@/lib/graph/api-client';
import type { GraphNode } from '@/lib/graph/types';
import { useSupabase } from '@/components/providers';
import { cn } from '@/lib/utils';

// =============================================================================
// Config
// =============================================================================

// Default graph ID - in production this would come from user settings or env
const DEFAULT_GRAPH_ID = (process.env.NEXT_PUBLIC_GRAPH_ID || 'gin_1762125961056_dg4bsd').trim();

// =============================================================================
// Component
// =============================================================================

export default function GraphPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useSupabase();

  // Initialize graph ID
  useEffect(() => {
    setDefaultGraphId(DEFAULT_GRAPH_ID);
  }, []);

  // UI state
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    searchParams.get('node')
  );
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);

  // Fetch the selected node details when ID changes
  const { data: nodesData, isLoading: nodesLoading } = useGraphNodes({
    graphId: DEFAULT_GRAPH_ID,
    limit: 100,
  });

  // Update selected node when ID or data changes
  useEffect(() => {
    if (selectedNodeId && nodesData?.nodes) {
      const node = nodesData.nodes.find((n) => n.id === selectedNodeId);
      if (node) {
        setSelectedNode(node);
        setIsPanelOpen(true);
      }
    }
  }, [selectedNodeId, nodesData]);

  // Handle node selection from tree or grid
  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('node', nodeId);
    router.push(`/dashboard/graph?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Handle viewing node details (open panel)
  const handleViewDetails = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsPanelOpen(true);
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('node', nodeId);
    router.push(`/dashboard/graph?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Handle navigation in detail panel (clicking related node)
  const handleNavigate = useCallback((nodeId: string) => {
    // Add current node to breadcrumbs if we have one
    if (selectedNode) {
      const props = selectedNode.properties as Record<string, unknown>;
      const name = (props.title || props.name || selectedNode.id) as string;
      setBreadcrumbs((prev) => [...prev, { id: selectedNode.id, name }]);
    }
    handleSelectNode(nodeId);
  }, [selectedNode, handleSelectNode]);

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback((nodeId: string) => {
    // Remove breadcrumbs after clicked one
    setBreadcrumbs((prev) => {
      const index = prev.findIndex((b) => b.id === nodeId);
      return index >= 0 ? prev.slice(0, index) : prev;
    });
    handleSelectNode(nodeId);
  }, [handleSelectNode]);

  // Close detail panel
  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setBreadcrumbs([]);
  }, []);

  // Toggle tree collapse
  const handleToggleTree = useCallback(() => {
    setIsTreeCollapsed((prev) => !prev);
  }, []);

  // Auth check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center p-4">
        <h2 className="text-lg font-mono font-medium text-foreground mb-2">
          Sign in to explore the graph
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Access your knowledge graph to see ADRs, patterns, sprints, and more.
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
    <div className="flex h-[calc(100vh-4rem)] relative overflow-hidden">
      {/* Tree Explorer Sidebar */}
      <TreeExplorer
        graphId={DEFAULT_GRAPH_ID}
        selectedNodeId={selectedNodeId}
        onSelectNode={handleSelectNode}
        isCollapsed={isTreeCollapsed}
        onToggleCollapse={handleToggleTree}
      />

      {/* Main Content - Card Grid */}
      <div className="flex-1 flex flex-col relative">
        <CardGrid
          graphId={DEFAULT_GRAPH_ID}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          onViewDetails={handleViewDetails}
        />

        {/* Detail Panel (overlay) */}
        <NodeDetailPanel
          graphId={DEFAULT_GRAPH_ID}
          node={selectedNode}
          isOpen={isPanelOpen}
          onClose={handleClosePanel}
          onNavigate={handleNavigate}
          breadcrumbs={breadcrumbs}
          onBreadcrumbClick={handleBreadcrumbClick}
        />
      </div>
    </div>
  );
}
