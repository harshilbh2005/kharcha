// ============================================================
// KHARCHA — Monthly Analytics Route Handler
// GET /api/analytics/monthly/[monthYear]
//
// monthYear param format: "YYYY-MM"
//
// Returns income and expenses for the given calendar month,
// purely based on the DATE each entry was received/spent.
// This is for historical viewing only — the budget calculation
// is done separately via /api/budget/current.
//
// All amounts returned encrypted — client decrypts with AES key.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMIT_GENERAL } from '@/lib/rate-limiter';
import type { IncomeType, MonthlyAnalyticsQueryResult } from '@/types';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ monthYear: string }> },
) {
  try {
    // ── Auth ─────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // ── Rate limit (60 req/min per user) ─────────────────────
    const blocked = checkRateLimit(userId, 'analytics-monthly', RATE_LIMIT_GENERAL);
    if (blocked) return blocked;

    // ── Validate param ───────────────────────────────────────
    const { monthYear } = await params;
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return NextResponse.json(
        { error: 'Invalid month format — use YYYY-MM' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // ── Profile lookup ───────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // ── Date range for the requested month ───────────────────
    const [year, month] = monthYear.split('-').map(Number);
    const monthStart = `${monthYear}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${monthYear}-${String(lastDay).padStart(2, '0')}`;

    // ── Income: all types, filtered by date in month ─────────
    // Analytics shows WHEN money came in, not which month it covers.
    const { data: incomeRows, error: incomeError } = await supabase
      .from('income_entries')
      .select('amount_encrypted, type, target_month, date')
      .eq('profile_id', profile.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: true });

    if (incomeError) {
      console.error('[analytics/monthly] income fetch error:', incomeError);
      return NextResponse.json({ error: 'Failed to fetch income data' }, { status: 500 });
    }

    // ── Expenses: filtered by date in month, exclude pass-through ──
    const { data: expenseRows, error: expenseError } = await supabase
      .from('transactions')
      .select('amount_encrypted, category_name, category_id, is_subscription, is_need, date')
      .eq('profile_id', profile.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .eq('is_pass_through', false);

    if (expenseError) {
      console.error('[analytics/monthly] expense fetch error:', expenseError);
      return NextResponse.json({ error: 'Failed to fetch expense data' }, { status: 500 });
    }

    // ── Assemble response ────────────────────────────────────
    const result: MonthlyAnalyticsQueryResult = {
      month_year: monthYear,
      income: (incomeRows ?? []).map((row) => ({
        amount: row.amount_encrypted as string,
        type: row.type as IncomeType,
        target_month: (row.target_month as string | null) ?? null,
        date: row.date as string,
      })),
      expenses: (expenseRows ?? []).map((row) => ({
        amount: row.amount_encrypted as string,
        category_name: (row.category_name as string | null) ?? null,
        category_id: (row.category_id as string | null) ?? null,
        is_subscription: row.is_subscription as boolean,
        is_need: row.is_need as boolean,
        date: row.date as string,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[analytics/monthly] unexpected error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Something went wrong' },
      { status: 500 },
    );
  }
}
