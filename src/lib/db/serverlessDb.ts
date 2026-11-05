import fs from 'fs';
import path from 'path';

export interface ResilientStatement {
  get(...params: any[]): any;
  all(...params: any[]): any[];
  run(...params: any[]): { changes: number; lastInsertRowid: number };
}

export class ResilientDb {
  private filePath: string;
  private store: Record<string, any[]> = {
    users: [],
    user_sessions: [],
    user_credits: [],
    channels: [],
    content_projects: [],
    video_scenes: [],
    api_credentials: [],
    agent_sessions: [],
    agent_messages: [],
    credit_purchases: [],
    credit_transactions: [],
    generated_assets: [],
    video_jobs: [],
    video_outputs: [],
    personal_creator_profiles: [],
    personal_creator_projects: [],
    personal_creator_scenes: [],
    personal_creator_assets: [],
    user_voices: [],
    competitor_channels: [],
    competitor_viral_cache: [],
    db_blog_posts: [],
    editorial_calendar: []
  };

  constructor(filePath?: string) {
    this.filePath = filePath || path.join('/tmp', 'data', 'tillercast_store.json');
    this.load();
    this.seedDefaults();
  }

  private seedDefaults() {
    if (!this.store.users) this.store.users = [];
    if (!this.store.user_credits) this.store.user_credits = [];
    if (!this.store.channels) this.store.channels = [];

    const now = new Date().toISOString();
    if (!this.store.users.find(u => u.id === 'user_default')) {
      this.store.users.push({
        id: 'user_default',
        email: 'creator@tillercast.live',
        password_hash: 'demo_hash_seeded',
        salt: 'demo_salt',
        name: 'Creative Director',
        email_verified: 1,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        onboarding_completed: 1,
        created_at: now,
        updated_at: now
      });
    }

    if (!this.store.user_credits.find(c => c.user_id === 'user_default')) {
      this.store.user_credits.push({
        user_id: 'user_default',
        balance: 9999,
        tier: 'CREATOR',
        subscription_status: 'ACTIVE',
        monthly_allowance: 9999,
        renews_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        updated_at: now
      });
    }

    if (!this.store.channels.find(c => c.user_id === 'user_default')) {
      this.store.channels.push({
        id: 'chan_default',
        user_id: 'user_default',
        name: 'My Studio',
        niche: 'AI & Tech',
        language: 'en',
        voice: 'cf-aura-orion',
        target_duration_minutes: 3,
        visual_style: 'Cinematic High-Contrast',
        subtitle_style: 'Modern Clean White',
        intro_style: 'High-Impact Hook',
        outro_cta: 'Subscribe for more breakdowns',
        publishing_platform: 'YouTube',
        content_rules: 'Professional studio pacing',
        created_at: now,
        updated_at: now
      });
    }
  }

  private load() {
    try {
      if (this.filePath && fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.store = { ...this.store, ...parsed };
      }
    } catch {}
  }

