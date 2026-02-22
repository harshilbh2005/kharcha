// ============================================================
// KHARCHA — Budget Monthly Route Handler
// GET /api/budget/monthly
//
// Returns encrypted income and expense amounts for the current
// month along with calendar metadata (days_remaining, days_elapsed).
// Decryption is the client's responsibility — amounts are returned
// as-is so the AES key never leaves the client.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { MonthlyBudgetQueryResult, IncomeType } from '@/types';

export async function GET() {
  try {
    // ── Auth ─────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
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

    // ── Calendar metadata ────────────────────────────────────
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based
    const dayOfMonth = now.getDate();

    // Zero-pad month to produce YYYY-MM
    const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;

    // Last day of the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // days_elapsed = full days already spent (yesterday and earlier)
    // days_remaining = from today to end of month (inclusive)
    const daysElapsed = dayOfMonth - 1;
    const daysRemaining = daysInMonth - dayOfMonth + 1;

    // ── Income entries for this month ─────────────────────────
    // Only budget-relevant types: allowance, festival_bonus, other, vault_replenish
    // pass_through and emergency_fund are excluded from the regular budget.
    const { data: incomeRows, error: incomeError } = await supabase
      .from('income_entries')
      .select('amount_encrypted, type')
      .eq('profile_id', profile.id)
      .eq('month_year', monthYear)
      .in('type', ['allowance', 'festival_bonus', 'vault_replenish', 'other']);

    if (incomeError) {
      console.error('[budget/monthly] income fetch error:', incomeError);
      return NextResponse.json({ error: 'Failed to fetch income data' }, { status: 500 });
    }

    // ── Expense transactions for this month ───────────────────
    // Exclude pass-through expenses (they net to ₹0 in the budget).
    const { data: expenseRows, error: expenseError } = await supabase
      .from('transactions')
      .select('amount_encrypted, category_id')
      .eq('profile_id', profile.id)
      .eq('month_year', monthYear)
      .eq('is_pass_through', false);

    if (expenseError) {
      console.error('[budget/monthly] expense fetch error:', expenseError);
      return NextResponse.json({ error: 'Failed to fetch expense data' }, { status: 500 });
    }

    // ── Assemble response ────────────────────────────────────
    const result: MonthlyBudgetQueryResult = {
      month: monthYear,
      total_income: (incomeRows ?? []).map((row) => ({
        amount: row.amount_encrypted as string,
        type: row.type as IncomeType,
      })),
      total_expenses: (expenseRows ?? []).map((row) => ({
        amount: row.amount_encrypted as string,
        category: (row.category_id as string | null) ?? null,
      })),
      days_remaining: daysRemaining,
      days_elapsed: daysElapsed,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[budget/monthly] unexpected error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Something went wrong' },
      { status: 500 },
    );
  }
}
