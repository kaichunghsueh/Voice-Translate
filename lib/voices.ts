/**
 * Approved Taiwanese Mandarin voices.
 *
 * Verified against Azure Speech `voices/list` in westus3 on 2026-05-12:
 * westus3 zh-TW catalog ships with 3 Neural voices. No DragonHD or
 * Multilingual variant is currently available for zh-TW in this region
 * (DragonHD ":DragonHDLatestNeural" suffix only applies to zh-CN voices).
 */

export type VoiceId =
  | 'zh-TW-HsiaoChenNeural'
  | 'zh-TW-HsiaoYuNeural'
  | 'zh-TW-YunJheNeural';

export interface VoiceMeta {
  id: VoiceId;
  displayName: string;
  gender: 'female' | 'male';
  style: string;
  hd: boolean;
  sample: string;
}

export const VOICES: VoiceMeta[] = [
  {
    id: 'zh-TW-HsiaoChenNeural',
    displayName: '曉臻',
    gender: 'female',
    style: '自然、新聞、口播',
    hd: false,
    sample: '你好,歡迎使用台灣口音語音合成服務。'
  },
  {
    id: 'zh-TW-HsiaoYuNeural',
    displayName: '曉雨',
    gender: 'female',
    style: '年輕、輕快',
    hd: false,
    sample: '今天天氣真好,要不要一起去散步?'
  },
  {
    id: 'zh-TW-YunJheNeural',
    displayName: '雲哲',
    gender: 'male',
    style: '沉穩、播報',
    hd: false,
    sample: '以下為今日重點新聞摘要。'
  }
];

const VOICE_IDS = new Set<VoiceId>(VOICES.map((v) => v.id));

export function isValidVoice(v: string): v is VoiceId {
  return VOICE_IDS.has(v as VoiceId);
}

/** Fallback used when the requested voice fails (e.g. transient WS errors). */
export const FALLBACK_VOICE: VoiceId = 'zh-TW-HsiaoChenNeural';
