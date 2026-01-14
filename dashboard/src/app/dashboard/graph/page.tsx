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

import { useState, useCallback, useEffect, useMemo, useRef, RefObject, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2, AlertCircle } from 'lucide-react';
import { TreeExplorer } from '@/components/graph/tree-explorer';
import { CardGrid } from '@/components/graph/card-grid';
import { NodeDetailPanel } from '@/components/graph/node-detail-panel';
import { ProjectView } from '@/components/graph/ProjectView';
import { CategoryView } from '@/components/graph/CategoryView';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/graph/Breadcrumbs';
import { NodeView } from '@/components/graph/NodeView';
import { ViewTransition, getTransitionDirection, type TransitionDirection, type ViewKey } from '@/components/graph/ViewTransition';
import { useGraphNodes } from '@/lib/graph/hooks';

// Lazy load the NodeEditorModal for performance (only loaded when editing)
const NodeEditorModal = dynamic(
  () => import('@/components/graph/NodeEditorModal').then((mod) => mod.NodeEditorModal),
  {
    loading: () => null, // Modal is hidden when closed, no loading indicator needed
    ssr: false, // No need for SSR on modal
  }
);
import { setDefaultGraphId, getNodeById } from '@/lib/graph/api-client';
import type { GraphNode, NodeLabel, TreeNode as TreeNodeType } from '@/lib/graph/types';
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
// NodeNotFound Component
// =============================================================================

interface NodeNotFoundProps {
  onBackToProject: () => void;
}

