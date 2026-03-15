import keywordExtractor from 'keyword-extractor';

export function extractKeywords(text: string): string[] {
    if (!text) return [];

    const extractionResult = keywordExtractor.extract(text, {
        language: "english",
        remove_digits: false,
        return_changed_case: true,
        remove_duplicates: true
    });

    // Filter out very short words
    const keywords = extractionResult.filter(word => word.length > 2);

    return keywords;
}
