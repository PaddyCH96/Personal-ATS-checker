"use client";

import { useState, useEffect } from 'react';
import { getJobs, saveJob, updateJob, deleteJob, JobApplication, JobStatus } from '@/lib/storage';

const STATUS_OPTIONS: JobStatus[] = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
const STATUS_COLORS: Record<JobStatus, string> = {
  Saved: 'bg-gray-100 text-gray-700',
  Applied: 'bg-blue-100 text-blue-700',
  Interview: 'bg-yellow-100 text-yellow-700',
  Offer: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
};

export default function JobTrackerPage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  // Form fields
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  useEffect(() => { setJobs(getJobs()); }, []);

  const counts = {
    total: jobs.length,
    interviews: jobs.filter(j => j.status === 'Interview').length,
    offers: jobs.filter(j => j.status === 'Offer').length,
  };

  const handleAdd = () => {
    if (!company.trim() || !jobTitle.trim()) return;
    saveJob({
      company: company.trim(),
      job_title: jobTitle.trim(),
      job_description: jobDesc.trim(),
      resume_version_id: null,
      cover_letter: null,
      status: 'Saved',
      date_applied: new Date().toISOString(),
      notes: '',
    });
    setJobs(getJobs());
    setCompany(''); setJobTitle(''); setJobDesc('');
    setShowForm(false);
  };

  const handleStatusChange = (id: string, status: JobStatus) => {
    updateJob(id, { status });
    setJobs(getJobs());
  };

  const handleSaveNotes = (id: string) => {
    updateJob(id, { notes: notesText });
    setJobs(getJobs());
    setEditingNotes(null);
  };

  const handleDelete = (id: string) => {
    deleteJob(id);
    setJobs(getJobs());
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-neutral-100 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Job Tracker</h1>
        <p className="text-neutral-500 mb-8">Track your applications, interviews, and offers in one place.</p>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-blue-600">{counts.total}</p>
            <p className="text-sm text-neutral-500 mt-1">Applications Sent</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-yellow-600">{counts.interviews}</p>
            <p className="text-sm text-neutral-500 mt-1">Interviews</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-green-600">{counts.offers}</p>
            <p className="text-sm text-neutral-500 mt-1">Offers</p>
          </div>
        </div>

        {/* Add Job Button / Form */}
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="mb-6 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            + Add Job
          </button>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6 shadow-sm">
            <h3 className="font-semibold text-neutral-800 mb-4">Add New Application</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company Name *" className="border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Job Title *" className="border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Job Description (optional)" rows={3} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-4" />
            <div className="flex gap-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Save</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-300">Cancel</button>
            </div>
          </div>
        )}

        {/* Jobs Table */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-10 text-center text-neutral-400">
            No job applications yet. Click &quot;Add Job&quot; to get started.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Company</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-800">{job.company}</td>
                    <td className="px-4 py-3 text-neutral-600">{job.job_title}</td>
                    <td className="px-4 py-3">
                      <select
                        value={job.status}
                        onChange={e => handleStatusChange(job.id, e.target.value as JobStatus)}
                        className={`px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${STATUS_COLORS[job.status]}`}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">{new Date(job.date_applied).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {editingNotes === job.id ? (
                        <div className="flex gap-2">
                          <input value={notesText} onChange={e => setNotesText(e.target.value)} className="border rounded px-2 py-1 text-xs flex-1" autoFocus />
                          <button onClick={() => handleSaveNotes(job.id)} className="text-green-600 text-xs font-medium">Save</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingNotes(job.id); setNotesText(job.notes); }} className="text-xs text-neutral-400 hover:text-blue-600 truncate max-w-[150px] block">
                          {job.notes || 'Add note...'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(job.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