  private save() {
    try {
      if (this.filePath) {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.filePath, JSON.stringify(this.store, null, 2));
      }
    } catch {}
  }

  pragma(p: string): any[] {
    return [];
  }

  exec(s: string): this {
    return this;
  }

  prepare(sql: string): ResilientStatement {
    const self = this;
    const clean = sql.replace(/\s+/g, ' ').trim();

    return {
      get(...params: any[]) {
        const res = self.query(clean, params);
        return Array.isArray(res) ? res[0] : res;
      },
      all(...params: any[]) {
        const res = self.query(clean, params);
        return Array.isArray(res) ? res : (res ? [res] : []);
      },
      run(...params: any[]) {
        return self.execute(clean, params);
      }
    };
  }

  private query(sql: string, params: any[]): any {
    if (/sqlite_master/i.test(sql)) {
      return Object.keys(this.store).map(name => ({ name }));
    }

    const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) return [];
    const table = fromMatch[1].toLowerCase();
    const rows = this.store[table] || [];

    const whereMatch = sql.match(/WHERE\s+(.+)$/i);
    if (!whereMatch) return rows;

    const whereClause = whereMatch[1].split(/ORDER\s+BY|LIMIT/i)[0].trim();
    
    // Single equality condition: field = ?
    const singleEq = whereClause.match(/^([a-zA-Z0-9_]+)\s*=\s*\?$/i);
    if (singleEq && params.length >= 1) {
      const field = singleEq[1];
      const val = params[0];
      return rows.filter(r => String(r[field] ?? '').toLowerCase() === String(val ?? '').toLowerCase());
    }

    // Double condition: f1 = ? AND f2 = ?
    const doubleAnd = whereClause.match(/^([a-zA-Z0-9_]+)\s*=\s*\?\s+AND\s+([a-zA-Z0-9_]+)\s*=\s*\?$/i);
    if (doubleAnd && params.length >= 2) {
      const f1 = doubleAnd[1];
      const f2 = doubleAnd[2];
      return rows.filter(r => 
        String(r[f1] ?? '').toLowerCase() === String(params[0] ?? '').toLowerCase() &&
        String(r[f2] ?? '').toLowerCase() === String(params[1] ?? '').toLowerCase()
      );
    }

    return rows;
  }

  private execute(sql: string, params: any[]): { changes: number; lastInsertRowid: number } {
    const insertMatch = sql.match(/INSERT(?:\s+OR\s+REPLACE|\s+OR\s+IGNORE)?\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const table = insertMatch[1].toLowerCase();
      if (!this.store[table]) this.store[table] = [];

      const cols = insertMatch[2].split(',').map(c => c.trim());
      const valPlaceholders = insertMatch[3].split(',').map(v => v.trim());

      const row: Record<string, any> = {};
      let paramIdx = 0;
      for (let i = 0; i < cols.length; i++) {
        const placeholder = valPlaceholders[i];
        if (placeholder === '?') {
          row[cols[i]] = params[paramIdx++];
        } else {
          const literal = placeholder.replace(/^['"]|['"]$/g, '');
          const asNum = Number(literal);
          row[cols[i]] = isNaN(asNum) ? literal : asNum;
        }
      }

      // Determine unique/primary key for upsert
      const keyField = cols.includes('id') ? 'id' : (cols.includes('user_id') ? 'user_id' : (cols.includes('email') ? 'email' : null));
      if (keyField && row[keyField] !== undefined) {
        const idx = this.store[table].findIndex(r => String(r[keyField]) === String(row[keyField]));
        if (idx >= 0) {
          if (!/OR\s+IGNORE/i.test(sql)) {
            this.store[table][idx] = { ...this.store[table][idx], ...row };
          }
        } else {
          this.store[table].push(row);
        }
      } else {
        this.store[table].push(row);
      }

      this.save();
      return { changes: 1, lastInsertRowid: this.store[table].length };
    }

    const updateMatch = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+)\s+WHERE\s+(.+)$/i);
    if (updateMatch) {
      const table = updateMatch[1].toLowerCase();
      const rows = this.store[table] || [];
      const setParts = updateMatch[2].split(',').map(s => s.trim());
      const whereClause = updateMatch[3].trim();

      const whereEq = whereClause.match(/^([a-zA-Z0-9_]+)\s*=\s*\?$/i);
      if (whereEq) {
        const whereField = whereEq[1];
        const whereVal = params[params.length - 1];

        let changes = 0;
        rows.forEach(r => {
          if (String(r[whereField]) === String(whereVal)) {
            let pIdx = 0;
            setParts.forEach(sp => {
              const [col, expr] = sp.split('=').map(x => x.trim());
              if (expr === '?') {
                r[col] = params[pIdx++];
              }
            });
            changes++;
          }
        });
        this.save();
        return { changes, lastInsertRowid: 0 };
      }
    }

    const deleteMatch = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)\s+WHERE\s+(.+)$/i);
    if (deleteMatch) {
      const table = deleteMatch[1].toLowerCase();
      const whereClause = deleteMatch[2].trim();
      const whereEq = whereClause.match(/^([a-zA-Z0-9_]+)\s*=\s*\?$/i);
      if (whereEq && params.length >= 1) {
        const field = whereEq[1];
        const val = params[0];
        const beforeLen = (this.store[table] || []).length;
        this.store[table] = (this.store[table] || []).filter(r => String(r[field]) !== String(val));
        this.save();
        return { changes: beforeLen - this.store[table].length, lastInsertRowid: 0 };
      }
    }

    return { changes: 0, lastInsertRowid: 0 };
  }
}
