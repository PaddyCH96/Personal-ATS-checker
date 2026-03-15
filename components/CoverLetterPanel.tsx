"use client";

import { useState } from 'react';
import { useApiCost } from './ApiCostProvider';

interface CoverLetterPanelProps {
  resumeData: any;
  jobDescription: string;
  jobIntelligence: any;
  onCoverLetterGenerated?: (text: string) => void;
}

export default function CoverLetterPanel({ resumeData, jobDescription, jobIntelligence, onCoverLetterGenerated }: CoverLetterPanelProps) {
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { addCost } = useApiCost();

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_data: resumeData,
          job_description: jobDescription,
          job_intelligence: jobIntelligence,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoverLetter(data.cover_letter_text);
      onCoverLetterGenerated?.(data.cover_letter_text);
      if (data.usage) {
        const cost = (data.usage.prompt_tokens * 0.150 + data.usage.completion_tokens * 0.600) / 1000000;
        addCost(cost);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!coverLetter) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const maxW = doc.internal.pageSize.getWidth() - 36;
    const lines = doc.splitTextToSize(coverLetter, maxW);
    doc.text(lines, 18, 25);
    // Use explicit Blob download for reliable Mac ~/Downloads saving
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'cover_letter.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-neutral-800 mb-2">📝 Cover Letter</h3>
      <p className="text-sm text-neutral-500 mb-4">Generate a professional cover letter tailored to the job description.</p>

      {!coverLetter ? (
        <>
          <button onClick={handleGenerate} disabled={loading} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {loading ? 'Generating...' : 'Generate Cover Letter'}
          </button>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </>
      ) : (
        <>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-5 mb-4 whitespace-pre-wrap text-sm text-neutral-700 leading-relaxed max-h-96 overflow-y-auto">
            {coverLetter}
          </div>
          <div className="flex gap-3">
            <button onClick={handleCopy} className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-300 flex items-center gap-2">
              {copied ? '✓ Copied!' : '📋 Copy Text'}
            </button>
            <button onClick={handleDownloadPdf} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              📄 Download PDF
            </button>
            <button onClick={handleGenerate} disabled={loading} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200">
              {loading ? 'Regenerating...' : '🔄 Regenerate'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
