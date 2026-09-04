import { NextResponse } from 'next/server';
import { getAiConfig } from '@/lib/apiUtils';

export const dynamic = 'force-dynamic';

/** Reports the active AI backend so the UI can label it (and skip cost tracking when local). */
export async function GET() {
  const { model, isLocal, label } = getAiConfig();
  // Deliberately omits baseURL and apiKey — no credential or host detail leaves the server.
  return NextResponse.json({ model, isLocal, label });
}
