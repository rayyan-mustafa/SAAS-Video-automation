import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  extractConfigFromPrompt,
  getNextInterviewQuestion,
  finalizeConfigDefaults,
  QUESTION_BANK,
} from '@/lib/agent/adaptiveInterview';
import { AgentConfig, AgentSession, AgentMessage, InterviewQuestion } from '@/lib/agent/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      sessionId: inputSessionId,
      message = '',
      selectedOption,
      field,
    } = body;

    const db = getDb();
    const now = new Date().toISOString();

    // Authenticate or fallback to demo user
    let userId = DEFAULT_USER_ID;
    try {
      const user = await getCurrentUser(req);
      if (user?.id) userId = user.id;
    } catch {}

    let session: AgentSession | null = null;
    let sessionId = inputSessionId;

    // 1. Fetch or create session
    if (sessionId) {
      session = db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(sessionId) as AgentSession | null;
    }

    if (!session) {
      sessionId = `sess_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const initialConfig: Partial<AgentConfig> = message ? extractConfigFromPrompt(message) : {};

      db.prepare(`
        INSERT INTO agent_sessions (id, user_id, title, status, config_json, created_at, updated_at)
        VALUES (?, ?, ?, 'interview', ?, ?, ?)
      `).run(
        sessionId,
        userId,
        initialConfig.topic || 'New Video Project',
        JSON.stringify(initialConfig),
        now,
        now
      );

      session = db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(sessionId) as AgentSession;
    }

    // 2. Parse current config
    let config: Partial<AgentConfig> = {};
    try {
      if (session.config_json) config = JSON.parse(session.config_json);
    } catch {}

    // 3. Save incoming user message if provided
    if (message.trim()) {
      const msgId = `msg_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      db.prepare(`
        INSERT INTO agent_messages (id, session_id, role, content, created_at)
        VALUES (?, ?, 'user', ?, ?)
      `).run(msgId, sessionId, message.trim(), now);

      // If this is the initial topic or new details provided in freeform text
      if (!config.topic) {
        const extracted = extractConfigFromPrompt(message);
        config = { ...config, ...extracted };
      }
    }

    // 4. Handle option selection from interview question
    if (field && selectedOption !== undefined) {
      if (typeof selectedOption === 'string' && selectedOption.startsWith('auto_')) {
        // "Decide for me" clicked
        const defaults = finalizeConfigDefaults(config);
        config[field as keyof AgentConfig] = defaults[field as keyof AgentConfig] as any;
      } else {
        config[field as keyof AgentConfig] = selectedOption;
      }
    }

    // Check if user replied with option text directly
    if (message.trim() && !field) {
      const lower = message.toLowerCase();
      for (const q of QUESTION_BANK) {
        if (!config[q.field]) {
          for (const opt of q.options) {
            if (lower.includes(opt.value.toLowerCase()) || lower.includes(opt.label.toLowerCase())) {
              config[q.field] = opt.value as any;
              break;
            }
          }
        }
      }
    }

    // 5. Determine next question or readiness
    const nextQuestion = getNextInterviewQuestion(config);
    const readyForScript = nextQuestion === null || Boolean(config.topic && Object.keys(config).length >= 4);

    let agentResponseText = '';
    let questionToReturn: InterviewQuestion | null = null;

    if (nextQuestion && !readyForScript) {
      questionToReturn = nextQuestion;
      agentResponseText = `Got it! ${nextQuestion.question}`;
    } else {
      // Ready for script generation
      const finalConfig = finalizeConfigDefaults(config);
      config = finalConfig;
      agentResponseText = `Awesome! I have everything I need to draft your high-retention video script for "${config.topic}". Click below to generate your scene-by-scene script!`;
    }

    // 6. Save agent response message
    const agentMsgId = `msg_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const metadata = {
      question: questionToReturn,
      readyForScript,
      config,
    };

    db.prepare(`
      INSERT INTO agent_messages (id, session_id, role, content, metadata_json, created_at)
      VALUES (?, ?, 'agent', ?, ?, ?)
    `).run(agentMsgId, sessionId, agentResponseText, JSON.stringify(metadata), now);

    // 7. Update session config
    db.prepare(`
      UPDATE agent_sessions 
      SET config_json = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(config),
      readyForScript ? 'interview_complete' : 'interview',
      now,
      sessionId
    );

    // 8. Fetch full conversation history
    const history = db.prepare(`
      SELECT id, session_id, role, content, metadata_json, created_at
      FROM agent_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId) as AgentMessage[];

    return NextResponse.json({
      success: true,
      sessionId,
      message: agentResponseText,
      question: questionToReturn,
      readyForScript,
      config,
      history,
    });
  } catch (err: any) {
    console.error('[API /api/agent/chat] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    const db = getDb();
    const session = db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(sessionId) as AgentSession | null;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const history = db.prepare(`
      SELECT id, session_id, role, content, metadata_json, created_at
      FROM agent_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId) as AgentMessage[];

    let config = {};
    let script = null;
    try {
      if (session.config_json) config = JSON.parse(session.config_json);
      if (session.script_json) script = JSON.parse(session.script_json);
    } catch {}

    return NextResponse.json({
      success: true,
      session,
      config,
      script,
      history,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
