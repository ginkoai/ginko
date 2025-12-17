/**
 * @fileType: page
 * @status: current
 * @updated: 2025-12-17
 * @tags: [graph, visualization, dashboard, exploration, c4-navigation]
 * @related: [tree-explorer.tsx, card-grid.tsx, node-detail-panel.tsx, ProjectView.tsx]
 * @priority: high
 * @complexity: high
 * @dependencies: [@tanstack/react-query, lucide-react]
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { TreeExplorer } from '@/components/graph/tree-explorer';
import { CardGrid } from '@/components/graph/card-grid';
import { NodeDetailPanel } from '@/components/graph/node-detail-panel';
import { ProjectView } from '@/components/graph/ProjectView';
import { CategoryView } from '@/components/graph/CategoryView';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/graph/Breadcrumbs';
import { NodeView } from '@/components/graph/NodeView';
import { ViewTransition, getTransitionDirection, type TransitionDirection, type ViewKey } from '@/components/graph/ViewTransition';
import { NodeEditorModal } from '@/components/graph/NodeEditorModal';
import { useGraphNodes } from '@/lib/graph/hooks';
import { setDefaultGraphId } from '@/lib/graph/api-client';
import type { GraphNode, NodeLabel } from '@/lib/graph/types';
import { useSupabase } from '@/components/providers';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

type ViewMode = 'project' | 'category' | 'detail';

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

  // View mode state (C4-style navigation)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Initialize from URL params
    const view = searchParams.get('view');
    if (view === 'category') return 'category';
    if (searchParams.get('node')) return 'detail';
    return 'project';
  });
  const [selectedCategory, setSelectedCategory] = useState<NodeLabel | null>(
    searchParams.get('type') as NodeLabel | null
  );

  // Track navigation direction for transitions
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('forward');
  const previousViewRef = useRef<ViewMode>(viewMode);

  // Helper to change view with direction tracking
  const navigateToView = useCallback((newView: ViewMode) => {
    const direction = getTransitionDirection(previousViewRef.current as ViewKey, newView as ViewKey);
    setTransitionDirection(direction);
    previousViewRef.current = newView;
    setViewMode(newView);
  }, []);

  // UI state
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    searchParams.get('node')
  );
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);

  // Edit modal state
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    // Track direction for transition (forward into detail)
    setTransitionDirection('forward');
    previousViewRef.current = 'detail';
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

  // Handle edit node (open modal)
  const handleEditNode = useCallback((nodeId: string) => {
    const node = nodesData?.nodes?.find((n) => n.id === nodeId);
    if (node) {
      setEditingNode(node);
      setIsEditModalOpen(true);
    }
  }, [nodesData]);

  // Handle save from edit modal
  const handleEditSave = useCallback((updatedNode: GraphNode) => {
    // Update local state if this is the selected node
    if (selectedNode?.id === updatedNode.id) {
      setSelectedNode(updatedNode);
    }
    // Note: React Query will refetch on next navigation
  }, [selectedNode]);

  // Close detail panel
  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setBreadcrumbs([]);
    // Return to previous view
    if (selectedCategory) {
      navigateToView('category');
    } else {
      navigateToView('project');
    }
  }, [selectedCategory, navigateToView]);

  // Toggle tree collapse
  const handleToggleTree = useCallback(() => {
    setIsTreeCollapsed((prev) => !prev);
  }, []);

  // Handle category selection from ProjectView
  const handleSelectCategory = useCallback((label: NodeLabel) => {
    setSelectedCategory(label);
    navigateToView('category');
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'category');
    params.set('type', label);
    params.delete('node');
    router.push(`/dashboard/graph?${params.toString()}`, { scroll: false });
  }, [router, searchParams, navigateToView]);

  // Handle going back to project view
  const handleGoToProject = useCallback(() => {
    navigateToView('project');
    setSelectedCategory(null);
    setSelectedNodeId(null);
    setSelectedNode(null);
    setIsPanelOpen(false);
    setBreadcrumbs([]);
    // Update URL
    router.push('/dashboard/graph', { scroll: false });
  }, [router, navigateToView]);

  // Handle going to category view
  const handleGoToCategory = useCallback((label: NodeLabel) => {
    navigateToView('category');
    setSelectedCategory(label);
    setSelectedNodeId(null);
    setSelectedNode(null);
    setIsPanelOpen(false);
    // Update URL
    const params = new URLSearchParams();
    params.set('view', 'category');
    params.set('type', label);
    router.push(`/dashboard/graph?${params.toString()}`, { scroll: false });
  }, [router, navigateToView]);

  // Build breadcrumb items based on current navigation state
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { type: 'project', label: 'Project' },
    ];

    if (selectedCategory) {
      items.push({
        type: 'category',
        label: `${selectedCategory}s`,
        nodeLabel: selectedCategory,
      });
    }

    if (selectedNode && isPanelOpen) {
      const props = selectedNode.properties as Record<string, unknown>;
      const title = (props.title || props.name || props.adr_id || props.task_id || selectedNode.id) as string;
      items.push({
        type: 'node',
        label: title,
        nodeLabel: selectedNode.label,
        nodeId: selectedNode.id,
      });
    }

    return items;
  }, [selectedCategory, selectedNode, isPanelOpen]);

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback((item: BreadcrumbItem, index: number) => {
    if (item.type === 'project') {
      handleGoToProject();
    } else if (item.type === 'category' && item.nodeLabel) {
      handleGoToCategory(item.nodeLabel);
    }
    // Node breadcrumbs are the current item, no navigation needed
  }, [handleGoToProject, handleGoToCategory]);

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

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Breadcrumb Navigation */}
        {(viewMode !== 'project' || isPanelOpen) && (
          <Breadcrumbs
            items={breadcrumbItems}
            onNavigate={handleBreadcrumbNavigate}
          />
        )}

        {/* View Content with Transitions */}
        <div className="flex-1 overflow-hidden">
          <ViewTransition
            viewKey={isPanelOpen ? 'detail' : viewMode as ViewKey}
            direction={transitionDirection}
            className="h-full overflow-auto"
          >
            {viewMode === 'project' && !isPanelOpen && (
              <ProjectView
                graphId={DEFAULT_GRAPH_ID}
                onSelectCategory={handleSelectCategory}
              />
            )}

            {viewMode === 'category' && selectedCategory && !isPanelOpen && (
              <CategoryView
                graphId={DEFAULT_GRAPH_ID}
                label={selectedCategory}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
                onViewDetails={handleViewDetails}
                onEdit={handleEditNode}
              />
            )}

            {/* Full-page NodeView when panel is open */}
            {isPanelOpen && selectedNode && (
              <NodeView
                graphId={DEFAULT_GRAPH_ID}
                node={selectedNode}
                onNavigate={handleNavigate}
                onEdit={handleEditNode}
              />
            )}
          </ViewTransition>
        </div>

        {/* Detail Panel (overlay) - hidden when NodeView is shown in main area */}
        {/* Can be toggled back for mobile/quick-view in future */}
        <NodeDetailPanel
          graphId={DEFAULT_GRAPH_ID}
          node={selectedNode}
          isOpen={false} // Disabled - using NodeView instead
          onClose={handleClosePanel}
          onNavigate={handleNavigate}
          breadcrumbs={breadcrumbs}
          onBreadcrumbClick={handleBreadcrumbClick}
        />
      </div>

      {/* Edit Node Modal */}
      <NodeEditorModal
        node={editingNode}
        graphId={DEFAULT_GRAPH_ID}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={handleEditSave}
      />
    </div>
  );
}
