/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-05
 * @tags: [migration, neo4j, export, adr-044]
 * @related: [import-neo4j-data.ts, event-lifecycle-manager.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import neo4j, { Driver, Node, Relationship } from 'neo4j-driver';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * Export Neo4j Database to Cypher Statements
 *
 * Exports all nodes and relationships from Hetzner Neo4j instance
 * to Cypher CREATE statements that can be imported into AuraDB.
 *
 * Output format:
 * - nodes.cypher: All nodes with properties
 * - relationships.cypher: All relationships with properties
 * - data.json: Complete export in JSON format (backup)
 */

interface ExportStats {
  nodes: number;
  relationships: number;
  nodeLabels: Record<string, number>;
  relationshipTypes: Record<string, number>;
  exportSize: number;
}

/**
 * Escape string values for Cypher
 */
function escapeCypherString(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    // Escape quotes and backslashes
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(v => escapeCypherString(v)).join(', ')}]`;
  }

  if (value instanceof Date) {
    return `datetime("${value.toISOString()}")`;
  }

  // Handle Neo4j temporal types
  if (value.constructor.name === 'DateTime') {
    return `datetime("${value.toString()}")`;
  }

  // Handle objects (convert to JSON string)
  if (typeof value === 'object') {
    return escapeCypherString(JSON.stringify(value));
  }

  return String(value);
}

/**
 * Convert node to Cypher CREATE statement
 */
function nodeToCypher(node: Node): string {
  const labels = Array.from(node.labels).join(':');
  const props = node.properties;

  // Build properties map
  const propStrings = Object.entries(props).map(([key, value]) => {
    return `${key}: ${escapeCypherString(value)}`;
  });

  const propsStr = propStrings.length > 0 ? `{${propStrings.join(', ')}}` : '';

  return `CREATE (n:${labels} ${propsStr})`;
}

/**
 * Convert relationship to Cypher CREATE statement
 */
function relationshipToCypher(rel: Relationship, nodeMap: Map<string, number>): string {
  const startIdx = nodeMap.get(rel.start.toString());
  const endIdx = nodeMap.get(rel.end.toString());
  const type = rel.type;
  const props = rel.properties;

  // Build properties map
  const propStrings = Object.entries(props).map(([key, value]) => {
    return `${key}: ${escapeCypherString(value)}`;
  });

  const propsStr = propStrings.length > 0 ? `{${propStrings.join(', ')}}` : '';

  return `MATCH (start), (end) WHERE id(start) = ${startIdx} AND id(end) = ${endIdx} CREATE (start)-[r:${type} ${propsStr}]->(end)`;
}

/**
 * Export all nodes from database
 */
async function exportNodes(driver: Driver): Promise<{ nodes: Node[], cypher: string[], stats: any }> {
  const session = driver.session();

  try {
    console.log('📦 Exporting nodes...');

    const result = await session.run(`
      MATCH (n)
      RETURN n, id(n) as nodeId, labels(n) as labels
      ORDER BY nodeId
    `);

    const nodes: Node[] = [];
    const cypherStatements: string[] = [];
    const labelCounts: Record<string, number> = {};
    const nodeMap = new Map<string, number>();

    result.records.forEach(record => {
      const node = record.get('n');
      const nodeId = record.get('nodeId');
      const labels = record.get('labels');

      nodes.push(node);
      nodeMap.set(nodeId.toString(), nodeId.toNumber());
      cypherStatements.push(nodeToCypher(node));

      // Count labels
      labels.forEach((label: string) => {
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      });
    });

    console.log(`✓ Exported ${nodes.length} nodes`);
    console.log('  Labels:', Object.entries(labelCounts).map(([k, v]) => `${k}(${v})`).join(', '));

    return { nodes, cypher: cypherStatements, stats: { labelCounts, nodeMap } };
  } finally {
    await session.close();
  }
}

/**
 * Export all relationships from database
 */
async function exportRelationships(driver: Driver, nodeMap: Map<string, number>): Promise<{ relationships: Relationship[], cypher: string[], stats: any }> {
  const session = driver.session();

  try {
    console.log('🔗 Exporting relationships...');

    const result = await session.run(`
      MATCH ()-[r]->()
      RETURN r, id(startNode(r)) as startId, id(endNode(r)) as endId, type(r) as relType
    `);

    const relationships: Relationship[] = [];
    const cypherStatements: string[] = [];
    const typeCounts: Record<string, number> = {};

    result.records.forEach(record => {
      const rel = record.get('r');
      const relType = record.get('relType');

      relationships.push(rel);
      cypherStatements.push(relationshipToCypher(rel, nodeMap));

      // Count types
      typeCounts[relType] = (typeCounts[relType] || 0) + 1;
    });

    console.log(`✓ Exported ${relationships.length} relationships`);
    console.log('  Types:', Object.entries(typeCounts).map(([k, v]) => `${k}(${v})`).join(', '));

    return { relationships, cypher: cypherStatements, stats: { typeCounts } };
  } finally {
    await session.close();
  }
}

/**
 * Export complete database
 */
export async function exportDatabase(
  driver: Driver,
  outputDir: string
): Promise<ExportStats> {
  console.log('\n🚀 Neo4j Database Export');
  console.log('========================\n');

  // Create output directory
  await mkdir(outputDir, { recursive: true });

  // Export nodes
  const { nodes, cypher: nodeCypher, stats: nodeStats } = await exportNodes(driver);

  // Export relationships
  const { relationships, cypher: relCypher, stats: relStats } = await exportRelationships(driver, nodeStats.nodeMap);

  // Write Cypher files
  console.log('\n💾 Writing export files...');

  // 1. Nodes Cypher
  const nodesCypherFile = join(outputDir, 'nodes.cypher');
  const nodesCypherContent = [
    '// Neo4j Database Export - Nodes',
    '// Generated: ' + new Date().toISOString(),
    '// Total Nodes: ' + nodes.length,
    '',
    '// Clear existing data (CAUTION: This will delete everything!)',
    '// MATCH (n) DETACH DELETE n;',
    '',
    ...nodeCypher
  ].join('\n');

  await writeFile(nodesCypherFile, nodesCypherContent);
  console.log(`✓ Wrote ${nodesCypherFile}`);

  // 2. Relationships Cypher
  const relsCypherFile = join(outputDir, 'relationships.cypher');
  const relsCypherContent = [
    '// Neo4j Database Export - Relationships',
    '// Generated: ' + new Date().toISOString(),
    '// Total Relationships: ' + relationships.length,
    '',
    ...relCypher
  ].join('\n');

  await writeFile(relsCypherFile, relsCypherContent);
  console.log(`✓ Wrote ${relsCypherFile}`);

  // 3. JSON backup (complete data)
  const jsonFile = join(outputDir, 'data.json');
  const jsonContent = JSON.stringify({
    exportedAt: new Date().toISOString(),
    source: 'Hetzner Neo4j',
    nodes: nodes.map(n => ({
      id: n.identity.toString(),
      labels: Array.from(n.labels),
      properties: n.properties
    })),
    relationships: relationships.map(r => ({
      id: r.identity.toString(),
      type: r.type,
      startNode: r.start.toString(),
      endNode: r.end.toString(),
      properties: r.properties
    }))
  }, null, 2);

  await writeFile(jsonFile, jsonContent);
  console.log(`✓ Wrote ${jsonFile}`);

  // 4. Import instructions
  const instructionsFile = join(outputDir, 'IMPORT-INSTRUCTIONS.md');
  const instructions = `# Neo4j AuraDB Import Instructions

