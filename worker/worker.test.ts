import Anthropic from '@anthropic-ai/sdk';
import { Messages as BetaMessages } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_PLAN_CHARS } from '../src/shared/contracts';
import type { DraftResponse, Extraction, ExtractResponse } from '../src/shared/contracts';
import { SAMPLE_PLAN } from '../src/fixtures/sample-plan';
import sample from '../src/fixtures/sample-extraction.json';
import worker from './index';
import { BUDGET_MS, type Env } from './llm';
import { ModelExtraction, toExtraction } from './schema';

const fixture = sample as Extraction;
const modelOut = { ...fixture, items: fixture.items.map(({ id: _id, ...rest }) => rest) }; // what a provider returns

// Real SDK, real error classes: only the network call is replaced.
const parse = vi.spyOn(BetaMessages.prototype, 'parse');
afterEach(() => vi.clearAllMocks());

const claudeOk = () => parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: modelOut, model: 'claude-opus-5-5' } as never);
const env = (over: Partial<Env> = {}): Env => ({
  AI: { run: vi.fn().mockResolvedValue({ response: modelOut }) } as unknown as Ai,
  ANTHROPIC_API_KEY: 'test-key-not-real',
  ALLOW_FORCE_FAIL: '1',
  ...over,
});

const OTHER = 'Bake sale, Apr 1 2027, cookies $50';
let ip = 0;
async function post(path: string, body: unknown, e: Env, headers: Record<string, string> = {}) {
  const req = new Request(`http://local${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.0.0.${++ip}`, ...headers },
    body: JSON.stringify(body),
  });
  const res = await worker.fetch(req as never, e);
  return { status: res.status, body: (await res.json()) as ExtractResponse & DraftResponse, cache: res.headers.get('cache-control') };
}

describe('POST /api/extract', () => {
  it('rejects an empty plan with 400', async () => {
    const r = await post('/api/extract', { plan: '   ' }, env());
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'empty' } });
  });

  it('rejects a plan over the length limit with 400', async () => {
    const r = await post('/api/extract', { plan: 'x'.repeat(MAX_PLAN_CHARS + 1) }, env());
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'too_long' } });
  });

  it('serves Claude with ids assigned and no-store', async () => {
    claudeOk();
    const r = await post('/api/extract', { plan: SAMPLE_PLAN }, env());
    expect(r.body).toMatchObject({ ok: true, source: 'live', provider: 'claude' });
    expect(r.cache).toBe('no-store');
    if (r.body.ok) expect(r.body.extraction.items.map((i) => i.id)).toEqual(['i1', 'i2', 'i3', 'i4', 'i5']);
  });

  it('uses Workers AI when there is no key', async () => {
    const e = env({ ANTHROPIC_API_KEY: undefined });
    const r = await post('/api/extract', { plan: OTHER }, e);
    expect(parse).not.toHaveBeenCalled();
    expect(e.AI.run).toHaveBeenCalledOnce();
    expect(r.body).toMatchObject({ ok: true, provider: 'workers-ai' });
  });

  it('never sends the sample plan to Workers AI: no key means the cached result', async () => {
    const e = env({ ANTHROPIC_API_KEY: undefined });
    const r = await post('/api/extract', { plan: SAMPLE_PLAN }, e);
    expect(e.AI.run).not.toHaveBeenCalled();
    expect(r.body).toMatchObject({ ok: true, source: 'cached', provider: 'cache', extraction: fixture });
  });

  it.each([
    ['RateLimitError', () => parse.mockRejectedValue(new Anthropic.RateLimitError(429, {}, 'rate limited', new Headers()))],
    ['refusal', () => parse.mockResolvedValue({ stop_reason: 'refusal', stop_details: { category: 'cyber' }, parsed_output: null } as never)],
    ['max_tokens', () => parse.mockResolvedValue({ stop_reason: 'max_tokens', parsed_output: null } as never)],
  ])('falls back to Workers AI on %s', async (_name, arrange) => {
    arrange();
    const r = await post('/api/extract', { plan: OTHER }, env());
    expect(parse).toHaveBeenCalled();
    expect(r.body).toMatchObject({ ok: true, provider: 'workers-ai' });
  });

  it('returns the cached sample when Claude fails on the sample', async () => {
    parse.mockRejectedValue(new Anthropic.InternalServerError(500, {}, 'down', new Headers()));
    const e = env();
    const r = await post('/api/extract', { plan: SAMPLE_PLAN }, e);
    expect(r.status).toBe(200);
    expect(e.AI.run).not.toHaveBeenCalled();
    expect(r.body).toMatchObject({ ok: true, source: 'cached', provider: 'cache', extraction: fixture });
  });

  it('returns the cached sample when Claude takes longer than 15 s on the sample', async () => {
    vi.useFakeTimers();
    try {
      parse.mockReturnValue(new Promise(() => {}) as never);
      const pending = post('/api/extract', { plan: SAMPLE_PLAN }, env());
      await vi.advanceTimersByTimeAsync(15_000);
      expect((await pending).body).toMatchObject({ ok: true, source: 'cached', provider: 'cache' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns 502 when Claude fails and Workers AI returns bad JSON twice on another plan', async () => {
    parse.mockRejectedValue(new Anthropic.APIConnectionError({ message: 'offline' }));
    const run = vi.fn().mockResolvedValue({ response: { items: 'nope' } });
    const r = await post('/api/extract', { plan: OTHER }, env({ AI: { run } as unknown as Ai }));
    expect(run).toHaveBeenCalledTimes(2);
    expect(r.status).toBe(502);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'llm_invalid' } });
  });

  it('answers llm_failed within the budget when the forced fallback never returns on another plan', async () => {
    vi.useFakeTimers();
    try {
      const run = vi.fn().mockReturnValue(new Promise(() => {}));
      const pending = post('/api/extract', { plan: OTHER }, env({ AI: { run } as unknown as Ai }), { 'x-fundcheck-force-claude-fail': '1' });
      await vi.advanceTimersByTimeAsync(BUDGET_MS);
      const r = await pending;
      expect(r.status).toBe(502);
      expect(r.body).toMatchObject({ ok: false, error: { code: 'llm_failed' } });
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns 502 when both providers fail on another plan', async () => {
    const r = await post('/api/extract', { plan: OTHER }, env(), { 'x-fundcheck-force-fail': '1' });
    expect(r.status).toBe(502);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'llm_failed' } });
  });

  it('ignores the force headers unless ALLOW_FORCE_FAIL is 1', async () => {
    claudeOk();
    const r = await post('/api/extract', { plan: SAMPLE_PLAN }, env({ ALLOW_FORCE_FAIL: '0' }), { 'x-fundcheck-force-fail': '1' });
    expect(r.body).toMatchObject({ ok: true, provider: 'claude' });
  });

  it('rate-limits after 20 calls a minute per IP, but still serves the sample from cache', async () => {
    claudeOk();
    const e = env();
    const from = { 'cf-connecting-ip': '192.0.2.7' };
    for (let i = 0; i < 20; i++) expect((await post('/api/extract', { plan: 'Bake sale, cookies $50' }, e, from)).status).toBe(200);
    const r = await post('/api/extract', { plan: 'Bake sale, cookies $50' }, e, from);
    expect(r.status).toBe(429);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'rate_limited' } });
    expect((await post('/api/extract', { plan: SAMPLE_PLAN }, e, from)).body).toMatchObject({ ok: true, source: 'cached' });
    expect((await post('/api/extract', { plan: 'Bake sale, cookies $50' }, e)).status).toBe(200); // other IPs unaffected
  });

  it('sends no temperature, budget_tokens or tool_choice, and sets effort and fallbacks', async () => {
    claudeOk();
    await post('/api/extract', { plan: SAMPLE_PLAN }, env());
    const params = parse.mock.calls[0][0] as unknown as Record<string, unknown>;
    const flat = JSON.stringify(params);
    for (const banned of ['temperature', 'budget_tokens', 'tool_choice', 'thinking']) expect(flat).not.toContain(`"${banned}"`);
    expect(params).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'], output_config: { effort: 'low' } });
    expect(params.messages).toHaveLength(1);
  });
});

