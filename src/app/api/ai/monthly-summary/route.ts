// ============================================================
// KHARCHA — AI Monthly Summary API Route
// POST /api/ai/monthly-summary
//
// Body:     MonthlyData (decrypted — caller must decrypt first)
// Response: MonthlySummaryResult | { error }
//
// Rate limited: 5 requests per hour per authenticated user
// (summaries are expensive — ~600 tokens each).
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateMonthlySummary } from '@/lib/ai/monthly-summary';
import { checkRateLimit, RATE_LIMIT_AI } from '@/lib/rate-limiter';

// ── Zod schema ────────────────────────────────────────────────────────────────

const categoryBreakdownSchema = z.object({
  name:   z.string().min(1).max(50),
  amount: z.number().nonnegative(),
  pct:    z.number().min(0).max(100),
});

const topExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount:      z.number().nonnegative(),
});

const bodySchema = z.object({
  month:                z.string().min(1).max(30),
  totalIncome:          z.number().nonnegative(),
  totalExpenses:        z.number().nonnegative(),
  totalSavings:         z.number(),
  subscriptionTotal:    z.number().nonnegative(),
  needsTotal:           z.number().nonnegative(),
  wantsTotal:           z.number().nonnegative(),
  categoryBreakdown:    z.array(categoryBreakdownSchema).max(6),
  topExpenses:          z.array(topExpenseSchema).max(5),
  vsLastMonth:          z.object({
    expensesDelta: z.number(),
    savingsDelta:  z.number(),
  }).nullable(),
  anomalies:            z.array(z.string().max(200)).max(10),
}).strict();

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // ── Rate limit (10 req/min per user — AI endpoint) ────────────────────────
    const blocked = checkRateLimit(userId, 'ai-monthly-summary', RATE_LIMIT_AI);
    if (blocked) return blocked;

    // ── Body validation ───────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 },
      );
    }

    // ── Profile lookup ────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // ── Generate summary ──────────────────────────────────────────────────────
    const result = await generateMonthlySummary(parsed.data);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to generate summary — AI service unavailable' },
        { status: 503 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/ai/monthly-summary] unexpected error:', error);

    // Surface the real Anthropic error to the client for easier debugging
    const err = error as { status?: number; message?: string; error?: { type?: string; message?: string } };
    const status  = err.status ?? 500;
    const message = err.error?.message ?? err.message ?? 'Something went wrong';

    // Map common Anthropic API errors to human-readable messages
    let clientMessage = message;
    if (status === 401) clientMessage = 'Invalid Anthropic API key — check ANTHROPIC_API_KEY in Vercel env vars';
    if (status === 429) clientMessage = 'Anthropic rate limit reached — try again in a moment';
    if (status === 529) clientMessage = 'Anthropic API overloaded — try again later';

    return NextResponse.json({ error: clientMessage }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
