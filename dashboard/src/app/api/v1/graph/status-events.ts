/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-19
 * @tags: [api, events, status-change, epic-015, sprint-0, graph-authoritative]
 * @related: [../task/[id]/status/route.ts, ../sprint/[id]/status/route.ts, ../epic/[id]/status/route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [neo4j-driver]
 */

/**
 * Status Change Event Emission (EPIC-015 Sprint 0 Task 4)
 *
 * Emits events when task/sprint/epic status changes for:
 * - Audit trail
 * - Future webhook/notification support
 * - Activity feeds
 */

import { Session } from 'neo4j-driver';

export interface StatusChangeEvent {
  event_type: 'status_change';
  entity_type: 'task' | 'sprint' | 'epic';
  entity_id: string;
  graph_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at: string;
  reason?: string;
}

/**
 * Generate unique event ID for status changes
 */
function generateEventId(entityType: string, entityId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `evt_status_${entityType}_${entityId}_${timestamp}_${random}`;
}

/**
 * Emit a status change event to the graph
 *
 * Creates an Event node linked to the entity that changed status.
 * This enables:
 * - Status history queries
 * - Activity feeds
 * - Future webhook triggers
 *
 * @param session Neo4j session (caller manages lifecycle)
 * @param event Status change event details
 * @returns Event ID if created, null on failure
 */
export async function emitStatusChangeEvent(
  session: Session,
  event: Omit<StatusChangeEvent, 'event_type'>
): Promise<string | null> {
  const eventId = generateEventId(event.entity_type, event.entity_id);

  try {
    // Skip event if status didn't actually change
    if (event.old_status === event.new_status) {
      console.log('[Status Events] Skipping event - status unchanged:', event.entity_id);
      return null;
    }

    await session.executeWrite(async (tx) => {
      await tx.run(
        `
        // Create status change event
        CREATE (e:Event {
          id: $eventId,
          event_type: 'status_change',
          entity_type: $entityType,
          entity_id: $entityId,
          graph_id: $graphId,
          old_status: $oldStatus,
          new_status: $newStatus,
          changed_by: $changedBy,
          timestamp: datetime($changedAt),
          reason: $reason,
          category: 'status_change',
          description: $description,
          impact: 'medium',
          shared: true
        })

        // Link event to entity
        WITH e
        CALL {
          WITH e
          MATCH (t:Task {id: $entityId, graph_id: $graphId})
          WHERE $entityType = 'task'
          CREATE (t)-[:HAS_EVENT]->(e)
          RETURN t as entity
          UNION
          WITH e
          MATCH (s:Sprint {id: $entityId, graph_id: $graphId})
          WHERE $entityType = 'sprint'
          CREATE (s)-[:HAS_EVENT]->(e)
          RETURN s as entity
          UNION
          WITH e
          MATCH (ep:Epic {id: $entityId, graph_id: $graphId})
          WHERE $entityType = 'epic'
          CREATE (ep)-[:HAS_EVENT]->(e)
          RETURN ep as entity
        }

        RETURN e.id as eventId
        `,
        {
          eventId,
          entityType: event.entity_type,
          entityId: event.entity_id,
          graphId: event.graph_id,
          oldStatus: event.old_status,
          newStatus: event.new_status,
          changedBy: event.changed_by,
          changedAt: event.changed_at,
          reason: event.reason || null,
          description: `${event.entity_type} ${event.entity_id}: ${event.old_status} → ${event.new_status}`,
        }
      );
    });

    console.log('[Status Events] Event emitted:', eventId, event.entity_type, event.entity_id);
    return eventId;

  } catch (error) {
    // Don't fail the status update if event creation fails
    console.warn('[Status Events] Failed to emit event:', error);
    return null;
  }
}

/**
 * Query status change history for an entity
 *
 * @param session Neo4j session
 * @param entityType Type of entity
 * @param entityId Entity ID
 * @param graphId Graph ID
 * @param limit Max events to return
 * @returns Array of status change events
 */
export async function getStatusHistory(
  session: Session,
  entityType: 'task' | 'sprint' | 'epic',
  entityId: string,
  graphId: string,
  limit: number = 50
): Promise<StatusChangeEvent[]> {
  try {
    const result = await session.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (e:Event {
          event_type: 'status_change',
          entity_type: $entityType,
          entity_id: $entityId,
          graph_id: $graphId
        })
        RETURN e.id as id,
               e.entity_type as entity_type,
               e.entity_id as entity_id,
               e.graph_id as graph_id,
               e.old_status as old_status,
               e.new_status as new_status,
               e.changed_by as changed_by,
               e.timestamp as changed_at,
               e.reason as reason
        ORDER BY e.timestamp DESC
        LIMIT $limit
        `,
        { entityType, entityId, graphId, limit }
      );
    });

    return result.records.map(record => ({
      event_type: 'status_change' as const,
      entity_type: record.get('entity_type'),
      entity_id: record.get('entity_id'),
      graph_id: record.get('graph_id'),
      old_status: record.get('old_status'),
      new_status: record.get('new_status'),
      changed_by: record.get('changed_by'),
      changed_at: record.get('changed_at')?.toString() || '',
      reason: record.get('reason') || undefined,
    }));

  } catch (error) {
    console.error('[Status Events] Failed to get history:', error);
    return [];
  }
}
