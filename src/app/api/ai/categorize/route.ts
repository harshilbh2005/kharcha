// ============================================================
// KHARCHA — AI Categorization API Route
// POST /api/ai/categorize
//
// Body:     { description: string, amount: number, currency?: 'INR'|'USD' }
// Response: CategorizationResult (category, subcategory, is_need, confidence, source)
//
// Rate limited: 10 requests per minute per authenticated user.
// The heavy lifting (3-tier logic + Claude API) is in categorize.ts.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { categorizeTransaction } from '@/lib/ai/categorize';
import { checkRateLimit, RATE_LIMIT_AI } from '@/lib/rate-limiter';

// ── Validation ────────────────────────────────────────────────────────────────

const bodySchema = z
  .object({
    description: z.string().trim().min(1, 'Description required').max(200),
    amount:      z.number().positive(),
    currency:    z.enum(['INR', 'USD']).default('INR'),
  })
  .strict();

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // ── Rate limit (10 req/min per user — AI endpoint) ────────────────────────
    const blocked = checkRateLimit(userId, 'ai-categorize', RATE_LIMIT_AI);
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

    const { description, amount, currency } = parsed.data;

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

    // ── Categorize ────────────────────────────────────────────────────────────
    const result = await categorizeTransaction(
      description,
      amount,
      profile.id as string,
      currency,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/ai/categorize] unexpected error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Something went wrong' },
      { status: 500 },
    );
  }
}
