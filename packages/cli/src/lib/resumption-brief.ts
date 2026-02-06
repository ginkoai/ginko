/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-02-05
 * @tags: [resumption-brief, context-synthesis, session-start, epic-018]
 * @related: [context-loader-events.ts, ../commands/start/start-reflection.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [context-loader-events.ts]
 */

/**
 * Resumption Brief Synthesis (EPIC-018 Sprint 1)
 *
 * Transforms raw event data into a structured "resumption brief" that helps
 * AI assistants and human users quickly understand:
 * - What was happening in the last session
 * - Where work stopped
 * - What questions remain open
 * - Which files were touched
 *
 * This replaces the raw status dashboard with actionable resumption context.
 */

import { Event, LoadedContext } from './context-loader-events.js';

/**
 * Resumption brief structure (EPIC-018 Sprint 1 t01)
 *
 * Provides a synthesized view of the last session for quick resumption.
 */
export interface ResumptionBrief {
  lastSession: {
    /** Summarized description of work: "Renamed settings panel, investigating API" */
    summary: string;
    /** Where exactly work stopped: "Checking if 'team' appears in API responses" */
    stoppingPoint: string;
    /** Questions that remain unanswered: ["Should we update member management too?"] */
    openQuestions: string[];
    /** Files modified during the session (unique list) */
    filesModified: string[];
    /** Human-readable session duration: "2h 15m" */
    duration: string;
  };
  /** Important decisions made during the session */
  decisions: Array<{
    description: string;
    timestamp: Date;
  }>;
  /** Insights discovered that may inform future work */
  insights: Array<{
    description: string;
    timestamp: Date;
  }>;
  /** When this brief was synthesized */
  synthesizedAt: Date;
  /** Number of events that were analyzed */
  eventCount: number;
}

/**
 * Options for brief synthesis
 */
export interface SynthesisOptions {
  /** Maximum number of events to analyze (default: 50) */
  maxEvents?: number;
  /** Maximum number of files to include (default: 10) */
  maxFiles?: number;
  /** Include team events in synthesis (default: false) */
  includeTeam?: boolean;
}

/**
 * Synthesize a resumption brief from loaded context (EPIC-018 Sprint 1 t01)
 *
 * Takes the raw events from LoadedContext and produces a structured
 * ResumptionBrief that AI assistants can use to understand session state.
 *
 * @param context - Loaded context from event stream
 * @param options - Synthesis options
 * @returns Synthesized resumption brief
 */
export function synthesizeResumptionBrief(
  context: LoadedContext,
  options: SynthesisOptions = {}
): ResumptionBrief {
  const {
    maxEvents = 50,
    maxFiles = 10,
    includeTeam = false
  } = options;

  // Combine events (my events + optionally team events)
  const allEvents = includeTeam && context.teamEvents
    ? [...context.myEvents, ...context.teamEvents]
    : context.myEvents;

  // Sort by timestamp descending (most recent first)
  const sortedEvents = [...allEvents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxEvents);

  // Extract components
  const summary = generateSessionSummary(sortedEvents);
  const stoppingPoint = findStoppingPoint(sortedEvents);
  const openQuestions = extractOpenQuestions(sortedEvents);
  const filesModified = extractFilesTouched(sortedEvents, maxFiles);
  const duration = calculateSessionDuration(sortedEvents);
  const decisions = extractDecisions(sortedEvents);
  const insights = extractInsights(sortedEvents);

  return {
    lastSession: {
      summary,
      stoppingPoint,
      openQuestions,
      filesModified,
      duration
    },
    decisions,
    insights,
    synthesizedAt: new Date(),
    eventCount: sortedEvents.length
  };
}

/**
 * Generate a summary of the session work (t01)
 *
 * Analyzes events to produce a concise summary like:
 * "Renamed settings panel, investigating API"
 */
function generateSessionSummary(events: Event[]): string {
  if (events.length === 0) {
    return 'No recent session activity';
  }

  // Group events by category
  const features = events.filter(e => e.category === 'feature');
  const fixes = events.filter(e => e.category === 'fix');
  const achievements = events.filter(e => e.category === 'achievement');

  const summaryParts: string[] = [];

  // Prioritize achievements (completed work)
  if (achievements.length > 0) {
    const recentAchievement = achievements[0];
    summaryParts.push(truncateDescription(recentAchievement.description, 50));
  }

  // Add feature work
  if (features.length > 0 && summaryParts.length < 2) {
    const recentFeature = features[0];
    const prefix = summaryParts.length > 0 ? 'working on' : '';
    const desc = truncateDescription(recentFeature.description, 40);
    summaryParts.push(prefix ? `${prefix} ${desc}` : desc);
  }

  // Add fix work
  if (fixes.length > 0 && summaryParts.length < 2) {
    const recentFix = fixes[0];
    const prefix = summaryParts.length > 0 ? 'fixing' : '';
    const desc = truncateDescription(recentFix.description, 40);
    summaryParts.push(prefix ? `${prefix} ${desc}` : desc);
  }

  // Fallback to most recent event
  if (summaryParts.length === 0) {
    summaryParts.push(truncateDescription(events[0].description, 60));
  }

  return summaryParts.join(', ');
}

/**
 * Find where work stopped (t01)
 *
 * Looks at the most recent events to determine the stopping point.
 * Returns something like: "Checking if 'team' appears in API responses"
 */
function findStoppingPoint(events: Event[]): string {
  if (events.length === 0) {
    return 'No stopping point identified';
  }

  // Most recent non-git event is typically where work stopped
  const workEvents = events.filter(e =>
    e.category !== 'git' &&
    e.category !== 'achievement' // Achievements are completed, not stopping points
  );

  if (workEvents.length === 0) {
    // If only git/achievements, last event was probably a commit
    const lastEvent = events[0];
    if (lastEvent.category === 'git') {
      return `Last commit: ${truncateDescription(lastEvent.description, 60)}`;
    }
    if (lastEvent.category === 'achievement') {
      return `Completed: ${truncateDescription(lastEvent.description, 60)}`;
    }
    return truncateDescription(lastEvent.description, 60);
  }

  const stoppingEvent = workEvents[0];

  // Add file context if available
  if (stoppingEvent.files && stoppingEvent.files.length > 0) {
    const mainFile = stoppingEvent.files[0];
    const fileName = mainFile.split('/').pop() || mainFile;
    return `${truncateDescription(stoppingEvent.description, 50)} (in ${fileName})`;
  }

  return truncateDescription(stoppingEvent.description, 60);
}

/**
 * Extract open questions from events (EPIC-018 Sprint 1 t03)
 *
 * Looks for decision/insight events with high impact that might indicate
 * unresolved questions. Also parses descriptions for question patterns.
 */
function extractOpenQuestions(events: Event[]): string[] {
  const questions: string[] = [];
  const seenQuestions = new Set<string>();

  for (const event of events) {
    // Look for explicit questions in descriptions
    const questionPatterns = [
      /\?$/, // Ends with question mark
      /should we/i,
      /need to decide/i,
      /unclear/i,
      /not sure/i,
      /question:/i,
      /todo:/i,
      /tbd/i,
      /investigate/i,
      /figure out/i
    ];

    const hasQuestionIndicator = questionPatterns.some(pattern =>
      pattern.test(event.description)
    );

    // High-impact decisions might indicate open questions
    const isHighImpactDecision =
      event.category === 'decision' &&
      event.impact === 'high';

    // Insights with uncertainty might be open questions
    const isUncertainInsight =
      event.category === 'insight' &&
      (event.description.toLowerCase().includes('maybe') ||
       event.description.toLowerCase().includes('might') ||
       event.description.toLowerCase().includes('could'));

    if (hasQuestionIndicator || isHighImpactDecision || isUncertainInsight) {
      // Extract the question or create one from the description
      let question = event.description;

      // Clean up the question
      if (!question.endsWith('?')) {
        // Convert statement to question if needed
        if (question.toLowerCase().startsWith('should we')) {
          question = question + '?';
        } else if (question.toLowerCase().includes('need to decide')) {
          question = question.replace(/need to decide/i, 'Decision needed:');
        }
      }

      // Deduplicate
      const normalizedQuestion = question.toLowerCase().trim();
      if (!seenQuestions.has(normalizedQuestion)) {
        seenQuestions.add(normalizedQuestion);
        questions.push(truncateDescription(question, 100));
      }
    }
  }

  return questions.slice(0, 5); // Limit to 5 questions
}

/**
 * Extract files touched from events (EPIC-018 Sprint 1 t02)
 *
 * Collects unique files from event.files arrays and returns them
 * sorted by frequency (most touched first).
 */
function extractFilesTouched(events: Event[], maxFiles: number): string[] {
  const fileCount = new Map<string, number>();

  for (const event of events) {
    if (event.files && Array.isArray(event.files)) {
      for (const file of event.files) {
        if (file && typeof file === 'string') {
          const count = fileCount.get(file) || 0;
          fileCount.set(file, count + 1);
        }
      }
    }
  }

  // Sort by frequency (most touched first)
  const sortedFiles = Array.from(fileCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([file]) => file);

  return sortedFiles.slice(0, maxFiles);
}

/**
 * Calculate session duration from events (t01)
 *
 * Returns human-readable duration like "2h 15m"
 */
function calculateSessionDuration(events: Event[]): string {
  if (events.length < 2) {
    return 'Unknown';
  }

  // Events are sorted descending (most recent first)
  const mostRecent = new Date(events[0].timestamp);
  const oldest = new Date(events[events.length - 1].timestamp);

  const durationMs = mostRecent.getTime() - oldest.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));

  if (durationMinutes < 1) {
    return 'Less than 1 minute';
  } else if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  } else {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

/**
 * Extract decisions from events (t01)
 */
function extractDecisions(events: Event[]): Array<{ description: string; timestamp: Date }> {
  return events
    .filter(e => e.category === 'decision')
    .map(e => ({
      description: e.description,
      timestamp: new Date(e.timestamp)
    }))
    .slice(0, 5); // Limit to 5 most recent
}

/**
 * Extract insights from events (t01)
 */
function extractInsights(events: Event[]): Array<{ description: string; timestamp: Date }> {
  return events
    .filter(e => e.category === 'insight')
    .map(e => ({
      description: e.description,
      timestamp: new Date(e.timestamp)
    }))
    .slice(0, 5); // Limit to 5 most recent
}

/**
 * Helper: Truncate description to max length with ellipsis
 */
function truncateDescription(description: string, maxLength: number): string {
  if (description.length <= maxLength) {
    return description;
  }
  return description.substring(0, maxLength - 3) + '...';
}

/**
 * Format resumption brief for human display
 *
 * Converts the structured brief into a readable format.
 */
export function formatResumptionBrief(brief: ResumptionBrief): string {
  const lines: string[] = [];

  lines.push('=== Resumption Brief ===');
  lines.push('');

  // Last session summary
  lines.push(`Summary: ${brief.lastSession.summary}`);
  lines.push(`Stopping point: ${brief.lastSession.stoppingPoint}`);
  lines.push(`Duration: ${brief.lastSession.duration}`);
  lines.push('');

  // Files modified
  if (brief.lastSession.filesModified.length > 0) {
    lines.push('Files touched:');
    for (const file of brief.lastSession.filesModified.slice(0, 5)) {
      lines.push(`  - ${file}`);
    }
    if (brief.lastSession.filesModified.length > 5) {
      lines.push(`  ... and ${brief.lastSession.filesModified.length - 5} more`);
    }
    lines.push('');
  }

  // Open questions
  if (brief.lastSession.openQuestions.length > 0) {
    lines.push('Open questions:');
    for (const question of brief.lastSession.openQuestions) {
      lines.push(`  ? ${question}`);
    }
    lines.push('');
  }

  // Decisions
  if (brief.decisions.length > 0) {
    lines.push('Recent decisions:');
    for (const decision of brief.decisions.slice(0, 3)) {
      lines.push(`  - ${decision.description}`);
    }
    lines.push('');
  }

  // Insights
  if (brief.insights.length > 0) {
    lines.push('Insights:');
    for (const insight of brief.insights.slice(0, 3)) {
      lines.push(`  - ${insight.description}`);
    }
    lines.push('');
  }

  lines.push(`Analyzed ${brief.eventCount} events`);

  return lines.join('\n');
}

/**
 * Format resumption brief for AI context (JSONL entry)
 *
 * Returns a structured object suitable for AI consumption.
 */
export function formatResumptionBriefForAI(brief: ResumptionBrief): object {
  return {
    type: 'resumption_brief',
    timestamp: brief.synthesizedAt.toISOString(),
    lastSession: {
      summary: brief.lastSession.summary,
      stoppingPoint: brief.lastSession.stoppingPoint,
      openQuestions: brief.lastSession.openQuestions,
      filesModified: brief.lastSession.filesModified,
      duration: brief.lastSession.duration
    },
    decisions: brief.decisions.map(d => ({
      description: d.description,
      timestamp: d.timestamp.toISOString()
    })),
    insights: brief.insights.map(i => ({
      description: i.description,
      timestamp: i.timestamp.toISOString()
    })),
    eventCount: brief.eventCount
  };
}
