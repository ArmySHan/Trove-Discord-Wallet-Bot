import { logger } from './logger';

export interface HttpOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
}

/**
 * Fetches JSON with a timeout and a small retry/backoff on 429/5xx. Throws on persistent failure.
 * The single network primitive used by every provider client.
 */
export async function httpJson<T>(url: string, options: HttpOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, timeoutMs = 10_000, retries = 2 } = options;

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < retries) {
          await delay(backoffMs(attempt));
          continue;
        }
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} for ${redact(url)}: ${text.slice(0, 200)}`);
      }

      return (await response.json()) as T;
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (attempt < retries && (isAbort || isNetworkError(err))) {
        logger.debug({ url: redact(url), attempt }, 'Retrying request');
        await delay(backoffMs(attempt));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError; // fetch throws TypeError on network failure
}

function backoffMs(attempt: number): number {
  return Math.min(2000, 250 * 2 ** attempt);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Hide an embedded API key from logs/errors (Alchemy keys live in the path). */
function redact(url: string): string {
  return url.replace(/\/v2\/[^/?]+/, '/v2/***').replace(/[?&](apikey|key)=[^&]+/gi, '$1=***');
}
