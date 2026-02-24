-- ============================================================
-- Migration 002: push_subscriptions table
-- Run this in the Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Index for fast lookup by profile ─────────────────────────
CREATE INDEX IF NOT EXISTS push_subscriptions_profile_id_idx
  ON push_subscriptions (profile_id);

-- ── RLS: users can only manage their own subscriptions ────────
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can select own push subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (profile_id = (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'));

-- Service role (server-side push dispatch) bypasses RLS by default.
