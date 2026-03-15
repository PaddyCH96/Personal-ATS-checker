export interface MatchResult {
    match_score: number;
    matched_keywords: string[];
    missing_keywords: string[];
}

export function calculateMatch(resumeKeywords: string[], jobKeywords: string[]): MatchResult {
    if (jobKeywords.length === 0) {
        return {
            match_score: 0,
            matched_keywords: [],
            missing_keywords: []
        };
    }

    const resumeSet = new Set(resumeKeywords);

    const matched: string[] = [];
    const missing: string[] = [];

    for (const keyword of jobKeywords) {
        if (resumeSet.has(keyword)) {
            matched.push(keyword);
        } else {
            missing.push(keyword);
        }
    }

    const matchScore = Math.round((matched.length / jobKeywords.length) * 100);

    return {
        match_score: matchScore,
        matched_keywords: matched,
        missing_keywords: missing
    };
}
