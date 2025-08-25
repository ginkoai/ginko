import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getAuthenticatedUser, 
  handlePreflight, 
  sendError, 
  sendSuccess,
  checkToolAccess,
  initializeDatabase 
} from '../_utils.js';

/**
 * Best Practices API Endpoint
 * Handles CRUD operations for the Best Practices Marketplace MVP
 * 
 * GET    /api/mcp/best-practices              - List/Search best practices
 * POST   /api/mcp/best-practices              - Create new best practice
 */

interface BestPractice {
  id?: string;
  name: string;
  description: string;
  syntax?: string;
  visibility: 'public' | 'private';
  author_id: string;
  author_name: string;
  author_avatar?: string;
  author_github_url?: string;
  organization_id?: string;
  tags?: string[];
  usage_count?: number;
  adoption_count?: number;
  created_at?: string;
  updated_at?: string;
  
  // AI Attribution & Quality Control
  content_source?: 'human' | 'ai_generated' | 'ai_curated';
  ai_model?: string;
  ai_prompt_version?: string;
  curator_id?: string;
  curation_status?: 'draft' | 'under_review' | 'approved' | 'rejected';
  curation_notes?: string;
  verification_status?: 'unverified' | 'community_tested' | 'empirically_validated';
  
  // Computed fields from view
  efficacy_score?: number;
  statistically_significant?: boolean;
  community_validation_count?: number;
  source_label?: string;
}

interface SearchParams {
  q?: string;           // Text search query
  tags?: string[];      // Tag filters
  visibility?: 'public' | 'private' | 'all';
  author?: string;      // Author filter
  limit?: number;       // Results limit
  offset?: number;      // Pagination offset
  sort?: 'created' | 'updated' | 'usage' | 'adoption';
  order?: 'asc' | 'desc';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight requests
  if (handlePreflight(req, res)) {
    return;
  }

  let db;
  
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(req);

    // Check access for best practices functionality
    await checkToolAccess(user, 'get_best_practices');

    db = await initializeDatabase();

