/**
 * @fileType: model
 * @status: current
 * @updated: 2025-12-15
 * @tags: [validation, schemas, knowledge-nodes, forms]
 * @related: [graph/types.ts, NodeEditor.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import type { NodeLabel } from './graph/types';

// =============================================================================
// Common Field Types
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'markdown';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  helperText?: string;
  readOnly?: boolean;
}

// =============================================================================
// Node Type Schemas
// =============================================================================

export interface NodeSchema {
  type: NodeLabel;
  displayName: string;
  fields: FieldConfig[];
  validate: (data: Record<string, any>) => ValidationResult;
  getFilePath: (data: Record<string, any>) => string;
}

// ADR Schema
// Note: ADRs synced from git have a single 'content' field with full markdown.
// This schema uses 'content' to match how ADRs are stored in the graph.
export const ADR_SCHEMA: NodeSchema = {
  type: 'ADR',
  displayName: 'Architecture Decision Record',
  fields: [
    {
      name: 'adr_id',
      label: 'ADR ID',
      type: 'text',
      required: true,
      placeholder: 'ADR-055',
      helperText: 'Format: ADR-XXX (e.g., ADR-055)',
      readOnly: true,
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Brief, descriptive title',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'proposed', label: 'Proposed' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'deprecated', label: 'Deprecated' },
        { value: 'superseded', label: 'Superseded' },
        { value: 'active', label: 'Active' },
        { value: 'draft', label: 'Draft' },
      ],
    },
    {
      name: 'content',
      label: 'Content',
      type: 'markdown',
      required: true,
      placeholder: '## Context\n\nDescribe the context...\n\n## Decision\n\nWhat was decided...\n\n## Consequences\n\nList consequences...',
      helperText: 'Full ADR content in markdown format (Context, Decision, Consequences sections)',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.adr_id || !data.adr_id.match(/^ADR-\d{3}$/)) {
      errors.push('ADR ID must follow format: ADR-XXX (e.g., ADR-055)');
    }

    if (!data.title || data.title.trim().length < 5) {
      errors.push('Title must be at least 5 characters');
    }

    if (!data.status) {
      errors.push('Status is required');
    }

    if (!data.content || data.content.trim().length < 50) {
      errors.push('Content must be at least 50 characters');
    }

    return { valid: errors.length === 0, errors };
  },
  getFilePath: (data) => {
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `docs/adr/${data.adr_id}-${slug}.md`;
  },
};

// PRD Schema
export const PRD_SCHEMA: NodeSchema = {
  type: 'PRD',
  displayName: 'Product Requirements Document',
  fields: [
    {
      name: 'prd_id',
      label: 'PRD ID',
      type: 'text',
      required: true,
      placeholder: 'PRD-001',
      helperText: 'Format: PRD-XXX (e.g., PRD-001)',
      readOnly: true,
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Feature or product name',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'review', label: 'In Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'archived', label: 'Archived' },
      ],
    },
    {
      name: 'overview',
      label: 'Overview',
      type: 'markdown',
      required: true,
      placeholder: 'What is this feature/product about?',
      helperText: 'High-level description of the feature',
    },
    {
      name: 'requirements',
      label: 'Requirements',
      type: 'markdown',
      required: true,
      placeholder: 'Functional and non-functional requirements',
      helperText: 'List all requirements, user stories, and acceptance criteria',
    },
    {
      name: 'success_criteria',
      label: 'Success Criteria',
      type: 'markdown',
      required: true,
      placeholder: 'How will we measure success?',
      helperText: 'Define measurable success metrics',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.prd_id || !data.prd_id.match(/^PRD-\d{3}$/)) {
      errors.push('PRD ID must follow format: PRD-XXX (e.g., PRD-001)');
    }

    if (!data.title || data.title.trim().length < 5) {
      errors.push('Title must be at least 5 characters');
    }

    if (!data.status) {
      errors.push('Status is required');
    }

    if (!data.overview || data.overview.trim().length < 20) {
      errors.push('Overview must be at least 20 characters');
    }

    if (!data.requirements || data.requirements.trim().length < 20) {
      errors.push('Requirements must be at least 20 characters');
    }

    if (!data.success_criteria || data.success_criteria.trim().length < 20) {
      errors.push('Success criteria must be at least 20 characters');
    }

    return { valid: errors.length === 0, errors };
  },
  getFilePath: (data) => {
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `docs/prd/${data.prd_id}-${slug}.md`;
  },
};

// Pattern Schema
// Note: Patterns synced from git have a 'content' field with full markdown.
export const PATTERN_SCHEMA: NodeSchema = {
  type: 'Pattern',
  displayName: 'Pattern',
  fields: [
    {
      name: 'pattern_id',
      label: 'Pattern ID',
      type: 'text',
      required: false,
      placeholder: 'PATTERN-001',
      helperText: 'Format: PATTERN-XXX (auto-generated if empty)',
      readOnly: true,
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      placeholder: 'Pattern name (e.g., retry-with-backoff)',
    },
    {
      name: 'confidence',
      label: 'Confidence',
      type: 'select',
      required: false,
      options: [
        { value: 'low', label: 'Low ○' },
        { value: 'medium', label: 'Medium ◐' },
        { value: 'high', label: 'High ★' },
      ],
    },
    {
      name: 'content',
      label: 'Content',
      type: 'markdown',
      required: true,
      placeholder: 'Describe the pattern, when to use it, and provide examples...',
      helperText: 'Full pattern content in markdown format',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 3) {
      errors.push('Name must be at least 3 characters');
    }

    if (!data.content || data.content.trim().length < 20) {
      errors.push('Content must be at least 20 characters');
    }

    return { valid: errors.length === 0, errors };
  },
  getFilePath: (data) => {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `docs/patterns/${data.pattern_id}-${slug}.md`;
  },
};

// Gotcha Schema
// Note: Gotchas synced from git have a 'content' field with full markdown.
export const GOTCHA_SCHEMA: NodeSchema = {
  type: 'Gotcha',
  displayName: 'Gotcha / Warning',
  fields: [
    {
      name: 'gotcha_id',
      label: 'Gotcha ID',
      type: 'text',
      required: false,
      placeholder: 'GOTCHA-001',
      helperText: 'Format: GOTCHA-XXX (auto-generated if empty)',
      readOnly: true,
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Brief, descriptive title',
    },
    {
      name: 'severity',
      label: 'Severity',
      type: 'select',
      required: false,
      options: [
        { value: 'low', label: 'Low 💡' },
        { value: 'medium', label: 'Medium 💡' },
        { value: 'high', label: 'High ⚠️' },
        { value: 'critical', label: 'Critical 🚨' },
      ],
    },
    {
      name: 'content',
      label: 'Content',
      type: 'markdown',
      required: true,
      placeholder: 'Describe the gotcha and how to avoid/mitigate it...',
      helperText: 'Full gotcha content including description and mitigation',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length < 5) {
      errors.push('Title must be at least 5 characters');
    }

    if (!data.content || data.content.trim().length < 20) {
      errors.push('Content must be at least 20 characters');
    }

    return { valid: errors.length === 0, errors };
  },
  getFilePath: (data) => {
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `docs/gotchas/${data.gotcha_id}-${slug}.md`;
  },
};

// Charter Schema
export const CHARTER_SCHEMA: NodeSchema = {
  type: 'Charter',
  displayName: 'Project Charter',
  fields: [
    {
      name: 'title',
      label: 'Project Title',
      type: 'text',
      required: true,
      placeholder: 'Project name',
    },
    {
      name: 'purpose',
      label: 'Purpose',
      type: 'markdown',
      required: true,
      placeholder: 'Why does this project exist?',
      helperText: 'Describe the problem being solved',
    },
    {
      name: 'goals',
      label: 'Goals',
      type: 'markdown',
      required: true,
      placeholder: 'What are the key goals?',
      helperText: 'List primary project goals (one per line)',
    },
    {
      name: 'success_criteria',
      label: 'Success Criteria',
      type: 'markdown',
      required: true,
      placeholder: 'How will success be measured?',
      helperText: 'Define measurable success criteria',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters');
    }

    if (!data.purpose || data.purpose.trim().length < 20) {
      errors.push('Purpose must be at least 20 characters');
    }

    if (!data.goals || data.goals.trim().length < 20) {
      errors.push('Goals must be at least 20 characters');
    }

    if (!data.success_criteria || data.success_criteria.trim().length < 20) {
      errors.push('Success criteria must be at least 20 characters');
    }

    return { valid: errors.length === 0, errors };
  },
  getFilePath: () => 'docs/PROJECT-CHARTER.md',
};

// Principle Schema
export const PRINCIPLE_SCHEMA: NodeSchema = {
  type: 'Principle',
  displayName: 'Development Principle',
  fields: [
    {
      name: 'principle_id',
      label: 'Principle ID',
      type: 'text',
      required: true,
      placeholder: 'PRINCIPLE-001',
      helperText: 'Format: PRINCIPLE-XXX (e.g., PRINCIPLE-001)',
      readOnly: true,
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      placeholder: 'Principle name',
    },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'standard', label: 'Standard (Read-only)' },
        { value: 'custom', label: 'Custom (Editable)' },
      ],
      helperText: 'Standard principles are read-only best practices',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'deprecated', label: 'Deprecated' },
      ],
    },
    {
      name: 'theory',
      label: 'Theory (Why It Matters)',
      type: 'markdown',
      required: true,
      placeholder: 'Explain why this principle is important...',
      helperText: 'Markdown explanation of the principle and its value',
    },
    {
      name: 'source',
      label: 'Source',
      type: 'text',
      required: false,
      placeholder: 'ADR-043, Anthropic Docs, etc.',
      helperText: 'Where this principle originated from',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.principle_id || !data.principle_id.match(/^PRINCIPLE-\d{3}$/)) {
      errors.push('Principle ID must follow format: PRINCIPLE-XXX (e.g., PRINCIPLE-001)');
    }

    if (!data.name || data.name.trim().length < 5) {
      errors.push('Name must be at least 5 characters');
    }

    if (!data.type) {
      errors.push('Type is required');
    }

    if (!data.status) {
      errors.push('Status is required');
    }

    if (!data.theory || data.theory.trim().length < 20) {
      errors.push('Theory must be at least 20 characters');
    }

    return { valid: errors.length === 0, errors };
  },
  getFilePath: (data) => {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `docs/principles/${data.principle_id}-${slug}.md`;
  },
};

// Sprint Schema
export const SPRINT_SCHEMA: NodeSchema = {
  type: 'Sprint',
  displayName: 'Sprint',
  fields: [
    {
      name: 'sprint_id',
      label: 'Sprint ID',
      type: 'text',
      required: true,
      placeholder: 'e005_s01',
      helperText: 'Format: e{NNN}_s{NN} (e.g., e005_s01)',
      readOnly: true,
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Sprint title',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'planning', label: 'Planning' },
        { value: 'active', label: 'Active' },
        { value: 'complete', label: 'Complete' },
      ],
    },
    {
      name: 'goal',
      label: 'Goal',
      type: 'markdown',
      required: false,
      placeholder: 'What is the sprint goal?',
      helperText: 'High-level objective for this sprint',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.sprint_id || data.sprint_id.trim().length < 3) {
      errors.push('Sprint ID is required');
    }

    if (!data.title || data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters');
    }

    if (!data.status) {
      errors.push('Status is required');
    }

    return { valid: errors.length === 0, errors };
  },
  getFilePath: (data) => {
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `docs/sprints/${data.sprint_id}-${slug}.md`;
  },
};

// Task Schema
export const TASK_SCHEMA: NodeSchema = {
  type: 'Task',
  displayName: 'Task',
  fields: [
    {
      name: 'task_id',
      label: 'Task ID',
      type: 'text',
      required: true,
      placeholder: 'e005_s01_t01',
      helperText: 'Format: e{NNN}_s{NN}_t{NN} (e.g., e005_s01_t01)',
      readOnly: true,
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Task title',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'paused', label: 'Paused' },
        { value: 'complete', label: 'Complete' },
      ],
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      required: false,
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'critical', label: 'Critical' },
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'markdown',
      required: false,
      placeholder: 'Task description',
      helperText: 'Detailed description of what needs to be done',
    },
    {
      name: 'assignee',
      label: 'Assignee',
      type: 'text',
      required: false,
      placeholder: 'user@example.com',
      helperText: 'Email of the person assigned to this task',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.task_id || data.task_id.trim().length < 3) {
      errors.push('Task ID is required');
    }

    if (!data.title || data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters');
    }

    if (!data.status) {
      errors.push('Status is required');
    }

    return { valid: errors.length === 0, errors };
  },
  getFilePath: (data) => {
    return `docs/tasks/${data.task_id}.md`;
  },
};

// Epic Schema
export const EPIC_SCHEMA: NodeSchema = {
  type: 'Epic',
  displayName: 'Epic',
  fields: [
    {
      name: 'epic_id',
      label: 'Epic ID',
      type: 'text',
      required: true,
      placeholder: 'e005',
      helperText: 'Format: e{NNN} (e.g., e005)',
      readOnly: true,
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Epic title',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'planning', label: 'Planning' },
        { value: 'active', label: 'Active' },
        { value: 'complete', label: 'Complete' },
        { value: 'on-hold', label: 'On Hold' },
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'markdown',
      required: false,
      placeholder: 'Epic description',
      helperText: 'High-level description of the epic',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.epic_id || data.epic_id.trim().length < 2) {
      errors.push('Epic ID is required');
    }

    if (!data.title || data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters');
    }

    if (!data.status) {
      errors.push('Status is required');
    }

    return { valid: errors.length === 0, errors };
  },
  getFilePath: (data) => {
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `docs/epics/${data.epic_id}-${slug}.md`;
  },
};

// =============================================================================
// Schema Registry
// =============================================================================

export const NODE_SCHEMAS: Record<string, NodeSchema> = {
  ADR: ADR_SCHEMA,
  PRD: PRD_SCHEMA,
  Pattern: PATTERN_SCHEMA,
  Gotcha: GOTCHA_SCHEMA,
  Charter: CHARTER_SCHEMA,
  Principle: PRINCIPLE_SCHEMA,
  Sprint: SPRINT_SCHEMA,
  Task: TASK_SCHEMA,
  Epic: EPIC_SCHEMA,
};

export function getNodeSchema(type: NodeLabel): NodeSchema | null {
  return NODE_SCHEMAS[type] || null;
}

export function getEditableNodeTypes(): NodeLabel[] {
  return Object.keys(NODE_SCHEMAS) as NodeLabel[];
}

export function isNodeTypeEditable(type: NodeLabel): boolean {
  return type in NODE_SCHEMAS;
}
