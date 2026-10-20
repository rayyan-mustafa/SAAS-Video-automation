import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDb, grantUserCredits } from '@/lib/db';

import { POST as handlePolarWebhook } from '../polar-webhook/route';

export const dynamic = 'force-dynamic';

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.startsWith('sk_')) return null;
  return new Stripe(secretKey, { apiVersion: '2024-06-20' as any });
}

export async function POST(req: Request) {
  // If request contains Polar Standard Webhooks headers, delegate to Polar handler
  if (req.headers.get('webhook-signature') || req.headers.get('webhook-id') || req.headers.get('Webhook-Signature')) {
    return handlePolarWebhook(req);
  }
  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured.');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe client unavailable' }, { status: 503 });
    }

    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Ensure idempotency table exists
    db.prepare(`
      CREATE TABLE IF NOT EXISTS processed_webhook_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        processed_at TEXT NOT NULL
      )
    `).run();

    // Idempotency check: process each event exactly once
    const alreadyProcessed = db
      .prepare('SELECT event_id FROM processed_webhook_events WHERE event_id = ?')
      .get(event.id);

    if (alreadyProcessed) {
      return NextResponse.json({ received: true, status: 'ALREADY_PROCESSED' }, { status: 200 });
    }

    // Process event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const planId = session.metadata?.planId || 'creator';
        const monthlyCredits = Number(session.metadata?.monthlyCredits) || 600;

        if (userId) {
          // 1. Grant initial monthly credits atomically
          grantUserCredits(userId, monthlyCredits, 'SUBSCRIPTION', `Stripe Subscription Activated (${planId.toUpperCase()})`);

          // 2. Update subscription tier and metadata
          db.prepare(`
            UPDATE user_credits 
            SET tier = ?,
                subscription_status = 'ACTIVE',
                monthly_allowance = ?,
                stripe_customer_id = ?,
                stripe_subscription_id = ?,
                updated_at = ?
            WHERE user_id = ?
          `).run(
            planId.toUpperCase(),
            monthlyCredits,
            (session.customer as string) || null,
            (session.subscription as string) || null,
            now,
            userId
          );

          console.log(`[Stripe Webhook] Successfully activated subscription for user ${userId} (${planId})`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        if (customerId) {
          db.prepare(`
            UPDATE user_credits 
            SET subscription_status = 'CANCELED',
                updated_at = ?
            WHERE stripe_customer_id = ?
          `).run(now, customerId);

          console.log(`[Stripe Webhook] Subscription canceled for customer ${customerId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (customerId) {
          db.prepare(`
            UPDATE user_credits 
            SET subscription_status = 'PAST_DUE',
                updated_at = ?
            WHERE stripe_customer_id = ?
          `).run(now, customerId);

          console.log(`[Stripe Webhook] Payment failed for customer ${customerId}`);
        }
        break;
      }

      default:
        // Ignore unhandled events safely
        break;
    }

    // Record that this event was successfully processed
    db.prepare(`
      INSERT INTO processed_webhook_events (event_id, event_type, processed_at)
      VALUES (?, ?, ?)
    `).run(event.id, event.type, now);

    return NextResponse.json({ received: true, status: 'PROCESSED' }, { status: 200 });
  } catch (err: any) {
    console.error('[Stripe Webhook] Processing error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
