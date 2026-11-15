import Anthropic from '@anthropic-ai/sdk';
import type { Provider } from '../src/shared/contracts';

export interface Env {
  AI: Ai;
  ANTHROPIC_API_KEY?: string; // Worker secret; .dev.vars locally
  LLM_PROVIDER: string; // "claude" | "workers-ai"
  CLAUDE_MODEL: string;
  WORKERS_AI_MODEL: string;
  ALLOW_FORCE_FAIL: string;
}

export type Effort = 'low' | 'medium' | 'high';
export interface LlmResult {
  data: unknown;
  provider: Provider;
  model: string;
  ms: number;
}
export interface CallOpts {
  effort?: Effort;
  forceClaudeFail?: boolean; // skip Claude and go straight to the fallback
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com'; // explicit so the SDK never reads ANTHROPIC_BASE_URL
const CLAUDE_TIMEOUT_MS = 30_000;
const WORKERS_AI_MAX_TOKENS = 4096; // the model's default is far too small for an extraction

/** Claude failed in a way the fallback should cover (refusal, truncation, no usable JSON). */
export class LlmOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmOutputError';
  }
}

export async function callClaude(
  env: Env,
  system: string,
  user: string,
  jsonSchema: object,
  effort: Effort = 'low',
): Promise<{ data: unknown; model: string }> {
  if (!env.ANTHROPIC_API_KEY) throw new LlmOutputError('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    authToken: null,
    baseURL: ANTHROPIC_API_URL,
    timeout: CLAUDE_TIMEOUT_MS,
    maxRetries: 0, // the Workers AI fallback is the retry
  });
  const msg = await client.beta.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: user }],
    output_config: {
      effort,
      format: { type: 'json_schema', schema: jsonSchema as Record<string, unknown> },
    },
  });
  if (msg.stop_reason === 'refusal') throw new LlmOutputError(`refusal (${msg.stop_details?.category ?? 'no category'})`);
  if (msg.stop_reason === 'max_tokens') throw new LlmOutputError('hit max_tokens');
  const text = msg.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new LlmOutputError('no text block in response');
  return { data: JSON.parse(text.text), model: msg.model };
}

export async function callWorkersAi(env: Env, system: string, user: string, jsonSchema: object): Promise<unknown> {
  const out = (await env.AI.run(env.WORKERS_AI_MODEL as Parameters<Ai['run']>[0], {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_schema', json_schema: jsonSchema },
    max_tokens: WORKERS_AI_MAX_TOKENS,
  } as never)) as { response?: unknown };
  // JSON Mode returns `response` as an object; some models return it as a JSON string.
  const r = out.response;
  if (r == null) throw new LlmOutputError('Workers AI returned no response');
  return typeof r === 'string' ? JSON.parse(r) : r;
}

function shouldFallBack(err: unknown): boolean {
  return err instanceof Anthropic.APIError || err instanceof LlmOutputError || err instanceof SyntaxError;
}

/** Claude first; on an SDK error, timeout, refusal or bad output, Workers AI. */
export async function callJson(
  env: Env,
  system: string,
  user: string,
  jsonSchema: object,
  opts: CallOpts = {},
): Promise<LlmResult> {
  const t0 = Date.now();
  if (env.LLM_PROVIDER === 'claude' && !opts.forceClaudeFail) {
    try {
      const { data, model } = await callClaude(env, system, user, jsonSchema, opts.effort);
      return { data, provider: 'claude', model, ms: Date.now() - t0 };
    } catch (err) {
      if (!shouldFallBack(err)) throw err;
      const e = err as Error & { status?: number };
      console.warn('claude failed, falling back to workers-ai:', e.name, e.status ?? '', e.message);
    }
  }
  const data = await callWorkersAi(env, system, user, jsonSchema);
  return { data, provider: 'workers-ai', model: env.WORKERS_AI_MODEL, ms: Date.now() - t0 };
}
