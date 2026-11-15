import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { Provider } from '../src/shared/contracts';

// The only file that knows providers. Change the model here (wrangler.jsonc vars override when set).
export const CLAUDE_MODEL = 'claude-opus-5-5';
export const WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export type Task = 'extract' | 'draft';
export type Effort = 'low' | 'medium' | 'high';
/** Chosen by measurement on the sample plan (see the S2 report). */
export const EFFORT: Record<Task, Effort> = { extract: 'low', draft: 'low' };

export interface Env {
  AI: Ai;
  ANTHROPIC_API_KEY?: string; // Worker secret; .dev.vars locally
  LLM_PROVIDER?: string; // "workers-ai" skips Claude
  CLAUDE_MODEL?: string;
  WORKERS_AI_MODEL?: string;
  ALLOW_FORCE_FAIL?: string; // "1" enables the x-fundcheck-force-* test headers
}

export interface LlmResult<T = unknown> {
  data: T;
  provider: Provider;
  model: string;
  ms: number;
}
export interface CallOpts {
  forceClaudeFail?: boolean; // skip Claude
  forceFail?: boolean; // fail both providers
}

/** Total failure of the chain. `llm_invalid`: the last provider answered but its JSON did not validate. */
export class LlmError extends Error {
  constructor(
    public code: 'llm_failed' | 'llm_invalid',
    message: string,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

async function callClaude<T>(env: Env, task: Task, system: string, user: string, schema: z.ZodType<T>) {
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    authToken: null,
    baseURL: 'https://api.anthropic.com', // explicit, so no environment base URL is ever used
    timeout: 20_000,
    maxRetries: 1,
  });
  const msg = await client.beta.messages.parse({
    model: env.CLAUDE_MODEL || CLAUDE_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    cache_control: { type: 'ephemeral' },
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: EFFORT[task], format: betaZodOutputFormat(schema) },
  });
  if (msg.stop_reason === 'refusal') throw new LlmError('llm_failed', `refusal (${msg.stop_details?.category ?? 'no category'})`);
  if (msg.stop_reason === 'max_tokens') throw new LlmError('llm_failed', 'max_tokens');
  if (msg.parsed_output == null) throw new LlmError('llm_invalid', 'no parsed_output');
  return { data: msg.parsed_output as T, model: msg.model };
}

/** Most-specific first. Every one of them falls back to Workers AI; the label is all that gets logged. */
function claudeErrorLabel(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) return 'RateLimitError';
  if (err instanceof Anthropic.AuthenticationError) return 'AuthenticationError';
  if (err instanceof Anthropic.APIConnectionTimeoutError) return 'APIConnectionTimeoutError';
  if (err instanceof Anthropic.APIConnectionError) return 'APIConnectionError';
  if (err instanceof Anthropic.InternalServerError) return 'InternalServerError';
  if (err instanceof Anthropic.APIError) return 'APIError';
  if (err instanceof LlmError) return `LlmError ${err.message}`;
  if (err instanceof Anthropic.AnthropicError) return 'AnthropicError (structured output did not parse)';
  return 'UnknownError';
}

async function callWorkersAi<T>(env: Env, system: string, user: string, schema: z.ZodType<T>): Promise<T> {
  let last: LlmError = new LlmError('llm_failed', 'not run');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = (await env.AI.run((env.WORKERS_AI_MODEL || WORKERS_AI_MODEL) as Parameters<Ai['run']>[0], {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_schema', json_schema: z.toJSONSchema(schema) },
        max_tokens: 4096, // the model default is far too small for an extraction
      } as never)) as { response?: unknown };
      // JSON Mode returns `response` as an object; some models return a JSON string.
      const raw = typeof out.response === 'string' ? JSON.parse(out.response) : out.response;
      const parsed = schema.safeParse(raw);
      if (parsed.success) return parsed.data;
      last = new LlmError('llm_invalid', 'Workers AI JSON failed validation');
    } catch (err) {
      // Includes "JSON Mode couldn't be met" and unparsable JSON strings.
      last = new LlmError(err instanceof SyntaxError ? 'llm_invalid' : 'llm_failed', `Workers AI: ${(err as Error).name}`);
    }
    console.warn('workers-ai attempt failed:', last.code, last.message);
  }
  throw last;
}

/** Claude, then Workers AI. Throws LlmError when both fail; the caller decides on the cached sample. */
export async function callJson<T>(
  env: Env,
  task: Task,
  system: string,
  user: string,
  schema: z.ZodType<T>,
  opts: CallOpts = {},
): Promise<LlmResult<T>> {
  const t0 = Date.now();
  if (opts.forceFail) throw new LlmError('llm_failed', 'forced failure (test header)');
  if (env.ANTHROPIC_API_KEY && env.LLM_PROVIDER !== 'workers-ai' && !opts.forceClaudeFail) {
    try {
      const { data, model } = await callClaude(env, task, system, user, schema);
      return { data, provider: 'claude', model, ms: Date.now() - t0 };
    } catch (err) {
      const status = (err as { status?: number }).status ?? '';
      console.warn(`claude failed (${task}), falling back to workers-ai:`, claudeErrorLabel(err), status);
    }
  }
  const data = await callWorkersAi(env, system, user, schema);
  return { data, provider: 'workers-ai', model: env.WORKERS_AI_MODEL || WORKERS_AI_MODEL, ms: Date.now() - t0 };
}
