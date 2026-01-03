// Migration 012: Team Membership Schema for EPIC-008 (Team Collaboration)
// Purpose: Enable multi-user collaboration with teams, invitations, and memberships
// Date: 2026-01-03
// Related: EPIC-008 Sprint 1 (Foundation - Schema & APIs)

// ============================================================================
// Team Node - Represents a team/workspace for collaboration
// ============================================================================

// Team nodes must have unique IDs
CREATE CONSTRAINT team_id_unique IF NOT EXISTS
FOR (t:Team)
REQUIRE t.id IS UNIQUE;

// Index on Team.graphId for project-level lookups
CREATE INDEX team_graph_idx IF NOT EXISTS
FOR (t:Team)
ON (t.graphId);

// ============================================================================
// Membership Node - Represents a user's membership in a team
// Using node instead of relationship for richer properties and querying
// ============================================================================

// Membership nodes must have unique IDs (format: team_user)
CREATE CONSTRAINT membership_id_unique IF NOT EXISTS
FOR (m:Membership)
REQUIRE m.id IS UNIQUE;

// Index on Membership.userId for user's teams lookup
CREATE INDEX membership_user_idx IF NOT EXISTS
FOR (m:Membership)
ON (m.userId);

// Index on Membership.teamId for team members lookup
CREATE INDEX membership_team_idx IF NOT EXISTS
FOR (m:Membership)
ON (m.teamId);

// Index on Membership.role for role-based filtering
CREATE INDEX membership_role_idx IF NOT EXISTS
FOR (m:Membership)
ON (m.role);

// Index on Membership.status for active member filtering
CREATE INDEX membership_status_idx IF NOT EXISTS
FOR (m:Membership)
ON (m.status);

// Composite index for efficient team+status queries
CREATE INDEX membership_team_status_idx IF NOT EXISTS
FOR (m:Membership)
ON (m.teamId, m.status);

// ============================================================================
// Invitation Node - Represents pending team invitations
// ============================================================================

// Invitation nodes must have unique codes
CREATE CONSTRAINT invitation_code_unique IF NOT EXISTS
FOR (i:Invitation)
REQUIRE i.code IS UNIQUE;

// Index on Invitation.teamId for team's pending invites
CREATE INDEX invitation_team_idx IF NOT EXISTS
FOR (i:Invitation)
ON (i.teamId);

// Index on Invitation.email for user's pending invites
CREATE INDEX invitation_email_idx IF NOT EXISTS
FOR (i:Invitation)
ON (i.email);

// Index on Invitation.status for filtering active invitations
CREATE INDEX invitation_status_idx IF NOT EXISTS
FOR (i:Invitation)
ON (i.status);

// Index on Invitation.expiresAt for cleanup queries
CREATE INDEX invitation_expiry_idx IF NOT EXISTS
FOR (i:Invitation)
ON (i.expiresAt);

// ============================================================================
// Relationships
// ============================================================================

// Team -[:BELONGS_TO]-> Graph (team belongs to a project graph)
// Membership -[:MEMBER_OF]-> Team (membership links to team)
// Membership -[:USER]-> (external user reference via userId property)
// Invitation -[:INVITES_TO]-> Team (invitation to join team)
// Invitation -[:INVITED_BY]-> (external user reference via inviterId property)

// ============================================================================
// Node Property Reference
// ============================================================================

// Team {
//   id: string (UUID),
//   name: string,
//   graphId: string (references Graph.graphId),
//   description?: string,
//   createdAt: datetime,
//   updatedAt: datetime,
//   createdBy: string (userId who created the team)
// }

// Membership {
//   id: string (format: {teamId}_{userId}),
//   teamId: string (references Team.id),
//   userId: string (user identifier, typically email),
//   role: string (owner | admin | member),
//   status: string (active | inactive | suspended),
//   joinedAt: datetime,
//   lastActiveAt: datetime,
//   invitedBy?: string (userId who invited this member)
// }

// Invitation {
//   code: string (unique invite code, 8-12 chars),
//   teamId: string (references Team.id),
//   email: string (invitee email),
//   role: string (role to assign on acceptance),
//   status: string (pending | accepted | expired | revoked),
//   createdAt: datetime,
//   expiresAt: datetime (default: 7 days from creation),
//   inviterId: string (userId who sent invitation),
//   acceptedAt?: datetime,
//   acceptedBy?: string (userId who accepted, if different from email)
// }

// ============================================================================
// Role Hierarchy
// ============================================================================

// owner: Full control - invite, manage roles, delete team, all member actions
// admin: Manage members - invite, change member roles (not owner), remove members
// member: Collaborate - view team, sync context, contribute insights

// ============================================================================
// Validation Query (to verify schema creation)
// ============================================================================

// SHOW CONSTRAINTS YIELD name WHERE name STARTS WITH 'team' OR name STARTS WITH 'membership' OR name STARTS WITH 'invitation';
// SHOW INDEXES YIELD name WHERE name STARTS WITH 'team' OR name STARTS WITH 'membership' OR name STARTS WITH 'invitation';
