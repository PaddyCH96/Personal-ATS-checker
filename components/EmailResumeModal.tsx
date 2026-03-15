"use client";

import { useState } from 'react';

interface EmailResumeModalProps {
  resumeData: any;
  coverLetterText: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmailResumeModal({ resumeData, coverLetterText, onClose, onSuccess }: EmailResumeModalProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [includeCoverLetter, setIncludeCoverLetter] = useState(!!coverLetterText);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) { setError('Please enter a recipient email.'); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/send-resume-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: email.trim(),
          message: message.trim() || undefined,
          resume_data: resumeData,
          cover_letter_text: includeCoverLetter ? coverLetterText : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-neutral-800 mb-4">📧 Send Resume via Email</h3>

        <label className="block text-sm font-medium text-neutral-600 mb-1">Recipient Email *</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="hiring@company.com" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-4" />

        <label className="block text-sm font-medium text-neutral-600 mb-1">Optional Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Hi, please find my resume attached..." rows={3} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-4" />

        {coverLetterText && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input type="checkbox" checked={includeCoverLetter} onChange={e => setIncludeCoverLetter(e.target.checked)} className="rounded" />
            <span className="text-sm text-neutral-700">Include cover letter as attachment</span>
          </label>
        )}

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-300">Cancel</button>
          <button onClick={handleSend} disabled={sending} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
