/**
 * @fileType: page
 * @status: current
 * @updated: 2026-01-26
 * @tags: [dashboard, team, status, visibility, epic-016, sprint-3]
 * @related: [../layout.tsx, TeamStatusGrid.tsx, MemberStatusCard.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, next]
 */

/**
 * Team Status Dashboard (EPIC-016 Sprint 3 Task 4)
 *
 * Visual dashboard showing:
 * - Team member progress with sprint details
 * - Activity indicators (active/idle/offline)
 * - Unassigned work summary with claim buttons
 */

'use client';

import { useUserGraph } from '@/contexts/UserGraphContext';
import { TeamStatusGrid } from '@/components/team/TeamStatusGrid';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users, AlertCircle } from 'lucide-react';

export default function TeamStatusPage() {
  const { graphId, isLoading, error } = useUserGraph();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <section>
          <h1 className="text-3xl font-bold text-gray-900">Team Status</h1>
          <p className="text-gray-600 mt-2">
            Monitor team progress and unassigned work
          </p>
        </section>

        <Card className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8 animate-fade-in">
        <section>
          <h1 className="text-3xl font-bold text-gray-900">Team Status</h1>
          <p className="text-gray-600 mt-2">
            Monitor team progress and unassigned work
          </p>
        </section>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-red-600">
            <AlertCircle className="h-8 w-8 mb-3" />
            <p className="font-medium">Error loading project</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No project state
  if (!graphId) {
    return (
      <div className="space-y-8 animate-fade-in">
        <section>
          <h1 className="text-3xl font-bold text-gray-900">Team Status</h1>
          <p className="text-gray-600 mt-2">
            Monitor team progress and unassigned work
          </p>
        </section>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-gray-900">No project selected</h3>
            <p className="text-sm mt-1">
              Initialize a project with <code className="bg-gray-100 px-2 py-1 rounded">ginko init</code> to see team status.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h1 className="text-3xl font-bold text-gray-900">Team Status</h1>
        <p className="text-gray-600 mt-2">
          Monitor team progress and unassigned work
        </p>
      </section>

      <TeamStatusGrid graphId={graphId} />
    </div>
  );
}
