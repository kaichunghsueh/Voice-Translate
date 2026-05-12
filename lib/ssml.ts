/**
 * SSML builder with strict XML escaping to prevent injection.
 * Speech SDK accepts SSML directly; we never interpolate raw user input.
 */

import type { VoiceId } from './voices';

const XML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
};

export function escapeXml(s: string): string {
  // Replace XML special chars and strip control chars (except \t \n \r).
  return s
    .replace(/[&<>"']/g, (c) => XML_ESCAPE[c]!)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

export interface BuildSsmlOptions {
  voice: VoiceId;
  text: string;
  /** Speed multiplier 0.5–2.0; mapped to prosody rate percentage. */
  rate?: number;
  /** Pitch percentage delta -50..+50. */
  pitch?: number;
}

export function buildSsml({ voice, text, rate = 1.0, pitch = 0 }: BuildSsmlOptions): string {
  const safeText = escapeXml(text);
  const clampedRate = Math.max(0.5, Math.min(2.0, rate));
  const clampedPitch = Math.max(-50, Math.min(50, pitch));
  // prosody rate expressed as a percentage delta from baseline:
  // rate=1.0 -> 0%, rate=1.5 -> +50%, rate=0.5 -> -50%
  const ratePct = Math.round((clampedRate - 1) * 100);
  const rateStr = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;
  const pitchStr = `${clampedPitch >= 0 ? '+' : ''}${clampedPitch}%`;

  return (
    `<speak version="1.0" xml:lang="zh-TW" xmlns="http://www.w3.org/2001/10/synthesis">` +
    `<voice name="${voice}">` +
    `<prosody rate="${rateStr}" pitch="${pitchStr}">${safeText}</prosody>` +
    `</voice>` +
    `</speak>`
  );
}
