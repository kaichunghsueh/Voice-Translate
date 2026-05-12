import {
  SpeechConfig,
  SpeechSynthesizer,
  SpeechSynthesisOutputFormat,
  ResultReason,
  CancellationReason,
  CancellationDetails
} from 'microsoft-cognitiveservices-speech-sdk';
import { getAiServicesToken } from './auth';
import { env, getSpeechRegion } from './env';
import { buildSsml, type BuildSsmlOptions } from './ssml';
import { FALLBACK_VOICE, type VoiceId } from './voices';

export interface SynthesizeResult {
  audio: Buffer;
  voiceUsed: VoiceId;
  fellBack: boolean;
  durationMs: number;
}

/**
 * Build SpeechConfig with a fresh AAD token. SDK requires the auth token
 * to be prefixed with "aad#<resourceId>#<token>" when authorizing by token,
 * but for Cognitive Services multi-service we use the resource-region form.
 */
async function buildConfig(): Promise<SpeechConfig> {
  const token = await getAiServicesToken();
  const region = getSpeechRegion();
  const resourceId = env.aiServicesResourceId;

  let config: SpeechConfig;
  if (resourceId) {
    const authToken = `aad#${resourceId}#${token}`;
    config = SpeechConfig.fromAuthorizationToken(authToken, region);
  } else {
    config = SpeechConfig.fromAuthorizationToken(token, region);
  }
  config.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;
  // Helpful header for service-side correlation
  config.setProperty('SpeechServiceConnection_LoggingFileName', '');
  return config;
}

function synthOnce(config: SpeechConfig, ssml: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const synth = new SpeechSynthesizer(config, undefined);
    synth.speakSsmlAsync(
      ssml,
      (result) => {
        try {
          if (result.reason === ResultReason.SynthesizingAudioCompleted) {
            const buf = Buffer.from(result.audioData);
            resolve(buf);
          } else if (result.reason === ResultReason.Canceled) {
            const d = CancellationDetails.fromResult(result);
            const msg =
              d.reason === CancellationReason.Error
                ? `Synthesis error: ${d.errorDetails || d.ErrorCode}`
                : `Synthesis canceled: ${d.reason}`;
            reject(new Error(msg));
          } else {
            reject(new Error(`Unexpected synthesis reason: ${result.reason}`));
          }
        } finally {
          synth.close();
        }
      },
      (err) => {
        synth.close();
        const e = err as unknown;
        if (e instanceof Error) reject(e);
        else reject(new Error(typeof e === 'string' ? e : JSON.stringify(e)));
      }
    );
  });
}

export async function synthesize(opts: BuildSsmlOptions): Promise<SynthesizeResult> {
  const started = Date.now();
  const ssmlPrimary = buildSsml(opts);
  const config = await buildConfig();

  try {
    const audio = await synthOnce(config, ssmlPrimary);
    return { audio, voiceUsed: opts.voice, fellBack: false, durationMs: Date.now() - started };
  } catch (err) {
    // If primary HD voice fails, retry with fallback (only once, only if different).
    if (opts.voice !== FALLBACK_VOICE) {
      const ssmlFallback = buildSsml({ ...opts, voice: FALLBACK_VOICE });
      const audio = await synthOnce(config, ssmlFallback);
      return {
        audio,
        voiceUsed: FALLBACK_VOICE,
        fellBack: true,
        durationMs: Date.now() - started
      };
    }
    throw err;
  }
}
