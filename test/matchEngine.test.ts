import { describe, it, expect } from 'vitest';
import { calculateMatch } from '../lib/matchEngine';

describe('matchEngine', () => {
  it('should calculate 100% match when all job keywords exist in resume', () => {
    const resume = ['python', 'aws', 'docker'];
    const job = ['python', 'aws'];
    const result = calculateMatch(resume, job);
    
    expect(result.match_score).toBe(100);
    expect(result.matched_keywords).toEqual(['python', 'aws']);
    expect(result.missing_keywords).toEqual([]);
  });

  it('should calculate 50% match when half of job keywords exist', () => {
    const resume = ['python', 'aws'];
    const job = ['python', 'docker'];
    const result = calculateMatch(resume, job);
    
    expect(result.match_score).toBe(50);
    expect(result.matched_keywords).toEqual(['python']);
    expect(result.missing_keywords).toEqual(['docker']);
  });

  it('should return 0% match when job keywords are empty', () => {
    const resume = ['python', 'aws'];
    const job: string[] = [];
    const result = calculateMatch(resume, job);
    
    expect(result.match_score).toBe(0);
    expect(result.matched_keywords).toEqual([]);
    expect(result.missing_keywords).toEqual([]);
  });

  it('should handle empty resume keywords', () => {
    const resume: string[] = [];
    const job = ['python', 'aws'];
    const result = calculateMatch(resume, job);
    
    expect(result.match_score).toBe(0);
    expect(result.matched_keywords).toEqual([]);
    expect(result.missing_keywords).toEqual(['python', 'aws']);
  });

  it('should correctly round scores (e.g., 2/3 = 67%)', () => {
    const resume = ['python', 'aws'];
    const job = ['python', 'aws', 'docker'];
    const result = calculateMatch(resume, job);
    
    expect(result.match_score).toBe(67);
  });
});
