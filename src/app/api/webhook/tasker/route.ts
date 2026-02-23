// ============================================================
// KHARCHA — Tasker Webhook
// POST /api/webhook/tasker
// Section 13.2 of KHARCHA_MASTER_PROJECT_DOCUMENT.md
//
// Receives bank SMS forwarded by Tasker (Android automation app).
// 1. Validates webhook secret against app_settings
// 2. Sanitizes + parses SMS (regex → AI fallback)
// 3. Creates a draft notification for the user to review
// 4. Returns { success: true, draft_id }
//
// Body:     { sms: string, sender: string, secret: string }
// Security: secret validated against app_settings.tasker_webhook_secret
// Rate:     30 requests per minute (IP-based — no auth required)
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseSMS }       from '@/lib/algorithms/sms-parser';
import { parseSMSWithAI } from '@/lib/ai/parse-sms';
import { checkAnomaly }   from '@/lib/algorithms/anomaly-detector';
import type { NotificationCreate } from '@/types';

// ── Rate limiter (IP-based — no user session here) ────────────────────────────

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT  = 30;
const WINDOW_MS   = 60_000;

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now    = Date.now();
  const prev   = rateLimitMap.get(ip) ?? [];
  const recent = prev.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= RATE_LIMIT) return false;

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

// ── Validation ────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  sms:    z.string().trim().min(10, 'SMS too short').max(1000, 'SMS too long'),
  sender: z.string().trim().min(1).max(50),
  secret: z.string().min(1, 'Secret required'),
}).strict();

// ── SMS sanitization (strip HTML/script tags) ─────────────────────────────────

function sanitizeSMS(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')        // strip HTML tags
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ') // keep printable chars
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);             // max SMS length for processing
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Rate limit (before any DB work) ────────────────────────────────────────
  const ip = getClientIP(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  // ── Body validation ─────────────────────────────────────────────────────────
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

  const { sms: rawSMS, sender, secret } = parsed.data;

  try {
    const supabase = await createClient();

    // ── Validate secret against app_settings ─────────────────────────────────
    //
    // We find the profile whose tasker_webhook_secret matches the provided
    // secret. This is the authentication mechanism — no Clerk session here.
    //
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('profile_id, tasker_webhook_secret')
      .eq('tasker_webhook_secret', secret)
      .single();

    if (settingsError || !settings) {
      // Return 401 without revealing whether the secret exists or not
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const profileId = settings.profile_id as string;

    // ── Sanitize SMS ──────────────────────────────────────────────────────────
    const cleanSMS = sanitizeSMS(rawSMS);

    // ── Parse SMS: regex → AI fallback ───────────────────────────────────────
    let parsedSMS = parseSMS(cleanSMS);

    if (parsedSMS.confidence < 0.5) {
      const aiResult = await parseSMSWithAI(cleanSMS);
      if (aiResult) {
        parsedSMS = aiResult;
      }
    }

    // If we couldn't parse a valid amount, reject
    if (parsedSMS.amount <= 0) {
      return NextResponse.json(
        { error: 'Could not parse SMS — not a recognised bank transaction' },
        { status: 400 },
      );
    }

    // ── Anomaly detection (with plaintext amount from SMS) ───────────────────
    const today = new Date().toISOString().slice(0, 10);
    const anomalies = await checkAnomaly({
      profileId,
      transactionId: 'tasker-draft',  // not yet inserted
      categoryId:    null,
      date:          today,
      plain_amount:  parsedSMS.amount,
    });

    // ── Build notification title / message ────────────────────────────────────
    const amountStr   = `₹${parsedSMS.amount.toLocaleString('en-IN')}`;
    const typeLabel   = parsedSMS.type === 'debit' ? 'debited' : 'credited';
    const merchantStr = parsedSMS.merchant ?? sender;
    const last4Str    = parsedSMS.account_last4 ? ` (••${parsedSMS.account_last4})` : '';

    let title   = `${amountStr} ${typeLabel}`;
    let message = `${amountStr} ${typeLabel} from ${merchantStr}${last4Str}. Tap to add transaction.`;

    // Prepend anomaly warning if any
    if (anomalies.length > 0) {
      const topAnomaly = anomalies[0];
      title   = `⚠️ ${title}`;
      message = `${topAnomaly?.message ?? ''} — ${message}`;
    }

    // ── Create draft notification ─────────────────────────────────────────────
    const notification: NotificationCreate = {
      profile_id: profileId,
      type:       'general',
      title,
      message,
      is_read:    false,
      action_url: '/transactions/new',
    };

    const { data: notif, error: notifError } = await supabase
      .from('notifications')
      .insert(notification)
      .select('id')
      .single();

    if (notifError || !notif) {
      console.error('[tasker-webhook] Failed to create notification:', notifError);
      return NextResponse.json(
        { error: 'Failed to create draft notification' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success:  true,
      draft_id: notif.id as string,
      parsed:   {
        amount:       parsedSMS.amount,
        type:         parsedSMS.type,
        merchant:     parsedSMS.merchant,
        account_last4:parsedSMS.account_last4,
        confidence:   parsedSMS.confidence,
      },
    });
  } catch (error) {
    console.error('[/api/webhook/tasker] unexpected error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Something went wrong' },
      { status: 500 },
    );
  }
}
