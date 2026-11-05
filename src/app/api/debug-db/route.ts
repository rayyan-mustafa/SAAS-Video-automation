import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const fs = require('fs');
  const path = require('path');

  const info: any = {
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NETLIFY: process.env.NETLIFY,
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
      cwd: process.cwd(),
      tmpExists: false,
      tmpWritable: false,
    },
    betterSqlite: 'pending',
  };

  try {
    info.env.tmpExists = fs.existsSync('/tmp');
    const testFile = path.join('/tmp', 'test-' + Date.now());
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    info.env.tmpWritable = true;
  } catch (e: any) {
    info.env.tmpError = e.message;
  }

  try {
    // Test native module require
    const Database = require('better-sqlite3');
    info.betterSqlite = 'module_required';
    const db = new Database(':memory:');
    info.betterSqlite = 'memory_db_opened';
    db.prepare('CREATE TABLE test (id INT)').run();
    db.prepare('INSERT INTO test VALUES (1)').run();
    const row = db.prepare('SELECT * FROM test').get();
    info.betterSqlite = 'success: ' + JSON.stringify(row);
  } catch (e: any) {
    info.betterSqlite = 'error: ' + (e.message || String(e)) + ' (stack: ' + (e.stack || '') + ')';
  }

  return NextResponse.json(info);
}
