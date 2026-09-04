import { NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdfParser';
import { extractKeywords } from '@/lib/keywordExtractor';
import { calculateMatch } from '@/lib/matchEngine';
import { formatApiError, sanitize } from '@/lib/apiUtils';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { allowed } = rateLimit(`analyze:${getClientIp(request)}`, 15, 60_000);
        if (!allowed) {
            return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
        }

        const formData = await request.formData();

        const resumeFile = formData.get('resume') as File | null;
        const masterProfileStr = formData.get('masterProfile') as string | null;
        const jobDescription = sanitize(formData.get('jobDescription') as string || '');

        if (!resumeFile && !masterProfileStr) {
            return NextResponse.json({ success: false, error: 'No resume file or master profile provided' }, { status: 400 });
        }

        if (!jobDescription) {
            return NextResponse.json({ success: false, error: 'Empty job description' }, { status: 400 });
        }

        let resumeText = '';

        if (resumeFile) {
            // Convert Web File Object to Node JS Buffer
            const arrayBuffer = await resumeFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Extract text from PDF
            resumeText = await extractTextFromPDF(buffer);
        } else if (masterProfileStr) {
            // Build text from structured Master Profile
            const profile = JSON.parse(masterProfileStr);
            const { summary, skills, experience, projects, education } = profile;
            
            const expText = experience?.map((e: any) => `${e.role} at ${e.company}\n${e.bullets?.join('\n')}`).join('\n\n') || '';
            const projText = projects?.map((p: any) => `${p.name}\n${p.bullets?.join('\n')}`).join('\n\n') || '';
            
            resumeText = `
                Summary: ${summary || ''}
                Skills: ${(skills || []).join(', ')}
                Experience:
                ${expText}
                Projects:
                ${projText}
                Education: ${(education || []).join('\n')}
            `;
        }

        // Extract keywords
        const resumeKeywords = extractKeywords(resumeText);
        const jobKeywords = extractKeywords(jobDescription);

        if (jobKeywords.length === 0) {
            return NextResponse.json({ success: false, error: 'No valid keywords found in job description' }, { status: 400 });
        }

        // Extract bullets
        const bullets = await import('@/lib/bulletExtractor').then(m => m.extractBullets(resumeText));

        // Compute match
        const result = calculateMatch(resumeKeywords, jobKeywords);

        return NextResponse.json({
            success: true,
            ...result,
            resume_text: resumeText,
            bullets: bullets
        });
    } catch (error: any) {
        return NextResponse.json(
            formatApiError(error, 'An error occurred during analysis'),
            { status: 500 }
        );
    }
}
