// ============================================================
// KHARCHA — Notifications API
//
// GET  /api/notifications          — fetch recent notifications
// PATCH /api/notifications         — mark one or all as read
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMIT_GENERAL } from '@/lib/rate-limiter';
import type { Notification } from '@/types';

// ── Shared profile lookup ─────────────────────────────────────────────────────

async function getProfileId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();
  return data?.id ?? null;
}

// ── GET /api/notifications ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = checkRateLimit(userId, 'notifications-read', RATE_LIMIT_GENERAL);
  if (rl) return rl;

  const profileId = await getProfileId(userId);
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = Math.min(Math.max(1, Number(limitParam ?? 50)), 100);

  const supabase = await createClient();
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[GET /api/notifications]', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }

  const list = (notifications ?? []) as Notification[];
  const unreadCount = list.filter((n) => !n.is_read).length;

  return NextResponse.json({ notifications: list, unreadCount });
}

// ── PATCH /api/notifications ──────────────────────────────────────────────────

const patchSchema = z.object({
  /** UUID to mark a single notification, or "all" to mark everything */
  id: z.union([z.string().uuid(), z.literal('all')]),
});

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = checkRateLimit(userId, 'notifications-mark', RATE_LIMIT_GENERAL);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { id } = parsed.data;

  const profileId = await getProfileId(userId);
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const supabase = await createClient();
  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('profile_id', profileId);

  if (id !== 'all') {
    query = query.eq('id', id);
  }

  const { error } = await query;
  if (error) {
    console.error('[PATCH /api/notifications]', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
