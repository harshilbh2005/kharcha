// ============================================================
// KHARCHA — AI SMS Parse API Route
// POST /api/ai/parse-sms
//
// Combines the regex parser (src/lib/algorithms/sms-parser.ts)
// with the AI fallback (src/lib/ai/parse-sms.ts).
// Regex runs first; AI only fires when confidence < 0.5.
//
// Body:     { sms: string }
// Response: ParsedSMS | { error }
//
// Rate limited: 20 requests per minute per authenticated user.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { parseSMS }       from '@/lib/algorithms/sms-parser';
import { parseSMSWithAI } from '@/lib/ai/parse-sms';

// ── Rate limiter ──────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT  = 20;
const WINDOW_MS   = 60_000;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now    = Date.now();
  const prev   = rateLimitMap.get(userId) ?? [];
  const recent = prev.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  rateLimitMap.set(userId, recent);
  return { allowed: true, remaining: RATE_LIMIT - recent.length };
}

// ── Validation ────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  sms: z.string().trim().min(10, 'SMS too short').max(1000, 'SMS too long'),
}).strict();

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // ── Rate limit ────────────────────────────────────────────────────────────
    const { allowed, remaining } = checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in a minute.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } },
      );
    }

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

    const { sms } = parsed.data;

    // ── Tier 1: regex parser ──────────────────────────────────────────────────
    const regexResult = parseSMS(sms);

    if (regexResult.confidence >= 0.5) {
      return NextResponse.json(regexResult, {
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'X-Parse-Source': 'regex',
        },
      });
    }

    // ── Tier 2: AI fallback ───────────────────────────────────────────────────
    const aiResult = await parseSMSWithAI(sms);

    if (aiResult) {
      return NextResponse.json(aiResult, {
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'X-Parse-Source': 'ai',
        },
      });
    }

    // ── Both failed: return low-confidence regex result ───────────────────────
    if (regexResult.amount > 0) {
      return NextResponse.json(regexResult, {
        headers: {
          'X-RateLimit-Remaining': String(remaining),
          'X-Parse-Source': 'regex-low-confidence',
        },
      });
    }

    return NextResponse.json(
      { error: 'Could not parse SMS — not a recognised bank transaction' },
      { status: 400 },
    );
  } catch (error) {
    console.error('[/api/ai/parse-sms] unexpected error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Something went wrong' },
      { status: 500 },
    );
  }
}
