"use client";

import { useState } from 'react';
import { saveJob } from '@/lib/storage';

interface SaveJobModalProps {
  jobDescription: string;
  resumeVersionId: string | null;
  coverLetterText: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SaveJobModal({ jobDescription, resumeVersionId, coverLetterText, onClose, onSuccess }: SaveJobModalProps) {
  const [company, setCompany] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!company.trim() || !roleTitle.trim()) { setError('Company and role title are required.'); return; }

    saveJob({
      company: company.trim(),
      job_title: roleTitle.trim(),
      job_description: jobDescription,
      resume_version_id: resumeVersionId,
      cover_letter: coverLetterText,
      status: 'Applied',
      date_applied: new Date().toISOString(),
      notes: '',
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-neutral-800 mb-4">💼 Save Job Application</h3>
        <p className="text-sm text-neutral-500 mb-4">Track this application in your Job Tracker.</p>

        <label className="block text-sm font-medium text-neutral-600 mb-1">Company Name *</label>
        <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-4" />

        <label className="block text-sm font-medium text-neutral-600 mb-1">Role Title *</label>
        <input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-4" />

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-300">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            Save Application
          </button>
        </div>
      </div>
    </div>
  );
}
