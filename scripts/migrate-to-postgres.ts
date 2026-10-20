/**
 * Database Migration Script: SQLite -> PostgreSQL
 * Usage: npx tsx scripts/migrate-to-postgres.ts
 */

import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

async function runMigration() {
  const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!postgresUrl) {
    console.error('ERROR: DATABASE_URL or POSTGRES_URL environment variable is required.');
    process.exit(1);
  }

  const sqlitePath = path.join(process.cwd(), 'data', 'app.db');
  if (!fs.existsSync(sqlitePath)) {
    console.warn(`Local SQLite database not found at ${sqlitePath}. Proceeding with schema creation only.`);
  }

  console.log('🔄 Connecting to PostgreSQL...');
  const pool = new Pool({
    connectionString: postgresUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  // 1. Initialize schema
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.postgres.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log('📜 Applying PostgreSQL schema...');
  await pool.query(schemaSql);
  console.log('✅ PostgreSQL schema created successfully.');

  if (!fs.existsSync(sqlitePath)) {
    console.log('✨ PostgreSQL database is ready for new data.');
    await pool.end();
    return;
  }

  // 2. Export and migrate tables from SQLite
  const sqlite = new Database(sqlitePath);
  const tables = [
    'users',
    'user_sessions',
    'customers',
    'customer_sessions',
    'email_verifications',
    'password_resets',
    'workspaces',
    'workspace_members',
    'channels',
    'content_projects',
    'video_scenes',
    'generated_assets',
    'video_jobs',
    'video_outputs',
    'user_voices',
    'oauth_connections',
    'api_credentials',
    'user_credits',
    'credit_transactions',
    'billing_plans',
    'automation_templates',
  ];

  console.log('🚀 Migrating table data from SQLite to PostgreSQL...');

  for (const table of tables) {
    try {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      if (rows.length === 0) {
        console.log(`  - Table "${table}": 0 rows`);
        continue;
      }

      console.log(`  - Table "${table}": Migrating ${rows.length} rows...`);
      for (const row of rows as any[]) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = columns.join(', ');

        const insertSql = `
          INSERT INTO ${table} (${colNames})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        await pool.query(insertSql, values);
      }
      console.log(`  ✅ Table "${table}": Completed (${rows.length} rows)`);
    } catch (tableErr: any) {
      console.warn(`  ⚠️ Skipped table "${table}": ${tableErr.message}`);
    }
  }

  console.log('\n🎉 Production Database Migration Complete!');
  await pool.end();
}

runMigration().catch((err) => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
