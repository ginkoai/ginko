/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-09
 * @tags: [quarter, date, roadmap, validation]
 * @related: [types/roadmap.ts, ADR-056]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

// =============================================================================
// Quarter Utilities (ADR-056: Roadmap as Epic View)
// =============================================================================

/**
 * Regex pattern for quarter format: Q{1-4}-{YYYY}
 * Examples: Q1-2026, Q4-2025
 */
export const QUARTER_REGEX = /^Q[1-4]-\d{4}$/;

/**
 * Parsed quarter representation
 */
export interface ParsedQuarter {
  year: number;
  quarter: number; // 1-4
}

/**
 * Parse a quarter string into year and quarter components
 * @param q Quarter string in format "Q{1-4}-{YYYY}"
 * @returns Parsed quarter object
 * @throws Error if format is invalid
 *
 * @example
 * parseQuarter("Q1-2026") // { year: 2026, quarter: 1 }
 * parseQuarter("Q4-2025") // { year: 2025, quarter: 4 }
 */
export function parseQuarter(q: string): ParsedQuarter {
  if (!QUARTER_REGEX.test(q)) {
    throw new Error(`Invalid quarter format: "${q}". Expected Q{1-4}-{YYYY} (e.g., Q1-2026)`);
  }

  const quarter = parseInt(q.charAt(1), 10);
  const year = parseInt(q.slice(3), 10);

  return { year, quarter };
}

/**
 * Format year and quarter into standard quarter string
 * @param year Full year (e.g., 2026)
 * @param quarter Quarter number (1-4)
 * @returns Formatted quarter string
 * @throws Error if quarter is not 1-4
 *
 * @example
 * formatQuarter(2026, 1) // "Q1-2026"
 * formatQuarter(2025, 4) // "Q4-2025"
 */
export function formatQuarter(year: number, quarter: number): string {
  if (quarter < 1 || quarter > 4) {
    throw new Error(`Invalid quarter number: ${quarter}. Must be 1-4`);
  }

  return `Q${quarter}-${year}`;
}

/**
 * Compare two quarters for sorting
 * @param a First quarter string
 * @param b Second quarter string
 * @returns Negative if a < b, positive if a > b, 0 if equal
 *
 * @example
 * compareQuarters("Q1-2026", "Q2-2026") // -1 (Q1 before Q2)
 * compareQuarters("Q4-2025", "Q1-2026") // -1 (2025 before 2026)
 * compareQuarters("Q1-2026", "Q1-2026") // 0 (equal)
 */
export function compareQuarters(a: string, b: string): number {
  const parsedA = parseQuarter(a);
  const parsedB = parseQuarter(b);

  // Compare years first
  if (parsedA.year !== parsedB.year) {
    return parsedA.year - parsedB.year;
  }

  // Same year, compare quarters
  return parsedA.quarter - parsedB.quarter;
}

/**
 * Get the current quarter based on today's date
 * @returns Current quarter string
 *
 * @example
 * // If today is January 15, 2026
 * getCurrentQuarter() // "Q1-2026"
 */
export function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // Q1: Jan-Mar (1-3), Q2: Apr-Jun (4-6), Q3: Jul-Sep (7-9), Q4: Oct-Dec (10-12)
  const quarter = Math.ceil(month / 3);

  return formatQuarter(year, quarter);
}

/**
 * Add quarters to a given quarter string
 * @param q Starting quarter string
 * @param n Number of quarters to add (can be negative)
 * @returns Resulting quarter string
 *
 * @example
 * addQuarters("Q1-2026", 1)  // "Q2-2026"
 * addQuarters("Q4-2025", 1)  // "Q1-2026"
 * addQuarters("Q1-2026", -1) // "Q4-2025"
 * addQuarters("Q1-2026", 4)  // "Q1-2027"
 */
export function addQuarters(q: string, n: number): string {
  const parsed = parseQuarter(q);

  // Total quarters from year 0
  const totalQuarters = parsed.year * 4 + (parsed.quarter - 1) + n;

  const newYear = Math.floor(totalQuarters / 4);
  const newQuarter = (totalQuarters % 4) + 1;

  return formatQuarter(newYear, newQuarter);
}

/**
 * Check if a quarter string is valid
 * @param q Quarter string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidQuarter("Q1-2026") // true
 * isValidQuarter("Q5-2026") // false
 * isValidQuarter("2026-Q1") // false
 */
export function isValidQuarter(q: string): boolean {
  return QUARTER_REGEX.test(q);
}

/**
 * Get the number of quarters between two quarter strings
 * @param start Start quarter
 * @param end End quarter
 * @returns Number of quarters (positive if end > start)
 *
 * @example
 * quartersBetween("Q1-2026", "Q4-2026") // 3
 * quartersBetween("Q1-2026", "Q1-2027") // 4
 * quartersBetween("Q4-2026", "Q1-2026") // -3
 */
export function quartersBetween(start: string, end: string): number {
  const parsedStart = parseQuarter(start);
  const parsedEnd = parseQuarter(end);

  const startTotal = parsedStart.year * 4 + parsedStart.quarter;
  const endTotal = parsedEnd.year * 4 + parsedEnd.quarter;

  return endTotal - startTotal;
}

/**
 * Get the start date of a quarter (first day of first month)
 * @param q Quarter string
 * @returns Date object for first day of quarter
 *
 * @example
 * getQuarterStartDate("Q1-2026") // Date(2026, 0, 1) = Jan 1, 2026
 * getQuarterStartDate("Q3-2026") // Date(2026, 6, 1) = Jul 1, 2026
 */
export function getQuarterStartDate(q: string): Date {
  const parsed = parseQuarter(q);
  const month = (parsed.quarter - 1) * 3; // 0, 3, 6, or 9

  return new Date(parsed.year, month, 1);
}

/**
 * Get the end date of a quarter (last day of last month)
 * @param q Quarter string
 * @returns Date object for last day of quarter
 *
 * @example
 * getQuarterEndDate("Q1-2026") // Date(2026, 2, 31) = Mar 31, 2026
 * getQuarterEndDate("Q4-2026") // Date(2026, 11, 31) = Dec 31, 2026
 */
export function getQuarterEndDate(q: string): Date {
  const parsed = parseQuarter(q);
  const endMonth = parsed.quarter * 3; // 3, 6, 9, or 12

  // Get last day by going to first of next month and subtracting a day
  return new Date(parsed.year, endMonth, 0);
}

/**
 * Check if a quarter is in the far future (> 2 years from now)
 * Used for warning about overly optimistic planning
 * @param q Quarter string
 * @returns true if more than 8 quarters (2 years) in the future
 *
 * @example
 * // If current quarter is Q1-2026
 * isFarFuture("Q1-2028") // true (8 quarters away)
 * isFarFuture("Q4-2027") // false (7 quarters away)
 */
export function isFarFuture(q: string): boolean {
  const current = getCurrentQuarter();
  const diff = quartersBetween(current, q);

  return diff > 8; // More than 2 years (8 quarters)
}
