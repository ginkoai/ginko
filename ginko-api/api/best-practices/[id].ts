import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase } from '../_utils.js';

/**
 * Individual Best Practice API Endpoint
 * Handles operations on specific best practices
 * 
 * GET    /api/mcp/best-practices/[id]         - Get specific best practice
 * PUT    /api/mcp/best-practices/[id]         - Update best practice (author only)
 * DELETE /api/mcp/best-practices/[id]         - Delete best practice (author only)
 */

interface BestPracticeUpdate {
  name?: string;
  description?: string;
  syntax?: string;
  visibility?: 'public' | 'private';
  tags?: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
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
      case 'GET':
        return await handleGetBestPractice(req, res, db, id);
      case 'PUT':
        return await handleUpdateBestPractice(req, res, db, id);
      case 'DELETE':
        return await handleDeleteBestPractice(req, res, db, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Best practice API error:', error);
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

async function handleGetBestPractice(req: VercelRequest, res: VercelResponse, db: any, id: string) {
  // Get best practice with tags and adoption info
  const query = `
    SELECT 
      bp.*,
      COALESCE(
        JSON_AGG(
          DISTINCT t.tag ORDER BY t.tag
        ) FILTER (WHERE t.tag IS NOT NULL),
        '[]'::json
      ) AS tags,
      COALESCE(
        JSON_AGG(
          DISTINCT JSON_BUILD_OBJECT(
            'project_id', a.project_id,
            'adopted_at', a.adopted_at,
            'adopted_by_user_id', a.adopted_by_user_id,
            'notes', a.notes
          ) ORDER BY a.adopted_at DESC
        ) FILTER (WHERE a.project_id IS NOT NULL),
        '[]'::json
      ) AS adoptions
    FROM best_practices bp
    LEFT JOIN bp_tags t ON bp.id = t.bp_id
    LEFT JOIN bp_adoptions a ON bp.id = a.bp_id
    WHERE bp.id = $1
    GROUP BY bp.id
  `;

  const result = await db.query(query, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Best practice not found' });
  }

  const bestPractice = result.rows[0];

  // Log view event (but not for the author viewing their own BP)
  const userId = extractUserIdFromRequest(req);
  if (userId && userId !== bestPractice.author_id) {
    await db.query(
      `INSERT INTO bp_usage_events (bp_id, event_type, user_id, metadata)
       VALUES ($1, 'view', $2, $3)`,
      [id, userId, JSON.stringify({ user_agent: req.headers['user-agent'] })]
    );
  }

  return res.status(200).json({
    best_practice: bestPractice
  });
}

async function handleUpdateBestPractice(req: VercelRequest, res: VercelResponse, db: any, id: string) {
  const userId = extractUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if best practice exists and user is the author
  const checkQuery = `
    SELECT author_id FROM best_practices WHERE id = $1
  `;
  
  const checkResult = await db.query(checkQuery, [id]);
  
  if (checkResult.rows.length === 0) {
    return res.status(404).json({ error: 'Best practice not found' });
  }

  if (checkResult.rows[0].author_id !== userId) {
    return res.status(403).json({ error: 'Only the author can update this best practice' });
  }

  const updates: BestPracticeUpdate = req.body;

  // Validation
  if (updates.visibility && !['public', 'private'].includes(updates.visibility)) {
    return res.status(400).json({ 
      error: 'Invalid visibility value',
      allowed: ['public', 'private']
    });
  }

  if (updates.name && updates.name.trim().length === 0) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }

  if (updates.description && updates.description.trim().length === 0) {
    return res.status(400).json({ error: 'Description cannot be empty' });
  }

  try {
    await db.query('BEGIN');

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(updates.name.trim());
      paramIndex++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(updates.description.trim());
      paramIndex++;
    }

    if (updates.syntax !== undefined) {
      updateFields.push(`syntax = $${paramIndex}`);
      updateValues.push(updates.syntax || null);
      paramIndex++;
    }

    if (updates.visibility !== undefined) {
      updateFields.push(`visibility = $${paramIndex}`);
      updateValues.push(updates.visibility);
      paramIndex++;
    }

    if (updateFields.length === 0 && !updates.tags) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    // Update best practice if there are field changes
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id); // For WHERE clause
      
      const updateQuery = `
        UPDATE best_practices 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      await db.query(updateQuery, updateValues);
    }

    // Update tags if provided
    if (updates.tags !== undefined) {
      // Delete existing tags
      await db.query('DELETE FROM bp_tags WHERE bp_id = $1', [id]);

      // Insert new tags
      if (updates.tags.length > 0) {
        const tagInsertQuery = `
          INSERT INTO bp_tags (bp_id, tag)
          VALUES ($1, $2)
        `;

        for (const tag of updates.tags) {
          if (tag.trim()) {
            await db.query(tagInsertQuery, [id, tag.trim()]);
          }
        }
      }
    }

    // Log update event
    await db.query(
      `INSERT INTO bp_usage_events (bp_id, event_type, user_id, metadata)
       VALUES ($1, 'update', $2, $3)`,
      [id, userId, JSON.stringify({ 
        updated_fields: Object.keys(updates),
        tag_count: updates.tags?.length || null
      })]
    );

    await db.query('COMMIT');

    // Fetch updated best practice with tags
    const fetchQuery = `
      SELECT 
        bp.*,
        COALESCE(
          JSON_AGG(
            DISTINCT t.tag ORDER BY t.tag
          ) FILTER (WHERE t.tag IS NOT NULL),
          '[]'::json
        ) AS tags
      FROM best_practices bp
      LEFT JOIN bp_tags t ON bp.id = t.bp_id
      WHERE bp.id = $1
      GROUP BY bp.id
    `;

    const finalResult = await db.query(fetchQuery, [id]);

    return res.status(200).json({
      best_practice: finalResult.rows[0],
      message: 'Best practice updated successfully'
    });

  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

async function handleDeleteBestPractice(req: VercelRequest, res: VercelResponse, db: any, id: string) {
  const userId = extractUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if best practice exists and user is the author
  const checkQuery = `
    SELECT author_id, name FROM best_practices WHERE id = $1
  `;
  
  const checkResult = await db.query(checkQuery, [id]);
  
  if (checkResult.rows.length === 0) {
    return res.status(404).json({ error: 'Best practice not found' });
  }

  if (checkResult.rows[0].author_id !== userId) {
    return res.status(403).json({ error: 'Only the author can delete this best practice' });
  }

  const bestPracticeName = checkResult.rows[0].name;

  try {
    await db.query('BEGIN');

    // Log deletion event before deleting
    await db.query(
      `INSERT INTO bp_usage_events (bp_id, event_type, user_id, metadata)
       VALUES ($1, 'delete', $2, $3)`,
      [id, userId, JSON.stringify({ name: bestPracticeName })]
    );

    // Delete best practice (cascades to tags, adoptions, usage events)
    await db.query('DELETE FROM best_practices WHERE id = $1', [id]);

    await db.query('COMMIT');

    return res.status(200).json({
      message: 'Best practice deleted successfully',
      deleted_id: id,
      deleted_name: bestPracticeName
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