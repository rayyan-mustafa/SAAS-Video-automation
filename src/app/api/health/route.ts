import { NextResponse } from 'next/server';
import { checkProvidersHealth } from '@/lib/providers/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await checkProvidersHealth();
    return NextResponse.json(health);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Health check failed', overall: 'UNHEALTHY' },
      { status: 500 }
    );
  }
}
