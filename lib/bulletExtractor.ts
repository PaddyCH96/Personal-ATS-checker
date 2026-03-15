export interface Bullet {
    original: string;
}

export function extractBullets(text: string): Bullet[] {
    if (!text) return [];

    const lines = text.split('\n');
    const bullets: Bullet[] = [];

    // Regex to match lines starting with -, •, or a number followed by a period/parenthesis
    const bulletPointRegex = /^[\s]*[-•*]+[\s]+(.+)/;
    const numberedListRegex = /^[\s]*\d+[.)]+[\s]+(.+)/;

    for (const line of lines) {
        let match = line.match(bulletPointRegex);
        if (!match) {
            match = line.match(numberedListRegex);
        }

        if (match) {
            const content = match[1].trim();
            const words = content.split(/\s+/).filter(word => word.length > 0);

            // Filter out > 5 words
            if (words.length >= 6) {
                bullets.push({ original: content });
            }
        }
    }

    // Fallback: If no strict bullet points found, just split by sentences and find verb-starting ones
    // or generally long lines that look like experience descriptions
    if (bullets.length === 0) {
        const fallbackLines = lines.map(l => l.trim()).filter(l => l.length > 30);
        for (const line of fallbackLines) {
            const words = line.split(/\s+/);
            if (words.length >= 6) {
                bullets.push({ original: line });
                if (bullets.length > 10) break; // limit fallback to 10
            }
        }
    }

    return bullets;
}
