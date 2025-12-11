/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-11
 * @tags: [utility, classnames, cn]
 * @related: []
 * @priority: high
 * @complexity: low
 * @dependencies: [clsx]
 */

import { clsx, type ClassValue } from 'clsx';

/**
 * Utility for constructing className strings conditionally.
 * Similar to the shadcn/ui pattern but without tailwind-merge for simplicity.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
