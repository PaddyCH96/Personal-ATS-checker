import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Optional: you sometimes need to set workerSrc in node, but getDocument{data} usually works.

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        const data = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdfDocument = await loadingTask.promise;

        let fullText = '';
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + ' ';
        }
        return fullText;
    } catch (error) {
        console.error('Error parsing PDF with pdfjs:', error);
        throw new Error('Failed to parse PDF file');
    }
}
