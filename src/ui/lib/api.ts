import type { ApiError, DraftRequest, DraftResponse, ExtractResponse } from '../../shared/contracts';

const NETWORK: ApiError = { code: 'llm_failed', message: "Couldn't reach FundCheck's AI service. Check your connection and try again." };

async function post<T extends { ok: boolean }>(path: string, body: unknown, timeoutMs: number): Promise<T | { ok: false; error: ApiError }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    // The worker always answers JSON; anything else (proxy 500, HTML) is a transport failure.
    const data = (await res.json().catch(() => null)) as T | { ok: false; error: ApiError } | null;
    if (data && typeof data === 'object' && 'ok' in data) return data;
    return { ok: false, error: NETWORK };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === 'AbortError';
    return { ok: false, error: aborted ? { code: 'llm_failed', message: 'The AI service took too long to answer. Try again.' } : NETWORK };
  } finally {
    clearTimeout(timer);
  }
}

export const extract = (plan: string) => post<ExtractResponse>('/api/extract', { plan }, 45_000);
export const draft = (req: DraftRequest) => post<DraftResponse>('/api/draft', req, 45_000);
