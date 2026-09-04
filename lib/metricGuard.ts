/**
 * Guards against fabricated metrics in AI-rewritten resume bullets.
 *
 * Prompt instructions alone don't reliably stop a model from inventing
 * "increased throughput by 30%" — smaller open-weight models especially. A
 * fabricated number on a resume is a serious problem for the candidate, so any
 * figure that appears in a rewrite but not in the original is flagged rather
 * than silently shipped.
 */

/** Bracketed placeholders like [X], [N]%, [X]% are intentional prompts to the user, not fabrications. */
const PLACEHOLDER = /\[[^\]]*\]/g;

/**
 * Numeric tokens: percentages, currency, multipliers, plain and decimal numbers.
 * Also catches written-out scale words that imply invented magnitude.
 */
const NUMBER_TOKEN = /\d+(?:[.,]\d+)*/g;

const SCALE_WORDS = /\b(?:millions?|billions?|thousands?|dozens?|hundreds?)\b/gi;

/** Normalize a numeric token so "1,200" and "1200" compare equal. */
function normalizeNumber(token: string): string {
  return token.replace(/,/g, '').replace(/\.0+$/, '');
}

function extractNumbers(text: string): string[] {
  const withoutPlaceholders = text.replace(PLACEHOLDER, ' ');
  return (withoutPlaceholders.match(NUMBER_TOKEN) || []).map(normalizeNumber);
}

function extractScaleWords(text: string): string[] {
  const withoutPlaceholders = text.replace(PLACEHOLDER, ' ');
  // Singularize so "millions" in a rewrite matches "million" in the original.
  return (withoutPlaceholders.match(SCALE_WORDS) || []).map(w => w.toLowerCase().replace(/s$/, ''));
}

/**
 * Return the figures present in `improved` that have no basis in `original`.
 * An empty array means every number in the rewrite is traceable to the source.
 */
export function findUnsupportedMetrics(original: string, improved: string): string[] {
  if (!original || !improved) return [];

  const originalNumbers = new Set(extractNumbers(original));
  const originalScale = new Set(extractScaleWords(original));

  const unsupported: string[] = [];

  for (const num of extractNumbers(improved)) {
    if (!originalNumbers.has(num)) unsupported.push(num);
  }
  for (const word of extractScaleWords(improved)) {
    if (!originalScale.has(word)) unsupported.push(word);
  }

  // De-duplicate while preserving order
  return [...new Set(unsupported)];
}

/**
 * Return real figures from `original` that the rewrite discarded.
 *
 * The inverse failure of fabrication, and just as damaging: a model that turns
 * "reduced runtime by 40%" into "improved efficiency" has thrown away the
 * candidate's strongest, genuinely earned evidence.
 */
export function findDroppedMetrics(original: string, improved: string): string[] {
  if (!original || !improved) return [];

  const improvedNumbers = new Set(extractNumbers(improved));
  const dropped = extractNumbers(original).filter(num => !improvedNumbers.has(num));

  return [...new Set(dropped)];
}

export interface BulletRewrite {
  original: string;
  improved: string;
  /** Figures in `improved` with no basis in `original` — surfaced for user review. */
  unsupported_metrics?: string[];
  /** Real figures from `original` that the rewrite discarded. */
  dropped_metrics?: string[];
}

export interface MetricAuditResult {
  bullets: BulletRewrite[];
  /** Human-readable warning when any bullet contains an unverifiable figure. */
  warning?: string;
  /** Human-readable notice when a rewrite discarded the candidate's real numbers. */
  dropped_metrics_notice?: string;
}

/**
 * Annotate each rewritten bullet with any figures it invented.
 * Flags rather than strips: silently editing the text could mangle a legitimate
 * rewrite, and the candidate is the only one who knows their real numbers.
 */
export function auditRewrittenBullets(bullets: unknown): MetricAuditResult {
  if (!Array.isArray(bullets)) return { bullets: [] };

  let flaggedCount = 0;
  let droppedCount = 0;

  const audited: BulletRewrite[] = bullets.map((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const original = typeof item.original === 'string' ? item.original : '';
    const improved = typeof item.improved === 'string' ? item.improved : '';

    const unsupported = findUnsupportedMetrics(original, improved);
    const dropped = findDroppedMetrics(original, improved);
    if (unsupported.length > 0) flaggedCount++;
    if (dropped.length > 0) droppedCount++;

    return {
      original,
      improved,
      ...(unsupported.length > 0 ? { unsupported_metrics: unsupported } : {}),
      ...(dropped.length > 0 ? { dropped_metrics: dropped } : {}),
    };
  });

  return {
    bullets: audited,
    ...(flaggedCount > 0
      ? {
          warning:
            `${flaggedCount} rewritten ${flaggedCount === 1 ? 'bullet contains figures' : 'bullets contain figures'} that were not in your original text. ` +
            `The AI may have invented them — verify each number against your real experience before using it on a resume.`,
        }
      : {}),
    ...(droppedCount > 0
      ? {
          dropped_metrics_notice:
            `${droppedCount} rewritten ${droppedCount === 1 ? 'bullet lost a number' : 'bullets lost numbers'} from your original text. ` +
            `Real metrics are your strongest evidence — consider restoring them.`,
        }
      : {}),
  };
}
