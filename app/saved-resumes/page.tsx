"use client";

import { useState, useEffect } from 'react';
import { getResumeVersions, ResumeVersion } from '@/lib/storage';

export default function SavedResumesPage() {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);

  useEffect(() => { setVersions(getResumeVersions()); }, []);

  const handleDownloadPdf = async (rv: ResumeVersion) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const marginL = 18;
    const marginR = 18;
    const maxW = pageW - marginL - marginR;
    let y = 20;

    const checkNewPage = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - 15) { doc.addPage(); y = 20; }
    };

    const addSection = (title: string) => {
      checkNewPage(12);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.setTextColor(5, 100, 60);
      doc.text(title.toUpperCase(), marginL, y);
      doc.setDrawColor(5, 150, 80); doc.setLineWidth(0.4);
      doc.line(marginL, y + 1.5, pageW - marginR, y + 1.5);
      y += 7; doc.setTextColor(30, 30, 30);
    };

    const addText = (text: string, bold = false, size = 9.5) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, maxW);
      checkNewPage(lines.length * 5 + 2);
      doc.text(lines, marginL, y); y += lines.length * 5 + 1;
    };

    const rd = rv.resume_data;
    if (rd.summary) { addSection('Summary'); addText(rd.summary); y += 4; }
    if (rd.skills?.length) { addSection('Skills'); addText(rd.skills.join('  ·  ')); y += 4; }
    if (rd.experience?.length) {
      addSection('Experience');
      rd.experience.forEach((exp: any) => {
        checkNewPage(14); addText(`${exp.role} — ${exp.company}`, true, 10);
        exp.bullets?.forEach((b: string) => {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
          const lines = doc.splitTextToSize(`• ${b}`, maxW - 4);
          checkNewPage(lines.length * 5 + 1);
          doc.text(lines, marginL + 3, y); y += lines.length * 5 + 1;
        });
        y += 3;
      });
    }
    if (rd.education?.length) { addSection('Education'); rd.education.forEach((e: string) => addText(e)); }

    // Use explicit Blob download for reliable Mac ~/Downloads saving
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `resume_${rv.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-neutral-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Saved Resumes</h1>
        <p className="text-neutral-500 mb-8">Browse and re-download previously generated resume versions.</p>

        {versions.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-10 text-center text-neutral-400">
            No saved resume versions yet. Generate a tailored resume to see it here.
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map(rv => (
              <div key={rv.id} className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-800">
                    {rv.resume_data?.experience?.[0]?.role || 'Tailored Resume'}
                    {rv.resume_data?.experience?.[0]?.company && (
                      <span className="text-neutral-400 font-normal"> — {rv.resume_data.experience[0].company}</span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Created: {new Date(rv.created_at).toLocaleString()}
                    {rv.job_id && <span className="ml-3">• Linked to job</span>}
                  </p>
                  {rv.resume_data?.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {rv.resume_data.skills.slice(0, 6).map((s: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{s}</span>
                      ))}
                      {rv.resume_data.skills.length > 6 && (
                        <span className="text-xs text-neutral-400">+{rv.resume_data.skills.length - 6} more</span>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDownloadPdf(rv)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
