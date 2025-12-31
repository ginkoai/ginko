/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-29
 * @tags: [editor, modal, dialog, knowledge-editing, crud]
 * @related: [NodeEditorForm.tsx, NodeEditor.tsx, dialog.tsx, NodeView.tsx, CondensedNodeCard.tsx]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, @radix-ui/react-dialog]
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { NodeEditorForm } from './NodeEditorForm';
import { getNodeSchema } from '@/lib/node-schemas';
import type { GraphNode, NodeLabel } from '@/lib/graph/types';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
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
};

// =============================================================================
// Types
// =============================================================================

interface NodeEditorModalProps {
  /** The node to edit */
  node: GraphNode | null;
  /** Graph ID for API calls */
  graphId: string;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Callback when save succeeds */
  onSave?: (updatedNode: GraphNode) => void;
}

// =============================================================================
// Helper
// =============================================================================

const getAuthToken = async (): Promise<string> => {
  if (typeof window !== 'undefined') {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || '';
  }
  return '';
};

// =============================================================================
// Component
// =============================================================================

export function NodeEditorModal({
  node,
  graphId,
  open,
  onOpenChange,
  onSave,
}: NodeEditorModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const initialDataRef = useRef<Record<string, unknown>>({});

  const schema = node ? getNodeSchema(node.label as NodeLabel) : null;
  const Icon = node ? nodeIcons[node.label as NodeLabel] : null;
  const color = node ? nodeColors[node.label as NodeLabel] : 'ginko';

  // Check if form has unsaved changes
  const hasUnsavedChanges = useCallback((): boolean => {
    const initial = initialDataRef.current;
    const current = formData;

    // Get all keys from both objects
    const allKeys = new Set([...Object.keys(initial), ...Object.keys(current)]);

    for (const key of allKeys) {
      const initialVal = initial[key];
      const currentVal = current[key];

      // Handle arrays
      if (Array.isArray(initialVal) && Array.isArray(currentVal)) {
        if (JSON.stringify(initialVal) !== JSON.stringify(currentVal)) {
          return true;
        }
        continue;
      }

      // Handle other values
      if (initialVal !== currentVal) {
        return true;
      }
    }

    return false;
  }, [formData]);

  // Reset form when node changes
  useEffect(() => {
    if (node && open) {
      const props = node.properties as Record<string, unknown>;

      // Map 'id' property to the schema's expected ID field name
      // e.g., Task expects 'task_id', Sprint expects 'sprint_id', etc.
      const idFieldMap: Record<string, string> = {
        Task: 'task_id',
        Sprint: 'sprint_id',
        Epic: 'epic_id',
        ADR: 'adr_id',
        PRD: 'prd_id',
        Pattern: 'pattern_id',
        Gotcha: 'gotcha_id',
        Principle: 'principle_id',
      };

      const idFieldName = idFieldMap[node.label];
      const mappedProps = { ...props };

      // If schema expects a specific ID field and node has 'id', map it
      if (idFieldName && props.id && !props[idFieldName]) {
        mappedProps[idFieldName] = props.id;
      }

      setFormData(mappedProps);
      initialDataRef.current = mappedProps;
      setErrors({});
      setSaveError(null);
      setShowUnsavedWarning(false);
    }
  }, [node, open]);

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

  const handleSave = useCallback(async () => {
    if (!node || !handleValidate()) {
      return;
    }

    setLoading(true);
    setSaveError(null);

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/v1/graph/nodes/${node.id}?graphId=${encodeURIComponent(graphId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          properties: formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save node');
      }

      const result = await response.json();
      onSave?.(result.node);
      onOpenChange(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save node');
    } finally {
      setLoading(false);
    }
  }, [node, graphId, formData, handleValidate, onSave, onOpenChange]);

  // Handle attempts to close the modal
  const handleRequestClose = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true);
    } else {
      onOpenChange(false);
    }
  }, [hasUnsavedChanges, onOpenChange]);

  const handleCancel = useCallback(() => {
    handleRequestClose();
  }, [handleRequestClose]);

  // Confirm discard changes
  const handleConfirmDiscard = useCallback(() => {
    setShowUnsavedWarning(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Cancel discard and continue editing
  const handleCancelDiscard = useCallback(() => {
    setShowUnsavedWarning(false);
  }, []);

  // Handle dialog open change (intercept outside clicks and escape key)
  const handleDialogOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // User is trying to close - check for unsaved changes
      handleRequestClose();
    } else {
      onOpenChange(newOpen);
    }
  }, [handleRequestClose, onOpenChange]);

  // Get node title for display
  const getNodeTitle = () => {
    if (!node) return '';
    const props = node.properties as Record<string, unknown>;
    return (props.title || props.name || props.adr_id || props.task_id || node.id) as string;
  };

  if (!node || !schema) {
    return null;
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent size="lg" showCloseButton={!loading}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                <Icon className={`w-5 h-5 text-${color}-500`} />
              </div>
            )}
            <div>
              <DialogTitle>Edit {schema.displayName}</DialogTitle>
              <DialogDescription className="mt-1">
                {getNodeTitle()}
              </DialogDescription>
            </div>
          </div>
          {/* Sync status */}
          {!(node.properties as Record<string, unknown>).synced && (
            <Badge variant="warning" className="w-fit mt-2">
              Pending Sync
            </Badge>
          )}
        </DialogHeader>

        <DialogBody>
          {/* General Error */}
          {saveError && (
            <Alert variant="destructive" className="mb-4">
              <div>
                <p className="font-semibold">Save Failed</p>
                <p className="text-sm">{saveError}</p>
              </div>
            </Alert>
          )}

          {errors._general && (
            <Alert variant="destructive" className="mb-4">
              <div>
                <p className="font-semibold">Validation Error</p>
                <p className="text-sm">{errors._general}</p>
              </div>
            </Alert>
          )}

          {/* Form */}
          <NodeEditorForm
            schema={schema}
            data={formData}
            onChange={setFormData}
            errors={errors}
          />
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Unsaved Changes Warning Dialog */}
    <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to close? Your changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleConfirmDiscard} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Discard Changes
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleCancelDiscard}>
            Continue Editing
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

export default NodeEditorModal;
