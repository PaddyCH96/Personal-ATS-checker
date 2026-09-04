import { NextResponse } from 'next/server';
import { createJsonCompletion, formatApiError, sanitize } from '@/lib/apiUtils';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { allowed } = rateLimit(`generate-cover-letter:${getClientIp(request)}`, 15, 60_000);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
    }

    const { resume_data, job_description, job_intelligence } = await request.json();

    if (!resume_data || !job_description) {
      return NextResponse.json({ success: false, error: 'Missing required fields: resume_data and job_description' }, { status: 400 });
    }

    const sanitizedJobDesc = sanitize(job_description);

    const intelligenceContext = job_intelligence ? `
Recruiter Intelligence:
- Role: ${job_intelligence.role_title || 'N/A'}
- Seniority: ${job_intelligence.seniority_level || 'N/A'}
- Industry: ${job_intelligence.industry_context || 'N/A'}
- Priorities: ${job_intelligence.recruiter_priorities?.join(', ') || 'N/A'}
` : '';

    const prompt = `
You are an expert career coach and professional writer. Write a compelling, professional cover letter for the following job opportunity.

Job Description:
${sanitizedJobDesc}

${intelligenceContext}

Candidate's Resume Data:
${JSON.stringify(resume_data, null, 2)}

Guidelines:
1. Address the letter professionally (use "Dear Hiring Manager" if no name is given).
2. Open with a strong hook that shows enthusiasm for the specific role.
3. Highlight 2-3 key qualifications that directly match the job requirements.
4. Use specific achievements from the resume to demonstrate value.
5. Show knowledge of the company/industry where possible.
6. Close with a confident call to action.
7. Keep it to 3-4 paragraphs, roughly 250-350 words.
8. Do NOT fabricate experience or skills not present in the resume.

Return a valid JSON object with this exact structure:
{
  "cover_letter_text": "The full cover letter text..."
}
`;

    const { data, usage } = await createJsonCompletion({
      system: 'You are a specialized JSON-outputting cover letter writer. Return only raw valid JSON without markdown code blocks.',
      prompt,
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      ...data,
      usage
    });
  } catch (error: any) {
    return NextResponse.json(
      formatApiError(error, 'An error occurred during cover letter generation'),
      { status: 500 }
    );
  }
}
