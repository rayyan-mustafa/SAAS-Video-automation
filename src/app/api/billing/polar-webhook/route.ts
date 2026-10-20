import { NextResponse } from 'next/server';
import { getDb, grantUserCredits, getUserCredits } from '@/lib/db';
import { verifyPolarWebhookSignature } from '@/lib/polar';
import { PLANS } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Webhook-Id, Webhook-Timestamp, Webhook-Signature',
    },
  });
}

function resolvePlanCredits(planIdOrName: string): { planId: string; credits: number } {
  const norm = (planIdOrName || '').toLowerCase().trim();
  if (norm.includes('starter')) {
    return { planId: 'starter', credits: 200 };
  }
  if (norm.includes('scale') || norm.includes('growth')) {
    return { planId: 'scale', credits: 1500 };
  }
  if (norm.includes('agency')) {
    return { planId: 'agency', credits: 4000 };
  }
  // Default to creator tier
  return { planId: 'creator', credits: 600 };
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // 1. Verify Polar Webhook Signature
    const isValid = await verifyPolarWebhookSignature(rawBody, req.headers);
    if (!isValid) {
      console.warn('[Polar Webhook] Invalid signature received.');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}') as {
      type?: string;
      data?: {
        id?: string;
        order_id?: string;
        checkout_id?: string;
        subscription_id?: string;
        customer_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        customer?: { id?: string; email?: string; name?: string };
        customer_email?: string;
        user?: { email?: string };
        product?: { id?: string; name?: string };
        metadata?: Record<string, any>;
      };
    };

    const eventType = payload.type || 'unknown';
    const data = payload.data || {};
    const eventId = data.id || data.order_id || data.checkout_id || `pol_${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDb();

    // 2. Ensure idempotency & tracking tables exist
    db.prepare(`
      CREATE TABLE IF NOT EXISTS processed_webhook_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        processed_at TEXT NOT NULL
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS polar_orders (
        id TEXT PRIMARY KEY,
        order_id TEXT UNIQUE,
        user_id TEXT,
        email TEXT,
        plan_id TEXT,
        amount INTEGER,
        created_at TEXT
      )
    `).run();

    // Idempotency check
    const alreadyProcessed = db
      .prepare('SELECT event_id FROM processed_webhook_events WHERE event_id = ?')
      .get(eventId);

    if (alreadyProcessed) {
      return NextResponse.json({ received: true, status: 'ALREADY_PROCESSED' }, { status: 200 });
    }

    // 3. Extract Customer Info & Plan
    const email = (
      data.customer?.email ||
      data.customer_email ||
      data.user?.email ||
      ''
    ).trim().toLowerCase();

    let userId: string | null = (data.metadata?.userId || data.metadata?.user_id || '').trim() || null;

    // If userId not passed in metadata, lookup user by email in database
    if (!userId && email) {
      const userRow = db
        .prepare('SELECT id FROM users WHERE LOWER(email) = ?')
        .get(email) as { id: string } | undefined;
      if (userRow?.id) {
        userId = userRow.id;
      }
    }

    const rawPlanIdentifier = data.metadata?.planId || data.product?.name || 'creator';
    const { planId, credits } = resolvePlanCredits(rawPlanIdentifier);

    console.log(`[Polar Webhook] Processing event "${eventType}" for user: ${userId || email || 'anonymous'} (Plan: ${planId}, Credits: ${credits})`);

    // 4. Handle Event Types
    switch (eventType) {
      case 'order.created':
      case 'checkout.created':
      case 'subscription.created':
      case 'subscription.active':
      case 'subscription.updated': {
        if (userId) {
          // Grant monthly video credits atomically
          grantUserCredits(userId, credits, 'SUBSCRIPTION', `Polar Subscription Activated (${planId.toUpperCase()})`);

          // Update user_credits tier & status
          db.prepare(`
            UPDATE user_credits 
            SET tier = ?,
                subscription_status = 'ACTIVE',
                monthly_allowance = ?,
                updated_at = ?
            WHERE user_id = ?
          `).run(planId.toUpperCase(), credits, now, userId);

          console.log(`[Polar Webhook] Granted ${credits} credits to user ${userId} on ${planId.toUpperCase()}`);
        }

        // Record polar order
        try {
          db.prepare(`
            INSERT OR REPLACE INTO polar_orders (id, order_id, user_id, email, plan_id, amount, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            `pol_ord_${Date.now()}`,
            eventId,
            userId || null,
            email || null,
            planId,
            data.amount || 0,
            now
          );
        } catch (dbErr) {
          console.warn('[Polar Webhook] Could not save order record:', dbErr);
        }
        break;
      }

      case 'subscription.canceled':
      case 'subscription.revoked': {
        if (userId) {
          db.prepare(`
            UPDATE user_credits 
            SET subscription_status = 'CANCELED',
                updated_at = ?
            WHERE user_id = ?
          `).run(now, userId);
          console.log(`[Polar Webhook] Subscription canceled for user ${userId}`);
        } else if (email) {
          const userRow = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email) as any;
          if (userRow?.id) {
            db.prepare(`
              UPDATE user_credits 
              SET subscription_status = 'CANCELED',
                  updated_at = ?
              WHERE user_id = ?
            `).run(now, userRow.id);
          }
        }
        break;
      }

      default:
        // Ignore unhandled events safely
        break;
    }

    // 5. Mark Event Processed
    db.prepare(`
      INSERT INTO processed_webhook_events (event_id, event_type, processed_at)
      VALUES (?, ?, ?)
    `).run(eventId, eventType, now);

    return NextResponse.json({ received: true, status: 'PROCESSED' }, { status: 200 });
  } catch (err: any) {
    console.error('[Polar Webhook] Error processing webhook:', err);
    return NextResponse.json({ error: 'Internal webhook error' }, { status: 500 });
  }
}
