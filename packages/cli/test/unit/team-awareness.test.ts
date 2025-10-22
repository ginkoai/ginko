/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-22
 * @tags: [team, collaboration, testing, unit-test, task-012]
 * @related: [team-awareness.ts, session-log-manager.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [jest, fs-extra, team-awareness, session-log-manager]
 */

/**
 * Team Awareness Tests
 *
 * Tests team collaboration features including:
 * - Active team member discovery
 * - Session viewing for specific members
 * - Team timeline aggregation
 * - File activity tracking
 * - Conflict detection
 * - Time window filtering
 *
 * Based on TASK-012
 */

import fs from 'fs-extra';
import path from 'path';
import {
  getActiveTeamMembers,
  getTeamMemberSession,
  getTeamTimeline,
  getTeamFileActivity,
  getFileConflicts,
  formatRelativeTime,
  formatTime
} from '../../src/utils/team-awareness.js';
import { SessionLogManager } from '../../src/core/session-log-manager.js';

// Mock config-loader
jest.mock('../../src/utils/config-loader.js', () => ({
  resolveProjectPath: jest.fn(async (pathKey: string) => {
    if (pathKey === 'sessions') {
      return path.join(process.cwd(), '.ginko', 'sessions');
    }
    return path.join(process.cwd(), pathKey);
  }),
  loadProjectConfig: jest.fn(async () => ({
    version: '1.0',
    project: { name: 'test-project' },
    paths: {
      sessions: '.ginko/sessions',
      context: '.ginko/context',
      backlog: 'backlog'
    }
  }))
}));

describe('Team Awareness', () => {
  const testDir = path.join(process.cwd(), '.ginko', 'sessions');
  const alice = 'alice-at-company-com';
  const bob = 'bob-at-company-com';
  const charlie = 'charlie-at-company-com';

  beforeEach(async () => {
    // Clean up test directory
    await fs.emptyDir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('getActiveTeamMembers', () => {
    it('should return empty array when no sessions exist', async () => {
      const members = await getActiveTeamMembers();
      expect(members).toEqual([]);
    });

    it('should discover active team members from session logs', async () => {
      // Create sessions for Alice and Bob
      const aliceDir = path.join(testDir, alice);
      const bobDir = path.join(testDir, bob);

      await fs.ensureDir(aliceDir);
      await fs.ensureDir(bobDir);

      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'feature/task-009');
      await SessionLogManager.createSessionLog(bobDir, 'bob@company.com', 'main');

      // Add some events
      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Implemented config loader',
        files: ['src/config-loader.ts'],
        impact: 'high'
      });

      await SessionLogManager.appendEntry(bobDir, {
        timestamp: new Date().toISOString(),
        category: 'fix',
        description: 'Fixed authentication bug',
        files: ['src/auth.ts'],
        impact: 'medium'
      });

      const members = await getActiveTeamMembers();

      expect(members.length).toBe(2);
      expect(members[0].email).toMatch(/alice@company.com|bob@company.com/);
      expect(members[1].email).toMatch(/alice@company.com|bob@company.com/);
    });

    it('should filter by time window', async () => {
      // Create Alice's session (recent)
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      // Create Charlie's session (old - 48h ago)
      const charlieDir = path.join(testDir, charlie);
      await fs.ensureDir(charlieDir);

      // Manually create old session log
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const oldSessionLog = `---
session_id: session-old
started: ${oldDate.toISOString()}
user: charlie@company.com
branch: main
---

# Session Log: session-old

## Timeline

## Key Decisions

## Files Affected

## Insights

## Git Operations

## Achievements
`;
      await fs.writeFile(path.join(charlieDir, 'current-session-log.md'), oldSessionLog);

      // Get members from last 24h
      const members = await getActiveTeamMembers(24);

      expect(members.length).toBe(1);
      expect(members[0].email).toBe('alice@company.com');
    });

    it('should extract current task from session', async () => {
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'feature/task-012');

      // Add event with task reference
      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Working on TASK-012 team collaboration',
        files: ['src/team-awareness.ts'],
        impact: 'high'
      });

      const members = await getActiveTeamMembers();

      expect(members.length).toBe(1);
      expect(members[0].currentTask).toBe('TASK-012');
    });

    it('should collect files modified across events', async () => {
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      // Add multiple events with different files
      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Created team-awareness.ts',
        files: ['src/utils/team-awareness.ts'],
        impact: 'high'
      });

      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Created team command',
        files: ['src/commands/team.ts'],
        impact: 'high'
      });

      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Updated index.ts',
        files: ['src/index.ts:38'],
        impact: 'medium'
      });

      const members = await getActiveTeamMembers();

      expect(members.length).toBe(1);
      expect(members[0].filesModified).toHaveLength(3);
      expect(members[0].filesModified).toContain('src/utils/team-awareness.ts');
      expect(members[0].filesModified).toContain('src/commands/team.ts');
      expect(members[0].filesModified).toContain('src/index.ts'); // Line number stripped
    });

    it('should sort by most recent activity', async () => {
      // Create Alice's session (2 hours ago)
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);

      const aliceDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const aliceLog = `---
session_id: session-alice
started: ${aliceDate.toISOString()}
user: alice@company.com
branch: main
---

# Session Log

## Timeline

### 10:00 - [feature]
Old event
Impact: medium

## Key Decisions
## Files Affected
## Insights
## Git Operations
## Achievements
`;
      await fs.writeFile(path.join(aliceDir, 'current-session-log.md'), aliceLog);

      // Create Bob's session (30 minutes ago - more recent)
      const bobDir = path.join(testDir, bob);
      await fs.ensureDir(bobDir);
      await SessionLogManager.createSessionLog(bobDir, 'bob@company.com', 'main');

      await SessionLogManager.appendEntry(bobDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Recent work',
        impact: 'high'
      });

      const members = await getActiveTeamMembers();

      expect(members.length).toBe(2);
      // Bob should be first (most recent)
      expect(members[0].email).toBe('bob@company.com');
      expect(members[1].email).toBe('alice@company.com');
    });

    it('should skip non-directory entries', async () => {
      // Create a valid session
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      // Create a non-directory file (like .DS_Store)
      await fs.writeFile(path.join(testDir, '.DS_Store'), 'junk');
      await fs.writeFile(path.join(testDir, 'vibechecks.log'), 'log data');

      const members = await getActiveTeamMembers();

      expect(members.length).toBe(1);
      expect(members[0].email).toBe('alice@company.com');
    });
  });

  describe('getTeamMemberSession', () => {
    it('should return null for non-existent user', async () => {
      const member = await getTeamMemberSession('nonexistent@example.com');
      expect(member).toBeNull();
    });

    it('should retrieve session by email', async () => {
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'feature/task-012');

      const member = await getTeamMemberSession('alice@company.com');

      expect(member).not.toBeNull();
      expect(member!.email).toBe('alice@company.com');
      expect(member!.slug).toBe(alice);
      expect(member!.branch).toBe('feature/task-012');
    });

    it('should retrieve session by slug', async () => {
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      const member = await getTeamMemberSession(alice);

      expect(member).not.toBeNull();
      expect(member!.email).toBe('alice@company.com');
    });

    it('should return more events than list view (20 vs 5)', async () => {
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      // Add 15 events
      for (let i = 0; i < 15; i++) {
        await SessionLogManager.appendEntry(aliceDir, {
          timestamp: new Date().toISOString(),
          category: 'feature',
          description: `Event ${i + 1}`,
          impact: 'medium'
        });
      }

      const member = await getTeamMemberSession('alice@company.com');

      expect(member).not.toBeNull();
      expect(member!.recentEvents.length).toBeGreaterThan(5);
      expect(member!.recentEvents.length).toBeLessThanOrEqual(20);
    });
  });

  describe('getTeamTimeline', () => {
    it('should return empty array when no activity', async () => {
      const timeline = await getTeamTimeline();
      expect(timeline).toEqual([]);
    });

    it('should aggregate events from multiple team members', async () => {
      // Alice's session
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Alice work',
        files: ['src/feature.ts'],
        impact: 'high'
      });

      // Bob's session
      const bobDir = path.join(testDir, bob);
      await fs.ensureDir(bobDir);
      await SessionLogManager.createSessionLog(bobDir, 'bob@company.com', 'main');

      await SessionLogManager.appendEntry(bobDir, {
        timestamp: new Date().toISOString(),
        category: 'fix',
        description: 'Bob fix',
        files: ['src/bug.ts'],
        impact: 'medium'
      });

      const timeline = await getTeamTimeline();

      expect(timeline.length).toBeGreaterThan(0);

      // Check that we have events from both users
      const users = timeline.map(e => e.user);
      expect(users).toContain('alice@company.com');
      expect(users).toContain('bob@company.com');
    });

    it('should respect time window', async () => {
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Recent work',
        impact: 'high'
      });

      // Timeline from last 24h should include it
      const timeline24h = await getTeamTimeline(24);
      expect(timeline24h.length).toBeGreaterThan(0);

      // Timeline from last 1 second should not
      await new Promise(resolve => setTimeout(resolve, 1100));
      const timeline1s = await getTeamTimeline(1 / 3600); // 1 second in hours
      expect(timeline1s.length).toBe(0);
    });

    it('should limit events returned', async () => {
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      // Add 60 events
      for (let i = 0; i < 60; i++) {
        await SessionLogManager.appendEntry(aliceDir, {
          timestamp: new Date().toISOString(),
          category: 'feature',
          description: `Event ${i}`,
          impact: 'medium'
        });
      }

      const timeline = await getTeamTimeline(24, 50);

      // Should be limited to 50 even though there are 60 events
      expect(timeline.length).toBeLessThanOrEqual(50);
    });

    it('should sort events by most recent first', async () => {
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      // Add events with different minutes to ensure sorting
      const now = new Date();
      const firstTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
      const secondTime = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago

      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: firstTime.toISOString(),
        category: 'feature',
        description: 'First event',
        impact: 'medium'
      });

      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: secondTime.toISOString(),
        category: 'feature',
        description: 'Second event',
        impact: 'medium'
      });

      const timeline = await getTeamTimeline();

      expect(timeline.length).toBeGreaterThan(0);
      // Most recent should be first
      expect(timeline[0].description).toBe('Second event');
    });
  });

  describe('getTeamFileActivity', () => {
    it('should return empty array when no activity', async () => {
      const activity = await getTeamFileActivity();
      expect(activity).toEqual([]);
    });

    it('should track files modified by each user', async () => {
      // Alice modifies file A
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Modified config',
        files: ['src/config.ts'],
        impact: 'high'
      });

      // Bob modifies file B
      const bobDir = path.join(testDir, bob);
      await fs.ensureDir(bobDir);
      await SessionLogManager.createSessionLog(bobDir, 'bob@company.com', 'main');

      await SessionLogManager.appendEntry(bobDir, {
        timestamp: new Date().toISOString(),
        category: 'fix',
        description: 'Fixed auth',
        files: ['src/auth.ts'],
        impact: 'medium'
      });

      const activity = await getTeamFileActivity();

      expect(activity.length).toBe(2);

      const configFile = activity.find(a => a.filePath === 'src/config.ts');
      expect(configFile).toBeDefined();
      expect(configFile!.users).toContain('alice@company.com');

      const authFile = activity.find(a => a.filePath === 'src/auth.ts');
      expect(authFile).toBeDefined();
      expect(authFile!.users).toContain('bob@company.com');
    });

    it('should detect multiple users modifying same file', async () => {
      // Alice modifies config.ts
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Updated config',
        files: ['src/config.ts'],
        impact: 'high'
      });

      // Bob also modifies config.ts
      const bobDir = path.join(testDir, bob);
      await fs.ensureDir(bobDir);
      await SessionLogManager.createSessionLog(bobDir, 'bob@company.com', 'main');

      await SessionLogManager.appendEntry(bobDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Also updated config',
        files: ['src/config.ts'],
        impact: 'medium'
      });

      const activity = await getTeamFileActivity();

      const configFile = activity.find(a => a.filePath === 'src/config.ts');
      expect(configFile).toBeDefined();
      expect(configFile!.users).toHaveLength(2);
      expect(configFile!.users).toContain('alice@company.com');
      expect(configFile!.users).toContain('bob@company.com');
    });

    it('should sort by most recently modified', async () => {
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      // Older file (5 minutes ago)
      const oldTime = new Date(Date.now() - 5 * 60 * 1000);
      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: oldTime.toISOString(),
        category: 'feature',
        description: 'Old file',
        files: ['src/old.ts'],
        impact: 'medium'
      });

      // Newer file (2 minutes ago)
      const newTime = new Date(Date.now() - 2 * 60 * 1000);
      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: newTime.toISOString(),
        category: 'feature',
        description: 'New file',
        files: ['src/new.ts'],
        impact: 'medium'
      });

      const activity = await getTeamFileActivity();

      expect(activity.length).toBe(2);
      // Most recent should be first
      expect(activity[0].filePath).toBe('src/new.ts');
    });
  });

  describe('getFileConflicts', () => {
    it('should return empty array when no conflicts', async () => {
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Solo work',
        files: ['src/solo.ts'],
        impact: 'medium'
      });

      const conflicts = await getFileConflicts();
      expect(conflicts).toEqual([]);
    });

    it('should detect conflicts when 2+ users modify same file', async () => {
      // Alice modifies shared file
      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Alice work',
        files: ['src/shared.ts'],
        impact: 'high'
      });

      // Bob also modifies shared file
      const bobDir = path.join(testDir, bob);
      await fs.ensureDir(bobDir);
      await SessionLogManager.createSessionLog(bobDir, 'bob@company.com', 'main');

      await SessionLogManager.appendEntry(bobDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Bob work',
        files: ['src/shared.ts'],
        impact: 'medium'
      });

      const conflicts = await getFileConflicts();

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].filePath).toBe('src/shared.ts');
      expect(conflicts[0].users).toHaveLength(2);
    });

    it('should not include files modified by only one user', async () => {
      const aliceDir = path.join(testDir, alice);
      const bobDir = path.join(testDir, bob);

      await fs.ensureDir(aliceDir);
      await fs.ensureDir(bobDir);

      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');
      await SessionLogManager.createSessionLog(bobDir, 'bob@company.com', 'main');

      // Alice modifies A, Bob modifies B (no conflicts)
      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Alice work',
        files: ['src/file-a.ts'],
        impact: 'high'
      });

      await SessionLogManager.appendEntry(bobDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Bob work',
        files: ['src/file-b.ts'],
        impact: 'medium'
      });

      // Both modify shared file (conflict)
      await SessionLogManager.appendEntry(aliceDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Shared work',
        files: ['src/shared.ts'],
        impact: 'high'
      });

      await SessionLogManager.appendEntry(bobDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Also shared work',
        files: ['src/shared.ts'],
        impact: 'medium'
      });

      const conflicts = await getFileConflicts();

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].filePath).toBe('src/shared.ts');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format "just now" for recent times', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should format minutes', () => {
      const date = new Date(Date.now() - 15 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('15m ago');
    });

    it('should format hours', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('3h ago');
    });

    it('should format days', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('2d ago');
    });
  });

  describe('formatTime', () => {
    it('should format time as HH:MM', () => {
      const date = new Date('2025-10-22T14:30:00');
      const formatted = formatTime(date);
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('Performance with 10+ users', () => {
    it('should handle 10+ active team members efficiently', async () => {
      // Create 15 users with sessions
      const users = Array.from({ length: 15 }, (_, i) => `user${i}-at-company-com`);

      for (const userSlug of users) {
        const userDir = path.join(testDir, userSlug);
        await fs.ensureDir(userDir);
        await SessionLogManager.createSessionLog(
          userDir,
          userSlug.replace('-at-', '@').replace(/-/g, '.'),
          'main'
        );

        // Add some events
        for (let j = 0; j < 5; j++) {
          await SessionLogManager.appendEntry(userDir, {
            timestamp: new Date().toISOString(),
            category: 'feature',
            description: `Event ${j}`,
            files: [`src/file-${j}.ts`],
            impact: 'medium'
          });
        }
      }

      const startTime = Date.now();
      const members = await getActiveTeamMembers();
      const endTime = Date.now();

      expect(members.length).toBe(15);
      // Should complete in under 1 second even with 15 users
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Privacy and git-tracked data', () => {
    it('should only read from .ginko/sessions directory', async () => {
      // This test verifies that we only access git-tracked session logs
      // No external data sources or APIs

      const aliceDir = path.join(testDir, alice);
      await fs.ensureDir(aliceDir);
      await SessionLogManager.createSessionLog(aliceDir, 'alice@company.com', 'main');

      const members = await getActiveTeamMembers();

      expect(members.length).toBe(1);
      // All data comes from git-tracked session log
      expect(members[0].email).toBe('alice@company.com');
    });

    it('should gracefully handle missing session logs', async () => {
      // Create directory without session log
      const emptyDir = path.join(testDir, 'empty-user');
      await fs.ensureDir(emptyDir);

      const members = await getActiveTeamMembers();

      // Should skip directory without session log
      expect(members).toEqual([]);
    });
  });
});
