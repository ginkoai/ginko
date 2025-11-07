/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [api, teams, client, task-023]
 * @related: [projects-client.ts, api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [api-client]
 */

/**
 * Teams API Client (TASK-023)
 *
 * Type-safe wrapper for Teams Management API endpoints
 */

import { api, ApiResponse } from '../../utils/api-client.js';

export interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  project_count?: number;
}

export interface TeamMember {
  user_id: string;
  role: 'owner' | 'member';
  github_username?: string;
  email?: string;
  full_name?: string;
  joined_at: string;
}

export interface CreateTeamRequest {
  name: string;
}

export interface AddTeamMemberRequest {
  github_username: string;
  role?: 'owner' | 'member';
}

/**
 * Teams API Client
 */
export class TeamsClient {
  /**
   * Create a new team
   */
  static async create(data: CreateTeamRequest): Promise<ApiResponse<Team>> {
    const response = await api.post<{ success: boolean; team: Team }>('/api/v1/teams', data);

    // Extract team from nested response
    if (response.data?.team) {
      return { ...response, data: response.data.team };
    }

    return response as unknown as ApiResponse<Team>;
  }

  /**
   * List user's teams
   */
  static async list(): Promise<ApiResponse<{ teams: Team[] }>> {
    return api.get<{ teams: Team[] }>('/api/v1/teams');
  }

  /**
   * Get team by ID
   */
  static async get(teamId: string): Promise<ApiResponse<Team>> {
    return api.get<Team>(`/api/v1/teams/${encodeURIComponent(teamId)}`);
  }

  /**
   * List team members
   */
  static async listMembers(teamId: string): Promise<ApiResponse<{ members: TeamMember[] }>> {
    return api.get<{ members: TeamMember[] }>(
      `/api/v1/teams/${encodeURIComponent(teamId)}/members`
    );
  }

  /**
   * Add member to team
   */
  static async addMember(
    teamId: string,
    data: AddTeamMemberRequest
  ): Promise<ApiResponse<TeamMember>> {
    const response = await api.post<{ success: boolean; member: TeamMember }>(
      `/api/v1/teams/${encodeURIComponent(teamId)}/members`,
      data
    );

    // Extract member from nested response
    if (response.data?.member) {
      return { ...response, data: response.data.member };
    }

    return response as unknown as ApiResponse<TeamMember>;
  }

  /**
   * Remove member from team
   */
  static async removeMember(
    teamId: string,
    userId: string
  ): Promise<ApiResponse<void>> {
    return api.delete<void>(
      `/api/v1/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`
    );
  }
}
