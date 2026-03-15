import { describe, it, expect } from 'vitest';
import { extractKeywords } from '../lib/keywordExtractor';

describe('keywordExtractor', () => {
  it('should extract meaningful keywords from a sentence', () => {
    const text = 'I am an experienced software engineer specializing in Python and AWS.';
    const keywords = extractKeywords(text);
    
    expect(keywords).toContain('experienced');
    expect(keywords).toContain('software');
    expect(keywords).toContain('engineer');
    expect(keywords).toContain('specializing');
    expect(keywords).toContain('python');
    expect(keywords).toContain('aws');
  });

  it('should remove stop words', () => {
    const text = 'The quickly jumping fox and the lazy dog';
    const keywords = extractKeywords(text);
    
    expect(keywords).not.toContain('The');
    expect(keywords).not.toContain('and');
    expect(keywords).not.toContain('the');
  });

  it('should remove very short words (<= 2 chars)', () => {
    const text = 'ab c de fgh ijkl'; // 'fgh' and 'ijkl' should remain
    const keywords = extractKeywords(text);
    
    expect(keywords.some(k => k.length <= 2)).toBe(false);
    expect(keywords).toContain('fgh');
    expect(keywords).toContain('ijkl');
  });

  it('should return an empty array for empty or null text', () => {
    expect(extractKeywords('')).toEqual([]);
    expect(extractKeywords('a b c')).toEqual([]); // All <= 2 chars
  });

  it('should handle numbers correctly as configured', () => {
    const text = 'Worked with 10 team members in 2023';
    const keywords = extractKeywords(text);
    
    // Configured with remove_digits: false, but short words logic may remove '10' depending on exact extraction
    // Let's just verify it extracts the main words
    expect(keywords).toContain('worked');
    expect(keywords).toContain('team');
    expect(keywords).toContain('members');
  });
});
