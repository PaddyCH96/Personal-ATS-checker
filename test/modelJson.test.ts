import { describe, it, expect } from 'vitest';
import { parseModelJson } from '../lib/apiUtils';
import { coerceResumeShape } from '../lib/resumeSchema';

describe('parseModelJson', () => {
  it('parses clean JSON', () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips ```json fences that smaller models add', () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('strips bare ``` fences', () => {
    expect(parseModelJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('recovers JSON wrapped in narration', () => {
    const raw = 'Sure! Here is the JSON you asked for:\n{"a":1}\nLet me know if you need changes.';
    expect(parseModelJson(raw)).toEqual({ a: 1 });
  });

  it('handles nested objects when extracting from prose', () => {
    const raw = 'Result: {"outer":{"inner":[1,2]}} done';
    expect(parseModelJson(raw)).toEqual({ outer: { inner: [1, 2] } });
  });

  it('throws on empty input', () => {
    expect(() => parseModelJson('')).toThrow(/Empty response/);
    expect(() => parseModelJson(null)).toThrow(/Empty response/);
  });

  it('throws when there is no JSON at all', () => {
    expect(() => parseModelJson('I cannot help with that.')).toThrow(/valid JSON/);
  });
});

describe('coerceResumeShape', () => {
  const full = {
    summary: 'Data engineer',
    skills: ['SQL', 'Python'],
    experience: [{ role: 'Analyst', company: 'Acme', bullets: ['Did a thing'] }],
    projects: [{ name: 'Proj', bullets: ['Built it'] }],
    education: ['BSc'],
  };

  it('passes through well-formed output with no warnings', () => {
    const { resume, warnings } = coerceResumeShape(full);
    expect(resume).toEqual(full);
    expect(warnings).toEqual([]);
  });

  it('splits a comma-joined skills string into an array', () => {
    const { resume } = coerceResumeShape({ ...full, skills: 'SQL, Python, dbt' });
    expect(resume.skills).toEqual(['SQL', 'Python', 'dbt']);
  });

  it('falls back to the master profile when skills are missing', () => {
    const { resume, warnings } = coerceResumeShape(
      { ...full, skills: [] },
      { fallbackProfile: { skills: ['Fallback'] } }
    );
    expect(resume.skills).toEqual(['Fallback']);
    expect(warnings.join(' ')).toMatch(/master profile skills/);
  });

  it('drops empty experience entries', () => {
    const { resume } = coerceResumeShape({
      ...full,
      experience: [{ role: '', company: '', bullets: [] }, full.experience[0]],
    });
    expect(resume.experience).toHaveLength(1);
  });

  it('warns when experience is missing entirely and no fallback exists', () => {
    const { resume, warnings } = coerceResumeShape({ ...full, experience: [] });
    expect(resume.experience).toEqual([]);
    expect(warnings.join(' ')).toMatch(/No experience entries/);
  });

  it('survives a completely malformed response', () => {
    const { resume, warnings } = coerceResumeShape('not an object');
    expect(resume.skills).toEqual([]);
    expect(resume.experience).toEqual([]);
    expect(warnings.join(' ')).toMatch(/unexpected shape/);
  });
});
