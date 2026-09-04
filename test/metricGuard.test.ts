import { describe, it, expect } from 'vitest';
import { findUnsupportedMetrics, findDroppedMetrics, auditRewrittenBullets, toBulletText, splitOnFlagged } from '../lib/metricGuard';

describe('findUnsupportedMetrics', () => {
  it('flags a percentage invented out of nothing', () => {
    // The exact fabrication observed from llama3.2:3b during testing
    expect(
      findUnsupportedMetrics(
        'Built dashboards in Power BI',
        'Designed and implemented data visualizations in Power BI, resulting in 25% increase in business insights'
      )
    ).toEqual(['25']);
  });

  it('flags an invented time reduction', () => {
    expect(
      findUnsupportedMetrics(
        'Wrote SQL reports',
        'Developed and optimized SQL queries in dbt, resulting in 30% reduction in reporting time'
      )
    ).toEqual(['30']);
  });

  it('allows numbers carried over from the original', () => {
    expect(
      findUnsupportedMetrics('Managed 5 analysts', 'Led a team of 5 analysts across two regions')
    ).toEqual([]);
  });

  it('allows reformatted numbers (1,200 vs 1200)', () => {
    expect(findUnsupportedMetrics('Processed 1200 records', 'Processed 1,200 records daily')).toEqual([]);
  });

  it('does not flag bracketed placeholders', () => {
    expect(
      findUnsupportedMetrics('Improved reporting speed', 'Improved reporting speed by [X]%')
    ).toEqual([]);
  });

  it('flags invented scale words', () => {
    expect(
      findUnsupportedMetrics('Handled customer records', 'Handled millions of customer records')
    ).toEqual(['million']);
  });

  it('allows scale words present in the original', () => {
    expect(
      findUnsupportedMetrics('Handled millions of records', 'Processed millions of customer records')
    ).toEqual([]);
  });

  it('reports each invented figure once', () => {
    expect(
      findUnsupportedMetrics('Ran reports', 'Ran 10 reports with 10 dashboards and 40% faster delivery')
    ).toEqual(['10', '40']);
  });

  it('returns nothing for empty input', () => {
    expect(findUnsupportedMetrics('', 'anything')).toEqual([]);
    expect(findUnsupportedMetrics('anything', '')).toEqual([]);
  });
});

describe('auditRewrittenBullets', () => {
  it('annotates only the offending bullets and warns', () => {
    const { bullets, warning } = auditRewrittenBullets([
      { original: 'Built dashboards', improved: 'Built 12 dashboards' },
      { original: 'Managed 5 analysts', improved: 'Led 5 analysts' },
    ]);

    expect(bullets[0].unsupported_metrics).toEqual(['12']);
    expect(bullets[1].unsupported_metrics).toBeUndefined();
    expect(warning).toMatch(/1 rewritten bullet contains figures/);
  });

  it('stays silent when nothing was invented', () => {
    const { warning } = auditRewrittenBullets([
      { original: 'Managed 5 analysts', improved: 'Led 5 analysts' },
    ]);
    expect(warning).toBeUndefined();
  });

  it('pluralizes the warning correctly', () => {
    const { warning } = auditRewrittenBullets([
      { original: 'Built dashboards', improved: 'Built 12 dashboards' },
      { original: 'Wrote reports', improved: 'Wrote 30 reports' },
    ]);
    expect(warning).toMatch(/2 rewritten bullets contain figures/);
  });

  it('preserves the text it flags rather than stripping it', () => {
    const { bullets } = auditRewrittenBullets([
      { original: 'Built dashboards', improved: 'Built 12 dashboards' },
    ]);
    expect(bullets[0].improved).toBe('Built 12 dashboards');
  });

  it('survives malformed model output', () => {
    expect(auditRewrittenBullets(null).bullets).toEqual([]);
    expect(auditRewrittenBullets('nonsense').bullets).toEqual([]);
    expect(auditRewrittenBullets([{ garbage: true }]).bullets).toEqual([
      { original: '', improved: '' },
    ]);
  });
});

describe('findDroppedMetrics', () => {
  it('flags a real metric the rewrite discarded', () => {
    expect(
      findDroppedMetrics(
        'Reduced report runtime by 40% in 2023',
        'Optimized report performance using Airflow, resulting in improved efficiency'
      )
    ).toEqual(['40', '2023']);
  });

  it('is silent when numbers are preserved', () => {
    expect(findDroppedMetrics('Managed 5 analysts', 'Led a team of 5 analysts')).toEqual([]);
  });

  it('matches across reformatting', () => {
    expect(findDroppedMetrics('Processed 1,200 records', 'Processed 1200 records daily')).toEqual([]);
  });

  it('notices when a rewrite drops numbers', () => {
    const { bullets, dropped_metrics_notice } = auditRewrittenBullets([
      { original: 'Cut runtime by 40%', improved: 'Improved runtime efficiency' },
    ]);
    expect(bullets[0].dropped_metrics).toEqual(['40']);
    expect(dropped_metrics_notice).toMatch(/1 rewritten bullet lost a number/);
  });

  it('can report fabrication and loss on the same batch', () => {
    const { warning, dropped_metrics_notice } = auditRewrittenBullets([
      { original: 'Cut runtime by 40%', improved: 'Improved runtime efficiency' },
      { original: 'Built dashboards', improved: 'Built 12 dashboards' },
    ]);
    expect(warning).toMatch(/1 rewritten bullet contains figures/);
    expect(dropped_metrics_notice).toMatch(/1 rewritten bullet lost a number/);
  });
});

