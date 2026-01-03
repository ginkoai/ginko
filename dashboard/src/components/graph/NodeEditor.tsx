/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [editor, knowledge-editing, crud, forms, edit-locking, epic-008]
 * @related: [NodeEditorForm.tsx, MarkdownEditor.tsx, node-schemas.ts, lib/edit-lock-manager.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [react]
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { NodeEditorForm } from './NodeEditorForm';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { getNodeSchema } from '@/lib/node-schemas';
import {
  EditLockManager,
  type LockHolder,
  type LockResult,
  formatLockHolder,
} from '@/lib/edit-lock-manager';
import type { NodeLabel } from '@/lib/graph/types';
import type { GraphNode } from '@/lib/graph/types';
import {
  XMarkIcon,
  CheckCircleIcon,
  LockClosedIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface NodeEditorProps {
  nodeType: NodeLabel;
  nodeId?: string;
  graphId: string;
  onSave: (data: GraphNode) => void;
  onCancel: () => void;
  initialData?: GraphNode;
}

/**
 * Lock refresh interval in milliseconds (10 minutes - before 15 min expiry)
 */
const LOCK_REFRESH_INTERVAL = 10 * 60 * 1000;

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

  // Lock state (EPIC-008 Sprint 2)
  const [lockAcquired, setLockAcquired] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockedBy, setLockedBy] = useState<LockHolder | null>(null);
  const [acquiringLock, setAcquiringLock] = useState(false);
  const lockManagerRef = useRef<EditLockManager | null>(null);
  const lockRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const schema = getNodeSchema(nodeType);

  const getAuthToken = useCallback(async (): Promise<string> => {
    if (typeof window !== 'undefined') {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token || '';
    }
    return '';
  }, []);

  // Initialize lock manager
  useEffect(() => {
    lockManagerRef.current = new EditLockManager(getAuthToken);
  }, [getAuthToken]);

  // Acquire lock on mount (only for existing nodes)
  useEffect(() => {
    if (!nodeId || !graphId || !lockManagerRef.current) {
      return;
    }

    const acquireLock = async () => {
      setAcquiringLock(true);
      setLockError(null);
      setLockedBy(null);

      try {
        const result: LockResult = await lockManagerRef.current!.acquireLock(nodeId, graphId);

        if (result.success) {
          setLockAcquired(true);

          // Set up lock refresh interval
          lockRefreshIntervalRef.current = setInterval(async () => {
            if (lockManagerRef.current) {
              const refreshResult = await lockManagerRef.current.extendLock(nodeId, graphId);
              if (!refreshResult.success) {
                console.warn('[NodeEditor] Failed to refresh lock:', refreshResult.error);
                // Lock was lost - show warning but don't block editing
                setLockError('Lock expired. Save may fail if another user is editing.');
              }
            }
          }, LOCK_REFRESH_INTERVAL);
        } else {
          setLockAcquired(false);
          if (result.heldBy) {
            setLockedBy(result.heldBy);
            setLockError(`This node is currently being edited by ${result.heldBy.email}`);
          } else {
            setLockError(result.error || 'Failed to acquire edit lock');
          }
        }
      } catch (error) {
        console.error('[NodeEditor] Lock acquisition error:', error);
        // Don't block editing if lock system fails - just warn
        setLockError('Unable to acquire edit lock. Proceed with caution.');
      } finally {
        setAcquiringLock(false);
      }
    };

    acquireLock();

    // Cleanup: release lock on unmount
    return () => {
      if (lockRefreshIntervalRef.current) {
        clearInterval(lockRefreshIntervalRef.current);
      }

      if (lockManagerRef.current && nodeId && graphId) {
        // Fire and forget - don't block unmount
        lockManagerRef.current.releaseLock(nodeId, graphId).catch((err) => {
          console.warn('[NodeEditor] Failed to release lock on unmount:', err);
        });
      }
    };
  }, [nodeId, graphId]);

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
      const url = isUpdate ? `/api/v1/graph/nodes/${nodeId}` : '/api/v1/graph/nodes';
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

      // Release lock after successful save
      if (nodeId && lockManagerRef.current) {
        await lockManagerRef.current.releaseLock(nodeId, graphId);
      }

      onSave(result.node);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save node');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    // Release lock before canceling
    if (nodeId && lockManagerRef.current) {
      await lockManagerRef.current.releaseLock(nodeId, graphId);
    }
    onCancel();
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

  // Show lock acquisition in progress
  if (acquiringLock) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Acquiring edit lock...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show locked by another user (blocking)
  if (lockedBy && !lockAcquired) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive" className="mb-6">
            <div className="flex items-start gap-3">
              <LockClosedIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Node is Locked</p>
                <p className="text-sm mt-1">
                  This node is currently being edited by another user. Please wait until they
                  finish or try again later.
                </p>
              </div>
            </div>
          </Alert>

          <div className="bg-secondary/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Editing by</p>
                <p className="text-sm text-muted-foreground">{formatLockHolder(lockedBy)}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onCancel}>
              Close
            </Button>
          </div>
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
                <code className="text-xs bg-secondary px-2 py-1 rounded font-mono">{nodeId}</code>
                {!synced && (
                  <Badge variant="warning" className="text-xs">
                    Pending Sync
                  </Badge>
                )}
                {lockAcquired && (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    <LockClosedIcon className="h-3 w-3 mr-1" />
                    Locked for editing
                  </Badge>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Lock Warning (non-blocking) */}
        {lockError && !lockedBy && (
          <Alert variant="warning" className="mb-6">
            <div className="flex items-start gap-2">
              <LockClosedIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Lock Warning</p>
                <p className="text-sm">{lockError}</p>
              </div>
            </div>
          </Alert>
        )}

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
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
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
