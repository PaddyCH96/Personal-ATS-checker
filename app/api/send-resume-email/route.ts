import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';
import { formatApiError, isValidEmail, sanitize } from '@/lib/apiUtils';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function generateResumePdf(resumeData: any): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 18;
  const marginR = 18;
  const maxW = pageW - marginL - marginR;
  let y = 20;

  const checkNewPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 20;
    }
  };

  const addSection = (title: string) => {
    checkNewPage(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(5, 100, 60);
    doc.text(title.toUpperCase(), marginL, y);
    doc.setDrawColor(5, 150, 80);
    doc.setLineWidth(0.4);
    doc.line(marginL, y + 1.5, pageW - marginR, y + 1.5);
    y += 7;
    doc.setTextColor(30, 30, 30);
  };

  const addText = (text: string, bold = false, size = 9.5) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxW);
    checkNewPage(lines.length * 5 + 2);
    doc.text(lines, marginL, y);
    y += lines.length * 5 + 1;
  };

  if (resumeData.summary) {
    addSection('Professional Summary');
    addText(resumeData.summary);
    y += 4;
  }

  if (resumeData.skills?.length) {
    addSection('Skills');
    addText(resumeData.skills.join('  ·  '));
    y += 4;
  }

  if (resumeData.experience?.length) {
    addSection('Experience');
    resumeData.experience.forEach((exp: any) => {
      checkNewPage(14);
      addText(`${exp.role} — ${exp.company}`, true, 10);
      exp.bullets?.forEach((b: string) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(`• ${b}`, maxW - 4);
        checkNewPage(lines.length * 5 + 1);
        doc.text(lines, marginL + 3, y);
        y += lines.length * 5 + 1;
      });
      y += 3;
    });
  }

  if (resumeData.education?.length) {
    addSection('Education');
    resumeData.education.forEach((edu: string) => addText(edu));
  }

  // Get buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function generateCoverLetterPdf(text: string): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const maxW = doc.internal.pageSize.getWidth() - 36;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, 18, 25);
  return Buffer.from(doc.output('arraybuffer'));
}

export async function POST(request: Request) {
  try {
    const { allowed } = rateLimit(`send-resume-email:${getClientIp(request)}`, 5, 60_000);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
    }

    const { recipient_email, message, resume_data, cover_letter_text } = await request.json();

    if (!recipient_email || !resume_data) {
      return NextResponse.json({ success: false, error: 'Missing required fields: recipient_email and resume_data' }, { status: 400 });
    }

    if (!isValidEmail(recipient_email)) {
      return NextResponse.json({ success: false, error: 'Invalid recipient email address' }, { status: 400 });
    }

    const sanitizedMessage = message ? sanitize(message) : '';
    const sanitizedCoverLetter = cover_letter_text ? sanitize(cover_letter_text) : '';

    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpEmail || !smtpPassword) {
      return NextResponse.json(
        { success: false, error: 'SMTP credentials not configured. Please set SMTP_EMAIL and SMTP_PASSWORD.' },
        { status: 500 }
      );
    }

    // Generate PDFs
    const resumePdf = generateResumePdf(resume_data);
    const attachments: any[] = [
      { filename: 'resume.pdf', content: resumePdf, contentType: 'application/pdf' }
    ];

    if (sanitizedCoverLetter) {
      const clPdf = generateCoverLetterPdf(sanitizedCoverLetter);
      attachments.push({ filename: 'cover_letter.pdf', content: clPdf, contentType: 'application/pdf' });
    }

    // Configure transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpEmail, pass: smtpPassword }
    });

    const bodyText = sanitizedMessage
      ? sanitizedMessage
      : 'Hi,\n\nPlease find my resume attached for your consideration.\n\nBest regards';

    await transporter.sendMail({
      from: smtpEmail,
      to: recipient_email,
      subject: 'Resume Application',
      text: bodyText,
      attachments,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      formatApiError(error, 'Failed to send email'),
      { status: 500 }
    );
  }
}
