// ============================================================
// Supabase SERVICE ROLE client
//
// Bypasses RLS — use ONLY for server-side internal operations
// (e.g. push notification dispatch, cron jobs, admin tasks).
// NEVER expose this client to the browser.
// ============================================================

import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error('Missing Supabase service role credentials');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
