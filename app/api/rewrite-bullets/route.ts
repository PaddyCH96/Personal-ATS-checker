import { NextResponse } from 'next/server';
import { createJsonCompletion, formatApiError, sanitize } from '@/lib/apiUtils';
import { auditRewrittenBullets } from '@/lib/metricGuard';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { allowed } = rateLimit(`rewrite-bullets:${getClientIp(request)}`, 15, 60_000);
        if (!allowed) {
            return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
        }

        const { job_description, missing_keywords, bullets } = await request.json();

        if (!bullets || bullets.length === 0) {
            return NextResponse.json({ success: false, error: 'No bullets provided to rewrite' }, { status: 400 });
        }

        const sanitizedJobDesc = sanitize(job_description || '');
        const sanitizedKeywords = (missing_keywords || []).map((k: string) => sanitize(k));

        const prompt = `
You are an expert resume writer and ATS optimizer.
Below is a list of original resume bullet points. Your task is to rewrite each bullet point.

CRITICAL RULE — NEVER INVENT FACTS:
You do not know this candidate's real numbers. Never add a metric, percentage,
dollar amount, team size, timeframe, or any other figure that is not already
present in the original bullet. Writing "increased efficiency by 30%" when the
original said no such thing is a fabrication that could cost the candidate their
job offer. This rule overrides every other instruction below.
- If the original bullet contains a number, keep it exactly as written.
- If a metric would genuinely strengthen the bullet but you do not have one,
  insert a bracketed placeholder such as [X]% or [N] for the candidate to fill
  in themselves. Never guess a value.
- Do not invent tools, employers, titles, dates, or scope that are not stated.

Make the bullets:
1. Stronger and more specific through precise action verbs and clearer articulation
   of what was actually done — not through invented numbers.
2. ATS-friendly and concise (strictly 1 sentence per bullet).
3. Naturally incorporate any relevant missing keywords from the job description if
   appropriate. Do not force them, and only if the candidate plausibly did that work.

Context:
Job Description:
${sanitizedJobDesc}

Missing Keywords to try and incorporate seamlessly:
${sanitizedKeywords.join(', ')}

Original Bullets:
${JSON.stringify(bullets, null, 2)}

Return a valid JSON object with the following structure exactly (no markdown formatting, just raw JSON):
{
  "rewritten_bullets": [
    {
      "original": "original text 1",
      "improved": "improved text 1"
    }
  ]
}
`;

        const { data, usage } = await createJsonCompletion<{ rewritten_bullets?: unknown }>({
            system: "You are a specialized resume writing assistant that never invents facts or figures. Return only raw valid JSON without markdown code blocks.",
            prompt,
            // Low temperature: this is a faithful rewrite, not creative writing.
            temperature: 0.3,
        });

        // Catch figures the model invented — or real ones it discarded — despite the prompt.
        // Audited against the user's own bullets, not the model's echo of them.
        const { bullets: auditedBullets, warning, dropped_metrics_notice } =
            auditRewrittenBullets(data?.rewritten_bullets, {
                sourceBullets: bullets,
                supportedTerms: sanitizedKeywords,
            });

        return NextResponse.json({
            success: true,
            rewritten_bullets: auditedBullets,
            ...(warning ? { warning } : {}),
            ...(dropped_metrics_notice ? { dropped_metrics_notice } : {}),
            usage
        });
    } catch (error: any) {
        return NextResponse.json(
            formatApiError(error, 'An error occurred during AI rewriting'),
            { status: 500 }
        );
    }
}
