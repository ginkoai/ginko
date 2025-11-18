#!/bin/bash
export NEO4J_URI="neo4j+s://7ae3e759.databases.neo4j.io"
export NEO4J_USER="neo4j"
export NEO4J_PASSWORD="u1CYINuzLrG0NcQ_4kLUCJj3TuJkPSdaMFENxNMIyW8"

npx tsx query-last-event.ts 2>&1 | grep -v "\[Neo4j\]"
