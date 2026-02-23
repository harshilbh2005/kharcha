// ============================================================
// KHARCHA — Current Budget Route Handler
// GET /api/budget/current
//
// Returns encrypted income and expense data for the current
// continuous budget period. The budget period starts on the 1st
// of the current month and stretches to the end of the furthest
// target_month from income entries.
//
// All amounts returned encrypted — client decrypts with AES key.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMIT_GENERAL } from '@/lib/rate-limiter';
import type { BudgetQueryResult, IncomeType } from '@/types';

export async function GET() {
  try {
    // ── Auth ─────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // ── Rate limit (60 req/min per user) ─────────────────────
    const blocked = checkRateLimit(userId, 'budget-current', RATE_LIMIT_GENERAL);
    if (blocked) return blocked;

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

    // ── Budget period: 1st of current month → now ────────────
    const now = new Date();
    const budgetStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // ── Income entries from budget start ─────────────────────
    // Only budget-relevant types: allowance, festival_bonus
    // pass_through and emergency_fund are excluded.
    const { data: incomeRows, error: incomeError } = await supabase
      .from('income_entries')
      .select('amount_encrypted, type, target_month')
      .eq('profile_id', profile.id)
      .gte('date', budgetStart)
      .in('type', ['allowance', 'festival_bonus'] satisfies IncomeType[]);

    if (incomeError) {
      console.error('[budget/current] income fetch error:', incomeError);
      return NextResponse.json({ error: 'Failed to fetch income data' }, { status: 500 });
    }

    // ── Find latest target_month from income entries ─────────
    // e.g. if we have entries with target_month "2026-02" and "2026-03",
    // the horizon stretches to end of March.
    let latestTargetMonth: string | null = null;
    for (const row of incomeRows ?? []) {
      const tm = row.target_month as string | null;
      if (tm && (!latestTargetMonth || tm > latestTargetMonth)) {
        latestTargetMonth = tm;
      }
    }

    // ── Determine horizon date for subscription lookups ──────
    let horizonDate: string;
    if (latestTargetMonth) {
      const [hYear, hMonth] = latestTargetMonth.split('-').map(Number);
      const lastDay = new Date(hYear, hMonth, 0).getDate(); // last day of that month
      horizonDate = `${latestTargetMonth}-${String(lastDay).padStart(2, '0')}`;
    } else {
      // Fallback: end of current month
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      horizonDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    // ── Expense transactions from budget start ───────────────
    // Exclude pass-through expenses (they net to ₹0).
    const { data: expenseRows, error: expenseError } = await supabase
      .from('transactions')
      .select('amount_encrypted, category_id, date')
      .eq('profile_id', profile.id)
      .gte('date', budgetStart)
      .eq('is_pass_through', false);

    if (expenseError) {
      console.error('[budget/current] expense fetch error:', expenseError);
      return NextResponse.json({ error: 'Failed to fetch expense data' }, { status: 500 });
    }

    // ── Split today's expenses from total ────────────────────
    const allExpenses = expenseRows ?? [];
    const todayExpenses = allExpenses.filter((row) => row.date === todayStr);

    // ── Expected unpaid subscriptions before horizon ─────────
    // Active subscriptions with next_billing_date between today and horizon
    // that haven't been matched to a transaction yet (last_paid_date < today
    // or null).
    const { data: subRows, error: subError } = await supabase
      .from('subscriptions')
      .select('amount_encrypted, name, next_billing_date, last_paid_date')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .gte('next_billing_date', todayStr)
      .lte('next_billing_date', horizonDate);

    if (subError) {
      console.error('[budget/current] subscription fetch error:', subError);
      // Non-fatal — continue without subscription data
    }

    // Filter to only truly unpaid: last_paid_date is null or before next_billing_date
    const unpaidSubs = (subRows ?? []).filter((sub) => {
      if (!sub.last_paid_date) return true;
      return sub.last_paid_date < (sub.next_billing_date as string);
    });

    // ── Assemble response ────────────────────────────────────
    const result: BudgetQueryResult = {
      total_income: (incomeRows ?? []).map((row) => ({
        amount: row.amount_encrypted as string,
        type: row.type as IncomeType,
      })),
      total_expenses: allExpenses.map((row) => ({
        amount: row.amount_encrypted as string,
        category: (row.category_id as string | null) ?? null,
      })),
      today_expenses: todayExpenses.map((row) => ({
        amount: row.amount_encrypted as string,
      })),
      latest_target_month: latestTargetMonth,
      expected_subscriptions: unpaidSubs.map((sub) => ({
        amount: sub.amount_encrypted as string,
        name: sub.name as string,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[budget/current] unexpected error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Something went wrong' },
      { status: 500 },
    );
  }
}
