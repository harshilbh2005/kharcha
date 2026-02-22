-- ============================================================
-- KHARCHA — Complete Database Schema
-- Run this in Supabase SQL Editor (in order, top to bottom)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- HELPER: Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- HELPER: Immutable date→YYYY-MM for generated columns
-- ============================================================
-- PostgreSQL's date::text cast depends on DateStyle, so it's
-- NOT immutable. to_char(date, 'YYYY-MM') IS immutable but
-- Postgres can't prove it. Wrapping it in an IMMUTABLE function
-- tells Postgres it's safe for generated/index expressions.
CREATE OR REPLACE FUNCTION date_to_month_year(d DATE)
RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT to_char(d, 'YYYY-MM') $$;

-- ============================================================
-- TABLE: profiles
-- Purpose: User profile and preferences (linked to Clerk user)
-- ============================================================
CREATE TABLE profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id           TEXT UNIQUE NOT NULL,
  display_name            TEXT NOT NULL DEFAULT 'User',
  currency                TEXT NOT NULL DEFAULT 'INR',
  pin_hash                TEXT,
  encryption_salt         TEXT,
  pin_enabled             BOOLEAN DEFAULT FALSE,
  biometric_enabled       BOOLEAN DEFAULT FALSE,
  monthly_budget_alert_pct INTEGER DEFAULT 80,
  daily_limit_enabled     BOOLEAN DEFAULT TRUE,
  notification_enabled    BOOLEAN DEFAULT TRUE,
  onboarding_completed    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: categories
-- Purpose: Expense categories (seeded + custom)
-- ============================================================
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  icon            TEXT NOT NULL,
  color           TEXT NOT NULL,
  is_default      BOOLEAN DEFAULT FALSE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: income_entries
-- Purpose: All incoming money (allowance, vault deposits, bonus, pass-through)
-- ============================================================
CREATE TABLE income_entries (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_encrypted    TEXT NOT NULL,
  amount_hash         TEXT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  type                TEXT NOT NULL CHECK (type IN (
                        'allowance',
                        'emergency_fund',
                        'festival_bonus',
                        'pass_through',
                        'vault_replenish',
                        'other'
                      )),
  description         TEXT,
  pass_through_for    TEXT,
  linked_expense_id   UUID,
  source              TEXT DEFAULT 'manual',
  raw_sms             TEXT,
  date                DATE NOT NULL DEFAULT CURRENT_DATE,
  month_year          TEXT GENERATED ALWAYS AS (date_to_month_year(date)) STORED,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER income_entries_updated_at
  BEFORE UPDATE ON income_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: subscriptions
-- Purpose: Recurring subscription tracking
-- ============================================================
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  amount_encrypted        TEXT NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'INR',
  amount_inr_encrypted    TEXT,
  billing_day             INTEGER CHECK (billing_day BETWEEN 1 AND 31),
  billing_cycle           TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  category_id             UUID REFERENCES categories(id),
  is_active               BOOLEAN DEFAULT TRUE,
  next_billing_date       DATE,
  last_paid_date          DATE,
  auto_match_keywords     TEXT[],
  remind_days_before      INTEGER DEFAULT 3,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: transactions (expenses)
-- Purpose: All outgoing money
-- ============================================================
CREATE TABLE transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_encrypted    TEXT NOT NULL,
  amount_hash         TEXT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  category_id         UUID REFERENCES categories(id),
  category_name       TEXT,
  subcategory         TEXT,
  description         TEXT NOT NULL,
  merchant            TEXT,
  is_pass_through     BOOLEAN DEFAULT FALSE,
  linked_income_id    UUID REFERENCES income_entries(id),
  is_subscription     BOOLEAN DEFAULT FALSE,
  subscription_id     UUID REFERENCES subscriptions(id),
  is_need             BOOLEAN DEFAULT TRUE,
  source              TEXT DEFAULT 'manual',
  raw_sms             TEXT,
  ai_categorized      BOOLEAN DEFAULT FALSE,
  ai_confidence       REAL,
  date                DATE NOT NULL DEFAULT CURRENT_DATE,
  time                TIME,
  month_year          TEXT GENERATED ALWAYS AS (date_to_month_year(date)) STORED,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: emergency_vault
-- Purpose: Emergency fund tracking (separate from spending budget)
-- ============================================================
CREATE TABLE emergency_vault (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_balance_encrypted   TEXT NOT NULL DEFAULT '0',
  target_amount_encrypted     TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER emergency_vault_updated_at
  BEFORE UPDATE ON emergency_vault
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: vault_transactions
-- Purpose: Vault deposit/withdrawal ledger
-- ============================================================
CREATE TABLE vault_transactions (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vault_id                    UUID NOT NULL REFERENCES emergency_vault(id) ON DELETE CASCADE,
  type                        TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount_encrypted            TEXT NOT NULL,
  amount_hash                 TEXT NOT NULL,
  reason                      TEXT,
  balance_after_encrypted     TEXT NOT NULL,
  linked_income_id            UUID REFERENCES income_entries(id),
  date                        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: monthly_summaries
-- Purpose: Pre-computed monthly aggregates (for fast analytics)
-- ============================================================
CREATE TABLE monthly_summaries (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_year                      TEXT NOT NULL,
  total_allowance_encrypted       TEXT,
  total_bonus_encrypted           TEXT,
  total_expenses_encrypted        TEXT,
  total_subscriptions_encrypted   TEXT,
  total_pass_through_encrypted    TEXT,
  vault_deposits_encrypted        TEXT,
  vault_withdrawals_encrypted     TEXT,
  daily_average_encrypted         TEXT,
  category_breakdown              JSONB,
  needs_vs_wants                  JSONB,
  burn_rate_data                  JSONB,
  ai_summary                     TEXT,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, month_year)
);

CREATE TRIGGER monthly_summaries_updated_at
  BEFORE UPDATE ON monthly_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: ai_learning
-- Purpose: Store user corrections to AI categorization for learning
-- ============================================================
CREATE TABLE ai_learning (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_keyword            TEXT NOT NULL,
  ai_suggested_category       TEXT,
  user_corrected_category     TEXT NOT NULL,
  user_corrected_subcategory  TEXT,
  is_need                     BOOLEAN,
  occurrence_count            INTEGER DEFAULT 1,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, merchant_keyword)
);

CREATE TRIGGER ai_learning_updated_at
  BEFORE UPDATE ON ai_learning
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: sms_templates
-- Purpose: Known bank SMS patterns for parsing
-- ============================================================
CREATE TABLE sms_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_name       TEXT NOT NULL,
  sms_pattern     TEXT NOT NULL,
  amount_group    INTEGER DEFAULT 1,
  merchant_group  INTEGER,
  type_indicator  TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: notifications
-- Purpose: In-app notification queue
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
                    'subscription_reminder',
                    'budget_warning',
                    'vault_low',
                    'anomaly_detected',
                    'monthly_summary_ready',
                    'vault_replenish_reminder',
                    'general'
                  )),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  action_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: app_settings
