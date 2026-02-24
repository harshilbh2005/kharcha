// ============================================================
// KHARCHA — Push Subscription API
//
// POST   /api/push/subscribe  — register a push subscription
// DELETE /api/push/subscribe  — unregister a push subscription
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMIT_GENERAL } from '@/lib/rate-limiter';

// ── Schema ─────────────────────────────────────────────────────────────────────

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string().min(1),
  auth:     z.string().min(1),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

// ── Shared profile lookup ──────────────────────────────────────────────────────

async function getProfileId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();
  return data?.id ?? null;
}

// ── POST /api/push/subscribe ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = checkRateLimit(userId, 'push-subscribe', RATE_LIMIT_GENERAL);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
  }

  const profileId = await getProfileId(userId);
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        profile_id: profileId,
        endpoint:   parsed.data.endpoint,
        p256dh:     parsed.data.p256dh,
        auth:       parsed.data.auth,
        user_agent: req.headers.get('user-agent') ?? null,
      },
      { onConflict: 'endpoint' },
    );

  if (error) {
    console.error('[POST /api/push/subscribe]', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── DELETE /api/push/subscribe ─────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = checkRateLimit(userId, 'push-unsubscribe', RATE_LIMIT_GENERAL);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const profileId = await getProfileId(userId);
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('profile_id', profileId)
    .eq('endpoint', parsed.data.endpoint);

  if (error) {
    console.error('[DELETE /api/push/subscribe]', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
