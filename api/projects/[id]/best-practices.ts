import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase } from '../../_utils.js';

/**
 * Project Best Practices API Endpoint
 * Retrieves all best practices adopted by a specific project
 * 
 * GET /api/mcp/projects/[id]/best-practices - Get adopted best practices for project
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  let db;
  
  try {
    db = await initializeDatabase();
    return await handleGetProjectBestPractices(req, res, db, id);
  } catch (error) {
    console.error('Project best practices API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  } finally {
    if (db && typeof db.disconnect === 'function') {
      await db.disconnect();
    }
  }
}

async function handleGetProjectBestPractices(req: VercelRequest, res: VercelResponse, db: any, projectId: string) {
  const userId = extractUserIdFromRequest(req);
  
  // Check if project exists and user has access (if authenticated)
  let projectQuery = `
    SELECT 
      p.id,
      p.name,
      p.slug,
      t.name as team_name,
      t.id as team_id,
      o.name as organization_name,
      o.id as organization_id
    FROM projects p
    JOIN teams t ON p.team_id = t.id
    JOIN organizations o ON t.organization_id = o.id
    WHERE p.id = $1
  `;

  const projectParams = [projectId];

  // If user is authenticated, verify access
  if (userId) {
    projectQuery += ` AND EXISTS (
      SELECT 1 FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = t.id AND u.id = $2
    )`;
    projectParams.push(userId);
  }

  const projectResult = await db.query(projectQuery, projectParams);

  if (projectResult.rows.length === 0) {
    return res.status(404).json({ 
      error: 'Project not found or access denied',
      details: userId ? 'You must be a member of the project team' : 'Project not found'
    });
  }

  const project = projectResult.rows[0];

  // Get all adopted best practices for the project
  const bestPracticesQuery = `
    SELECT 
      bp.*,
      a.adopted_at,
      a.adopted_by_user_id,
      a.notes as adoption_notes,
      u.email as adopted_by_email,
      COALESCE(
        JSON_AGG(
          DISTINCT t.tag ORDER BY t.tag
        ) FILTER (WHERE t.tag IS NOT NULL),
        '[]'::json
      ) AS tags
    FROM bp_adoptions a
    JOIN best_practices bp ON a.bp_id = bp.id
    LEFT JOIN users u ON a.adopted_by_user_id = u.id
    LEFT JOIN bp_tags t ON bp.id = t.bp_id
    WHERE a.project_id = $1
    GROUP BY bp.id, a.adopted_at, a.adopted_by_user_id, a.notes, u.email
    ORDER BY a.adopted_at DESC
  `;

  const bestPracticesResult = await db.query(bestPracticesQuery, [projectId]);

  // Get adoption statistics
  const statsQuery = `
    SELECT 
      COUNT(*) as total_adopted,
      COUNT(CASE WHEN bp.visibility = 'public' THEN 1 END) as public_count,
      COUNT(CASE WHEN bp.visibility = 'private' THEN 1 END) as private_count,
      COUNT(DISTINCT bp.author_id) as unique_authors,
      MIN(a.adopted_at) as first_adoption,
      MAX(a.adopted_at) as latest_adoption
    FROM bp_adoptions a
    JOIN best_practices bp ON a.bp_id = bp.id
    WHERE a.project_id = $1
  `;

  const statsResult = await db.query(statsQuery, [projectId]);
  const stats = statsResult.rows[0];

  // Get most common tags
  const tagsQuery = `
    SELECT 
      t.tag,
      t.normalized_tag,
      COUNT(*) as usage_count
    FROM bp_adoptions a
    JOIN bp_tags t ON a.bp_id = t.bp_id
    WHERE a.project_id = $1
    GROUP BY t.tag, t.normalized_tag
    ORDER BY usage_count DESC, t.tag
    LIMIT 20
  `;

  const tagsResult = await db.query(tagsQuery, [projectId]);

  // Log view event if user is authenticated
  if (userId) {
    await db.query(
      `INSERT INTO bp_usage_events (bp_id, event_type, user_id, project_id, metadata)
       VALUES (NULL, 'project_view', $1, $2, $3)`,
      [userId, projectId, JSON.stringify({ 
        total_adopted: parseInt(stats.total_adopted),
        view_type: 'project_best_practices'
      })]
    );
  }

  return res.status(200).json({
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      team_name: project.team_name,
      team_id: project.team_id,
      organization_name: project.organization_name,
      organization_id: project.organization_id
    },
    best_practices: bestPracticesResult.rows,
    statistics: {
      total_adopted: parseInt(stats.total_adopted),
      public_count: parseInt(stats.public_count),
      private_count: parseInt(stats.private_count),
      unique_authors: parseInt(stats.unique_authors),
      first_adoption: stats.first_adoption,
      latest_adoption: stats.latest_adoption
    },
    common_tags: tagsResult.rows,
    meta: {
      project_id: projectId,
      retrieved_at: new Date().toISOString(),
      user_authenticated: !!userId
    }
  });
}

function extractUserIdFromRequest(req: VercelRequest): string | null {
  // This would integrate with your existing auth system
  // For now, return null to indicate no auth (will be implemented with actual auth)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // TODO: Verify JWT token and extract user ID
    // For development, you might extract from a header or use a test user
    return req.headers['x-user-id'] as string || null;
  }
  return null;
}