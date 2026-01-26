/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-26
 * @tags: [team, unassigned, work, epic-016, sprint-3]
 * @related: [MemberStatusCard.tsx, TeamStatusGrid.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertCircle, UserPlus } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface UnassignedWork {
  sprintId: string;
  sprintTitle: string;
  epicTitle: string;
  taskCount: number;
}

interface UnassignedWorkSectionProps {
  unassigned: UnassignedWork[];
  onClaim?: (sprintId: string) => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function UnassignedWorkSection({
  unassigned,
  onClaim,
  className,
}: UnassignedWorkSectionProps) {
  if (unassigned.length === 0) {
    return null;
  }

  const totalTasks = unassigned.reduce((sum, u) => sum + u.taskCount, 0);

  return (
    <Card className={cn('border-yellow-200 bg-yellow-50/50', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span>Unassigned Work</span>
          </div>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            {totalTasks} tasks
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {unassigned.slice(0, 5).map((item) => (
          <div
            key={item.sprintId}
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-100"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {item.epicTitle}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {item.sprintTitle}
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <Badge variant="secondary" className="whitespace-nowrap">
                {item.taskCount} {item.taskCount === 1 ? 'task' : 'tasks'}
              </Badge>

              {onClaim && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onClaim(item.sprintId)}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Claim
                </Button>
              )}
            </div>
          </div>
        ))}

        {unassigned.length > 5 && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            ... and {unassigned.length - 5} more sprints with unassigned work
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default UnassignedWorkSection;
