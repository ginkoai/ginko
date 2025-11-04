/**
 * Test Graph API Server
 *
 * Minimal HTTP server for testing WriteDispatcher graph adapter integration
 * Implements POST /api/v1/graph/nodes endpoint
 */

const http = require('http');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route: POST /api/v1/graph/nodes
  if (req.url === '/api/v1/graph/nodes' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { graphId, label, data: nodeData } = data;

        console.log('\n[Graph API] Received node creation request:');
        console.log('  GraphID:', graphId);
        console.log('  Label:', label);
        console.log('  Data:', JSON.stringify(nodeData, null, 2));

        // Check auth header
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: { code: 'AUTH_REQUIRED', message: 'Bearer token required' }
          }));
          return;
        }

        // Validate request
        if (!graphId || !label || !nodeData) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: { code: 'INVALID_REQUEST', message: 'Missing required fields' }
          }));
          return;
        }

        // Generate mock node ID
        const nodeId = `${label.toLowerCase()}_${Date.now()}_test`;

        // Success response
        const response = {
          nodeId,
          label,
          graphId,
          created: true
        };

        console.log('  Response:', JSON.stringify(response, null, 2));

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('[Graph API] Error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: error.message }
        }));
      }
    });
    return;
  }

  // Route: GET /api/v1/graph/status
  if (req.url === '/api/v1/graph/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Test Graph API Server Running',
      neo4j: { connected: true, version: 'test-mode' }
    }));
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: { code: 'NOT_FOUND', message: 'Route not found' }
  }));
});

server.listen(PORT, () => {
  console.log(`\n🚀 Test Graph API Server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST http://localhost:${PORT}/api/v1/graph/nodes`);
  console.log(`  GET  http://localhost:${PORT}/api/v1/graph/status`);
  console.log(`\nPress Ctrl+C to stop\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down test server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