describe('schema post-validation', () => {
  it('accepts the recorded fixture', () => {
    expect(ModelExtraction.safeParse(modelOut).success).toBe(true);
  });

  it('drops an invented rule id but keeps the item', () => {
    const raw = structuredClone(modelOut);
    raw.items[1].matches.push({ ruleId: 'R99.made_up', confidence: 'high', reason: 'x' } as never);
    raw.eventMatches.push({ ruleId: 'R3.talent', confidence: 'high', reason: 'x', evidence: '' } as never); // item rule used as event rule
    const parsed = ModelExtraction.parse(raw);
    expect(parsed.items[1].matches.map((m) => m.ruleId)).toEqual(['R1']);
    expect(parsed.eventMatches.map((m) => m.ruleId)).toEqual(['R4']);
  });

  it('blanks fabricated evidence, keeps real evidence across case and spacing, nulls negatives', () => {
    const raw = structuredClone(modelOut);
    raw.items[0].evidence = 'Catering from Nobu $9,000';
    raw.items[2].evidence = 'dj   $600';
    raw.items[3].totalCents = -480000;
    raw.eventMatches[0].evidence = 'free entry for all';
    const ex = toExtraction(ModelExtraction.parse(raw), SAMPLE_PLAN);
    expect(ex.items[0].evidence).toBe('');
    expect(ex.items[2].evidence).toBe('dj   $600');
    expect(ex.items[3].totalCents).toBeNull();
    expect(ex.eventMatches[0].evidence).toBe('');
    expect(ex.eventMatches[0].ruleId).toBe('R4');
  });
});

describe('POST /api/draft', () => {
  const check = { fund: { label: 'Performing, Visual Arts, & Cultural Fund' }, flags: [{ ruleId: 'R1', itemId: 'i2', severity: 'not_eligible' }] };

  it('rejects a body without an extraction', async () => {
    const r = await post('/api/draft', { check }, env());
    expect(r.status).toBe(400);
  });

  it('justifies only items that are not flagged not_eligible, and keeps flagged items out of the prompt', async () => {
    parse.mockResolvedValue({
      stop_reason: 'end_turn',
      model: 'claude-opus-5-5',
      parsed_output: {
        description: 'd',
        missionAlignment: 'm',
        foodJustification: 'f',
        travelPurpose: 't',
        budgetJustifications: [
          { itemId: 'i1', text: 'Dinner for the audience.' },
          { itemId: 'i2', text: 'flagged, must be dropped' },
          { itemId: 'i9', text: 'invented' },
        ],
      },
    } as never);
    const r = await post('/api/draft', { extraction: fixture, check }, env());
    expect(r.body).toMatchObject({ ok: true, provider: 'claude', draft: { foodJustification: 'f', travelPurpose: null, budgetJustifications: { i1: 'Dinner for the audience.' } } });
    const user = JSON.stringify((parse.mock.calls[0][0] as unknown as { messages: unknown }).messages);
    expect(user).not.toContain('$');
    expect(user).not.toMatch(/balloon/i);
    expect(user).toContain('Printed programs');
  });
});
