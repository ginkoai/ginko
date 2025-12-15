/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [editor, knowledge-editing, crud, forms]
 * @related: [NodeEditorForm.tsx, MarkdownEditor.tsx, node-schemas.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [react]
 */
'use client';

import { useState, useEffect } from 'react';
import { NodeEditorForm } from './NodeEditorForm';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { getNodeSchema } from '@/lib/node-schemas';
import type { NodeLabel } from '@/lib/graph/types';
import type { GraphNode } from '@/lib/graph/types';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface NodeEditorProps {
  nodeType: NodeLabel;
  nodeId?: string;
  graphId: string;
  onSave: (data: GraphNode) => void;
  onCancel: () => void;
  initialData?: GraphNode;
}

export function NodeEditor({
  nodeType,
  nodeId,
  graphId,
  onSave,
  onCancel,
  initialData,
}: NodeEditorProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingNode, setLoadingNode] = useState(!!nodeId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [synced, setSynced] = useState(true);

  const schema = getNodeSchema(nodeType);

  // Load existing node data if editing
  useEffect(() => {
    if (initialData) {
      setFormData(initialData.properties as Record<string, any>);
      setLoadingNode(false);
      setSynced((initialData.properties as any).synced ?? true);
    } else if (nodeId) {
      loadNodeData();
    }
  }, [nodeId, initialData]);

  const loadNodeData = async () => {
    setLoadingNode(true);
    setSaveError(null);

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load node');
      }

      const data = await response.json();
      setFormData(data.node.properties);
      setSynced(data.node.properties.synced ?? true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to load node');
    } finally {
      setLoadingNode(false);
    }
  };

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

  const handleValidate = (): boolean => {
    if (!schema) return false;

    const result = schema.validate(formData);

    if (!result.valid) {
      const errorMap: Record<string, string> = {};
      result.errors.forEach((error) => {
        // Extract field name from error message (simple heuristic)
        const field = schema.fields.find((f) => error.toLowerCase().includes(f.name.toLowerCase()));
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
  };

  const handleSave = async () => {
    if (!handleValidate()) {
      return;
    }

    setLoading(true);
    setSaveError(null);

    try {
      const token = await getAuthToken();
      const isUpdate = !!nodeId;
      const url = isUpdate
        ? `/api/v1/graph/nodes/${nodeId}`
        : '/api/v1/graph/nodes';
      const method = isUpdate ? 'PATCH' : 'POST';

      const payload = isUpdate
        ? {
            graphId,
            updates: formData,
          }
        : {
            graphId,
            label: nodeType,
            data: {
              ...formData,
              id: formData[`${nodeType.toLowerCase()}_id`] || formData.id || crypto.randomUUID(),
              graph_id: graphId,
              created_at: new Date().toISOString(),
              synced: false, // Mark as unsynced until CLI pulls it
            },
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save node');
      }

      const result = await response.json();
      onSave(result.node);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save node');
    } finally {
      setLoading(false);
    }
  };

  if (!schema) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <div>
              <p className="font-semibold">Unsupported Node Type</p>
              <p className="text-sm">The node type "{nodeType}" is not editable.</p>
            </div>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loadingNode) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading node data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>
              {nodeId ? 'Edit' : 'Create'} {schema.displayName}
            </CardTitle>
            {nodeId && (
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs bg-secondary px-2 py-1 rounded font-mono">
                  {nodeId}
                </code>
                {!synced && (
                  <Badge variant="warning" className="text-xs">
                    Pending Sync
                  </Badge>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* General Error */}
        {saveError && (
          <Alert variant="destructive" className="mb-6">
            <div>
              <p className="font-semibold">Save Failed</p>
              <p className="text-sm">{saveError}</p>
            </div>
          </Alert>
        )}

        {errors._general && (
          <Alert variant="destructive" className="mb-6">
            <div>
              <p className="font-semibold">Validation Error</p>
              <p className="text-sm">{errors._general}</p>
            </div>
          </Alert>
        )}

        {/* Sync Warning */}
        {!synced && nodeId && (
          <Alert variant="warning" className="mb-6">
            <div>
              <p className="font-semibold">Unsynced Changes</p>
              <p className="text-sm">
                This node has changes that haven't been synced to git. Run{' '}
                <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono text-xs">
                  ginko sync
                </code>{' '}
                to pull these changes into your repository.
              </p>
            </div>
          </Alert>
        )}

        {/* Form */}
        <NodeEditorForm schema={schema} data={formData} onChange={setFormData} errors={errors} />
      </CardContent>

      <CardFooter className="flex items-center justify-between p-6 bg-secondary/30">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={loading} disabled={loading}>
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          {nodeId ? 'Save Changes' : 'Create Node'}
        </Button>
      </CardFooter>
    </Card>
  );
}
