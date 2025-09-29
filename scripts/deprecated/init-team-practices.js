#!/usr/bin/env node

import { DatabaseManager } from './dist/database.js';
import { BestPracticesManager } from './dist/best-practices.js';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'contextmcp',
  username: process.env.DB_USER || 'contextmcp',
  password: process.env.DB_PASSWORD || 'contextmcp123',
  ssl: false
};

async function initializeTeamBestPractices() {
  const db = new DatabaseManager(dbConfig);
  
  try {
    await db.connect();
    console.log('[INIT] Initializing team best practices...');

    const teamId = '91fc8f4a-da20-453a-99c7-cf363f4e22b8';
    const defaultPractices = BestPracticesManager.getDefaultPractices();
    
    await db.initializeTeamBestPractices(teamId, defaultPractices);
    console.log(`[INIT] ✅ Initialized ${defaultPractices.length} best practices for team`);

  } catch (error) {
    console.error('[INIT] Error initializing best practices:', error);
  } finally {
    await db.disconnect();
  }
}

initializeTeamBestPractices().catch(console.error);