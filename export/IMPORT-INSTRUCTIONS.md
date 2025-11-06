# Neo4j AuraDB Import Instructions

## Export Summary

**Exported**: 2025-11-05T21:41:06.363Z
**Source**: Hetzner Neo4j (178.156.182.99:7687)
**Nodes**: 118
**Relationships**: 1069

### Node Types
- Graph: 1
- ADR: 59
- PRD: 17
- Pattern: 7
- Event: 25
- SessionCursor: 6
- User: 3

### Relationship Types
- CONTAINS: 83
- REFERENCES: 20
- IMPLEMENTS: 4
- SUPERSEDES: 2
- SIMILAR_TO: 920
- NEXT: 25
- POSITIONED_AT: 6
- LOGGED: 9

## Import to AuraDB

### Option 1: Browser Console (Recommended for small datasets)

1. Open AuraDB console: https://console.neo4j.io/
2. Navigate to your database
3. Open "Query" tab
4. Copy and paste contents of `nodes.cypher`
5. Execute queries
6. Copy and paste contents of `relationships.cypher`
7. Execute queries

### Option 2: Cypher Shell

```bash
# Connect to AuraDB
cypher-shell -a neo4j+s://xxxxx.databases.neo4j.io \
  -u neo4j \
  -p YOUR_PASSWORD

# Import nodes
:source nodes.cypher

# Import relationships
:source relationships.cypher
```

### Option 3: Programmatic Import

Use the `import-neo4j-data.ts` script:

```bash
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io \
NEO4J_USER=neo4j \
NEO4J_PASSWORD=YOUR_PASSWORD \
npm run import-neo4j
```

## Verification

After import, verify data:

```cypher
// Count nodes
MATCH (n) RETURN labels(n) as label, count(n) as count

// Count relationships
MATCH ()-[r]->() RETURN type(r) as type, count(r) as count

// Check specific data
MATCH (u:User) RETURN u LIMIT 5
MATCH (e:Event) RETURN e ORDER BY e.timestamp DESC LIMIT 10
```

Expected counts:
- Nodes: 118
- Relationships: 1069

## Rollback

If import fails, clear database and retry:

```cypher
MATCH (n) DETACH DELETE n
```

⚠️ **Warning**: This deletes ALL data!

## Files

- `nodes.cypher` - Node creation statements
- `relationships.cypher` - Relationship creation statements
- `data.json` - Complete JSON backup
- `IMPORT-INSTRUCTIONS.md` - This file
