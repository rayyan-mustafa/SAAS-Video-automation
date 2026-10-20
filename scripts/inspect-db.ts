import { getDb } from '../src/lib/db';

const db = getDb();
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];

console.log('==============================================');
console.log(`DATABASE LOCATION: data/app.db`);
console.log(`TOTAL TABLES FOUND: ${tables.length}`);
console.log('==============================================\n');

for (const t of tables) {
  try {
    const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get() as { c: number };
    console.log(`• ${t.name.padEnd(28)} : ${count.c} rows`);
  } catch (err: any) {
    console.log(`• ${t.name.padEnd(28)} : (error reading count: ${err.message})`);
  }
}
