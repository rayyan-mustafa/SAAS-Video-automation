/**
 * Next.js Server Lifecycle Instrumentation Hook
 *
 * Automatically bootstraps background schedulers and queue processors
 * when the production Node.js server starts up.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // In local development, avoid auto-running the background worker/scheduler loop
    // so npm run dev doesn't automatically generate videos or burn API credits without user interaction.
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_SCHEDULER !== 'true') {
      console.log('[AutoVideo] ⏸️ Background scheduler paused in dev mode (set ENABLE_DEV_SCHEDULER=true or run npm run worker to enable).');
      return;
    }

    try {
      const { publishingScheduler } = await import('@/lib/scheduler');
      const pollIntervalMs = parseInt(process.env.SCHEDULER_INTERVAL_MS || '30000', 10);
      console.log(`[AutoVideo] 🚀 Initializing Autonomous Publishing Worker Daemon (${pollIntervalMs / 1000}s interval)...`);
      publishingScheduler.start(pollIntervalMs);
    } catch (err: any) {
      console.error('[AutoVideo] Failed to initialize background scheduler in instrumentation:', err.message);
    }
  }
}
