/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-15
 * @tags: [graph, exports, barrel, editing]
 * @related: [tree-explorer.tsx, node-card.tsx, card-grid.tsx, NodeEditor.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

// Visualization components
export { TreeExplorer, type TreeExplorerProps } from './tree-explorer';
export { TreeNode, type TreeNodeProps } from './tree-node';
export { NodeCard, type NodeCardProps } from './node-card';
export { CardGrid, type CardGridProps } from './card-grid';
export { FilterBar, type FilterBarProps } from './filter-bar';
export { NodeDetailPanel, type NodeDetailPanelProps } from './node-detail-panel';
export { AdjacencyList, type AdjacencyListProps } from './adjacency-list';

// C4-style navigation components
export { SummaryCard, type SummaryCardProps } from './SummaryCard';
export { MetricsRow, type MetricsRowProps, type Metric } from './MetricsRow';
export { ProjectView, type ProjectViewProps } from './ProjectView';
export { CategoryView, type CategoryViewProps } from './CategoryView';
export { CondensedNodeCard, type CondensedNodeCardProps } from './CondensedNodeCard';
export { Breadcrumbs, type BreadcrumbsProps, type BreadcrumbItem } from './Breadcrumbs';
export { NodeView, type NodeViewProps } from './NodeView';
export { RelatedNodesSummary, type RelatedNodesSummaryProps } from './RelatedNodesSummary';

// Knowledge editing components
export { NodeEditor } from './NodeEditor';
export { NodeEditorForm } from './NodeEditorForm';
export { MarkdownEditor } from './MarkdownEditor';
export { UnsyncedBanner } from './UnsyncedBanner';
