/**
 * @fileType: test
 * @status: current
 * @updated: 2026-02-15
 * @tags: [test, cloud-guard, local-first, ADR-078]
 * @related: [../../src/utils/cloud-guard.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [jest]
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock auth-storage
jest.mock('../../src/utils/auth-storage.js', () => ({
  isAuthenticated: jest.fn(),
  loadAuthSession: jest.fn(),
}));

import { withOptionalCloud, requireCloud, showCloudUpgradeHint } from '../../src/utils/cloud-guard.js';
import { isAuthenticated, loadAuthSession } from '../../src/utils/auth-storage.js';

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;
const mockLoadAuthSession = loadAuthSession as jest.MockedFunction<typeof loadAuthSession>;

describe('cloud-guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withOptionalCloud', () => {
    it('should return available=true when authenticated', async () => {
      const mockSession = { api_key: 'gk_test', user: { id: '1', email: 'test@example.com' } };
      mockLoadAuthSession.mockResolvedValue(mockSession as any);

      const result = await withOptionalCloud('start');

      expect(result.available).toBe(true);
      expect(result.session).toEqual(mockSession);
    });

    it('should return available=false when not authenticated', async () => {
      mockLoadAuthSession.mockResolvedValue(null);

      const result = await withOptionalCloud('start');

      expect(result.available).toBe(false);
      expect(result.session).toBeNull();
    });

    it('should return available=false on error', async () => {
      mockLoadAuthSession.mockRejectedValue(new Error('disk read failed'));

      const result = await withOptionalCloud('start');

      expect(result.available).toBe(false);
      expect(result.session).toBeNull();
    });

    it('should never throw', async () => {
      mockLoadAuthSession.mockRejectedValue(new Error('catastrophic failure'));

      await expect(withOptionalCloud('handoff')).resolves.toBeDefined();
    });
  });

  describe('requireCloud', () => {
    it('should not exit when authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      await requireCloud('push');

      expect(mockExit).not.toHaveBeenCalled();
      mockExit.mockRestore();
    });

    it('should exit with code 0 when not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await requireCloud('push');

      expect(mockExit).toHaveBeenCalledWith(0);
      mockExit.mockRestore();
      mockLog.mockRestore();
    });

    it('should mention the command name in output', async () => {
      mockIsAuthenticated.mockResolvedValue(false);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      const logOutput: string[] = [];
      const mockLog = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
        logOutput.push(args.join(' '));
      });

      await requireCloud('graph query');

      const fullOutput = logOutput.join('\n');
      expect(fullOutput).toContain('graph query');
      expect(fullOutput).toContain('ginko login');

      mockExit.mockRestore();
      mockLog.mockRestore();
    });
  });

  describe('showCloudUpgradeHint', () => {
    it('should not show hint when authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      await showCloudUpgradeHint('Some feature');

      expect(mockLog).not.toHaveBeenCalled();
      mockLog.mockRestore();
    });
  });
});