function NodeNotFound({ onBackToProject }: NodeNotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-destructive/10">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-xl font-mono font-semibold text-foreground mb-2">
        Node not found
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        The node you're looking for doesn't exist or was deleted. It may have been removed or the link is invalid.
      </p>
      <button
        onClick={onBackToProject}
        className="px-4 py-2 bg-ginko-500 text-black font-mono font-medium rounded-full hover:bg-ginko-400 transition-colors"
      >
        Back to Project
      </button>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

function GraphPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useSupabase();

  // Initialize graph ID
  useEffect(() => {
    setDefaultGraphId(DEFAULT_GRAPH_ID);
  }, []);

  // Check if we have URL params for deep linking
  const nodeParam = searchParams.get('node');
  const viewParam = searchParams.get('view');
  const typeParam = searchParams.get('type') as NodeLabel | null;

  // View mode state (C4-style navigation) - initialize from URL params
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (nodeParam) return 'detail';
    if (viewParam === 'category') return 'category';
    return 'project';
  });
  const [selectedCategory, setSelectedCategory] = useState<NodeLabel | null>(typeParam);

  // Track if initial URL params have been processed
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);

  // Sync state from URL params (handles deep links and initial render)
  useEffect(() => {
    if (nodeParam && !urlParamsProcessed) {
      setSelectedNodeId(nodeParam);
      setViewMode('detail');
      setUrlParamsProcessed(true);
    } else if (viewParam === 'category' && typeParam && !urlParamsProcessed) {
      setSelectedCategory(typeParam);
      setViewMode('category');
      setUrlParamsProcessed(true);
    } else if (!nodeParam && !viewParam && !urlParamsProcessed) {
      setUrlParamsProcessed(true);
    }
  }, [searchParams, nodeParam, viewParam, typeParam, urlParamsProcessed]);

  // Track navigation direction for transitions
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('forward');
  const previousViewRef = useRef<ViewMode>(viewMode);

  // Ref for scrolling content to top on navigation
  const contentRef = useRef<HTMLDivElement>(null);

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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodeParam);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);

  // Edit modal state
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Track if we're fetching a node by ID (for deep links)
  const [isFetchingNode, setIsFetchingNode] = useState(false);

  // Fetch the selected node details when ID changes
  const { data: nodesData, isLoading: nodesLoading } = useGraphNodes({
    graphId: DEFAULT_GRAPH_ID,
    limit: 100,
  });

  // Update selected node when ID or data changes
  // Note: This effect handles nodes from the 100-node cache first,
  // then fetches directly if not found (for deep links to nodes outside cache)
  useEffect(() => {
    if (selectedNodeId && nodesData?.nodes) {
      const node = nodesData.nodes.find((n) => n.id === selectedNodeId);
      if (node) {
        setSelectedNode(node);
        setIsPanelOpen(true);
        setIsFetchingNode(false);
      } else if ((!selectedNode || selectedNode.id !== selectedNodeId) && !isFetchingNode) {
        // Node not in cache - fetch it directly (for deep links or parent navigation)
        setIsFetchingNode(true);
        getNodeById(selectedNodeId, { graphId: DEFAULT_GRAPH_ID })
          .then(node => {
            if (node) {
              setSelectedNode(node);
              setIsPanelOpen(true);
            }
          })
          .catch(console.error)
          .finally(() => setIsFetchingNode(false));
      }
    }
  }, [selectedNodeId, nodesData, selectedNode, isFetchingNode]);

  // Clean up stale breadcrumbs when nodes data changes
  useEffect(() => {
    if (nodesData?.nodes && breadcrumbs.length > 0) {
      setBreadcrumbs((prev) =>
        prev.filter((crumb) => nodesData.nodes?.some((n) => n.id === crumb.id))
      );
    }
  }, [nodesData, breadcrumbs.length]);

  // Scroll content to top when selected node changes
  useEffect(() => {
    if (selectedNodeId && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [selectedNodeId]);

  // Handle node selection from tree or grid
  const handleSelectNode = useCallback((nodeId: string, treeNode?: TreeNodeType) => {
    setSelectedNodeId(nodeId);

    // If tree node data is provided and has properties, use it directly
    // This handles cases where the node isn't in the limited nodesData fetch
    if (treeNode && treeNode.properties && !nodeId.endsWith('-folder')) {
      const graphNode: GraphNode = {
        id: treeNode.id,
        label: treeNode.label,
        properties: treeNode.properties,
      };
      setSelectedNode(graphNode);
      setIsPanelOpen(true);
    }

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('node', nodeId);
    router.push(`/dashboard/graph?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Handle viewing node details (open panel)
  const handleViewDetails = useCallback((nodeId: string, nodeData?: GraphNode) => {
    setSelectedNodeId(nodeId);
    // Use provided node data directly (from CategoryView) to avoid lookup failures
    if (nodeData) {
      setSelectedNode(nodeData);
    }
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
    // Add current node to breadcrumbs if we have one and it's not already the last item
    if (selectedNode) {
      const props = selectedNode.properties as Record<string, unknown>;
      const name = (props.title || props.name || selectedNode.id) as string;
      setBreadcrumbs((prev) => {
        // Don't add duplicate if it's already the last breadcrumb
        if (prev.length > 0 && prev[prev.length - 1].id === selectedNode.id) {
          return prev;
        }
        return [...prev, { id: selectedNode.id, name }];
      });
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
  const handleEditNode = useCallback((nodeId: string, nodeData?: GraphNode) => {
    // Use provided node data or fall back to lookup
    const node = nodeData || nodesData?.nodes?.find((n) => n.id === nodeId) || selectedNode;
    if (node) {
      setEditingNode(node);
      setIsEditModalOpen(true);
    }
  }, [nodesData, selectedNode]);

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
    setBreadcrumbs([]); // Clear breadcrumbs when going back to category view
    // Update URL
    const params = new URLSearchParams();
    params.set('view', 'category');
    params.set('type', label);
    router.push(`/dashboard/graph?${params.toString()}`, { scroll: false });
  }, [router, navigateToView]);

  // Build breadcrumb items based on current navigation state + history
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

    // Add accumulated node breadcrumbs from navigation history
    // Filter out stale breadcrumbs (nodes that no longer exist)
    breadcrumbs.forEach((crumb) => {
      const historyNode = nodesData?.nodes?.find((n) => n.id === crumb.id);
      if (historyNode) {
        items.push({
          type: 'node',
          label: crumb.name,
          nodeLabel: historyNode.label,
          nodeId: crumb.id,
        });
      }
    });

    // Add current node
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
  }, [selectedCategory, selectedNode, isPanelOpen, breadcrumbs, nodesData]);

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback((item: BreadcrumbItem, index: number) => {
    if (item.type === 'project') {
      handleGoToProject();
    } else if (item.type === 'category' && item.nodeLabel) {
      handleGoToCategory(item.nodeLabel);
    } else if (item.type === 'node' && item.nodeId) {
      // Navigate to a node in history - trim breadcrumbs after this point
      handleBreadcrumbClick(item.nodeId);
    }
  }, [handleGoToProject, handleGoToCategory, handleBreadcrumbClick]);

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
          <div
            ref={contentRef}
            className="h-full overflow-auto"
          >
          <ViewTransition
            viewKey={isPanelOpen ? 'detail' : viewMode as ViewKey}
            direction={transitionDirection}
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

            {/* Show NodeNotFound only for truly invalid node IDs (from URL) */}
            {/* Don't show if isPanelOpen - node was set via handleViewDetails */}
            {/* Don't show while fetching node by ID */}
            {selectedNodeId && !selectedNode && !nodesLoading && !isFetchingNode && !isPanelOpen && viewMode === 'detail' && (
              <NodeNotFound onBackToProject={handleGoToProject} />
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

// Wrap with Suspense for useSearchParams (Next.js requirement)
export default function GraphPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    }>
      <GraphPageContent />
    </Suspense>
  );
}
