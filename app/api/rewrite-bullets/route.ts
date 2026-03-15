import { NextResponse } from 'next/server';
import { getOpenAI, withRetry, formatApiError, sanitize } from '@/lib/apiUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { job_description, missing_keywords, bullets } = await request.json();

        if (!bullets || bullets.length === 0) {
            return NextResponse.json({ success: false, error: 'No bullets provided to rewrite' }, { status: 400 });
        }

        const sanitizedJobDesc = sanitize(job_description || '');
        const sanitizedKeywords = (missing_keywords || []).map((k: string) => sanitize(k));

        const openai = getOpenAI();

        const prompt = `
You are an expert resume writer and ATS optimizer.
Below is a list of original resume bullet points. Your task is to rewrite each bullet point.
Make them:
1. More specific, with measurable impact where possible.
2. ATS-friendly and concise (strictly 1 sentence per bullet).
3. Naturally incorporate any relevant missing keywords from the job description if appropriate. Do not force them if they don't make sense.

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

        const response = await withRetry(async () => {
            return await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a specialized JSON-outputting resume writing assistant. Return only raw valid JSON without markdown code blocks." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            });
        });

        const rewriteResult = response.choices[0].message.content;
        if (!rewriteResult) {
            throw new Error('No response from OpenAI');
        }

        const parsedData = JSON.parse(rewriteResult);
        return NextResponse.json({
            success: true,
            ...parsedData,
            usage: response.usage
        });
    } catch (error: any) {
        return NextResponse.json(
            formatApiError(error, 'An error occurred during AI rewriting'),
            { status: 500 }
        );
    }
}
