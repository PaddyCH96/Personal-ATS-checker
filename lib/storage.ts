// ===== DATA MODELS =====

export type JobStatus = 'Saved' | 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export interface JobApplication {
  id: string;
  company: string;
  job_title: string;
  job_description: string;
  resume_version_id: string | null;
  cover_letter: string | null;
  status: JobStatus;
  date_applied: string;
  notes: string;
}

export interface ResumeData {
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

export interface ResumeVersion {
  id: string;
  resume_data: ResumeData;
  template: string;
  job_id: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
  timestamp: string;
  read: boolean;
}

// ===== HELPERS =====

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function getArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`LocalStorage corruption detected for key "${key}". Resetting...`, err);
    localStorage.removeItem(key);
    return [];
  }
}

function setArray<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save to localStorage for key "${key}":`, err);
  }
}

// ===== JOB APPLICATIONS =====

const JOBS_KEY = 'rm_job_applications';

export function getJobs(): JobApplication[] {
  return getArray<JobApplication>(JOBS_KEY);
}

export function saveJob(job: Omit<JobApplication, 'id'>): JobApplication {
  const jobs = getJobs();
  const newJob: JobApplication = { ...job, id: generateId() };
  jobs.unshift(newJob);
  setArray(JOBS_KEY, jobs);
  return newJob;
}

export function updateJob(id: string, updates: Partial<JobApplication>): JobApplication | null {
  const jobs = getJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx === -1) return null;
  jobs[idx] = { ...jobs[idx], ...updates };
  setArray(JOBS_KEY, jobs);
  return jobs[idx];
}

export function deleteJob(id: string): void {
  const jobs = getJobs().filter(j => j.id !== id);
  setArray(JOBS_KEY, jobs);
}

// ===== RESUME VERSIONS =====

const VERSIONS_KEY = 'rm_resume_versions';

export function getResumeVersions(): ResumeVersion[] {
  return getArray<ResumeVersion>(VERSIONS_KEY);
}

export function saveResumeVersion(data: Omit<ResumeVersion, 'id' | 'created_at'>): ResumeVersion {
  const versions = getResumeVersions();
  const newVersion: ResumeVersion = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  versions.unshift(newVersion);
  setArray(VERSIONS_KEY, versions);
  return newVersion;
}

export function getResumeVersionById(id: string): ResumeVersion | undefined {
  return getResumeVersions().find(v => v.id === id);
}

// ===== NOTIFICATIONS =====

const NOTIF_KEY = 'rm_notifications';

export function getNotifications(): AppNotification[] {
  return getArray<AppNotification>(NOTIF_KEY);
}

export function addNotification(message: string, type: AppNotification['type'] = 'success'): AppNotification {
  const notifs = getNotifications();
  const n: AppNotification = {
    id: generateId(),
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false,
  };
  notifs.unshift(n);
  // Keep only last 50
  setArray(NOTIF_KEY, notifs.slice(0, 50));
  return n;
}

export function markNotificationRead(id: string): void {
  const notifs = getNotifications();
  const idx = notifs.findIndex(n => n.id === id);
  if (idx !== -1) {
    notifs[idx].read = true;
    setArray(NOTIF_KEY, notifs);
  }
}