## Export Summary

**Exported**: ${new Date().toISOString()}
**Source**: Hetzner Neo4j (178.156.182.99:7687)
**Nodes**: ${nodes.length}
**Relationships**: ${relationships.length}

### Node Types
${Object.entries(nodeStats.labelCounts).map(([label, count]) => `- ${label}: ${count}`).join('\n')}

### Relationship Types
${Object.entries(relStats.typeCounts).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

## Import to AuraDB

### Option 1: Browser Console (Recommended for small datasets)

1. Open AuraDB console: https://console.neo4j.io/
2. Navigate to your database
3. Open "Query" tab
4. Copy and paste contents of \`nodes.cypher\`
5. Execute queries
6. Copy and paste contents of \`relationships.cypher\`
7. Execute queries

### Option 2: Cypher Shell

\`\`\`bash
# Connect to AuraDB
cypher-shell -a neo4j+s://xxxxx.databases.neo4j.io \\
  -u neo4j \\
  -p YOUR_PASSWORD

# Import nodes
:source nodes.cypher

# Import relationships
:source relationships.cypher
\`\`\`

### Option 3: Programmatic Import

Use the \`import-neo4j-data.ts\` script:

\`\`\`bash
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io \\
NEO4J_USER=neo4j \\
NEO4J_PASSWORD=YOUR_PASSWORD \\
npm run import-neo4j
\`\`\`

## Verification

After import, verify data:

\`\`\`cypher
// Count nodes
MATCH (n) RETURN labels(n) as label, count(n) as count

// Count relationships
MATCH ()-[r]->() RETURN type(r) as type, count(r) as count

// Check specific data
MATCH (u:User) RETURN u LIMIT 5
MATCH (e:Event) RETURN e ORDER BY e.timestamp DESC LIMIT 10
\`\`\`

Expected counts:
- Nodes: ${nodes.length}
- Relationships: ${relationships.length}

## Rollback

If import fails, clear database and retry:

\`\`\`cypher
MATCH (n) DETACH DELETE n
\`\`\`

⚠️ **Warning**: This deletes ALL data!

## Files

- \`nodes.cypher\` - Node creation statements
- \`relationships.cypher\` - Relationship creation statements
- \`data.json\` - Complete JSON backup
- \`IMPORT-INSTRUCTIONS.md\` - This file
`;

  await writeFile(instructionsFile, instructions);
  console.log(`✓ Wrote ${instructionsFile}`);

  // Calculate total size
  const totalSize = Buffer.byteLength(nodesCypherContent) +
                   Buffer.byteLength(relsCypherContent) +
                   Buffer.byteLength(jsonContent);

  console.log('\n✅ Export Complete!');
  console.log('==================');
  console.log(`Nodes: ${nodes.length}`);
  console.log(`Relationships: ${relationships.length}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Total Size: ${(totalSize / 1024).toFixed(2)} KB`);

  return {
    nodes: nodes.length,
    relationships: relationships.length,
    nodeLabels: nodeStats.labelCounts,
    relationshipTypes: relStats.typeCounts,
    exportSize: totalSize
  };
}

// CLI execution
if (require.main === module) {
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://178.156.182.99:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'Palindrome000'
    )
  );

  const outputDir = process.env.EXPORT_DIR || './export';

  exportDatabase(driver, outputDir)
    .then(stats => {
      console.log('\n📊 Export Statistics:');
      console.log('  Node Labels:', JSON.stringify(stats.nodeLabels, null, 2));
      console.log('  Relationship Types:', JSON.stringify(stats.relationshipTypes, null, 2));
      return driver.close();
    })
    .catch(err => {
      console.error('\n❌ Export failed:', err);
      driver.close();
      process.exit(1);
    });
}
