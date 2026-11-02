import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { refineAgentScript } from '@/lib/agent/scriptRefiner';
import { calculateVideoCreditCost } from '@/lib/billing';
import { AgentSession, AgentScript } from '@/lib/agent/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, instruction, sceneIndex } = body;

    if (!sessionId || !instruction) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: sessionId and instruction' },
        { status: 400 }
      );
    }

    const db = getDb();
    const session = db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(sessionId) as AgentSession | null;
    if (!session) {
      return NextResponse.json(
        { success: false, error: `Session not found: ${sessionId}` },
        { status: 404 }
      );
    }

    if (!session.script_json) {
      return NextResponse.json(
        { success: false, error: 'No script has been generated yet for this session. Generate script first.' },
        { status: 400 }
      );
    }

    let currentScript: AgentScript;
    try {
      currentScript = JSON.parse(session.script_json);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to parse session script JSON' },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    // 1. Record creator refinement instruction in chat
    const userMsgId = `msg_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    db.prepare(`
      INSERT INTO agent_messages (id, session_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `).run(userMsgId, sessionId, instruction.trim(), now);

    // 2. Perform intelligent refinement
    const { updatedScript, explanation } = await refineAgentScript(currentScript, {
      instruction: instruction.trim(),
      sceneIndex: typeof sceneIndex === 'number' ? sceneIndex : undefined,
    });

    // 3. Recalculate credit cost estimate
    const creditEstimate = calculateVideoCreditCost({
      scenes: updatedScript.scenes.map((s) => ({ visualTier: s.visual_tier })),
      voiceTier: updatedScript.voiceTier,
      includeThumbnail: true,
      isPreview: false,
    });

    // 4. Save updated script to session
    db.prepare(`
      UPDATE agent_sessions
      SET script_json = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(updatedScript), now, sessionId);

    // 5. Append agent confirmation message in chat
    const agentMsgId = `msg_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    db.prepare(`
      INSERT INTO agent_messages (id, session_id, role, content, metadata_json, created_at)
      VALUES (?, ?, 'agent', ?, ?, ?)
    `).run(
      agentMsgId,
      sessionId,
      `✨ ${explanation}`,
      JSON.stringify({ refined: true, explanation, estimate: creditEstimate }),
      now
    );

    return NextResponse.json({
      success: true,
      sessionId,
      updatedScript,
      explanation,
      estimate: creditEstimate,
    });
  } catch (err: any) {
    console.error('[API /agent/refine] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to refine script' },
      { status: 500 }
    );
  }
}

