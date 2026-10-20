import BetterSqlite3 from 'better-sqlite3';
import { Pool, PoolClient } from 'pg';
import path from 'path';
import fs from 'fs';

export interface Database {
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  queryAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid?: number | bigint }>;
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
}

let pgPoolInstance: Pool | null = null;
let sqliteInstance: BetterSqlite3.Database | null = null;

export function getPostgresUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    null
  );
}

export function isUsingPostgres(): boolean {
  return !!getPostgresUrl();
}

/**
 * Translates query containing '?' positional placeholders into Postgres '$1, $2, ...' syntax.
 */
export function translateSqlToPostgres(sql: string): string {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

/**
 * Initializes and returns the PostgreSQL pool if configured.
 */
export function getPgPool(): Pool {
  if (!pgPoolInstance) {
    const connectionString = getPostgresUrl();
    if (!connectionString) {
      throw new Error('DATABASE_URL or POSTGRES_URL is not configured.');
    }

    pgPoolInstance = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    pgPoolInstance.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return pgPoolInstance;
}

/**
 * Initializes and returns SQLite instance (used for local development / testing).
 */
export function getSqliteDb(): BetterSqlite3.Database {
  if (!sqliteInstance) {
    const isServerless = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    const dataDir = isServerless ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'app.db');
    sqliteInstance = new BetterSqlite3(dbPath);
    try {
      sqliteInstance.pragma('journal_mode = DELETE');
      sqliteInstance.pragma('synchronous = NORMAL');
      sqliteInstance.pragma('foreign_keys = ON');
    } catch (e: any) {
      console.warn('[DB-Adapter] SQLite pragma warning:', e.message);
    }
  }
  return sqliteInstance;
}

/**
 * PostgreSQL Database Implementation
 */
export class PostgresDatabase implements Database {
  private pool: Pool;
  private client?: PoolClient;

  constructor(poolOrClient?: Pool | PoolClient) {
    if (poolOrClient) {
      if ('connect' in poolOrClient && typeof poolOrClient.connect === 'function') {
        this.pool = poolOrClient as Pool;
      } else {
        this.client = poolOrClient as PoolClient;
        this.pool = getPgPool();
      }
    } else {
      this.pool = getPgPool();
    }
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await this.queryAll<T>(sql, params);
    return rows.length > 0 ? rows[0] : undefined;
  }

  async queryAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const pgSql = translateSqlToPostgres(sql);
    const target = this.client || this.pool;
    const res = await target.query(pgSql, params);
    return res.rows as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const pgSql = translateSqlToPostgres(sql);
    const target = this.client || this.pool;
    const res = await target.query(pgSql, params);
    return { changes: res.rowCount || 0 };
  }

  async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txDb = new PostgresDatabase(client);
      const result = await fn(txDb);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

/**
 * SQLite Database Implementation
 */
export class SQLiteDatabase implements Database {
  private db: BetterSqlite3.Database;

  constructor(db?: BetterSqlite3.Database) {
    this.db = db || getSqliteDb();
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params);
    return (row as T) || undefined;
  }

  async queryAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid?: number | bigint }> {
    const stmt = this.db.prepare(sql);
    const res = stmt.run(...params);
    return { changes: res.changes, lastInsertRowid: res.lastInsertRowid };
  }

  async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
    const runInTx = this.db.transaction(() => {
      return fn(this);
    });
    return await runInTx();
  }
}

let activeDatabaseInstance: Database | null = null;

/**
 * Returns the configured active Database implementation (PostgreSQL or SQLite).
 */
export function getDatabase(): Database {
  if (!activeDatabaseInstance) {
    if (isUsingPostgres()) {
      activeDatabaseInstance = new PostgresDatabase();
    } else {
      activeDatabaseInstance = new SQLiteDatabase();
    }
  }
  return activeDatabaseInstance;
}

// Universal convenience functions
export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return getDatabase().queryAll<T>(sql, params);
}

export async function dbQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const res = await getDatabase().queryOne<T>(sql, params);
  return res ?? null;
}

export async function dbExecute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid?: number | bigint }> {
  return getDatabase().execute(sql, params);
}

export async function dbTransaction<T>(
  callback: (tx: {
    query: <R = any>(sql: string, params?: any[]) => Promise<R[]>;
    queryOne: <R = any>(sql: string, params?: any[]) => Promise<R | null>;
    execute: (sql: string, params?: any[]) => Promise<{ changes: number }>;
  }) => Promise<T>
): Promise<T> {
  return getDatabase().transaction(async (txDb) => {
    return callback({
      query: (s, p) => txDb.queryAll(s, p),
      queryOne: async (s, p) => (await txDb.queryOne(s, p)) ?? null,
      execute: (s, p) => txDb.execute(s, p),
    });
  });
}
