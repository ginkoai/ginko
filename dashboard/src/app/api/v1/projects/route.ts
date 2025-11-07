/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [projects, crud, rest-api, task-022, multi-tenancy]
 * @related: [teams/route.ts, middleware.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next/server, supabase]
 */

/**
 * POST /api/v1/projects - Create project
 * GET /api/v1/projects - List user's projects
 *
 * TASK-022: Project Management API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

interface CreateProjectRequest {
  name: string;
  description?: string;
  github_repo_url?: string;
  github_repo_id?: number;
  visibility?: 'public' | 'private';
  discoverable?: boolean;
}

/**
 * POST /api/v1/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const body: CreateProjectRequest = await request.json();

      // Validate required fields
      if (!body.name || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Missing required field: name' },
          { status: 400 }
        );
      }

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: body.name.trim(),
          description: body.description || null,
          github_repo_url: body.github_repo_url || null,
          github_repo_id: body.github_repo_id || null,
          visibility: body.visibility || 'private',
          discoverable: body.discoverable || false,
          created_by: user.id,
        })
        .select()
        .single();

      if (projectError) {
        console.error('[Projects API] Create project error:', projectError);
        return NextResponse.json(
          { error: 'Failed to create project', message: projectError.message },
          { status: 500 }
        );
      }

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: 'owner',
          granted_by: user.id,
        });

      if (memberError) {
        console.error('[Projects API] Add owner error:', memberError);
        // Rollback project creation
        await supabase.from('projects').delete().eq('id', project.id);
        return NextResponse.json(
          { error: 'Failed to add project owner', message: memberError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          github_repo_url: project.github_repo_url,
          github_repo_id: project.github_repo_id,
          visibility: project.visibility,
          discoverable: project.discoverable,
          created_by: project.created_by,
          created_at: project.created_at,
          updated_at: project.updated_at,
          role: 'owner',
        },
      }, { status: 201 });

    } catch (error: any) {
      console.error('[Projects API] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to create project', message: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/v1/projects
 * List user's projects (owned + member + team access)
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user, supabase) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const visibility = searchParams.get('visibility') as 'public' | 'private' | null;
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      // Get projects where user is a direct member
      let memberQuery = supabase
        .from('project_members')
        .select('project_id, role, projects(*)')
        .eq('user_id', user.id)
        .limit(Math.min(limit, 100))
        .range(offset, offset + Math.min(limit, 100) - 1);

      const { data: memberProjects, error: memberError } = await memberQuery;

      if (memberError) {
        console.error('[Projects API] List member projects error:', memberError);
        return NextResponse.json(
          { error: 'Failed to list projects', message: memberError.message },
          { status: 500 }
        );
      }

      // Get projects accessible via team membership
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      const teamIds = teamMemberships?.map(tm => tm.team_id) || [];
      let teamProjects: any[] = [];

      if (teamIds.length > 0) {
        const { data: teamProjectData } = await supabase
          .from('project_teams')
          .select('project_id, projects(*)')
          .in('team_id', teamIds);

        teamProjects = teamProjectData || [];
      }

      // Combine and deduplicate projects
      const projectsMap = new Map();

      // Add member projects (direct access takes precedence)
      memberProjects?.forEach((mp: any) => {
        if (mp.projects) {
          projectsMap.set(mp.projects.id, {
            ...mp.projects,
            role: mp.role,
            access_type: 'direct',
          });
        }
      });

      // Add team projects (if not already in map)
      teamProjects.forEach((tp: any) => {
        if (tp.projects && !projectsMap.has(tp.projects.id)) {
          projectsMap.set(tp.projects.id, {
            ...tp.projects,
            role: 'member',
            access_type: 'team',
          });
        }
      });

      let projects = Array.from(projectsMap.values());

      // Filter by visibility if specified
      if (visibility) {
        projects = projects.filter((p: any) => p.visibility === visibility);
      }

      // Sort by updated_at descending
      projects.sort((a: any, b: any) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      return NextResponse.json({
        projects,
        totalCount: projects.length,
        filters: {
          visibility: visibility || 'all',
          limit: Math.min(limit, 100),
          offset,
        },
      });

    } catch (error: any) {
      console.error('[Projects API] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to list projects', message: error.message },
        { status: 500 }
      );
    }
  });
}
