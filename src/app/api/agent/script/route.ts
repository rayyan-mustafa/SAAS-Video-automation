import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { generateAgentScript } from '@/lib/agent/scriptGenerator';
import { finalizeConfigDefaults } from '@/lib/agent/adaptiveInterview';
import { calculateVideoCreditCost } from '@/lib/billing';
import { AgentConfig, AgentSession, AgentScript } from '@/lib/agent/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, config: configOverride } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId parameter' },
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

    // Parse session config and merge any overrides
    let storedConfig: Partial<AgentConfig> = {};
    try {
      if (session.config_json) storedConfig = JSON.parse(session.config_json);
    } catch {}

    const mergedConfig: AgentConfig = finalizeConfigDefaults({
      ...storedConfig,
      ...(configOverride || {}),
    });

    console.log(`[API /agent/script] Generating script for session ${sessionId} ("${mergedConfig.topic}")...`);

    // Generate script using Gemini Flash / resilient providers
    const script: AgentScript = await generateAgentScript(mergedConfig);

    // Calculate credit cost estimate
    const creditEstimate = calculateVideoCreditCost({
      scenes: script.scenes.map((s) => ({ visualTier: s.visual_tier })),
      voiceTier: script.voiceTier,
      includeThumbnail: true,
      isPreview: false,
    });

    const now = new Date().toISOString();

    // Save script to session
    db.prepare(`
      UPDATE agent_sessions
      SET script_json = ?, config_json = ?, status = 'script_ready', updated_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(script),
      JSON.stringify(mergedConfig),
      now,
      sessionId
    );

    // Append agent message to chat history
    const msgId = `msg_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const msgContent = `🎉 I've drafted your ${script.sceneCount}-scene script for "${script.title}" (~${script.totalEstimatedSec}s, ${script.wordCount} words)! You can review each scene on the right, or tell me anything you'd like to refine.`;
    
    db.prepare(`
      INSERT INTO agent_messages (id, session_id, role, content, metadata_json, created_at)
      VALUES (?, ?, 'agent', ?, ?, ?)
    `).run(
      msgId,
      sessionId,
      msgContent,
      JSON.stringify({ scriptSummary: { sceneCount: script.sceneCount, totalSec: script.totalEstimatedSec, estimate: creditEstimate } }),
      now
    );

    return NextResponse.json({
      success: true,
      sessionId,
      script,
      estimate: creditEstimate,
    });
  } catch (err: any) {
    console.error('[API /agent/script] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate script' },
      { status: 500 }
    );
  }
}
