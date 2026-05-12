/**
 * Centralized server-side environment validation.
 * Values are read lazily via getters so that `next build` (which evaluates
 * route modules during "Collecting page data") does not fail when required
 * env vars are not present at build time.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  get aiServicesEndpoint() { return required('AZURE_AISERVICES_ENDPOINT'); },
  get aiServicesResourceId() { return optional('AZURE_AISERVICES_RESOURCE_ID'); },
  get foundryProjectEndpoint() { return optional('AZURE_FOUNDRY_PROJECT_ENDPOINT'); },
  get gptDeployment() { return optional('AZURE_GPT_DEPLOYMENT', 'gpt-5-mini'); },
  get region() { return optional('TTS_REGION', 'westus3'); },
  get defaultVoice() { return optional('TTS_DEFAULT_VOICE', 'zh-TW-HsiaoChenNeural'); },
  get appInsightsConn() { return optional('APPLICATIONINSIGHTS_CONNECTION_STRING'); },
  get managedIdentityClientId() { return optional('AZURE_CLIENT_ID'); },
  get nodeEnv() { return optional('NODE_ENV', 'development'); }
} as const;

export function getSpeechRegion(): string {
  return env.region;
}
