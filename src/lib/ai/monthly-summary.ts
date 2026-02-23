// ============================================================
// KHARCHA — AI Monthly Summary Generator
// Section 11.2 of KHARCHA_MASTER_PROJECT_DOCUMENT.md
//
// Generates a warm, actionable monthly spending summary using
// Claude Sonnet 4.5. Called at month end or on-demand from the
// POST /api/ai/monthly-summary route.
//
// IMPORTANT: Only decrypted (plaintext) amounts are sent to AI.
// The caller must decrypt all amounts before passing them here.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CategoryBreakdown {
  name: string;
  amount: number;
  /** Percentage of total expenses (0-100) */
  pct: number;
}

export interface MonthlyData {
  month: string;               // e.g. "February 2026"
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  subscriptionTotal: number;
  needsTotal: number;
  wantsTotal: number;
  /** Top categories by spend, at most 6 */
  categoryBreakdown: CategoryBreakdown[];
  /** Top 5 largest single transactions: [description, amount] */
  topExpenses: Array<{ description: string; amount: number }>;
  /** Previous month comparison: positive = improved (spent less / saved more) */
  vsLastMonth: {
    expensesDelta: number;   // positive = spent less
    savingsDelta: number;    // positive = saved more
  } | null;
  /** Any anomaly messages detected this month */
  anomalies: string[];
}

export interface MonthlySummaryResult {
  /** 3-4 sentence overview paragraph */
  summary: string;
  /** 2 positive observations */
  wins: string[];
  /** 2 areas for improvement */
  watch: string[];
  /** 1 specific actionable tip */
  tip: string;
  /** Raw Claude response, kept for debugging */
  raw: string;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const SUMMARY_PROMPT = `You are a friendly personal finance advisor for a college student in India.
Analyze their monthly spending data and give a brief, encouraging but honest summary.

Keep tone: warm, like a supportive older sibling. Use ₹ for amounts.
Be specific with numbers. Don't be preachy.

Format your response as:
SUMMARY: (3-4 sentences overview)
WINS: (2 bullet points of positive observations)
WATCH: (2 bullet points of areas to improve)
TIP: (1 specific actionable tip for next month)

Monthly Data:
{data}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDataForPrompt(data: MonthlyData): string {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const needsPct = data.totalExpenses > 0
    ? Math.round((data.needsTotal / data.totalExpenses) * 100)
    : 0;
  const wantsPct = 100 - needsPct;

  const lines: string[] = [
    `Month: ${data.month}`,
    `Total Income: ${fmt(data.totalIncome)}`,
    `Total Expenses: ${fmt(data.totalExpenses)}`,
    `Savings: ${fmt(data.totalSavings)} (${data.totalIncome > 0 ? Math.round((data.totalSavings / data.totalIncome) * 100) : 0}% of income)`,
    `Subscriptions: ${fmt(data.subscriptionTotal)}`,
    `Needs vs Wants: ${needsPct}% needs / ${wantsPct}% wants (${fmt(data.needsTotal)} / ${fmt(data.wantsTotal)})`,
    '',
    'Category Breakdown:',
    ...data.categoryBreakdown.map(
      (c) => `  ${c.name}: ${fmt(c.amount)} (${c.pct}%)`,
    ),
    '',
    'Top 5 Expenses:',
    ...data.topExpenses.map(
      (e, i) => `  ${i + 1}. ${e.description}: ${fmt(e.amount)}`,
    ),
  ];

  if (data.vsLastMonth) {
    lines.push('');
    const expDir = data.vsLastMonth.expensesDelta >= 0 ? 'less' : 'more';
    const savDir = data.vsLastMonth.savingsDelta >= 0 ? 'more' : 'less';
    lines.push(
      `vs Last Month: spent ${fmt(Math.abs(data.vsLastMonth.expensesDelta))} ${expDir}, saved ${fmt(Math.abs(data.vsLastMonth.savingsDelta))} ${savDir}`,
    );
  }

  if (data.anomalies.length > 0) {
    lines.push('');
    lines.push('Anomalies This Month:');
    data.anomalies.forEach((a) => lines.push(`  - ${a}`));
  }

  return lines.join('\n');
}

/** Parse the structured SUMMARY:/WINS:/WATCH:/TIP: response from Claude */
function parseClaudeResponse(text: string): Omit<MonthlySummaryResult, 'raw'> {
  // Extract each section
  const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=WINS:|$)/i);
  const winsMatch    = text.match(/WINS:\s*([\s\S]*?)(?=WATCH:|$)/i);
  const watchMatch   = text.match(/WATCH:\s*([\s\S]*?)(?=TIP:|$)/i);
  const tipMatch     = text.match(/TIP:\s*([\s\S]*?)$/i);

  const summary = summaryMatch?.[1]?.trim() ?? 'Could not generate summary.';

  // Parse bullet points from WINS and WATCH sections
  const parseBullets = (raw: string | undefined): string[] => {
    if (!raw) return [];
    return raw
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l) => l.length > 0)
      .slice(0, 2);
  };

  const wins  = parseBullets(winsMatch?.[1]);
  const watch = parseBullets(watchMatch?.[1]);
  const tip   = tipMatch?.[1]?.trim() ?? '';

  // Ensure we always have at least empty strings
  return {
    summary,
    wins:  wins.length  > 0 ? wins  : ['Keep it up!'],
    watch: watch.length > 0 ? watch : ['Review spending next month'],
    tip:   tip || 'Track every expense, no matter how small.',
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a monthly spending summary using Claude Sonnet 4.5.
 *
 * @param data - Decrypted monthly spending data (caller must decrypt first)
 * @returns Structured summary with summary, wins, watch, tip — or null on error
 */
export async function generateMonthlySummary(
  data: MonthlyData,
): Promise<MonthlySummaryResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[monthly-summary] ANTHROPIC_API_KEY not set — AI summary unavailable');
    return null;
  }

  const client = new Anthropic({ apiKey });
  const dataText = formatDataForPrompt(data);
  const prompt = SUMMARY_PROMPT.replace('{data}', dataText);

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 600,
      messages:   [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') return null;

    const raw = content.text.trim();
    const parsed = parseClaudeResponse(raw);

    return { ...parsed, raw };
  } catch (error) {
    console.error('[monthly-summary] Claude API error:', error);
    return null;
  }
}
