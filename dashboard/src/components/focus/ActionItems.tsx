/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [focus, action-items, warnings, notifications, sync, dashboard]
 * @related: [UnsyncedBanner.tsx, focus/page.tsx, graph/page.tsx]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, @heroicons/react, next/link]
 */
'use client';

import { useState, useEffect } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface ActionItemsProps {
  userId: string;
  graphId: string;
}

interface ActionItem {
  id: string;
  type: 'warning' | 'info';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  count?: number;
  action?: {
    type: 'link' | 'command';
    label: string;
    value: string;
  };
}

interface UnsyncedResponse {
  nodes: any[];
  count: number;
  graphId: string;
}

export function ActionItems({ userId, graphId }: ActionItemsProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  useEffect(() => {
    fetchActionItems();
  }, [graphId, userId]);

  const fetchActionItems = async () => {
    setLoading(true);
    const actionItems: ActionItem[] = [];

    try {
      // Fetch unsynced nodes count
      const unsyncedCount = await fetchUnsyncedCount();
      if (unsyncedCount > 0) {
        actionItems.push({
          id: 'unsynced-nodes',
          type: 'warning',
          icon: ExclamationTriangleIcon,
          title: 'Unsynced Knowledge Nodes',
          description: `${unsyncedCount} knowledge ${unsyncedCount === 1 ? 'node has been' : 'nodes have been'} edited in the dashboard`,
          count: unsyncedCount,
          action: {
            type: 'command',
            label: 'Run ginko sync',
            value: 'ginko sync',
          },
        });
      }

      // Future: Add other action items here
      // - Uncommitted files
      // - Failed tests
      // - Outdated dependencies
      // - Sprint tasks overdue

      setItems(actionItems);
    } catch (error) {
      console.error('[ActionItems] Error fetching action items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnsyncedCount = async (): Promise<number> => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/v1/graph/nodes/unsynced?graphId=${graphId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Fail silently for auth errors
        if (response.status === 401 || response.status === 404) {
          return 0;
        }
        throw new Error('Failed to fetch unsynced nodes');
      }

      const data: UnsyncedResponse = await response.json();
      return data.count;
    } catch (error) {
      console.error('[ActionItems] Error fetching unsynced count:', error);
      return 0;
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

  const handleCopyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(command);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (error) {
      console.error('[ActionItems] Failed to copy command:', error);
    }
  };

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // Show "all caught up" if no items
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckIcon className="h-5 w-5" />
          <p className="text-sm font-medium">All caught up!</p>
        </div>
      </div>
    );
  }

  // Show collapsible action items
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Action Items</h3>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={collapsed ? 'Expand action items' : 'Collapse action items'}
        >
          {collapsed ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronUpIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {items.map((item) => (
            <ActionItemCard
              key={item.id}
              item={item}
              onCopyCommand={handleCopyCommand}
              copiedCommand={copiedCommand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ActionItemCardProps {
  item: ActionItem;
  onCopyCommand: (command: string) => void;
  copiedCommand: string | null;
}

function ActionItemCard({ item, onCopyCommand, copiedCommand }: ActionItemCardProps) {
  const Icon = item.icon;
  const variant = item.type === 'warning' ? 'warning' : 'default';
  const iconColor = item.type === 'warning' ? 'text-yellow-600' : 'text-blue-600';
  const isCopied = copiedCommand === item.action?.value;

  return (
    <div
      className={`rounded-md border p-3 ${
        item.type === 'warning'
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-blue-50 border-blue-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-semibold ${
              item.type === 'warning' ? 'text-yellow-900' : 'text-blue-900'
            }`}>
              {item.title}
            </p>
            {item.count !== undefined && (
              <Badge variant={variant} className="text-xs">
                {item.count}
              </Badge>
            )}
          </div>
          <p className={`text-sm mb-2 ${
            item.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'
          }`}>
            {item.description}
          </p>
          {item.action && (
            <div className="flex items-center gap-2">
              {item.action.type === 'link' && (
                <Link href={item.action.value}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-current"
                  >
                    {item.action.label}
                  </Button>
                </Link>
              )}
              {item.action.type === 'command' && (
                <div className="flex items-center gap-2">
                  <code className={`px-2 py-1 rounded font-mono text-xs ${
                    item.type === 'warning'
                      ? 'bg-yellow-100 text-yellow-900'
                      : 'bg-blue-100 text-blue-900'
                  }`}>
                    {item.action.value}
                  </code>
                  <button
                    onClick={() => onCopyCommand(item.action!.value)}
                    className={`p-1 rounded transition-colors ${
                      item.type === 'warning'
                        ? 'hover:bg-yellow-200 text-yellow-700'
                        : 'hover:bg-blue-200 text-blue-700'
                    }`}
                    aria-label="Copy command to clipboard"
                    title="Copy to clipboard"
                  >
                    {isCopied ? (
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
