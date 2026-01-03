/**
 * @fileType: model
 * @status: current
 * @updated: 2025-12-11
 * @tags: [graph, types, visualization, neo4j]
 * @related: [api-client.ts, hooks.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

// =============================================================================
// Node Types
// =============================================================================

/** All supported node labels in the knowledge graph */
export type NodeLabel =
  | 'Project'
  | 'Charter'
  | 'Epic'
  | 'Sprint'
  | 'Task'
  | 'ADR'
  | 'PRD'
  | 'Pattern'
  | 'Gotcha'
  | 'Principle'
  | 'Event'
  | 'Session'
  | 'Commit'
  | 'Team'
  | 'Membership'
  | 'Invitation';

/** Base properties all nodes share */
export interface BaseNodeProperties {
  id: string;
  graph_id: string;
  created_at: string;
  updated_at?: string;
}

/** Project node - root of the hierarchy */
export interface ProjectNode extends BaseNodeProperties {
  name: string;
  description?: string;
}

/** Charter node - project purpose and goals */
export interface CharterNode extends BaseNodeProperties {
  title: string;
  purpose?: string;
  goals?: string[];
  success_criteria?: string[];
}

/** Epic node - large feature grouping */
export interface EpicNode extends BaseNodeProperties {
  epic_id: string;
  title: string;
  description?: string;
  status: 'planning' | 'active' | 'complete' | 'on-hold';
}

/** Sprint node - time-boxed work period */
export interface SprintNode extends BaseNodeProperties {
  sprint_id: string;
  title: string;
  goal?: string;
  status: 'planning' | 'active' | 'complete';
  progress?: number;
  start_date?: string;
  end_date?: string;
}

/** Task node - individual work item */
export interface TaskNode extends BaseNodeProperties {
  task_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'paused' | 'complete';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
}

/** ADR node - architecture decision record */
export interface ADRNode extends BaseNodeProperties {
  adr_id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  summary?: string;
  decision?: string;
  consequences?: string;
}

/** PRD node - product requirements document */
export interface PRDNode extends BaseNodeProperties {
  prd_id: string;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  summary?: string;
}

/** Pattern node - reusable solution */
export interface PatternNode extends BaseNodeProperties {
  pattern_id: string;
  name: string;
  description?: string;
  confidence: 'low' | 'medium' | 'high';
  usage_count?: number;
}

/** Gotcha node - known pitfall or warning */
export interface GotchaNode extends BaseNodeProperties {
  gotcha_id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation?: string;
}

/** Principle node - guiding development principle */
export interface PrincipleNode extends BaseNodeProperties {
  principle_id: string;
  name: string;
  theory: string;
  type: 'standard' | 'custom';
  status: 'active' | 'deprecated';
  source?: string;
  related_patterns?: string[];
  related_adrs?: string[];
  version?: string;
}

/** Event node - session activity */
export interface EventNode extends BaseNodeProperties {
  event_id: string;
  category: 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';
  description: string;
  user_id?: string;
  impact?: 'low' | 'medium' | 'high';
  files?: string[];
}

/** Team node - collaboration workspace */
export interface TeamNode extends BaseNodeProperties {
  name: string;
  description?: string;
  created_by: string;
  member_count?: number;
}

/** Membership node - user's membership in a team */
export interface MembershipNode extends BaseNodeProperties {
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'inactive' | 'suspended';
  joined_at: string;
  last_active_at?: string;
  invited_by?: string;
}

/** Invitation node - pending team invitation */
export interface InvitationNode extends BaseNodeProperties {
  code: string;
  team_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  inviter_id: string;
  accepted_at?: string;
  accepted_by?: string;
}

/** Union type for all node property types */
export type NodeProperties =
  | ProjectNode
  | CharterNode
  | EpicNode
  | SprintNode
  | TaskNode
  | ADRNode
  | PRDNode
  | PatternNode
  | GotchaNode
  | PrincipleNode
  | EventNode
  | TeamNode
  | MembershipNode
  | InvitationNode;

/** Generic graph node with label and properties */
export interface GraphNode<T extends NodeProperties = NodeProperties> {
  id: string;
  label: NodeLabel;
  properties: T;
}

// =============================================================================
// Relationship Types
// =============================================================================

/** All supported relationship types */
export type RelationshipType =
  | 'BELONGS_TO'
  | 'CONTAINS'
  | 'IMPLEMENTS'
  | 'REFERENCES'
  | 'NEXT'
  | 'MENTIONS'
  | 'RELATED_TO'
  | 'PARENT_OF'
  | 'CHILD_OF'
  | 'MEMBER_OF'
  | 'INVITES_TO'
  | 'INVITED_BY';

/** Graph relationship between nodes */
export interface GraphRelationship {
  id: string;
  type: RelationshipType;
  startNodeId: string;
  endNodeId: string;
  properties?: Record<string, unknown>;
}

// =============================================================================
// API Response Types
// =============================================================================

/** Response from listing nodes */
export interface ListNodesResponse {
  nodes: GraphNode[];
  total: number;
  limit: number;
  offset: number;
}

/** Response from semantic search */
export interface QueryResponse {
  results: Array<{
    node: GraphNode;
    score: number;
  }>;
  query: string;
  total: number;
}

/** Response from graph status endpoint */
export interface GraphStatusResponse {
  namespace: string;
  graphId: string;
  visibility: 'private' | 'organization' | 'public';
  nodes: {
    total: number;
    byType: Record<string, number>;
    withEmbeddings: number;
  };
  relationships: {
    total: number;
    byType: Record<string, number>;
  };
  lastSync: string;
  health: string;
  stats?: {
    averageConnections: number;
    mostConnected: {
      id: string;
      connections: number;
    };
  };
}

/** Adjacency node with relationship info */
export interface AdjacentNode {
  node: GraphNode;
  relationship: {
    type: RelationshipType;
    direction: 'incoming' | 'outgoing';
    properties?: Record<string, unknown>;
  };
}

/** Response from adjacencies endpoint */
export interface AdjacenciesResponse {
  sourceNode: GraphNode;
  adjacencies: AdjacentNode[];
  total: number;
}

// =============================================================================
// Tree View Types
// =============================================================================

/** Node hierarchy for tree view */
export interface TreeNode {
  id: string;
  label: NodeLabel;
  name: string;
  children?: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
  hasChildren?: boolean;
  properties?: NodeProperties;
}

/** Tree structure root */
export interface TreeRoot {
  project: TreeNode;
}

// =============================================================================
// UI State Types
// =============================================================================

/** Filter options for card grid */
export interface NodeFilters {
  labels?: NodeLabel[];
  search?: string;
  sortBy?: 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

/** View mode for graph page */
export type ViewMode = 'grid' | 'detail';

/** Selection state */
export interface SelectionState {
  selectedNodeId: string | null;
  viewMode: ViewMode;
  filters: NodeFilters;
}
