import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

/** Default local (Ollama) endpoint — used when no provider is configured. */
const OLLAMA_BASE_URL = 'http://localhost:11434/v1';
const OLLAMA_DEFAULT_MODEL = 'llama3.1:8b';
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';

export interface AiProviderConfig {
  baseURL: string | undefined;
  apiKey: string;
  model: string;
  /** True when running against a local endpoint (no per-token cost). */
  isLocal: boolean;
  /** Human-readable provider label, surfaced to the UI. */
  label: string;
}

/**
 * Resolve which AI backend to talk to.
 *
 * Resolution order:
 *   1. AI_BASE_URL set        -> any OpenAI-compatible provider (Ollama, Groq, OpenRouter, HF router, ...)
 *   2. OpenAI key set         -> OpenAI (preserves existing setups unchanged)
 *   3. nothing configured     -> local Ollama, so a fresh clone runs free with no signup
 */
export function getAiConfig(): AiProviderConfig {
  const baseURL = process.env.AI_BASE_URL?.trim();
  const openaiKey = process.env.MAIN_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL?.trim();

  if (baseURL) {
    const isLocal = /localhost|127\.0\.0\.1|host\.docker\.internal|0\.0\.0\.0/.test(baseURL);
    return {
      baseURL,
      // Local runtimes ignore the key but the SDK requires a non-empty string.
      apiKey: process.env.AI_API_KEY || openaiKey || 'local-no-key-required',
      model: model || OLLAMA_DEFAULT_MODEL,
      isLocal,
      label: isLocal ? 'Local model' : new URL(baseURL).hostname,
    };
  }

  if (openaiKey) {
    return {
      baseURL: undefined,
      apiKey: openaiKey,
      model: model || OPENAI_DEFAULT_MODEL,
      isLocal: false,
      label: 'OpenAI',
    };
  }

  return {
    baseURL: OLLAMA_BASE_URL,
    apiKey: 'ollama',
    model: model || OLLAMA_DEFAULT_MODEL,
    isLocal: true,
    label: 'Local model (Ollama)',
  };
}

/** Get or create a singleton OpenAI-compatible client for the configured provider. */
export function getOpenAI(): OpenAI {
  const { baseURL, apiKey } = getAiConfig();

  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey, baseURL, timeout: 120_000 }); // local models are slower than hosted APIs
  }
  return openaiInstance;
}

/** Retry wrapper for API requests with exponential backoff */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      // Don't retry on client errors (4xx) — only on server/network/timeout errors
      const status = (err as { status?: number })?.status;
      if (status && status >= 400 && status < 500) throw err;

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

/**
 * Parse JSON from a model response, tolerating the formatting habits of smaller
 * open-weight models (markdown fences, leading prose, trailing commentary).
 */
export function parseModelJson<T = unknown>(raw: string | null | undefined): T {
  if (!raw || !raw.trim()) throw new Error('Empty response from model');

  let text = raw.trim();

  // Strip ```json ... ``` fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) text = fenced[1].trim();

  try {
    return JSON.parse(text) as T;
  } catch {
    // Fall through to brace extraction
  }

  // Grab the outermost {...} block, ignoring any prose around it
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      // Fall through to the thrown error below
    }
  }

  throw new Error('Model did not return valid JSON');
}

/** True if the provider rejected `response_format` as unsupported. */
function isJsonModeUnsupported(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  const msg = String(e?.message || '').toLowerCase();
  return e?.status === 400 && (msg.includes('response_format') || msg.includes('json_object'));
}

export interface JsonCompletionArgs {
  system: string;
  prompt: string;
  temperature?: number;
}

export interface JsonCompletionResult<T> {
  data: T;
  usage: OpenAI.CompletionUsage | undefined;
}

/**
 * Request a JSON object from the configured model and parse it defensively.
 *
 * Handles the two ways open-weight backends differ from OpenAI:
 *  - `response_format: json_object` may be unsupported -> retried without it
 *  - output may be fenced or prefaced with prose      -> repaired, then re-asked once
 */
export async function createJsonCompletion<T = Record<string, unknown>>({
  system,
  prompt,
  temperature = 0.7,
}: JsonCompletionArgs): Promise<JsonCompletionResult<T>> {
  const openai = getOpenAI();
  const { model } = getAiConfig();

  const run = async (useJsonMode: boolean, extraNudge = '') => {
    return withRetry(async () =>
      openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt + extraNudge },
        ],
        temperature,
        ...(useJsonMode ? { response_format: { type: 'json_object' as const } } : {}),
      })
    );
  };

  let response;
  try {
    response = await run(true);
  } catch (err: unknown) {
    if (!isJsonModeUnsupported(err)) throw err;
    response = await run(false);
  }

  const content = response.choices[0]?.message?.content;

  try {
    return { data: parseModelJson<T>(content), usage: response.usage };
  } catch {
    // One repair attempt — common with smaller models that wrap or narrate output.
    const repaired = await run(
      false,
      '\n\nIMPORTANT: Respond with raw JSON only. No markdown fences, no explanation before or after.'
    );
    return {
      data: parseModelJson<T>(repaired.choices[0]?.message?.content),
      usage: repaired.usage,
    };
  }
}

/** Validate that a string is a valid email address format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Sanitize a string by trimming and removing basic HTML tags */
export function sanitize(input: string): string {
  if (!input) return '';
  return input.trim().replace(/<[^>]*>?/gm, '');
}

/**
 * Walk an error's `cause` chain looking for a network error code.
 * The OpenAI SDK buries the real code two levels down:
 *   APIConnectionError -> TypeError('fetch failed') -> AggregateError(code: ECONNREFUSED)
 */
function findNetworkErrorCode(error: unknown): string | undefined {
  let current = error as { code?: string; errors?: unknown[]; cause?: unknown } | undefined;
  for (let depth = 0; current && depth < 6; depth++) {
    if (typeof current.code === 'string') return current.code;
    // AggregateError collects per-address failures (IPv6 then IPv4)
    if (Array.isArray(current.errors)) {
      const nested = current.errors.find((e) => typeof (e as { code?: unknown })?.code === 'string');
      if (nested) return (nested as { code: string }).code;
    }
    current = current.cause as typeof current;
  }
  return undefined;
}

/** Standard API error response format */
export function formatApiError(error: unknown, defaultMessage: string = 'Internal Server Error') {
  console.error('[API Error]', error);

  // Unreachable provider is the most common self-host stumble — make it actionable.
  // Note: the SDK sets `name` to 'Error', so match on the constructor instead.
  const code = findNetworkErrorCode(error);
  const ctorName = (error as { constructor?: { name?: string } })?.constructor?.name;
  const isConnectionError =
    ctorName === 'APIConnectionError' || ctorName === 'APIConnectionTimeoutError';

  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || isConnectionError) {
    const { baseURL, isLocal } = getAiConfig();
    return {
      success: false,
      error: isLocal
        ? `Cannot reach the local AI model at ${baseURL}. Is Ollama running? Start it with "ollama serve" and pull a model with "ollama pull llama3.1:8b".`
        : `Cannot reach the AI provider at ${baseURL}. Check AI_BASE_URL and your network connection.`,
    };
  }

  return {
    success: false,
    error: (error as { message?: string })?.message || defaultMessage
  };
}
