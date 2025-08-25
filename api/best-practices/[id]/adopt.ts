import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase } from '../../_utils.js';

/**
 * Best Practice Adoption API Endpoint
 * Handles adoption/unadoption of best practices for projects
 * 
 * POST   /api/mcp/best-practices/[id]/adopt    - Adopt best practice for project
 * DELETE /api/mcp/best-practices/[id]/adopt    - Remove adoption
 */

interface AdoptionRequest {
  project_id: string;
  notes?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Best practice ID is required' });
  }

  let db;
  
  try {
    db = await initializeDatabase();

    switch (req.method) {
      case 'POST':
        return await handleAdoptBestPractice(req, res, db, id);
      case 'DELETE':
        return await handleUnadoptBestPractice(req, res, db, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Best practice adoption API error:', error);
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

async function handleAdoptBestPractice(req: VercelRequest, res: VercelResponse, db: any, bpId: string) {
  const userId = extractUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const adoption: AdoptionRequest = req.body;

  if (!adoption.project_id) {
    return res.status(400).json({ 
      error: 'Missing required field',
      required: ['project_id']
    });
  }

  try {
    await db.query('BEGIN');

    // Check if best practice exists
    const bpCheck = await db.query(
      'SELECT id, name, visibility FROM best_practices WHERE id = $1',
      [bpId]
    );

    if (bpCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Best practice not found' });
    }

    const bestPractice = bpCheck.rows[0];

    // Check if project exists and user has access
    const projectCheck = await db.query(`
      SELECT p.id, p.name, t.name as team_name
      FROM projects p
      JOIN teams t ON p.team_id = t.id
      JOIN team_members tm ON t.id = tm.team_id
      JOIN users u ON tm.user_id = u.id
      WHERE p.id = $1 AND u.id = $2
    `, [adoption.project_id, userId]);

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Project not found or access denied',
        details: 'You must be a member of the project team to adopt best practices'
      });
    }

    const project = projectCheck.rows[0];

    // Check if already adopted
    const existingAdoption = await db.query(
      'SELECT id FROM bp_adoptions WHERE bp_id = $1 AND project_id = $2',
      [bpId, adoption.project_id]
    );

    if (existingAdoption.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Best practice already adopted for this project',
        existing_adoption_id: existingAdoption.rows[0].id
      });
    }

    // Create adoption
    const adoptionResult = await db.query(`
      INSERT INTO bp_adoptions (bp_id, project_id, adopted_by_user_id, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [bpId, adoption.project_id, userId, adoption.notes || null]);

    const newAdoption = adoptionResult.rows[0];

    // Log adoption event
    await db.query(
      `INSERT INTO bp_usage_events (bp_id, event_type, user_id, project_id, metadata)
       VALUES ($1, 'adopt', $2, $3, $4)`,
      [bpId, userId, adoption.project_id, JSON.stringify({ 
        project_name: project.name,
        team_name: project.team_name,
        has_notes: !!adoption.notes
      })]
    );

    await db.query('COMMIT');

    return res.status(201).json({
      adoption: {
        ...newAdoption,
        best_practice_name: bestPractice.name,
        project_name: project.name,
        team_name: project.team_name
      },
      message: 'Best practice adopted successfully'
    });

  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

async function handleUnadoptBestPractice(req: VercelRequest, res: VercelResponse, db: any, bpId: string) {
  const userId = extractUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { project_id } = req.query;

  if (!project_id || typeof project_id !== 'string') {
    return res.status(400).json({ 
      error: 'Missing required query parameter',
      required: ['project_id']
    });
  }

  try {
    await db.query('BEGIN');

    // Check if adoption exists and user has access to project
    const adoptionCheck = await db.query(`
      SELECT 
        a.id,
        a.adopted_at,
        bp.name as bp_name,
        p.name as project_name,
        t.name as team_name
      FROM bp_adoptions a
      JOIN best_practices bp ON a.bp_id = bp.id
      JOIN projects p ON a.project_id = p.id
      JOIN teams t ON p.team_id = t.id
      JOIN team_members tm ON t.id = tm.team_id
      JOIN users u ON tm.user_id = u.id
      WHERE a.bp_id = $1 AND a.project_id = $2 AND u.id = $3
    `, [bpId, project_id, userId]);

    if (adoptionCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Adoption not found or access denied',
        details: 'Best practice is not adopted for this project, or you do not have access'
      });
    }

    const adoption = adoptionCheck.rows[0];

    // Remove adoption
    await db.query(
      'DELETE FROM bp_adoptions WHERE bp_id = $1 AND project_id = $2',
      [bpId, project_id]
    );

    // Log unadoption event
    await db.query(
      `INSERT INTO bp_usage_events (bp_id, event_type, user_id, project_id, metadata)
       VALUES ($1, 'unadopt', $2, $3, $4)`,
      [bpId, userId, project_id, JSON.stringify({ 
        project_name: adoption.project_name,
        team_name: adoption.team_name,
        was_adopted_at: adoption.adopted_at
      })]
    );

    await db.query('COMMIT');

    return res.status(200).json({
      message: 'Best practice adoption removed successfully',
      removed_adoption: {
        bp_id: bpId,
        project_id: project_id,
        bp_name: adoption.bp_name,
        project_name: adoption.project_name,
        team_name: adoption.team_name
      }
    });

  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
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