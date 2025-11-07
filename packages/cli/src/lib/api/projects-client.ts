/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [api, projects, client, task-023]
 * @related: [teams-client.ts, api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [api-client]
 */

/**
 * Projects API Client (TASK-023)
 *
 * Type-safe wrapper for Project Management API endpoints
 */

import { api, ApiResponse } from '../../utils/api-client.js';

export interface Project {
  id: string;
  name: string;
  description?: string;
  github_repo_url?: string;
  github_repo_id?: number;
  visibility: 'public' | 'private';
  discoverable: boolean;
  created_at: string;
  updated_at: string;
  node_count?: number;
  member_count?: number;
  team_count?: number;
}

export interface ProjectMember {
  user_id: string;
  role: 'owner' | 'member';
  github_username?: string;
  email?: string;
  full_name?: string;
  joined_at: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  github_repo_url?: string;
  github_repo_id?: number;
  visibility?: 'public' | 'private';
  discoverable?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  github_repo_url?: string;
  visibility?: 'public' | 'private';
  discoverable?: boolean;
}

export interface ListProjectsOptions {
  visibility?: 'public' | 'private';
  limit?: number;
  offset?: number;
}

export interface AddMemberRequest {
  github_username: string;
  role?: 'owner' | 'member';
}

export interface UpdateMemberRequest {
  role: 'owner' | 'member';
}

/**
 * Projects API Client
 */
export class ProjectsClient {
  /**
   * Create a new project
   */
  static async create(data: CreateProjectRequest): Promise<ApiResponse<Project>> {
    const response = await api.post<{ success: boolean; project: Project }>('/api/v1/projects', data);

    // Extract project from nested response
    if (response.data?.project) {
      return { ...response, data: response.data.project };
    }

    return response as unknown as ApiResponse<Project>;
  }

  /**
   * List user's projects
   */
  static async list(options?: ListProjectsOptions): Promise<ApiResponse<{ projects: Project[] }>> {
    const params = new URLSearchParams();

    if (options?.visibility) {
      params.append('visibility', options.visibility);
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options?.offset) {
      params.append('offset', options.offset.toString());
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/v1/projects?${queryString}` : '/api/v1/projects';

    return api.get<{ projects: Project[] }>(endpoint);
  }

  /**
   * Get project by ID or name
   */
  static async get(projectIdOrName: string): Promise<ApiResponse<Project>> {
    const response = await api.get<{ success: boolean; project: Project }>(
      `/api/v1/projects/${encodeURIComponent(projectIdOrName)}`
    );

    // Extract project from nested response
    if (response.data?.project) {
      return { ...response, data: response.data.project };
    }

    return response as unknown as ApiResponse<Project>;
  }

  /**
   * Update project
   */
  static async update(
    projectIdOrName: string,
    data: UpdateProjectRequest
  ): Promise<ApiResponse<Project>> {
    const response = await api.patch<{ success: boolean; project: Project }>(
      `/api/v1/projects/${encodeURIComponent(projectIdOrName)}`,
      data
    );

    // Extract project from nested response
    if (response.data?.project) {
      return { ...response, data: response.data.project };
    }

    return response as unknown as ApiResponse<Project>;
  }

  /**
   * Delete project
   */
  static async delete(projectIdOrName: string): Promise<ApiResponse<void>> {
    return api.delete<void>(`/api/v1/projects/${encodeURIComponent(projectIdOrName)}`);
  }

  /**
   * List project members
   */
  static async listMembers(projectIdOrName: string): Promise<ApiResponse<{ members: ProjectMember[] }>> {
    return api.get<{ members: ProjectMember[] }>(
      `/api/v1/projects/${encodeURIComponent(projectIdOrName)}/members`
    );
  }

  /**
   * Add member to project
   */
  static async addMember(
    projectIdOrName: string,
    data: AddMemberRequest
  ): Promise<ApiResponse<ProjectMember>> {
    const response = await api.post<{ success: boolean; member: ProjectMember }>(
      `/api/v1/projects/${encodeURIComponent(projectIdOrName)}/members`,
      data
    );

    // Extract member from nested response
    if (response.data?.member) {
      return { ...response, data: response.data.member };
    }

    return response as unknown as ApiResponse<ProjectMember>;
  }

  /**
   * Update member role
   */
  static async updateMember(
    projectIdOrName: string,
    userId: string,
    data: UpdateMemberRequest
  ): Promise<ApiResponse<ProjectMember>> {
    const response = await api.patch<{ success: boolean; member: ProjectMember }>(
      `/api/v1/projects/${encodeURIComponent(projectIdOrName)}/members/${encodeURIComponent(userId)}`,
      data
    );

    // Extract member from nested response
    if (response.data?.member) {
      return { ...response, data: response.data.member };
    }

    return response as unknown as ApiResponse<ProjectMember>;
  }

  /**
   * Remove member from project
   */
  static async removeMember(
    projectIdOrName: string,
    userId: string
  ): Promise<ApiResponse<void>> {
    return api.delete<void>(
      `/api/v1/projects/${encodeURIComponent(projectIdOrName)}/members/${encodeURIComponent(userId)}`
    );
  }

  /**
   * Add team to project
   */
  static async addTeam(
    projectIdOrName: string,
    teamId: string
  ): Promise<ApiResponse<void>> {
    return api.post<void>(
      `/api/v1/projects/${encodeURIComponent(projectIdOrName)}/teams`,
      { team_id: teamId }
    );
  }

  /**
   * Remove team from project
   */
  static async removeTeam(
    projectIdOrName: string,
    teamId: string
  ): Promise<ApiResponse<void>> {
    return api.delete<void>(
      `/api/v1/projects/${encodeURIComponent(projectIdOrName)}/teams/${encodeURIComponent(teamId)}`
    );
  }
}
