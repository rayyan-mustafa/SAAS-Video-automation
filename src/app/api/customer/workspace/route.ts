import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const db = getDb();
    const workspaces = db.prepare('SELECT * FROM workspaces WHERE customer_id = ? ORDER BY created_at ASC').all(user.id);

    return NextResponse.json({
      success: true,
      workspaces,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch workspaces' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Workspace name is required.' }, { status: 400 });
    }

    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + crypto.randomBytes(3).toString('hex');
    const workspaceId = crypto.randomUUID();
    const now = new Date().toISOString();
    const db = getDb();

    db.prepare(`
      INSERT INTO workspaces (id, customer_id, name, slug, plan, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'CREATOR', ?, ?)
    `).run(workspaceId, user.id, cleanName, slug, now, now);

    db.prepare(`
      INSERT OR REPLACE INTO workspace_members (workspace_id, customer_id, role, joined_at)
      VALUES (?, ?, 'OWNER', ?)
    `).run(workspaceId, user.id, now);

    // Mark onboarding completed
    db.prepare('UPDATE users SET onboarding_completed = 1, updated_at = ? WHERE id = ?').run(now, user.id);

    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId);

    return NextResponse.json({
      success: true,
      message: 'Workspace created successfully.',
      workspace,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create workspace' }, { status: 500 });
  }
}
