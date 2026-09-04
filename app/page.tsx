"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApiCost } from '@/components/ApiCostProvider';
import { useNotification } from '@/components/NotificationToast';
import { saveResumeVersion } from '@/lib/storage';
import CoverLetterPanel from '@/components/CoverLetterPanel';
import EmailResumeModal from '@/components/EmailResumeModal';
import SaveJobModal from '@/components/SaveJobModal';
import { HighlightedMetrics, MetricNotice } from '@/components/MetricFlags';

// ----- Interfaces -----

interface Bullet {
  original: string;
}

interface RewrittenBullet {
  original: string;
  improved: string;
  /** Figures the AI added that were not in the original — verify before using. */
  unsupported_metrics?: string[];
  /** Real figures from the original that the rewrite discarded. */
  dropped_metrics?: string[];
}

interface MatchResult {
  match_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  resume_text: string;
  bullets: Bullet[];
}

interface TailoredResume {
  summary: string;
  skills: string[];
  experience: {
    role: string;
    company: string;
    bullets: string[];
  }[];
  projects: {
    name: string;
    bullets: string[];
  }[];
  education: string[];
}

interface MasterProfile {
  summary: string;
  skills: string[];
  experience: { role: string; company: string; bullets: string[] }[];
  projects: { name: string; bullets: string[] }[];
  education: string[];
}

interface SkillPriority {
  skill: string;
  importance: 'high' | 'medium' | 'low';
}

interface GapAnalysis {
  strong_matches: string[];
  partial_matches: string[];
  missing_critical_skills: string[];
  missing_secondary_skills: string[];
}

interface JobIntelligence {
  role_title: string;
  seniority_level: string;
  primary_skills: string[];
  secondary_skills: string[];
  tools_and_technologies: string[];
  key_responsibilities: string[];
  industry_context: string;
  experience_expectation: string;
  recruiter_priorities: string[];
  skill_priority: SkillPriority[];
  gap_analysis: GapAnalysis | null;
  resume_strategy: string[];
}

// ----- Main Component -----

