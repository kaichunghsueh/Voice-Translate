import { NextResponse, type NextRequest } from 'next/server';
import { synthesize } from '@/lib/speech';
import { isValidVoice } from '@/lib/voices';
import { checkRateLimit } from '@/lib/ratelimit';
import { initTelemetry, trackEvent } from '@/lib/telemetry';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

initTelemetry();

const MAX_TEXT_LEN = 5000;

interface TtsRequestBody {
  text?: unknown;
  voice?: unknown;
  rate?: unknown;
  pitch?: unknown;
  variant?: unknown;
  experimentId?: unknown;
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  let body: TtsRequestBody;
  try {
    body = (await req.json()) as TtsRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text : '';
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'text_required' }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json(
      { error: 'text_too_long', max: MAX_TEXT_LEN },
      { status: 413 }
    );
  }

  const voiceCandidate = typeof body.voice === 'string' ? body.voice : env.defaultVoice;
  if (!isValidVoice(voiceCandidate)) {
    return NextResponse.json({ error: 'invalid_voice' }, { status: 400 });
  }

  const rate = typeof body.rate === 'number' ? body.rate : 1.0;
  const pitch = typeof body.pitch === 'number' ? body.pitch : 0;
  if (!Number.isFinite(rate) || !Number.isFinite(pitch)) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const variant = typeof body.variant === 'string' ? body.variant : 'A';
  const experimentId = typeof body.experimentId === 'string' ? body.experimentId : 'default';

  const ip = clientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', resetAt: rl.resetAt },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rl.resetAt - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': '0'
        }
      }
    );
  }

  try {
    const result = await synthesize({ voice: voiceCandidate, text, rate, pitch });
    trackEvent({
      name: 'tts_generate',
      properties: {
        voice: result.voiceUsed,
        voiceRequested: voiceCandidate,
        fellBack: result.fellBack,
        textLength: text.length,
        rate,
        pitch,
        variant,
        experimentId,
        durationMs: result.durationMs
      }
    });
    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.audio.length.toString(),
        'Cache-Control': 'no-store',
        'X-Voice-Used': result.voiceUsed,
        'X-Fell-Back': result.fellBack ? '1' : '0',
        'X-Synth-Duration-Ms': result.durationMs.toString(),
        'X-RateLimit-Remaining': rl.remaining.toString()
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    trackEvent({
      name: 'tts_error',
      properties: {
        voice: voiceCandidate,
        textLength: text.length,
        message: message.slice(0, 500)
      }
    });
    return NextResponse.json({ error: 'synthesis_failed', message }, { status: 502 });
  }
}
