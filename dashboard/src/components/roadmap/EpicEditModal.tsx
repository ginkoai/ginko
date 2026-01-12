/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, epic-edit, modal, decision-factors, ADR-056]
 * @related: [RoadmapCanvas.tsx, DecisionFactorSelector.tsx, EpicCard.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react, @radix-ui/react-dialog]
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Circle,
  CircleDot,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
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
import { DecisionFactorSelector } from './DecisionFactorSelector';
import type { RoadmapLane, DecisionFactor } from '@/lib/graph/types';
import type { RoadmapEpic } from './RoadmapCanvas';

// =============================================================================
// Types
// =============================================================================

interface EpicEditModalProps {
  epic: RoadmapEpic | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: EpicRoadmapUpdate) => Promise<void>;
}

export interface EpicRoadmapUpdate {
  roadmap_lane?: RoadmapLane;
  roadmap_status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  decision_factors?: DecisionFactor[];
  roadmap_visible?: boolean;
  changelog_reason?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const LANES: { value: RoadmapLane; label: string; description: string; color: string }[] = [
  { value: 'now', label: 'Now', description: 'Ready for immediate work', color: 'border-green-500' },
  { value: 'next', label: 'Next', description: 'Committed, waiting to start', color: 'border-blue-500' },
  { value: 'later', label: 'Later', description: 'Proposed, needs decisions', color: 'border-gray-500' },
  { value: 'done', label: 'Done', description: 'Completed work', color: 'border-green-600' },
  { value: 'dropped', label: 'Dropped', description: 'Cancelled or abandoned', color: 'border-red-500' },
];

const STATUSES: { value: string; label: string; icon: typeof Circle; iconClass: string }[] = [
  { value: 'not_started', label: 'Not Started', icon: Circle, iconClass: 'text-muted-foreground' },
  { value: 'in_progress', label: 'In Progress', icon: CircleDot, iconClass: 'text-primary' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, iconClass: 'text-green-500' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, iconClass: 'text-red-400' },
];

// =============================================================================
// Component
// =============================================================================

export function EpicEditModal({ epic, isOpen, onClose, onSave }: EpicEditModalProps) {
  // Form state
  const [lane, setLane] = useState<RoadmapLane>('later');
  const [status, setStatus] = useState<string>('not_started');
  const [decisionFactors, setDecisionFactors] = useState<DecisionFactor[]>([]);
  const [visible, setVisible] = useState(true);
  const [changeReason, setChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize form when epic changes
  useEffect(() => {
    if (epic) {
      setLane(epic.roadmap_lane || 'later');
      setStatus(epic.roadmap_status || 'not_started');
      setDecisionFactors(epic.decision_factors || []);
      setVisible(epic.roadmap_visible ?? true);
      setChangeReason('');
      setValidationError(null);
    }
  }, [epic]);

  // Validation: Now lane requires cleared decision factors
  const canSelectNow = decisionFactors.length === 0;

  // Handle lane change with validation
  const handleLaneChange = useCallback((newLane: RoadmapLane) => {
    if (newLane === 'now' && !canSelectNow) {
      setValidationError('Clear all decision factors before moving to Now');
      return;
    }
    setValidationError(null);
    setLane(newLane);
  }, [canSelectNow]);

  // When factors change, validate current lane
  useEffect(() => {
    if (lane === 'now' && decisionFactors.length > 0) {
      setValidationError('Now lane requires all decision factors to be cleared');
    } else {
      setValidationError(null);
    }
  }, [lane, decisionFactors]);

  // Handle save
  const handleSave = async () => {
    if (!epic) return;

    // Final validation
    if (lane === 'now' && decisionFactors.length > 0) {
      setValidationError('Clear all decision factors before moving to Now');
      return;
    }

    setIsSaving(true);
    try {
      const updates: EpicRoadmapUpdate = {};

      // Only include changed fields
      if (lane !== epic.roadmap_lane) updates.roadmap_lane = lane;
      if (status !== epic.roadmap_status) updates.roadmap_status = status as EpicRoadmapUpdate['roadmap_status'];

      const factorsChanged = JSON.stringify(decisionFactors.sort()) !==
        JSON.stringify((epic.decision_factors || []).sort());
      if (factorsChanged) updates.decision_factors = decisionFactors;

      if (visible !== epic.roadmap_visible) updates.roadmap_visible = visible;
      if (changeReason.trim()) updates.changelog_reason = changeReason.trim();

      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Failed to save epic:', error);
      setValidationError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Extract display ID
  const displayId = epic?.id.toUpperCase().replace(/^E(\d+)/, 'EPIC-$1') || '';

  // Check if any changes were made
  const hasChanges = epic && (
    lane !== epic.roadmap_lane ||
    status !== epic.roadmap_status ||
    JSON.stringify(decisionFactors.sort()) !== JSON.stringify((epic.decision_factors || []).sort()) ||
    visible !== epic.roadmap_visible ||
    changeReason.trim().length > 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            <span className="text-muted-foreground font-mono text-base mr-2">{displayId}</span>
            {epic?.title}
          </DialogTitle>
          <DialogDescription>
            Edit roadmap properties for this epic
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* Lane Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority Lane</label>
            <div className="grid grid-cols-5 gap-2">
              {LANES.map(({ value, label, description, color }) => {
                const isSelected = lane === value;
                const isDisabled = value === 'now' && !canSelectNow;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleLaneChange(value)}
                    disabled={isDisabled}
                    className={`
                      relative p-3 rounded-lg border-2 text-center transition-all
                      ${isSelected ? `${color} bg-secondary` : 'border-transparent bg-card hover:bg-secondary/50'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    title={isDisabled ? 'Clear decision factors first' : description}
                  >
                    <div className="text-sm font-medium">{label}</div>
                    {isDisabled && (
                      <AlertTriangle className="absolute top-1 right-1 w-3 h-3 text-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
            {epic && lane !== epic.roadmap_lane && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="font-mono">{epic.roadmap_lane?.toUpperCase()}</span>
                <ArrowRight className="w-3 h-3" />
                <span className="font-mono text-primary">{lane.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Status Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <div className="grid grid-cols-4 gap-2">
              {STATUSES.map(({ value, label, icon: Icon, iconClass }) => {
                const isSelected = status === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    className={`
                      flex items-center gap-2 p-3 rounded-lg border transition-all
                      ${isSelected ? 'border-primary bg-secondary' : 'border-transparent bg-card hover:bg-secondary/50'}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${iconClass}`} />
                    <span className="text-sm">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Decision Factors (only relevant for Later lane) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Decision Factors</label>
              {lane !== 'later' && decisionFactors.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Usually used with Later lane
                </span>
              )}
            </div>
            <DecisionFactorSelector
              selected={decisionFactors}
              onChange={setDecisionFactors}
            />
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3">
              {visible ? (
                <Eye className="w-5 h-5 text-muted-foreground" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <div className="text-sm font-medium">
                  {visible ? 'Public' : 'Internal Only'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {visible
                    ? 'Visible in public roadmap views'
                    : 'Hidden from external viewers'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className={`
                relative w-11 h-6 rounded-full transition-colors
                ${visible ? 'bg-primary' : 'bg-muted'}
              `}
            >
              <div
                className={`
                  absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                  ${visible ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Change Reason (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Change Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Why are you making this change? (for changelog)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm
                resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <span className="text-sm text-destructive">{validationError}</span>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !!validationError || !hasChanges}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EpicEditModal;
