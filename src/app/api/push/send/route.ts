// ============================================================
// KHARCHA — Push Send API (internal server-side dispatcher)
//
// POST /api/push/send
//
// Called by server-side code (notification triggers) to deliver
// a Web Push notification to all subscriptions for a profile.
//
// Security: requires PUSH_INTERNAL_SECRET header so this
// endpoint cannot be called from the browser.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';

// ── VAPID configuration ────────────────────────────────────────────────────────

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// ── Schema ─────────────────────────────────────────────────────────────────────

const sendSchema = z.object({
  profileId: z.string().uuid(),
  title:     z.string().min(1).max(100),
  body:      z.string().min(1).max(300),
  /** Deep-link URL to open when notification is tapped */
  url:       z.string().optional().default('/'),
  /** Notification type tag — collapses duplicate notifications */
  type:      z.string().optional().default('general'),
});

// ── POST /api/push/send ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Verify this is an internal server call
  const secret = req.headers.get('x-push-secret');
  if (!secret || secret !== process.env.PUSH_INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { profileId, title, body: notifBody, url, type } = parsed.data;

  // Fetch all push subscriptions for this profile using service role
  // (bypasses RLS — safe because we're server-side and have verified the secret)
  const supabase = createServiceClient();
  const { data: subscriptions, error: fetchError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('profile_id', profileId);

  if (fetchError) {
    console.error('[POST /api/push/send] fetch subscriptions:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No subscriptions found' });
  }

  const payload = JSON.stringify({ title, body: notifBody, url, type });
  let sent = 0;
  const staleEndpoints: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 24 }, // 24 hours TTL
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired or invalid — queue for cleanup
          staleEndpoints.push(sub.endpoint);
        } else {
          console.error('[POST /api/push/send] send error:', err);
        }
      }
    }),
  );

  // Clean up stale subscriptions
  if (staleEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints);
  }

  return NextResponse.json({ sent, stale: staleEndpoints.length });
}
