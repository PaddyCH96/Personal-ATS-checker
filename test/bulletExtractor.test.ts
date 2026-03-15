import { describe, it, expect } from 'vitest';
import { extractBullets } from '../lib/bulletExtractor';

describe('bulletExtractor', () => {
  it('should extract standard bullet points (- or •)', () => {
    const text = `
    Experience:
    - Developed a highly scalable API using Node.js
    • Managed a team of 5 engineers to deliver features
    * Optimized the database queries by over 30 percent
    `;
    const bullets = extractBullets(text);
    
    expect(bullets.length).toBe(3);
    expect(bullets[0].original).toBe('Developed a highly scalable API using Node.js');
    expect(bullets[1].original).toBe('Managed a team of 5 engineers to deliver features');
    expect(bullets[2].original).toBe('Optimized the database queries by over 30 percent');
  });

  it('should extract numbered list bullets', () => {
    const text = `
    Achievements:
    1. Built a robust CI/CD pipeline from scratch
    2) Increased revenue by implementing new payment gateways
    `;
    const bullets = extractBullets(text);
    
    expect(bullets.length).toBe(2);
    expect(bullets[0].original).toBe('Built a robust CI/CD pipeline from scratch');
    expect(bullets[1].original).toBe('Increased revenue by implementing new payment gateways');
  });

  it('should ignore short lines (less than 6 words)', () => {
    const text = `
    - Very short line.
    - This is short.
    - This is a valid bullet point that has more than five words.
    `;
    const bullets = extractBullets(text);
    
    expect(bullets.length).toBe(1);
    expect(bullets[0].original).toBe('This is a valid bullet point that has more than five words.');
  });

  it('should use fallback extraction for long sentence-like lines without strict bullet decorators', () => {
    const text = `
    Summary
    I am a highly motivated engineer with deep expertise in full stack development.
    I successfully architected the main payment processing system resulting in zero downtime.
    Skills: Java AWS React NextJS
    `;
    const bullets = extractBullets(text);
    
    // Focuses on long lines (>30 chars and >5 words)
    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets.some(b => b.original.includes('architected the main payment processing system'))).toBe(true);
  });

  it('should return empty array for empty text', () => {
    expect(extractBullets('')).toEqual([]);
  });
});
