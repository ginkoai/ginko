/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [editor, modal, dialog, node-creation, crud]
 * @related: [NodeEditorModal.tsx, NodeEditorForm.tsx, CategoryView.tsx]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, @radix-ui/react-dialog]
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { NodeEditorForm } from './NodeEditorForm';
import { getNodeSchema } from '@/lib/node-schemas';
import type { GraphNode, NodeLabel } from '@/lib/graph/types';
import {
  createNode,
  getNextADRNumber,
  getNextPatternId,
  getNextGotchaId,
} from '@/lib/graph/api-client';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import {
  FileText,
  Target,
  Zap,
  AlertTriangle,
  CheckSquare,
  Calendar,
  GitBranch,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// Icon & Color Mapping
// =============================================================================

const nodeIcons: Record<NodeLabel, LucideIcon> = {
  Project: Target,
  Charter: FileText,
  Epic: Target,
  Sprint: Calendar,
  Task: CheckSquare,
  ADR: FileText,
  PRD: FileText,
  Pattern: Zap,
  Gotcha: AlertTriangle,
  Principle: Lightbulb,
  Event: GitBranch,
  Session: GitBranch,
  Commit: GitBranch,
  Team: Target,
  Membership: Target,
  Invitation: Target,
};

const nodeColors: Record<NodeLabel, string> = {
  Project: 'ginko',
  Charter: 'blue',
  Epic: 'purple',
  Sprint: 'cyan',
  Task: 'ginko',
  ADR: 'amber',
  PRD: 'orange',
  Pattern: 'emerald',
  Gotcha: 'red',
  Principle: 'indigo',
  Event: 'slate',
  Session: 'slate',
  Commit: 'slate',
  Team: 'blue',
  Membership: 'slate',
  Invitation: 'amber',
};

// Default content templates
const contentTemplates: Partial<Record<NodeLabel, string>> = {
  ADR: `## Context

Describe the context and problem that led to this decision...

## Decision

Describe the decision that was made...

## Consequences

List the consequences of this decision...`,
  Pattern: `## Description

Describe the pattern and when to use it...

## Example

Provide an example of the pattern in action...`,
  Gotcha: `## Problem

Describe the gotcha or pitfall...

## Solution

How to avoid or mitigate this issue...`,
};

// =============================================================================
// Types
// =============================================================================

interface CreateNodeModalProps {
  /** The type of node to create */
  nodeType: NodeLabel | null;
  /** Graph ID for API calls */
  graphId: string;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Callback when creation succeeds */
  onCreate?: (newNode: GraphNode) => void;
}

// =============================================================================
// Component
// =============================================================================

export function CreateNodeModal({
  nodeType,
  graphId,
  open,
  onOpenChange,
  onCreate,
}: CreateNodeModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const schema = nodeType ? getNodeSchema(nodeType) : null;
  const Icon = nodeType ? nodeIcons[nodeType] : null;
  const color = nodeType ? nodeColors[nodeType] : 'ginko';

  // Initialize form with defaults and auto-generated ID
  useEffect(() => {
    if (nodeType && open) {
      setErrors({});
      setSaveError(null);
      setInitializing(true);

      const initializeForm = async () => {
        const defaults: Record<string, unknown> = {};

        // Set default content from template
        if (contentTemplates[nodeType]) {
          defaults.content = contentTemplates[nodeType];
        }

        // Set default status
        if (nodeType === 'ADR') {
          defaults.status = 'proposed';
        } else if (nodeType === 'Pattern') {
          defaults.confidence = 'medium';
        } else if (nodeType === 'Gotcha') {
          defaults.severity = 'medium';
        }

        // Auto-generate ID
        try {
          if (nodeType === 'ADR') {
            const nextId = await getNextADRNumber({ graphId });
            defaults.adr_id = nextId;
            defaults.id = nextId;
          } else if (nodeType === 'Pattern') {
            const nextId = await getNextPatternId({ graphId });
            defaults.pattern_id = nextId;
            defaults.id = nextId;
          } else if (nodeType === 'Gotcha') {
            const nextId = await getNextGotchaId({ graphId });
            defaults.gotcha_id = nextId;
            defaults.id = nextId;
          }
        } catch (error) {
          console.error('Failed to generate ID:', error);
          // Continue without auto-generated ID
        }

        setFormData(defaults);
        setInitializing(false);
      };

      initializeForm();
    }
  }, [nodeType, open, graphId]);

  const handleValidate = useCallback((): boolean => {
    if (!schema) return false;

    const result = schema.validate(formData);

    if (!result.valid) {
      const errorMap: Record<string, string> = {};
      result.errors.forEach((error) => {
        const field = schema.fields.find((f) =>
          error.toLowerCase().includes(f.name.toLowerCase())
        );
        if (field) {
          errorMap[field.name] = error;
        } else {
          errorMap['_general'] = error;
        }
      });
      setErrors(errorMap);
      return false;
    }

    setErrors({});
    return true;
  }, [schema, formData]);

  const handleCreate = useCallback(async () => {
    if (!nodeType || !handleValidate()) {
      return;
    }

    setLoading(true);
    setSaveError(null);

    try {
      const result = await createNode({
        graphId,
        label: nodeType,
        properties: formData,
      });

      onCreate?.(result.node);
      onOpenChange(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to create node');
    } finally {
      setLoading(false);
    }
  }, [nodeType, graphId, formData, handleValidate, onCreate, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!nodeType || !schema) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" showCloseButton={!loading}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                <Icon className={`w-5 h-5 text-${color}-500`} />
              </div>
            )}
            <div>
              <DialogTitle>Create New {schema.displayName}</DialogTitle>
              <DialogDescription className="mt-1">
                Fill in the details below to create a new {schema.displayName.toLowerCase()}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          {/* Initializing State */}
          {initializing && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ginko-500" />
              <span className="ml-3 text-muted-foreground">Preparing form...</span>
            </div>
          )}

          {/* Save Error */}
          {!initializing && saveError && (
            <Alert variant="destructive" className="mb-4">
              <div>
                <p className="font-semibold">Creation Failed</p>
                <p className="text-sm">{saveError}</p>
              </div>
            </Alert>
          )}

          {!initializing && errors._general && (
            <Alert variant="destructive" className="mb-4">
              <div>
                <p className="font-semibold">Validation Error</p>
                <p className="text-sm">{errors._general}</p>
              </div>
            </Alert>
          )}

          {/* Form */}
          {!initializing && (
            <NodeEditorForm
              schema={schema}
              data={formData}
              onChange={setFormData}
              errors={errors}
            />
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading || initializing}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || initializing}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            ) : (
              <PlusCircleIcon className="h-4 w-4 mr-2" />
            )}
            Create {schema.displayName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateNodeModal;
