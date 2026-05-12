/**
 * Application Insights instrumentation via OpenTelemetry distro.
 * Initialized once on first import; no-op when connection string missing.
 */
import { env } from './env';

let initialized = false;

export function initTelemetry(): void {
  if (initialized || !env.appInsightsConn) return;
  initialized = true;
  // Lazy-require to avoid bundling in edge runtimes
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAzureMonitor } = require('@azure/monitor-opentelemetry');
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: env.appInsightsConn
    }
  });
}

export interface CustomEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
}

export function trackEvent(evt: CustomEvent): void {
  if (!env.appInsightsConn) return;
  // OTel API
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { trace } = require('@opentelemetry/api');
  const tracer = trace.getTracer('voice-translate');
  const span = tracer.startSpan(evt.name);
  if (evt.properties) {
    for (const [k, v] of Object.entries(evt.properties)) {
      span.setAttribute(k, v as never);
    }
  }
  span.end();
}
