// ============================================================
// KHARCHA — Exchange Rate API Route
// GET /api/exchange-rate
//
// Returns the current USD→INR exchange rate.
// Uses ExchangeRate-API (free tier) with daily caching in the
// app_settings table to stay within rate limits.
//
// Response: { rate: number, updatedAt: string }
// Fallback: returns cached rate (default 84.0) if API is down.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMIT_GENERAL } from '@/lib/rate-limiter';

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Default USD→INR rate used when no cached rate exists */
const DEFAULT_RATE = 84.0;

/** How long to cache the rate before refreshing (24 hours in ms) */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// ─── Route Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // ── Auth ─────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // ── Rate limit (60 req/min per user) ─────────────────────
    const blocked = checkRateLimit(userId, 'exchange-rate', RATE_LIMIT_GENERAL);
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

    // ── Fetch cached rate from app_settings ──────────────────
    const { data: settings } = await supabase
      .from('app_settings')
      .select('exchange_rate_usd_inr, exchange_rate_updated_at')
      .eq('profile_id', profile.id)
      .single();

    const cachedRate = (settings?.exchange_rate_usd_inr as number | null) ?? DEFAULT_RATE;
    const cachedUpdatedAt = settings?.exchange_rate_updated_at as string | null;

    // ── Check if cache is fresh (< 24 hours old) ─────────────
    if (cachedUpdatedAt) {
      const lastUpdated = new Date(cachedUpdatedAt).getTime();
      const now = Date.now();

      if (now - lastUpdated < CACHE_DURATION_MS) {
        return NextResponse.json({
          rate: cachedRate,
          updatedAt: cachedUpdatedAt,
        });
      }
    }

    // ── Fetch fresh rate from ExchangeRate-API ───────────────
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;

    if (!apiKey) {
      console.warn('[exchange-rate] EXCHANGE_RATE_API_KEY not set, returning cached/default rate');
      return NextResponse.json({
        rate: cachedRate,
        updatedAt: cachedUpdatedAt ?? new Date().toISOString(),
      });
    }

    let freshRate = cachedRate;
    let freshUpdatedAt = new Date().toISOString();

    try {
      const apiRes = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
        { signal: AbortSignal.timeout(5000) }, // 5s timeout
      );

      if (apiRes.ok) {
        const data = await apiRes.json() as {
          result: string;
          conversion_rates?: { INR?: number };
        };

        if (data.result === 'success' && data.conversion_rates?.INR) {
          freshRate = data.conversion_rates.INR;
        }
      } else {
        console.warn('[exchange-rate] API returned non-OK status:', apiRes.status);
      }
    } catch (fetchError) {
      console.warn('[exchange-rate] API fetch failed, using cached rate:', fetchError);
      // Fall through — use cached rate
    }

    // ── Update cache in app_settings ─────────────────────────
    const { error: updateError } = await supabase
      .from('app_settings')
      .update({
        exchange_rate_usd_inr: freshRate,
        exchange_rate_updated_at: freshUpdatedAt,
      })
      .eq('profile_id', profile.id);

    if (updateError) {
      console.error('[exchange-rate] Failed to update cache:', updateError);
      // Non-fatal — still return the rate
    }

    return NextResponse.json({
      rate: freshRate,
      updatedAt: freshUpdatedAt,
    });
  } catch (error) {
    console.error('[exchange-rate] unexpected error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Something went wrong' },
      { status: 500 },
    );
  }
}