describe('technology names are not metrics', () => {
  // Regression: the rewrite prompt asks the model to weave in job-description
  // keywords, so flagging S3/EC2/Log4j2 would cry wolf on every cloud role.
  it.each([
    ['AWS S3', 'Built data pipelines', 'Built data pipelines on AWS S3'],
    ['EC2', 'Managed servers', 'Managed EC2 instances'],
    ['Log4j2', 'Handled logging', 'Handled logging with Log4j2'],
    ['OAuth2', 'Built auth', 'Built auth with OAuth2'],
  ])('does not flag %s', (_name, original, improved) => {
    expect(findUnsupportedMetrics(original, improved)).toEqual([]);
  });

  it('still catches a real fabrication alongside a tech term', () => {
    expect(
      findUnsupportedMetrics('Built pipelines', 'Built 12 pipelines on AWS S3')
    ).toEqual(['12']);
  });

  it('treats numbers inside supplied keywords as legitimate', () => {
    expect(
      findUnsupportedMetrics('Wrote scripts', 'Wrote scripts in Python 3.11', ['Python 3.11'])
    ).toEqual([]);
  });
});

describe('audit uses the user bullets, not the model echo', () => {
  it('catches a fabrication even when the model rewrites its own "original"', () => {
    // Model claims the source already said 30% — it did not.
    const { bullets, warning } = auditRewrittenBullets(
      [{ original: 'Improved reporting by 30%', improved: 'Improved reporting by 30%' }],
      { sourceBullets: ['Improved reporting'] }
    );
    expect(bullets[0].unsupported_metrics).toEqual(['30']);
    expect(warning).toBeDefined();
  });

  it('falls back to the model original when no source is supplied', () => {
    const { bullets } = auditRewrittenBullets([
      { original: 'Built dashboards', improved: 'Built 12 dashboards' },
    ]);
    expect(bullets[0].unsupported_metrics).toEqual(['12']);
  });

  it('aligns source bullets positionally', () => {
    const { bullets } = auditRewrittenBullets(
      [
        { original: 'a', improved: 'Led 5 analysts' },
        { original: 'b', improved: 'Cut runtime 40%' },
      ],
      { sourceBullets: ['Managed 5 analysts', 'Cut runtime'] }
    );
    expect(bullets[0].unsupported_metrics).toBeUndefined(); // 5 is real
    expect(bullets[1].unsupported_metrics).toEqual(['40']); // 40 invented
  });
});

describe('source bullets accept both wire shapes', () => {
  // Regression: extractBullets returns { original } objects, not strings.
  // Coercing those to '' emptied the baseline and silently disabled the audit —
  // every unit test still passed because they all passed plain strings.
  it('reads { original } objects from extractBullets', () => {
    expect(toBulletText({ original: 'Built dashboards' })).toBe('Built dashboards');
  });

  it('reads plain strings', () => {
    expect(toBulletText('Built dashboards')).toBe('Built dashboards');
  });

  it('degrades to empty for junk', () => {
    expect(toBulletText(null)).toBe('');
    expect(toBulletText({ nope: 1 })).toBe('');
  });

  it('still audits when given object-shaped source bullets', () => {
    const { bullets, warning } = auditRewrittenBullets(
      [{ original: 'Built dashboards', improved: 'Built 12 dashboards' }],
      { sourceBullets: [{ original: 'Built dashboards' }] }
    );
    expect(bullets[0].unsupported_metrics).toEqual(['12']);
    expect(warning).toBeDefined();
  });

  it('preserves the real original text for display', () => {
    const { bullets } = auditRewrittenBullets(
      [{ original: 'paraphrased by model', improved: 'Led 5 analysts' }],
      { sourceBullets: [{ original: 'Managed 5 analysts' }] }
    );
    expect(bullets[0].original).toBe('Managed 5 analysts');
  });
});

describe('splitOnFlagged (drives the inline highlight)', () => {
  it('puts flagged figures on odd indices', () => {
    const parts = splitOnFlagged('Built 12 dashboards', ['12']);
    expect(parts[1]).toBe('12');
    expect(parts.filter((_, i) => i % 2 === 1)).toEqual(['12']);
  });

  it('highlights every occurrence', () => {
    const parts = splitOnFlagged('Cut 40% and 40% again', ['40']);
    expect(parts.filter((_, i) => i % 2 === 1)).toEqual(['40', '40']);
  });

  it('matches a comma-formatted number from its normalized token', () => {
    const parts = splitOnFlagged('Processed 1,200 records', ['1200']);
    expect(parts.filter((_, i) => i % 2 === 1)).toEqual(['1,200']);
  });

  it('prefers the longest token when one nests inside another', () => {
    const parts = splitOnFlagged('Handled 1200 rows', ['1200', '1']);
    expect(parts.filter((_, i) => i % 2 === 1)).toEqual(['1200']);
  });

  it('matches a pluralized scale word', () => {
    const parts = splitOnFlagged('Handled millions of rows', ['million']);
    expect(parts.filter((_, i) => i % 2 === 1)).toEqual(['millions']);
  });

  it('returns the text untouched when nothing is flagged', () => {
    expect(splitOnFlagged('Built dashboards', [])).toEqual(['Built dashboards']);
  });

  it('rejoins to exactly the original text', () => {
    const text = 'Cut 40% and processed 1,200 rows';
    expect(splitOnFlagged(text, ['40', '1200']).join('')).toBe(text);
  });
});