export default function Home() {
  const { addCost } = useApiCost();
  const { showToast } = useNotification();

  const calculateAndAddCost = (usage?: { prompt_tokens: number; completion_tokens: number }) => {
    if (!usage) return;
    const cost = (usage.prompt_tokens * 0.150 + usage.completion_tokens * 0.600) / 1000000;
    addCost(cost);
  };

  // PDF upload flow
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);

  // Phase 2
  const [rewriting, setRewriting] = useState(false);
  const [rewrittenBullets, setRewrittenBullets] = useState<RewrittenBullet[] | null>(null);
  const [metricWarning, setMetricWarning] = useState<string | null>(null);
  const [droppedMetricsNotice, setDroppedMetricsNotice] = useState<string | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  // Phase 3
  const [generatingResume, setGeneratingResume] = useState(false);
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Source toggle
  const [useMasterProfile, setUseMasterProfile] = useState(false);
  const [masterProfile, setMasterProfile] = useState<MasterProfile | null>(null);

  // Phase 5 - Job Intelligence
  const [jobIntelligence, setJobIntelligence] = useState<JobIntelligence | null>(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);

  // PDF Download
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const resumePrintRef = useRef<HTMLDivElement>(null);

  // Phase 8 state
  const [coverLetterText, setCoverLetterText] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSaveJobModal, setShowSaveJobModal] = useState(false);
  const [lastResumeVersionId, setLastResumeVersionId] = useState<string | null>(null);

  // --- Hydrate from localStorage on mount ---
  useEffect(() => {
    // Load master profile if it exists
    const savedProfile = localStorage.getItem('master_profile_data');
    if (savedProfile) {
      try { setMasterProfile(JSON.parse(savedProfile)); } catch { /* ignore */ }
    }
    // Load last generated resume
    const savedResume = localStorage.getItem('last_generated_resume');
    if (savedResume) {
      try { setTailoredResume(JSON.parse(savedResume)); } catch { /* ignore */ }
    }
  }, []);

  // ----- HANDLERS: PDF Upload Flow (Phase 1) -----

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (!useMasterProfile && !file) { setError('Please upload a resume PDF or select Master Profile.'); return; }
    if (useMasterProfile && !masterProfile) { setError('Master Profile is empty. Please build it first.'); return; }
    if (!jobDescription.trim()) { setError('Please paste a job description.'); return; }

    setLoading(true);
    setError(null);
    setResult(null);
    setRewrittenBullets(null);
    setMetricWarning(null);
    setDroppedMetricsNotice(null);
    setRewriteError(null);
    setTailoredResume(null);
    setJobIntelligence(null);

    const formData = new FormData();
    if (useMasterProfile && masterProfile) {
      formData.append('masterProfile', JSON.stringify(masterProfile));
    } else if (file) {
      formData.append('resume', file);
    }
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to analyze');
      setResult(data);

      // Phase 5: Auto-fire job intelligence extraction
      setLoadingIntelligence(true);
      try {
        const intRes = await fetch('/api/job-intelligence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_description: jobDescription,
            resume_skills: data.matched_keywords || []
          })
        });
        const intData = await intRes.json();
        if (intRes.ok) {
          setJobIntelligence(intData);
          calculateAndAddCost(intData.usage);
        }
      } catch { /* intelligence is optional, silently fail */ }
      setLoadingIntelligence(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ----- HANDLERS: Phase 2 - Bullet Rewriting -----

  const handleRewrite = async () => {
    if (!result || !result.bullets || result.bullets.length === 0) {
      setRewriteError('No bullets extracted to rewrite.'); return;
    }
    setRewriting(true);
    setRewriteError(null);
    try {
      const response = await fetch('/api/rewrite-bullets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: result.resume_text,
          job_description: jobDescription,
          missing_keywords: result.missing_keywords,
          bullets: result.bullets
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to rewrite bullets');
      setRewrittenBullets(data.rewritten_bullets);
      // Surface the metric audit — a fabricated figure on a resume is worse
      // than a bland bullet, so the user has to be able to see it.
      setMetricWarning(data.warning ?? null);
      setDroppedMetricsNotice(data.dropped_metrics_notice ?? null);
      calculateAndAddCost(data.usage);
    } catch (err: any) {
      setRewriteError(err.message);
    } finally {
      setRewriting(false);
    }
  };

  // ----- HANDLERS: Phase 3 - Generate from PDF -----

  const handleGenerateResume = async () => {
    if (!result) return;
    setGeneratingResume(true);
    setGenerateError(null);
    setCopied(false);
    try {
      const payload: any = {
        job_description: jobDescription,
        missing_keywords: result.missing_keywords,
        improved_bullets: rewrittenBullets,
        job_intelligence: jobIntelligence
      };
      
      if (useMasterProfile && masterProfile) {
        payload.master_profile = masterProfile;
      } else {
        payload.resume_text = result.resume_text;
      }

      const response = await fetch('/api/generate-tailored-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate tailored resume');
      setTailoredResume(data);
      calculateAndAddCost(data.usage);
      localStorage.setItem('last_generated_resume', JSON.stringify(data));

      // Auto-save resume version
      const rv = saveResumeVersion({ resume_data: data, template: 'default', job_id: null });
      setLastResumeVersionId(rv.id);
      showToast('Tailored resume generated & saved!');
    } catch (err: any) {
      setGenerateError(err.message);
    } finally {
      setGeneratingResume(false);
    }
  };

  // ----- HANDLERS: Copy and PDF Download -----

  const handleCopyResume = () => {
    if (!tailoredResume) return;
    let text = `SUMMARY\n${tailoredResume.summary}\n\n`;
    text += `SKILLS\n${tailoredResume.skills.join(', ')}\n\n`;
    text += `EXPERIENCE\n`;
    tailoredResume.experience.forEach(exp => {
      text += `${exp.role} at ${exp.company}\n`;
      exp.bullets.forEach(b => { text += `- ${b}\n`; });
      text += `\n`;
    });
    if (tailoredResume.projects?.length > 0) {
      text += `PROJECTS\n`;
      tailoredResume.projects.forEach(proj => {
        text += `${proj.name}\n`;
        proj.bullets.forEach(b => { text += `- ${b}\n`; });
        text += `\n`;
      });
    }
    if (tailoredResume.education?.length > 0) {
      text += `EDUCATION\n`;
      tailoredResume.education.forEach(edu => { text += `${edu}\n`; });
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!tailoredResume) return;
    setDownloadingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginL = 18;
      const marginR = 18;
      const maxW = pageW - marginL - marginR;
      let y = 20;

      const checkNewPage = (needed: number) => {
        if (y + needed > pageH - 15) {
          doc.addPage();
          y = 20;
        }
      };

      const addSectionTitle = (title: string) => {
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

      const addBullet = (text: string) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(`• ${text}`, maxW - 4);
        checkNewPage(lines.length * 5 + 1);
        doc.text(lines, marginL + 3, y);
        y += lines.length * 5 + 1;
      };

      // --- SUMMARY ---
      addSectionTitle('Professional Summary');
      addText(tailoredResume.summary);
      y += 4;

      // --- SKILLS ---
      addSectionTitle('Skills');
      addText(tailoredResume.skills.join('  ·  '));
      y += 4;

      // --- EXPERIENCE ---
      addSectionTitle('Experience');
      tailoredResume.experience.forEach(exp => {
        checkNewPage(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text(exp.role, marginL, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 120, 80);
        const compW = doc.getTextWidth(exp.company);
        doc.text(exp.company, pageW - marginR - compW, y);
        doc.setTextColor(30, 30, 30);
        y += 5.5;
        exp.bullets.forEach(b => addBullet(b));
        y += 3;
      });

      // --- PROJECTS ---
      if (tailoredResume.projects?.length > 0) {
        addSectionTitle('Projects');
        tailoredResume.projects.forEach(proj => {
          checkNewPage(12);
          addText(proj.name, true, 10);
          y += 0.5;
          proj.bullets.forEach(b => addBullet(b));
          y += 3;
        });
      }

      // --- EDUCATION ---
      if (tailoredResume.education?.length > 0) {
        addSectionTitle('Education');
        tailoredResume.education.forEach(edu => {
          addText(edu, false, 9.5);
        });
      }

      // Use explicit Blob + anchor download for reliable Mac Downloads folder saving
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = 'tailored_resume.pdf';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      // Clean up the Blob URL after a short delay to ensure the download starts
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      // No action on error, just proceed to finally
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ----- RENDER -----

  return (
    <main className="min-h-screen bg-neutral-50 p-6 md:p-12 font-sans text-neutral-900">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900">
            Resume <span className="text-blue-600">Job Match</span> Analyzer
          </h1>
          <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
            Upload your resume, paste a job description, and let AI optimize your resume for the role.
          </p>
        </header>

        {/* ===== UNIFIED MVP WORKFLOW ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Step 1: Source */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-neutral-700">
                Step 1: Resume Source
              </label>
              
              {masterProfile && (
                <div className="flex bg-neutral-100 p-1 rounded-lg mb-4">
                  <button
                    onClick={() => setUseMasterProfile(false)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${!useMasterProfile ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    Upload PDF
                  </button>
                  <button
                    onClick={() => setUseMasterProfile(true)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${useMasterProfile ? 'bg-indigo-50 border border-indigo-200 shadow-sm text-indigo-700' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    Master Profile
                  </button>
                </div>
              )}

              {useMasterProfile ? (
                 <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-6 text-center space-y-2">
                    <div className="mx-auto w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h3 className="text-sm font-semibold text-indigo-900">Master Profile Loaded</h3>
                    <p className="text-xs text-indigo-700">Your saved profile data will be used for analysis. No PDF needed.</p>
                    <Link href="/master-profile" className="inline-block mt-2 text-xs text-indigo-600 hover:underline">Edit Profile →</Link>
                 </div>
              ) : (
                <div className="mt-2 flex justify-center rounded-xl border border-dashed border-neutral-300 px-6 py-10 hover:bg-neutral-50 transition-colors">
                  <div className="text-center">
                    <div className="mt-4 flex text-sm leading-6 text-neutral-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-500"
                      >
                        <span>{file ? file.name : 'Select a PDF file'}</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="application/pdf" onChange={handleFileChange} />
                      </label>
                    </div>
                    {!file && <p className="text-xs leading-5 text-neutral-500">PDF up to 5MB</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-neutral-700" htmlFor="jd">
                Step 2: Job Description
              </label>
              <textarea
                id="jd"
                rows={6}
                className="block w-full rounded-xl border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4 border bg-neutral-50 hover:bg-white transition-colors"
                placeholder="Paste the target job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Analyze Button */}
          <div className="pt-4 flex flex-col items-center border-t border-neutral-100 mt-4 pt-6">
            <h3 className="text-sm font-semibold text-neutral-600 mb-4 tracking-wide uppercase">Step 3: Intelligence Engine</h3>
            {error && <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 py-2 px-4 rounded-lg">{error}</div>}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className={`w-full md:w-auto px-10 py-3.5 rounded-full text-white font-medium text-lg transition-all ${
                loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95'
              }`}
            >
              {loading ? 'Analyzing Profile & Job Match...' : 'Analyze Job Match'}
            </button>
          </div>
        </div>

        {/* ===== PHASE 1+2+3: Analysis Results ===== */}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Score */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-neutral-500">Match Score</h2>
              <div className="flex justify-center items-baseline gap-1">
                <span className={`text-6xl font-extrabold tracking-tighter ${
                  result.match_score >= 80 ? 'text-green-500' : result.match_score >= 50 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {result.match_score}
                </span>
                <span className="text-3xl font-bold text-neutral-400">%</span>
              </div>
            </div>

            <hr className="border-neutral-100" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Matched Keywords */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                  Matched Keywords ({result.matched_keywords.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.matched_keywords.length > 0 ? (
                    result.matched_keywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-400">No matching keywords found.</span>
                  )}
                </div>
              </div>

              {/* Missing Keywords */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                  Missing Keywords ({result.missing_keywords.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords.length > 0 ? (
                    result.missing_keywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-400">Great job! No key terms missing.</span>
                  )}
                </div>
              </div>
            </div>

            {/* ===== PHASE 5: Job Intelligence ===== */}
            {(jobIntelligence || loadingIntelligence) && (
              <>
                <hr className="border-neutral-100" />
                {loadingIntelligence ? (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Extracting Job Intelligence...
                    </div>
                  </div>
                ) : jobIntelligence && (
                  <div className="space-y-6">
                    {/* Job Intelligence Card */}
                    <div className="bg-blue-50/60 rounded-xl p-5 border border-blue-100 space-y-4">
                      <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        Job Intelligence
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Role</span>
                          <p className="font-semibold text-neutral-900 mt-0.5">{jobIntelligence.role_title}</p>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Seniority</span>
                          <p className="font-semibold text-neutral-900 mt-0.5">{jobIntelligence.seniority_level}</p>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Industry</span>
                          <p className="font-semibold text-neutral-900 mt-0.5">{jobIntelligence.industry_context}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Primary Skills</span>
                        <div className="flex flex-wrap gap-1.5">
                          {jobIntelligence.primary_skills.map((s, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">{s}</span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Secondary Skills</span>
                        <div className="flex flex-wrap gap-1.5">
                          {jobIntelligence.secondary_skills.map((s, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">{s}</span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Recruiter Priorities</span>
                        <ul className="space-y-1">
                          {jobIntelligence.recruiter_priorities.map((p, i) => (
                            <li key={i} className="text-sm text-neutral-700 flex items-start gap-2">
                              <span className="text-blue-500 mt-1">▸</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Resume Strategy Insights Card */}
                    <div className="bg-amber-50/60 rounded-xl p-5 border border-amber-100 space-y-4">
                      <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        Resume Strategy Insights
                      </h3>

                      {/* Gap Analysis */}
                      {jobIntelligence.gap_analysis && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {jobIntelligence.gap_analysis.strong_matches.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-green-600">Strong Matches</span>
                              <div className="flex flex-wrap gap-1.5">
                                {jobIntelligence.gap_analysis.strong_matches.map((s, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">✓ {s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {jobIntelligence.gap_analysis.partial_matches.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-yellow-600">Partial Matches</span>
                              <div className="flex flex-wrap gap-1.5">
                                {jobIntelligence.gap_analysis.partial_matches.map((s, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">~ {s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {jobIntelligence.gap_analysis.missing_critical_skills.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-red-600">Missing Critical Skills</span>
                              <div className="flex flex-wrap gap-1.5">
                                {jobIntelligence.gap_analysis.missing_critical_skills.map((s, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">✗ {s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {jobIntelligence.gap_analysis.missing_secondary_skills.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-orange-600">Missing Secondary Skills</span>
                              <div className="flex flex-wrap gap-1.5">
                                {jobIntelligence.gap_analysis.missing_secondary_skills.map((s, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">◦ {s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Strategy Suggestions */}
                      {jobIntelligence.resume_strategy.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Recommendations</span>
                          <ul className="space-y-1.5">
                            {jobIntelligence.resume_strategy.map((s, i) => (
                              <li key={i} className="text-sm text-neutral-700 flex items-start gap-2">
                                <span className="text-amber-500 font-bold mt-0.5">{i + 1}.</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <hr className="border-neutral-100" />

            {/* Phase 2: Bullet Rewriting */}
            <div className="pt-4 flex flex-col items-center gap-4">
              <h3 className="text-lg font-semibold text-neutral-800">Enhance Your Resume Bullets</h3>
              <p className="text-sm text-neutral-500 text-center max-w-lg">
                Use AI to automatically rewrite your resume bullets to include missing keywords like{' '}
                <strong>{result.missing_keywords.slice(0, 3).join(', ')}</strong> while making them more quantifiable and ATS-friendly.
              </p>
              {rewriteError && <div className="text-sm text-red-600 bg-red-50 py-2 px-4 rounded-lg">{rewriteError}</div>}
              <button
                onClick={handleRewrite}
                disabled={rewriting || !result.bullets.length}
                className={`px-6 py-2.5 rounded-full text-white font-medium transition-all ${
                  rewriting
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : result.bullets.length
                      ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md active:scale-95'
                      : 'bg-neutral-300 cursor-not-allowed'
                }`}
              >
                {rewriting ? 'Generating with AI...' : 'Generate Improved Bullets'}
              </button>
            </div>

            {/* Improved Bullets Panel */}
            {rewrittenBullets && (
              <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-xl font-bold mb-4 text-indigo-900 border-b pb-2">Improved Resume Bullets</h3>

                {metricWarning && <MetricNotice tone="warning" message={metricWarning} />}
                {droppedMetricsNotice && <MetricNotice tone="info" message={droppedMetricsNotice} />}

                <div className="space-y-4">
                  {rewrittenBullets.map((bullet, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl p-5 border grid grid-cols-1 md:grid-cols-2 gap-4 items-start ${
                        bullet.unsupported_metrics?.length
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-indigo-50/50 border-indigo-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Original</span>
                        <p className="text-sm text-neutral-700">{bullet.original}</p>
                        {bullet.dropped_metrics?.length ? (
                          <p className="text-xs text-sky-700 pt-1">
                            Dropped from the rewrite: <span className="font-semibold">{bullet.dropped_metrics.join(', ')}</span> — consider restoring.
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1 relative md:border-l md:border-indigo-100 md:pl-4">
                        <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Improved
                        </span>
                        <p className="text-sm font-medium text-neutral-900">
                          <HighlightedMetrics text={bullet.improved} flagged={bullet.unsupported_metrics} />
                        </p>
                        {bullet.unsupported_metrics?.length ? (
                          <p className="text-xs text-amber-800 pt-1">
                            Highlighted figures were not in your original — verify before using.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-neutral-100" />

            {/* Phase 3: Generate Tailored Resume */}
            <div className="pt-4 flex flex-col items-center gap-4">
              <h3 className="text-lg font-semibold text-neutral-800">Generate Tailored Resume</h3>
              <p className="text-sm text-neutral-500 text-center max-w-lg">
                Create a fully structured resume optimized specifically for the provided job description.
              </p>
              {generateError && <div className="text-sm text-red-600 bg-red-50 py-2 px-4 rounded-lg">{generateError}</div>}
              <button
                onClick={handleGenerateResume}
                disabled={generatingResume}
                className={`px-6 py-2.5 rounded-full text-white font-medium transition-all ${
                  generatingResume
                    ? 'bg-emerald-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md active:scale-95'
                }`}
              >
                {generatingResume ? 'Generating...' : 'Generate Tailored Resume'}
              </button>
            </div>

          </div>
        )}

        {/* ===== PHASE 3+4: Tailored Resume Preview ===== */}
        {tailoredResume && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
              <h3 className="text-2xl font-bold text-neutral-900">
                Tailored Resume
                <span className="ml-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 align-middle">AI Generated</span>
              </h3>
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopyResume}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {copied ? (
                    <><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Copied!</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy Text</>
                  )}
                </button>
                {/* Phase 4 PDF Download */}
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-all ${
                    downloadingPdf
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {downloadingPdf ? (
                    'Generating PDF...'
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Download PDF</>
                  )}
                </button>
              </div>
            </div>

            {/* Printable Resume Content */}
            <div id="resume-print-area" ref={resumePrintRef} className="space-y-6 font-sans text-neutral-800">

              <section>
                <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-200 pb-1 mb-2">Professional Summary</h4>
                <p className="text-sm leading-relaxed">{tailoredResume.summary}</p>
              </section>

              <section>
                <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-200 pb-1 mb-2">Skills</h4>
                <p className="text-sm">{tailoredResume.skills.join(' · ')}</p>
              </section>

              <section className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-200 pb-1 mb-2">Experience</h4>
                {tailoredResume.experience.map((exp, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <h5 className="font-bold text-neutral-900">{exp.role}</h5>
                      <span className="text-sm text-emerald-700 font-medium">{exp.company}</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      {exp.bullets.map((b, j) => (
                        <li key={j} className="text-sm leading-relaxed">{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>

              {tailoredResume.projects?.length > 0 && (
                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-200 pb-1 mb-2">Projects</h4>
                  {tailoredResume.projects.map((proj, i) => (
                    <div key={i} className="space-y-1">
                      <h5 className="font-bold text-neutral-900">{proj.name}</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        {proj.bullets.map((b, j) => (
                          <li key={j} className="text-sm leading-relaxed">{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}

              {tailoredResume.education?.length > 0 && (
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 border-b border-emerald-200 pb-1 mb-2">Education</h4>
                  <ul className="space-y-1">
                    {tailoredResume.education.map((edu, i) => (
                      <li key={i} className="text-sm font-medium">{edu}</li>
                    ))}
                  </ul>
                </section>
              )}

            </div>

          </div>
        )}

        {/* ===== PHASE 8: Cover Letter, Email, Save Job ===== */}
        {tailoredResume && (
          <div className="space-y-6">
            {/* Cover Letter Panel */}
            <CoverLetterPanel
              resumeData={tailoredResume}
              jobDescription={jobDescription}
              jobIntelligence={jobIntelligence}
              onCoverLetterGenerated={(text) => setCoverLetterText(text)}
            />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowEmailModal(true)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                📧 Send Resume via Email
              </button>
              <button
                onClick={() => setShowSaveJobModal(true)}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                💼 Save Job Application
              </button>
            </div>
          </div>
        )}

        {/* Modals */}
        {showEmailModal && tailoredResume && (
          <EmailResumeModal
            resumeData={tailoredResume}
            coverLetterText={coverLetterText}
            onClose={() => setShowEmailModal(false)}
            onSuccess={() => showToast('Email sent successfully!')}
          />
        )}
        {showSaveJobModal && (
          <SaveJobModal
            jobDescription={jobDescription}
            resumeVersionId={lastResumeVersionId}
            coverLetterText={coverLetterText}
            onClose={() => setShowSaveJobModal(false)}
            onSuccess={() => showToast('Job application saved!')}
          />
        )}

        {/* Prompt to create profile if none exists */}
        {!masterProfile && (
          <div className="text-center py-4">
            <Link href="/master-profile" className="text-sm text-neutral-500 hover:text-indigo-600 transition-colors">
              📋 Or build a <span className="font-semibold text-indigo-600">Master Resume Profile</span> to generate tailored resumes without re-uploading your PDF each time →
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
