import { NextResponse } from 'next/server';
import { createJsonCompletion, formatApiError, sanitize } from '@/lib/apiUtils';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { allowed } = rateLimit(`job-intelligence:${getClientIp(request)}`, 15, 60_000);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
    }

    const { job_description, resume_skills } = await request.json();

    if (!job_description) {
      return NextResponse.json({ success: false, error: 'Missing required field: job_description' }, { status: 400 });
    }

    const sanitizedJobDesc = sanitize(job_description);
    const sanitizedSkills = (resume_skills || []).map((s: string) => sanitize(s));

    const resumeSkillsContext = sanitizedSkills.length > 0
      ? `\n\nThe candidate's current resume contains these skills: ${sanitizedSkills.join(', ')}. Use this to produce the gap_analysis section by comparing against the job requirements.`
      : '\n\nNo resume skills were provided. Set the gap_analysis to null.';

    const prompt = `
You are an expert recruiter and hiring manager. Analyze the following job description and extract structured intelligence.

Job Description:
${sanitizedJobDesc}
${resumeSkillsContext}

Return a valid JSON object matching this exact structure:
{
  "role_title": "the job title",
  "seniority_level": "Junior / Mid / Mid-Senior / Senior / Lead / Principal",
  "primary_skills": ["top 3-5 must-have technical skills"],
  "secondary_skills": ["2-4 nice-to-have skills"],
  "tools_and_technologies": ["specific tools, frameworks, platforms mentioned"],
  "key_responsibilities": ["3-5 main job duties"],
  "industry_context": "the industry/domain, e.g. Fintech, Healthcare, SaaS",
  "experience_expectation": "years and type of experience expected",
  "recruiter_priorities": ["3-5 things the recruiter cares about most"],
  "skill_priority": [
    { "skill": "SkillName", "importance": "high" },
    { "skill": "SkillName", "importance": "medium" },
    { "skill": "SkillName", "importance": "low" }
  ],
  "gap_analysis": {
    "strong_matches": ["skills the candidate clearly has"],
    "partial_matches": ["skills the candidate may partially have"],
    "missing_critical_skills": ["high-importance skills the candidate lacks"],
    "missing_secondary_skills": ["lower-importance skills the candidate lacks"]
  },
  "resume_strategy": [
    "Actionable suggestion 1",
    "Actionable suggestion 2",
    "Actionable suggestion 3"
  ]
}

Rules:
- skill_priority should cover ALL skills from primary_skills, secondary_skills, and tools_and_technologies.
- gap_analysis should be null if no resume skills were provided.
- resume_strategy suggestions must be factual and should never tell the user to fabricate experience.
- Return only raw valid JSON, no markdown.
`;

    const { data, usage } = await createJsonCompletion({
      system: 'You are a specialized JSON-outputting recruiter intelligence assistant. Return only raw valid JSON without markdown code blocks.',
      prompt,
      temperature: 0.5,
    });

    return NextResponse.json({
      success: true,
      ...data,
      usage
    });
  } catch (error: any) {
    return NextResponse.json(
      formatApiError(error, 'An error occurred during job intelligence extraction'),
      { status: 500 }
    );
  }
}
