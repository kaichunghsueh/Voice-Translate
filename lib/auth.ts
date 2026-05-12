import { DefaultAzureCredential, ManagedIdentityCredential, type TokenCredential } from '@azure/identity';
import { env } from './env';

/**
 * Returns a TokenCredential bound to the workload UAMI in production,
 * and DefaultAzureCredential (az login / VS Code) locally.
 */
let cached: TokenCredential | undefined;

export function getCredential(): TokenCredential {
  if (cached) return cached;

  if (env.nodeEnv === 'production' && env.managedIdentityClientId) {
    cached = new ManagedIdentityCredential({ clientId: env.managedIdentityClientId });
  } else {
    cached = new DefaultAzureCredential({
      managedIdentityClientId: env.managedIdentityClientId || undefined
    });
  }
  return cached;
}

const SPEECH_SCOPE = 'https://cognitiveservices.azure.com/.default';

let tokenCache: { token: string; expiresOnTimestamp: number } | undefined;

/**
 * Returns a fresh access token for Azure AI Services data plane (Speech + OpenAI).
 * Caches until 60 seconds before expiry.
 */
export async function getAiServicesToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresOnTimestamp - 60_000 > now) {
    return tokenCache.token;
  }
  const cred = getCredential();
  const t = await cred.getToken(SPEECH_SCOPE);
  if (!t) throw new Error('Failed to acquire AAD token for Cognitive Services');
  tokenCache = { token: t.token, expiresOnTimestamp: t.expiresOnTimestamp };
  return t.token;
}
