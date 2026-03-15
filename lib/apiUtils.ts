import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

/** Get or create a singleton OpenAI client */
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured in environment variables.');
  
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey, timeout: 30000 }); // 30s timeout for stability
  }
  return openaiInstance;
}

/** Retry wrapper for API requests with exponential backoff */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      // Don't retry on client errors (4xx) — only on server/network/timeout errors
      if (err?.status && err.status >= 400 && err.status < 500) throw err;
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
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

/** Standard API error response format */
export function formatApiError(error: any, defaultMessage: string = 'Internal Server Error') {
  console.error('[API Error]', error);
  return {
    success: false,
    error: error?.message || defaultMessage
  };
}