    switch (req.method) {
      case 'GET':
        return await handleListBestPractices(req, res, db, user);
      case 'POST':
        return await handleCreateBestPractice(req, res, db, user);
      default:
        return sendError(res, 'Method not allowed', 405);
    }
  } catch (error) {
    console.error('Best practices API error:', error);
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

async function handleListBestPractices(req: VercelRequest, res: VercelResponse, db: any, user: any) {
  const params = parseSearchParams(req.query);
  
  try {
    // Check if best_practices table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'best_practices'
      )
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      return res.status(503).json({
        error: 'Best Practices service not available',
        message: 'Database schema not migrated. Please run the migration script.',
        migration_needed: true
      });
    }
  } catch (error) {
    // Database might not support this query or connection failed
    return res.status(503).json({
      error: 'Best Practices service not available',
      message: 'Database connection failed or schema not available.',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
  
  let query = `
    SELECT 
      bp.*,
      COALESCE(
        JSON_AGG(
          DISTINCT t.tag ORDER BY t.tag
        ) FILTER (WHERE t.tag IS NOT NULL),
        '[]'::json
      ) AS tags
    FROM bp_with_efficacy bp
    LEFT JOIN bp_tags t ON bp.id = t.bp_id
    WHERE 1=1
  `;
  
  const queryParams: any[] = [];
  let paramIndex = 1;

  // Visibility filter
  if (params.visibility && params.visibility !== 'all') {
    query += ` AND bp.visibility = $${paramIndex}`;
    queryParams.push(params.visibility);
    paramIndex++;
  }

  // Text search
  if (params.q) {
    query += ` AND bp.search_vector @@ plainto_tsquery('english', $${paramIndex})`;
    queryParams.push(params.q);
    paramIndex++;
  }

  // Author filter
  if (params.author) {
    query += ` AND bp.author_id = $${paramIndex}`;
    queryParams.push(params.author);
    paramIndex++;
  }

  // Tag filter
  if (params.tags && params.tags.length > 0) {
    query += ` AND EXISTS (
      SELECT 1 FROM bp_tags bt 
      WHERE bt.bp_id = bp.id 
      AND bt.normalized_tag = ANY($${paramIndex}::text[])
    )`;
    queryParams.push(params.tags.map(tag => tag.toLowerCase()));
    paramIndex++;
  }

  query += ` GROUP BY bp.id`;

  // Sorting
  const sortColumn = getSortColumn(params.sort);
  const sortOrder = params.order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortColumn} ${sortOrder}`;

  // Pagination
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  queryParams.push(params.limit || 50, params.offset || 0);

  const result = await db.query(query, queryParams);

  // Get total count for pagination
  let countQuery = `
    SELECT COUNT(DISTINCT bp.id) as total
    FROM bp_with_efficacy bp
    LEFT JOIN bp_tags t ON bp.id = t.bp_id
    WHERE 1=1
  `;
  
  const countParams: any[] = [];
  let countParamIndex = 1;

  // Apply same filters for count
  if (params.visibility && params.visibility !== 'all') {
    countQuery += ` AND bp.visibility = $${countParamIndex}`;
    countParams.push(params.visibility);
    countParamIndex++;
  }

  if (params.q) {
    countQuery += ` AND bp.search_vector @@ plainto_tsquery('english', $${countParamIndex})`;
    countParams.push(params.q);
    countParamIndex++;
  }

  if (params.author) {
    countQuery += ` AND bp.author_id = $${countParamIndex}`;
    countParams.push(params.author);
    countParamIndex++;
  }

  if (params.tags && params.tags.length > 0) {
    countQuery += ` AND EXISTS (
      SELECT 1 FROM bp_tags bt 
      WHERE bt.bp_id = bp.id 
      AND bt.normalized_tag = ANY($${countParamIndex}::text[])
    )`;
    countParams.push(params.tags.map(tag => tag.toLowerCase()));
    countParamIndex++;
  }

  const countResult = await db.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0]?.total || '0');

  return res.status(200).json({
    best_practices: result.rows,
    pagination: {
      total,
      limit: params.limit || 50,
      offset: params.offset || 0,
      has_more: (params.offset || 0) + (params.limit || 50) < total
    },
    filters: params
  });
}

async function handleCreateBestPractice(req: VercelRequest, res: VercelResponse, db: any, user: any) {
  const bp: BestPractice = req.body;

  // Validation
  if (!bp.name || !bp.description) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['name', 'description']
    });
  }

  if (!bp.author_id || !bp.author_name) {
    return res.status(400).json({ 
      error: 'Author information required',
      required: ['author_id', 'author_name']
    });
  }

  if (bp.visibility && !['public', 'private'].includes(bp.visibility)) {
    return res.status(400).json({ 
      error: 'Invalid visibility value',
      allowed: ['public', 'private']
    });
  }

  try {
    await db.query('BEGIN');

    // Insert best practice
    const insertQuery = `
      INSERT INTO best_practices (
        name, description, syntax, visibility,
        author_id, author_name, author_avatar, author_github_url,
        organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      bp.name,
      bp.description,
      bp.syntax || null,
      bp.visibility || 'private',
      bp.author_id,
      bp.author_name,
      bp.author_avatar || null,
      bp.author_github_url || null,
      bp.organization_id || null
    ]);

    const newBP = result.rows[0];

    // Insert tags if provided
    if (bp.tags && bp.tags.length > 0) {
      const tagInsertQuery = `
        INSERT INTO bp_tags (bp_id, tag)
        VALUES ($1, $2)
      `;

      for (const tag of bp.tags) {
        if (tag.trim()) {
          await db.query(tagInsertQuery, [newBP.id, tag.trim()]);
        }
      }
    }

    // Log usage event
    await db.query(
      `INSERT INTO bp_usage_events (bp_id, event_type, user_id, metadata)
       VALUES ($1, 'create', $2, $3)`,
      [newBP.id, bp.author_id, JSON.stringify({ initial_tags: bp.tags || [] })]
    );

    await db.query('COMMIT');

    // Fetch complete best practice with tags
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

    const finalResult = await db.query(fetchQuery, [newBP.id]);

    return res.status(201).json({
      best_practice: finalResult.rows[0],
      message: 'Best practice created successfully'
    });

  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

function parseSearchParams(query: any): SearchParams {
  return {
    q: query.q || undefined,
    tags: query.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined,
    visibility: query.visibility || 'all',
    author: query.author || undefined,
    limit: query.limit ? Math.min(parseInt(query.limit), 100) : 50,
    offset: query.offset ? parseInt(query.offset) : 0,
    sort: query.sort || 'created',
    order: query.order === 'asc' ? 'asc' : 'desc'
  };
}

function getSortColumn(sort?: string): string {
  switch (sort) {
    case 'updated': return 'bp.updated_at';
    case 'usage': return 'bp.usage_count';
    case 'adoption': return 'bp.adoption_count';
    case 'name': return 'bp.name';
    default: return 'bp.created_at';
  }
}