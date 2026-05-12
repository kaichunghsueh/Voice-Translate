import { NextResponse, type NextRequest } from 'next/server';
import { initTelemetry, trackEvent } from '@/lib/telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

initTelemetry();

interface VoteBody {
  experimentId?: unknown;
  winner?: unknown; // 'A' | 'B' | 'tie'
  variantA?: unknown;
  variantB?: unknown;
  textLength?: unknown;
}

export async function POST(req: NextRequest) {
  let body: VoteBody;
  try {
    body = (await req.json()) as VoteBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const experimentId = typeof body.experimentId === 'string' ? body.experimentId : 'default';
  const winner = typeof body.winner === 'string' ? body.winner : '';
  if (!['A', 'B', 'tie'].includes(winner)) {
    return NextResponse.json({ error: 'invalid_winner' }, { status: 400 });
  }
  const variantA = typeof body.variantA === 'string' ? body.variantA : '';
  const variantB = typeof body.variantB === 'string' ? body.variantB : '';
  const textLength = typeof body.textLength === 'number' ? body.textLength : 0;

  trackEvent({
    name: 'tts_ab_vote',
    properties: { experimentId, winner, variantA, variantB, textLength }
  });

  return NextResponse.json({ ok: true });
}
