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
      ],
    },
    {
      name: 'context',
      label: 'Context',
      type: 'markdown',
      required: true,
      placeholder: 'What is the context of this decision?',
      helperText: 'Describe the problem, constraints, and forces at play',
    },
    {
      name: 'decision',
      label: 'Decision',
      type: 'markdown',
      required: true,
      placeholder: 'What was decided?',
      helperText: 'Describe the decision clearly and concisely',
    },
    {
      name: 'consequences',
      label: 'Consequences',
      type: 'markdown',
      required: true,
      placeholder: 'What are the consequences of this decision?',
      helperText: 'List positive, negative, and neutral consequences',
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

    if (!data.context || data.context.trim().length < 20) {
      errors.push('Context must be at least 20 characters');
    }

    if (!data.decision || data.decision.trim().length < 20) {
      errors.push('Decision must be at least 20 characters');
    }

    if (!data.consequences || data.consequences.trim().length < 20) {
      errors.push('Consequences must be at least 20 characters');
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
export const PATTERN_SCHEMA: NodeSchema = {
  type: 'Pattern',
  displayName: 'Pattern',
  fields: [
    {
      name: 'pattern_id',
      label: 'Pattern ID',
      type: 'text',
      required: true,
      placeholder: 'PATTERN-001',
      helperText: 'Format: PATTERN-XXX (e.g., PATTERN-001)',
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
      required: true,
      options: [
        { value: 'low', label: 'Low ○' },
        { value: 'medium', label: 'Medium ◐' },
        { value: 'high', label: 'High ★' },
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'markdown',
      required: true,
      placeholder: 'What is this pattern?',
      helperText: 'Describe the pattern and its purpose',
    },
    {
      name: 'example',
      label: 'Example',
      type: 'markdown',
      required: false,
      placeholder: 'Code example or usage scenario',
      helperText: 'Show how to use this pattern (optional)',
    },
    {
      name: 'when_to_use',
      label: 'When to Use',
      type: 'markdown',
      required: true,
      placeholder: 'When should this pattern be applied?',
      helperText: 'Describe the scenarios where this pattern is appropriate',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.pattern_id || !data.pattern_id.match(/^PATTERN-\d{3}$/)) {
      errors.push('Pattern ID must follow format: PATTERN-XXX (e.g., PATTERN-001)');
    }

    if (!data.name || data.name.trim().length < 3) {
      errors.push('Name must be at least 3 characters');
    }

    if (!data.confidence) {
      errors.push('Confidence level is required');
    }

    if (!data.description || data.description.trim().length < 20) {
      errors.push('Description must be at least 20 characters');
    }

    if (!data.when_to_use || data.when_to_use.trim().length < 20) {
      errors.push('When to use must be at least 20 characters');
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
export const GOTCHA_SCHEMA: NodeSchema = {
  type: 'Gotcha',
  displayName: 'Gotcha / Warning',
  fields: [
    {
      name: 'gotcha_id',
      label: 'Gotcha ID',
      type: 'text',
      required: true,
      placeholder: 'GOTCHA-001',
      helperText: 'Format: GOTCHA-XXX (e.g., GOTCHA-001)',
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
      required: true,
      options: [
        { value: 'low', label: 'Low 💡' },
        { value: 'medium', label: 'Medium 💡' },
        { value: 'high', label: 'High ⚠️' },
        { value: 'critical', label: 'Critical 🚨' },
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'markdown',
      required: true,
      placeholder: 'What is the gotcha or pitfall?',
      helperText: 'Describe the problem in detail',
    },
    {
      name: 'mitigation',
      label: 'Mitigation / Solution',
      type: 'markdown',
      required: true,
      placeholder: 'How to avoid or fix this issue?',
      helperText: 'Provide clear steps to prevent or resolve the problem',
    },
  ],
  validate: (data) => {
    const errors: string[] = [];

    if (!data.gotcha_id || !data.gotcha_id.match(/^GOTCHA-\d{3}$/)) {
      errors.push('Gotcha ID must follow format: GOTCHA-XXX (e.g., GOTCHA-001)');
    }

    if (!data.title || data.title.trim().length < 5) {
      errors.push('Title must be at least 5 characters');
    }

    if (!data.severity) {
      errors.push('Severity is required');
    }

    if (!data.description || data.description.trim().length < 20) {
      errors.push('Description must be at least 20 characters');
    }

    if (!data.mitigation || data.mitigation.trim().length < 20) {
      errors.push('Mitigation must be at least 20 characters');
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

// =============================================================================
// Schema Registry
// =============================================================================

export const NODE_SCHEMAS: Record<string, NodeSchema> = {
  ADR: ADR_SCHEMA,
  PRD: PRD_SCHEMA,
  Pattern: PATTERN_SCHEMA,
  Gotcha: GOTCHA_SCHEMA,
  Charter: CHARTER_SCHEMA,
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
