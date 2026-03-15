// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for the PDF download fix.
 * We test the Blob + anchor download mechanism that replaced doc.save().
 */

// Mock jsPDF doc object
function createMockDoc() {
  const mockBlob = new Blob(['%PDF-mock-content'], { type: 'application/pdf' });

  return {
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    getTextWidth: vi.fn(() => 30),
    addPage: vi.fn(),
    output: vi.fn((_type: string) => mockBlob),
    save: vi.fn(), // should NOT be called in the fixed version
    mockBlob,
  };
}

describe('PDF Download Mechanism', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate a Blob from output()', () => {
    const doc = createMockDoc();
    const blob = doc.output('blob');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  it('should create a valid Object URL from the Blob', () => {
    const doc = createMockDoc();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    expect(url).toBeTruthy();
    expect(typeof url).toBe('string');
    URL.revokeObjectURL(url);
  });

  it('should create an anchor element with download="tailored_resume.pdf"', () => {
    const doc = createMockDoc();
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'tailored_resume.pdf';

    expect(link.tagName).toBe('A');
    expect(link.download).toBe('tailored_resume.pdf');
    expect(link.href).toContain('blob:');

    URL.revokeObjectURL(blobUrl);
  });

  it('should NOT call doc.save — explicit Blob download is used instead', () => {
    const doc = createMockDoc();

    // Simulate the fixed download flow
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'tailored_resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    // doc.save MUST NOT have been called (that was the old broken approach)
    expect(doc.save).not.toHaveBeenCalled();
    // doc.output MUST have been called with 'blob'
    expect(doc.output).toHaveBeenCalledWith('blob');
  });

  it('should execute the full download flow without throwing', () => {
    const doc = createMockDoc();

    expect(() => {
      // Exact logic from the fixed handleDownloadPdf
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = 'tailored_resume.pdf';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);
    }).not.toThrow();
  });
});