-- Purpose: Global app configuration per user
-- ============================================================
CREATE TABLE app_settings (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exchange_rate_usd_inr       REAL DEFAULT 84.0,
  exchange_rate_updated_at    TIMESTAMPTZ,
  theme                       TEXT DEFAULT 'parchment',
  tasker_webhook_secret       TEXT,
  ai_categorization_enabled   BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_transactions_profile_date ON transactions(profile_id, date DESC);
CREATE INDEX idx_transactions_month ON transactions(profile_id, month_year);
CREATE INDEX idx_transactions_category ON transactions(profile_id, category_id);
CREATE INDEX idx_income_profile_date ON income_entries(profile_id, date DESC);
CREATE INDEX idx_income_month ON income_entries(profile_id, month_year);
CREATE INDEX idx_vault_txn_vault ON vault_transactions(vault_id, date DESC);
CREATE INDEX idx_subscriptions_profile ON subscriptions(profile_id, is_active);
CREATE INDEX idx_notifications_profile ON notifications(profile_id, is_read, created_at DESC);
CREATE INDEX idx_ai_learning_merchant ON ai_learning(profile_id, merchant_keyword);
CREATE INDEX idx_categories_profile ON categories(profile_id);
CREATE INDEX idx_emergency_vault_profile ON emergency_vault(profile_id);
CREATE INDEX idx_monthly_summaries_profile ON monthly_summaries(profile_id, month_year);
CREATE INDEX idx_sms_templates_profile ON sms_templates(profile_id);
CREATE INDEX idx_app_settings_profile ON app_settings(profile_id);

-- ============================================================
-- ROW LEVEL SECURITY — Enable on ALL tables
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: profiles
-- Uses clerk_user_id directly from JWT
-- ============================================================
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (clerk_user_id = auth.jwt() ->> 'sub');

-- ============================================================
-- RLS POLICIES: categories
-- ============================================================
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "categories_insert" ON categories
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "categories_update" ON categories
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "categories_delete" ON categories
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- RLS POLICIES: income_entries
-- ============================================================
CREATE POLICY "income_entries_select" ON income_entries
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "income_entries_insert" ON income_entries
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "income_entries_update" ON income_entries
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "income_entries_delete" ON income_entries
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- RLS POLICIES: subscriptions
-- ============================================================
CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "subscriptions_insert" ON subscriptions
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "subscriptions_update" ON subscriptions
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "subscriptions_delete" ON subscriptions
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- RLS POLICIES: transactions
-- ============================================================
CREATE POLICY "transactions_select" ON transactions
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- RLS POLICIES: emergency_vault
-- ============================================================
CREATE POLICY "emergency_vault_select" ON emergency_vault
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "emergency_vault_insert" ON emergency_vault
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "emergency_vault_update" ON emergency_vault
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "emergency_vault_delete" ON emergency_vault
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- RLS POLICIES: vault_transactions
-- ============================================================
CREATE POLICY "vault_transactions_select" ON vault_transactions
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "vault_transactions_insert" ON vault_transactions
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "vault_transactions_update" ON vault_transactions
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "vault_transactions_delete" ON vault_transactions
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- RLS POLICIES: monthly_summaries
-- ============================================================
CREATE POLICY "monthly_summaries_select" ON monthly_summaries
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "monthly_summaries_insert" ON monthly_summaries
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "monthly_summaries_update" ON monthly_summaries
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "monthly_summaries_delete" ON monthly_summaries
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- RLS POLICIES: ai_learning
-- ============================================================
CREATE POLICY "ai_learning_select" ON ai_learning
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "ai_learning_insert" ON ai_learning
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "ai_learning_update" ON ai_learning
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "ai_learning_delete" ON ai_learning
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- RLS POLICIES: sms_templates
-- ============================================================
CREATE POLICY "sms_templates_select" ON sms_templates
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "sms_templates_insert" ON sms_templates
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "sms_templates_update" ON sms_templates
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "sms_templates_delete" ON sms_templates
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- RLS POLICIES: notifications
-- ============================================================
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- RLS POLICIES: app_settings
-- ============================================================
CREATE POLICY "app_settings_select" ON app_settings
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "app_settings_insert" ON app_settings
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "app_settings_update" ON app_settings
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "app_settings_delete" ON app_settings
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- FUNCTION: Calculate current month's available budget
-- Returns encrypted values; decryption happens client-side
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_monthly_budget(p_profile_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_month TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'month', v_month,
    'total_income', COALESCE(
      (SELECT json_agg(json_build_object('amount', amount_encrypted, 'type', type))
       FROM income_entries
       WHERE profile_id = p_profile_id
         AND month_year = v_month
         AND type IN ('allowance', 'festival_bonus')),
      '[]'::json
    ),
    'total_expenses', COALESCE(
      (SELECT json_agg(json_build_object('amount', amount_encrypted, 'category', category_name))
       FROM transactions
       WHERE profile_id = p_profile_id
         AND month_year = v_month
         AND is_pass_through = FALSE),
      '[]'::json
    ),
    'days_remaining', (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE)::INTEGER,
    'days_elapsed', (CURRENT_DATE - DATE_TRUNC('month', CURRENT_DATE)::DATE)::INTEGER + 1
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Get subscription reminders (due within X days)
-- ============================================================
CREATE OR REPLACE FUNCTION get_upcoming_subscriptions(p_profile_id UUID, p_days INTEGER DEFAULT 3)
RETURNS SETOF subscriptions AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM subscriptions
    WHERE profile_id = p_profile_id
      AND is_active = TRUE
      AND next_billing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Seed default categories for a new user
-- Called during onboarding after profile creation
-- ============================================================
CREATE OR REPLACE FUNCTION seed_default_categories(p_profile_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (profile_id, name, icon, color, is_default, sort_order) VALUES
    (p_profile_id, 'Food & Dining',    'UtensilsCrossed', '#A37B6F', true, 1),
    (p_profile_id, 'Transport',        'Car',             '#8B7355', true, 2),
    (p_profile_id, 'Entertainment',    'Gamepad2',        '#7B6B8A', true, 3),
    (p_profile_id, 'Shopping',         'ShoppingBag',     '#6B8A7B', true, 4),
    (p_profile_id, 'Subscriptions',    'RefreshCw',       '#8A7B6B', true, 5),
    (p_profile_id, 'Education',        'GraduationCap',   '#6B707C', true, 6),
    (p_profile_id, 'Health',           'Heart',           '#B85C5C', true, 7),
    (p_profile_id, 'Utilities',        'Zap',             '#C4935A', true, 8),
    (p_profile_id, 'Personal',         'User',            '#6B7D71', true, 9),
    (p_profile_id, 'Other',            'MoreHorizontal',  '#9599A3', true, 10);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: Auto-update monthly_summaries when transaction added
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_update_monthly_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark the monthly summary as stale (to be recomputed by the app)
  UPDATE monthly_summaries
  SET updated_at = NOW()
  WHERE profile_id = NEW.profile_id
    AND month_year = NEW.month_year;

  -- If no summary exists, create a placeholder
  INSERT INTO monthly_summaries (profile_id, month_year)
  VALUES (NEW.profile_id, NEW.month_year)
  ON CONFLICT (profile_id, month_year) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_transaction_insert
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION trigger_update_monthly_summary();

CREATE TRIGGER on_income_insert
  AFTER INSERT OR UPDATE ON income_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_update_monthly_summary();
