import { MAX_PLAN_CHARS } from '../src/shared/contracts';
import type { ApiError, ApiErrorCode, DraftResponse, Extraction, ExtractResponse } from '../src/shared/contracts';
import { SAMPLE_PLAN } from '../src/fixtures/sample-plan';
import sampleExtraction from '../src/fixtures/sample-extraction.json';
import { callJson, LlmError, type CallOpts, type Env } from './llm';
import { DRAFT_SYSTEM, draftUser, EXTRACT_SYSTEM, extractUser } from './prompts';
import { DraftInput, ModelDraft, ModelExtraction, toDraft, toExtraction } from './schema';

const MAX_DRAFT_BODY_CHARS = 100_000;
const RATE_LIMIT_PER_MIN = 20;
const SAMPLE_DEADLINE_MS = 15_000;

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const fail = (code: ApiErrorCode, message: string, status: number) =>
  json({ ok: false, error: { code, message } satisfies ApiError }, status);

// shortcut: per-isolate only, upgrade to the Workers rate-limit binding if abused
const hits = new Map<string, { start: number; count: number }>();
function overLimit(ip: string, now = Date.now()): boolean {
  const h = hits.get(ip);
  if (!h || now - h.start >= 60_000) {
    if (hits.size > 10_000) hits.clear();
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  return ++h.count > RATE_LIMIT_PER_MIN;
}

function forceOpts(req: Request, env: Env): CallOpts {
  if (env.ALLOW_FORCE_FAIL !== '1') return {};
  return {
    forceClaudeFail: req.headers.get('x-fundcheck-force-claude-fail') === '1',
    forceFail: req.headers.get('x-fundcheck-force-fail') === '1',
  };
}

function llmFailure(err: unknown) {
  if (!(err instanceof LlmError)) throw err;
  return fail(err.code, err.code === 'llm_invalid' ? 'The AI returned an answer we could not read. Try again.' : 'The AI is unavailable right now. Try again in a minute.', 502);
}

const CACHED_MODEL = 'claude-opus-5-5 (recorded)';
const cached = (t0: number) =>
  json({ ok: true, source: 'cached', provider: 'cache', model: CACHED_MODEL, ms: Date.now() - t0, extraction: sampleExtraction as Extraction } satisfies ExtractResponse);

async function extract(req: Request, env: Env, limited: boolean): Promise<Response> {
  const t0 = Date.now();
  const body = (await req.json().catch(() => null)) as { plan?: unknown } | null;
  const plan = typeof body?.plan === 'string' ? body.plan : '';
  if (!plan.trim()) return fail('empty', 'Paste an event plan first.', 400);
  if (plan.length > MAX_PLAN_CHARS) return fail('too_long', `Keep the plan under ${MAX_PLAN_CHARS} characters.`, 400);
  const isSample = plan.trim() === SAMPLE_PLAN.trim();
  if (limited) return isSample ? cached(t0) : fail('rate_limited', 'Too many checks from this network. Wait a minute and try again.', 429);
  const live = (async () => {
    const r = await callJson(env, 'extract', EXTRACT_SYSTEM, extractUser(plan), ModelExtraction, { ...forceOpts(req, env), claudeOnly: isSample });
    // Metadata first, so a truncated response (head -c) still shows the provider.
    return json({ ok: true, source: 'live', provider: r.provider, model: r.model, ms: r.ms, extraction: toExtraction(r.data, plan) } satisfies ExtractResponse);
  })();
  if (!isSample) return live.catch(llmFailure);
  // Sample plan: Claude only, raced against a deadline; a slow or failed call gets the recorded result.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => (timer = setTimeout(resolve, SAMPLE_DEADLINE_MS, null)));
  const won = await Promise.race([live.catch(() => null), deadline]);
  clearTimeout(timer);
  return won ?? cached(t0);
}

async function draft(req: Request, env: Env, limited: boolean): Promise<Response> {
  const text = await req.text();
  if (text.length > MAX_DRAFT_BODY_CHARS) return fail('too_long', 'That request is too large.', 400);
  let parsed;
  try {
    parsed = DraftInput.safeParse(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) return fail('empty', 'Send an extraction and a check result.', 400);
  if (limited) return fail('rate_limited', 'Too many requests from this network. Wait a minute and try again.', 429);
  try {
    const r = await callJson(env, 'draft', DRAFT_SYSTEM, draftUser(parsed.data), ModelDraft, forceOpts(req, env));
    return json({ ok: true, source: 'live', provider: r.provider, model: r.model, ms: r.ms, draft: toDraft(r.data, parsed.data) } satisfies DraftResponse);
  } catch (err) {
    return llmFailure(err);
  }
}

export default {
  async fetch(req, env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname === '/api/health' && req.method === 'GET') return json({ ok: true, claudeConfigured: Boolean(env.ANTHROPIC_API_KEY) });
    if (req.method === 'POST' && (pathname === '/api/extract' || pathname === '/api/draft')) {
      const limited = overLimit(req.headers.get('cf-connecting-ip') ?? 'unknown');
      return pathname === '/api/extract' ? extract(req, env, limited) : draft(req, env, limited);
    }
    return json({ code: 'not_found', message: 'Unknown API route' }, 404);
  },
} satisfies ExportedHandler<Env>;
