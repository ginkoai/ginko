/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-30
 * @tags: [insights, scheduler, auto-update, coaching]
 * @related: [./index.ts, ../../commands/start/start-reflection.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

import fs from 'fs-extra';
import * as path from 'path';
import { getGinkoDir, getUserEmail } from '../../utils/helpers.js';

/**
 * Configuration for scheduled insights runs.
 */
export interface InsightsScheduleConfig {
  day1: ScheduleEntry;
  day7: ScheduleEntry;
  day30: ScheduleEntry;
}

export interface ScheduleEntry {
  intervalMs: number;  // How often to run (in ms)
  lastRun?: string;    // ISO timestamp of last run
  lastScore?: number;  // Score from last run
}

/**
 * Default schedule configuration.
 * - 1-day insights: Run every 24 hours
 * - 7-day insights: Run every 24 hours (aggregates last 7 days)
 * - 30-day insights: Run every 7 days (aggregates last 30 days)
 */
const DEFAULT_SCHEDULE: InsightsScheduleConfig = {
  day1: { intervalMs: 24 * 60 * 60 * 1000 },  // 24 hours
  day7: { intervalMs: 24 * 60 * 60 * 1000 },  // 24 hours
  day30: { intervalMs: 7 * 24 * 60 * 60 * 1000 },  // 7 days
};

/**
 * Get the path to the insights schedule file.
 */
async function getSchedulePath(): Promise<string> {
  const ginkoDir = await getGinkoDir();
  const userEmail = await getUserEmail();
  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
  return path.join(ginkoDir, 'sessions', userSlug, 'insights-schedule.json');
}

/**
 * Load the current schedule configuration.
 */
export async function loadSchedule(): Promise<InsightsScheduleConfig> {
  try {
    const schedulePath = await getSchedulePath();
    if (await fs.pathExists(schedulePath)) {
      const data = await fs.readJson(schedulePath);
      return {
        day1: { ...DEFAULT_SCHEDULE.day1, ...data.day1 },
        day7: { ...DEFAULT_SCHEDULE.day7, ...data.day7 },
        day30: { ...DEFAULT_SCHEDULE.day30, ...data.day30 },
      };
    }
  } catch {
    // Return default on any error
  }
  return { ...DEFAULT_SCHEDULE };
}

/**
 * Save the schedule configuration.
 */
export async function saveSchedule(schedule: InsightsScheduleConfig): Promise<void> {
  const schedulePath = await getSchedulePath();
  await fs.ensureDir(path.dirname(schedulePath));
  await fs.writeJson(schedulePath, schedule, { spaces: 2 });
}

/**
 * Check which insights periods need to be refreshed.
 * Returns an array of period names that should be run.
 */
export async function checkSchedule(): Promise<Array<'day1' | 'day7' | 'day30'>> {
  const schedule = await loadSchedule();
  const now = Date.now();
  const periodsToRun: Array<'day1' | 'day7' | 'day30'> = [];

  for (const [period, entry] of Object.entries(schedule) as Array<['day1' | 'day7' | 'day30', ScheduleEntry]>) {
    const lastRun = entry.lastRun ? new Date(entry.lastRun).getTime() : 0;
    const elapsed = now - lastRun;

    if (elapsed >= entry.intervalMs) {
      periodsToRun.push(period);
    }
  }

  return periodsToRun;
}

/**
 * Record that an insights run completed for a specific period.
 */
export async function recordRun(
  period: 'day1' | 'day7' | 'day30',
  score: number
): Promise<void> {
  const schedule = await loadSchedule();
  schedule[period] = {
    ...schedule[period],
    lastRun: new Date().toISOString(),
    lastScore: score,
  };
  await saveSchedule(schedule);
}

/**
 * Get the last known scores for trend display.
 */
export async function getLastScores(): Promise<{
  day1?: { score: number; runAt: string };
  day7?: { score: number; runAt: string };
  day30?: { score: number; runAt: string };
}> {
  const schedule = await loadSchedule();
  const result: ReturnType<typeof getLastScores> extends Promise<infer T> ? T : never = {};

  if (schedule.day1.lastRun && schedule.day1.lastScore !== undefined) {
    result.day1 = { score: schedule.day1.lastScore, runAt: schedule.day1.lastRun };
  }
  if (schedule.day7.lastRun && schedule.day7.lastScore !== undefined) {
    result.day7 = { score: schedule.day7.lastScore, runAt: schedule.day7.lastRun };
  }
  if (schedule.day30.lastRun && schedule.day30.lastScore !== undefined) {
    result.day30 = { score: schedule.day30.lastScore, runAt: schedule.day30.lastRun };
  }

  return result;
}

/**
 * Map period names to the --days flag value for the insights command.
 */
export function getPeriodDays(period: 'day1' | 'day7' | 'day30'): number {
  switch (period) {
    case 'day1': return 1;
    case 'day7': return 7;
    case 'day30': return 30;
  }
}

export default {
  loadSchedule,
  saveSchedule,
  checkSchedule,
  recordRun,
  getLastScores,
  getPeriodDays,
};
