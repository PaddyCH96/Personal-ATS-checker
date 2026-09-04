import type { ResumeData } from './storage';

/**
 * Normalizes model output into the ResumeData shape.
 *
 * Frontier models reliably return the requested schema; smaller open-weight
 * models sometimes omit sections, return a string where an array belongs, or
 * nest bullets one level too deep. Rather than throwing (and losing the whole
 * generation), coerce what came back and report what needed fixing.
 */

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map(v => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''))
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    // Models occasionally return "React, Node, SQL" instead of an array.
    return value.split(/[,\n•]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
};

const asString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string').join(' ').trim();
  return '';
};

export interface CoerceOptions {
  /** Master profile to fall back on when the model drops a section entirely. */
  fallbackProfile?: Partial<ResumeData> | null;
}

export interface CoerceResult {
  resume: ResumeData;
  warnings: string[];
}

export function coerceResumeShape(raw: unknown, options: CoerceOptions = {}): CoerceResult {
  const warnings: string[] = [];
  const fallback = options.fallbackProfile ?? null;
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  if (!raw || typeof raw !== 'object') {
    warnings.push('Model returned an unexpected shape; fell back to profile data where possible.');
  }

  const summary = asString(input.summary) || asString(fallback?.summary);
  if (!summary) warnings.push('No professional summary was generated.');

  let skills = asStringArray(input.skills);
  if (skills.length === 0 && fallback?.skills) {
    skills = asStringArray(fallback.skills);
    if (skills.length) warnings.push('Skills section was missing; used your master profile skills.');
  }

  const experience = Array.isArray(input.experience)
    ? input.experience
        .map((exp: Record<string, unknown>) => ({
          role: asString(exp?.role),
          company: asString(exp?.company),
          bullets: asStringArray(exp?.bullets),
        }))
        .filter((exp: ResumeData['experience'][number]) => exp.role || exp.company || exp.bullets.length > 0)
    : [];

  if (experience.length === 0) {
    const fallbackExp = Array.isArray(fallback?.experience) ? fallback!.experience : [];
    if (fallbackExp.length) {
      warnings.push('Experience section was missing; used your master profile experience.');
      experience.push(...fallbackExp);
    } else {
      warnings.push('No experience entries were generated.');
    }
  }

  const projects = Array.isArray(input.projects)
    ? input.projects
        .map((proj: Record<string, unknown>) => ({
          name: asString(proj?.name),
          bullets: asStringArray(proj?.bullets),
        }))
        .filter((proj: ResumeData['projects'][number]) => proj.name || proj.bullets.length > 0)
    : [];

  let education = asStringArray(input.education);
  if (education.length === 0 && fallback?.education) {
    education = asStringArray(fallback.education);
  }

  return {
    resume: { summary, skills, experience, projects, education },
    warnings,
  };
}
