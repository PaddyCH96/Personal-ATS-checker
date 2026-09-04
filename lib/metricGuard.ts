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
 *
 * Digits fused to letters are deliberately excluded — "S3", "EC2", "Log4j2" and
 * "OAuth2" are technology names, not claims about the candidate's impact. The
 * rewrite prompt actively asks the model to weave in job-description keywords,
 * so without this the guard would cry wolf on nearly every cloud or data role
 * and train users to dismiss the warning that matters.
 */
const NUMBER_TOKEN = /(?<![A-Za-z0-9.])\d+(?:,\d{3})*(?:\.\d+)?(?![A-Za-z0-9])/g;

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
 *
 * `supportedTerms` are keywords the model was explicitly asked to incorporate
 * (e.g. "Python 3.11"); numbers occurring in them are legitimate, not invented.
 */
export function findUnsupportedMetrics(
  original: string,
  improved: string,
  supportedTerms: string[] = []
): string[] {
  if (!original || !improved) return [];

  const termText = supportedTerms.join(' ');
  const originalNumbers = new Set([...extractNumbers(original), ...extractNumbers(termText)]);
  const originalScale = new Set([...extractScaleWords(original), ...extractScaleWords(termText)]);

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

/**
 * Coerce a source bullet to its text.
 *
 * Callers pass either plain strings or the `{ original }` objects that
 * extractBullets produces. Getting this wrong silently empties the baseline,
 * which disables the audit entirely rather than failing loudly — so both
 * shapes are handled here, where they are covered by tests.
 */
export function toBulletText(bullet: unknown): string {
  if (typeof bullet === 'string') return bullet;
  const original = (bullet as { original?: unknown })?.original;
  return typeof original === 'string' ? original : '';
}

/** Build a matcher for one flagged token, tolerating "1,200" vs "1200". */
function tokenPattern(token: string): string {
  if (/^\d+$/.test(token)) {
    // Allow a thousands separator between any two digits.
    return token.split('').join(',?');
  }
  // Scale words ("million") may appear pluralized in the rendered text.
  return `${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?`;
}

/**
 * Split `text` so the flagged figures land on the ODD indices, ready for a
 * renderer to wrap them. Returns a single-element array when nothing is flagged.
 *
 * Lives here rather than in the component so the index contract is unit-tested;
 * getting it wrong silently highlights the wrong words.
 */
export function splitOnFlagged(text: string, flagged: string[] = []): string[] {
  if (!text) return [''];
  if (flagged.length === 0) return [text];

  // Longest first, so "1200" wins over a bare "1" nested inside it.
  const ordered = [...flagged].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${ordered.map(tokenPattern).join('|')})`, 'gi');

  return text.split(pattern);
}

export interface AuditOptions {
  /**
   * The user's actual bullets, positionally aligned with the model's output.
   * Authoritative baseline — the model's own `original` field is only a fallback.
   * Accepts plain strings or `{ original }` objects.
   */
  sourceBullets?: unknown[];
  /** Keywords the model was told to weave in; numbers inside them aren't fabrications. */
  supportedTerms?: string[];
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
export function auditRewrittenBullets(
  bullets: unknown,
  options: AuditOptions = {}
): MetricAuditResult {
  if (!Array.isArray(bullets)) return { bullets: [] };

  const { sourceBullets = [], supportedTerms = [] } = options;

  let flaggedCount = 0;
  let droppedCount = 0;

  const audited: BulletRewrite[] = bullets.map((entry, index) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const modelOriginal = typeof item.original === 'string' ? item.original : '';
    const improved = typeof item.improved === 'string' ? item.improved : '';

    // The model authors BOTH fields, so its `original` cannot be trusted as the
    // baseline — a model that quietly paraphrases the original would hide its own
    // fabrication. Compare against the user's actual bullet whenever we have it.
    const sourceText = index < sourceBullets.length ? toBulletText(sourceBullets[index]) : '';
    const original = sourceText || modelOriginal;

    const unsupported = findUnsupportedMetrics(original, improved, supportedTerms);
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
