import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { Provider } from '../src/shared/contracts';

// The only file that knows providers, and the only place the model IDs live.
export const CLAUDE_MODEL = 'claude-opus-5-5';
export const WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export type Task = 'extract' | 'draft';
export type Effort = 'low' | 'medium' | 'high';
/** Chosen by measurement on the sample plan (see the S2 report). */
export const EFFORT: Record<Task, Effort> = { extract: 'low', draft: 'low' };
/** Hard cap on one request's whole provider chain, well under the UI's 45 s abort. */
export const BUDGET_MS = 25_000;

export interface Env {
  AI: Ai;
  ANTHROPIC_API_KEY?: string; // Worker secret; .dev.vars locally
  LLM_PROVIDER?: string; // "workers-ai" skips Claude
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
  claudeOnly?: boolean; // never use Workers AI (the sample plan has the cached result instead)
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
    timeout: BUDGET_MS, // a 22-item plan took 19 s at effort low
    maxRetries: 0, // Workers AI is the retry
  });
  const msg = await client.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // Breakpoint on the system block, so every plan reads the same cached prefix.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    output_config: { effort: EFFORT[task], format: betaZodOutputFormat(schema) },
  });
  const u = msg.usage;
  if (u) console.log(`claude ${task}: in ${u.input_tokens}, cache read ${u.cache_read_input_tokens ?? 0}, cache write ${u.cache_creation_input_tokens ?? 0}, out ${u.output_tokens}`);
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
      const out = (await env.AI.run(WORKERS_AI_MODEL as Parameters<Ai['run']>[0], {
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

/** Claude, then Workers AI, inside BUDGET_MS. Throws LlmError when both fail or time runs out; the caller decides on the cached sample. */
export async function callJson<T>(...args: Parameters<typeof chain<T>>): Promise<LlmResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      console.warn(`${args[1]}: no answer within ${BUDGET_MS} ms`);
      reject(new LlmError('llm_failed', `no answer within ${BUDGET_MS} ms`));
    }, BUDGET_MS);
  });
  try {
    // shortcut: the losing call is not aborted, it just stops mattering; pass a signal if Workers AI usage ever costs too much
    return await Promise.race([chain(...args), budget]);
  } finally {
    clearTimeout(timer);
  }
}

async function chain<T>(
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
      console.warn(`claude failed (${task}):`, claudeErrorLabel(err), status);
    }
  }
  if (opts.claudeOnly) throw new LlmError('llm_failed', 'Claude failed and Workers AI is off for this call');
  const data = await callWorkersAi(env, system, user, schema);
  return { data, provider: 'workers-ai', model: WORKERS_AI_MODEL, ms: Date.now() - t0 };
}
