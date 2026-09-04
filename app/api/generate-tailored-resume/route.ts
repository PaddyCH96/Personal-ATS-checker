import { NextResponse } from 'next/server';
import { createJsonCompletion, formatApiError, sanitize } from '@/lib/apiUtils';
import { coerceResumeShape } from '@/lib/resumeSchema';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { allowed } = rateLimit(`generate-tailored-resume:${getClientIp(request)}`, 15, 60_000);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
    }

    const { resume_text, master_profile, job_description, missing_keywords, improved_bullets, job_intelligence } = await request.json();

    if ((!resume_text && !master_profile) || !job_description) {
      return NextResponse.json({ success: false, error: 'Missing required fields: resume_text/master_profile or job_description' }, { status: 400 });
    }

    const sanitizedJobDesc = sanitize(job_description);
    const sanitizedKeywords = (missing_keywords || []).map((k: string) => sanitize(k));
    const sanitizedResumeText = resume_text ? sanitize(resume_text) : null;

    // Build intelligence context if available
    const intelligenceContext = job_intelligence ? `
Recruiter Intelligence (use these signals to prioritize content):
- Recruiter Priorities: ${job_intelligence.recruiter_priorities?.join(', ') || 'N/A'}
- Primary Skills to emphasize: ${job_intelligence.primary_skills?.join(', ') || 'N/A'}
- Industry Context: ${job_intelligence.industry_context || 'N/A'}
- Seniority Level: ${job_intelligence.seniority_level || 'N/A'}
` : '';

    const prompt = `
You are an expert resume writer and recruiter. Your task is to generate a fully optimized, structured resume tailored to the provided job description using the supplied resume content.

Guidelines:
1. Maintain the user's real experience (do not fabricate facts, job titles, companies, or dates).
2. Improve clarity, impact, and use strong action verbs.
3. Integrate missing keywords naturally where relevant.
4. Keep bullet points concise and ATS-friendly.
5. Identify sections like Summary, Skills, Experience, Projects, and Education from the parsed resume text. If they cannot be cleanly identified, infer them logically based on the content.
6. Use the provided "improved bullets" wherever possible in the experience and project sections instead of the original text.

Context:
Job Description:
${sanitizedJobDesc}
${intelligenceContext}
Missing Keywords to try and incorporate seamlessly:
${sanitizedKeywords.join(', ') || 'None'}

Improved Bullets to use:
${improved_bullets ? JSON.stringify(improved_bullets, null, 2) : 'None provided'}

Source Resume Information:
${master_profile ? JSON.stringify(master_profile, null, 2) : sanitizedResumeText}

Return a valid JSON object strictly matching this structure (no markdown formatting, just raw JSON):
{
  "summary": "Professional summary...",
  "skills": ["Skill 1", "Skill 2"],
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "bullets": ["Bullet 1", "Bullet 2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "bullets": ["Bullet 1"]
    }
  ],
  "education": ["Degree detail 1", "Degree detail 2"]
}
`;

    const { data, usage } = await createJsonCompletion({
      system: "You are a specialized JSON-outputting resume writing assistant. Return only raw valid JSON without markdown code blocks.",
      prompt,
      temperature: 0.7,
    });

    // Smaller open-weight models sometimes omit or mistype sections — normalize
    // to the expected shape rather than rendering a half-broken resume.
    const { resume, warnings } = coerceResumeShape(data, {
      fallbackProfile: master_profile ?? null,
    });

    return NextResponse.json({
      success: true,
      ...resume,
      ...(warnings.length ? { warnings } : {}),
      usage
    });
  } catch (error: any) {
    return NextResponse.json(
      formatApiError(error, 'An error occurred during resume generation'),
      { status: 500 }
    );
  }
}
