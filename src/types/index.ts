// ============================================================
// KHARCHA — Centralized Type Definitions
// All types matching the database schema + business logic
// ============================================================

// ============================================================
// UNION TYPES
// ============================================================

export type IncomeType =
  | 'allowance'
  | 'emergency_fund'
  | 'festival_bonus'
  | 'pass_through'
  | 'vault_replenish'
  | 'other';

export type VaultTransactionType = 'deposit' | 'withdrawal';

export type BillingCycle = 'monthly' | 'yearly';

export type NotificationType =
  | 'subscription_reminder'
  | 'budget_warning'
  | 'vault_low'
  | 'anomaly_detected'
  | 'monthly_summary_ready'
  | 'vault_replenish_reminder'
  | 'general';

export type TransactionSource = 'manual' | 'sms_parsed' | 'tasker';

export type BurnStatus = 'safe' | 'caution' | 'danger';

export type AnomalyType =
  | 'single_transaction'
  | 'daily_total'
  | 'velocity'
  | 'category_shift';

export type AnomalySeverity = 'flag' | 'warn' | 'note';

export type SMSTransactionType = 'debit' | 'credit';

export type Currency = 'INR' | 'USD';

// ============================================================
// TABLE: profiles
// ============================================================

export interface Profile {
  id: string;
  clerk_user_id: string;
  display_name: string;
  currency: Currency;
  pin_hash: string | null;
  encryption_salt: string | null;
  pin_enabled: boolean;
  biometric_enabled: boolean;
  monthly_budget_alert_pct: number;
  daily_limit_enabled: boolean;
  notification_enabled: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileCreate {
  clerk_user_id: string;
  display_name?: string;
  currency?: Currency;
  pin_hash?: string | null;
  encryption_salt?: string | null;
  pin_enabled?: boolean;
  biometric_enabled?: boolean;
  monthly_budget_alert_pct?: number;
  daily_limit_enabled?: boolean;
  notification_enabled?: boolean;
  onboarding_completed?: boolean;
}

// No encrypted fields — Profile doesn't have a "Decrypted" variant

// ============================================================
// TABLE: categories
// ============================================================

export interface Category {
  id: string;
  profile_id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface CategoryCreate {
  profile_id: string;
  name: string;
  icon: string;
  color: string;
  is_default?: boolean;
  sort_order?: number;
}

// No encrypted fields

// ============================================================
// TABLE: income_entries
// ============================================================

export interface IncomeEntry {
  id: string;
  profile_id: string;
  amount_encrypted: string;
  amount_hash: string;
  currency: Currency;
  type: IncomeType;
  description: string | null;
  pass_through_for: string | null;
  linked_expense_id: string | null;
  source: TransactionSource;
  raw_sms: string | null;
  date: string;
  month_year: string; // generated
  created_at: string;
  updated_at: string;
}

export interface IncomeEntryCreate {
  profile_id: string;
  amount_encrypted: string;
  amount_hash: string;
  currency?: Currency;
  type: IncomeType;
  description?: string | null;
  pass_through_for?: string | null;
  linked_expense_id?: string | null;
  source?: TransactionSource;
  raw_sms?: string | null;
  date?: string;
}

export interface IncomeEntryDecrypted extends Omit<IncomeEntry, 'amount_encrypted' | 'amount_hash'> {
  amount: number;
}

// ============================================================
// TABLE: transactions (expenses)
// ============================================================

export interface Transaction {
  id: string;
  profile_id: string;
  amount_encrypted: string;
  amount_hash: string;
  currency: Currency;
  category_id: string | null;
  category_name: string | null;
  subcategory: string | null;
  description: string;
  merchant: string | null;
  is_pass_through: boolean;
  linked_income_id: string | null;
  is_subscription: boolean;
  subscription_id: string | null;
  is_need: boolean;
  source: TransactionSource;
  raw_sms: string | null;
  ai_categorized: boolean;
  ai_confidence: number | null;
  date: string;
  time: string | null;
  month_year: string; // generated
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  profile_id: string;
  amount_encrypted: string;
  amount_hash: string;
  currency?: Currency;
  category_id?: string | null;
  category_name?: string | null;
  subcategory?: string | null;
  description: string;
  merchant?: string | null;
  is_pass_through?: boolean;
  linked_income_id?: string | null;
  is_subscription?: boolean;
  subscription_id?: string | null;
  is_need?: boolean;
  source?: TransactionSource;
  raw_sms?: string | null;
  ai_categorized?: boolean;
  ai_confidence?: number | null;
  date?: string;
  time?: string | null;
}

export interface TransactionDecrypted extends Omit<Transaction, 'amount_encrypted' | 'amount_hash'> {
  amount: number;
}

// ============================================================
// TABLE: emergency_vault
// ============================================================

export interface EmergencyVault {
  id: string;
  profile_id: string;
  current_balance_encrypted: string;
  target_amount_encrypted: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyVaultCreate {
  profile_id: string;
  current_balance_encrypted?: string;
  target_amount_encrypted?: string | null;
}

export interface EmergencyVaultDecrypted extends Omit<EmergencyVault, 'current_balance_encrypted' | 'target_amount_encrypted'> {
  current_balance: number;
  target_amount: number | null;
}

// ============================================================
// TABLE: vault_transactions
// ============================================================

export interface VaultTransaction {
  id: string;
  profile_id: string;
  vault_id: string;
  type: VaultTransactionType;
  amount_encrypted: string;
  amount_hash: string;
  reason: string | null;
  balance_after_encrypted: string;
  linked_income_id: string | null;
  date: string;
  created_at: string;
}

export interface VaultTransactionCreate {
  profile_id: string;
  vault_id: string;
  type: VaultTransactionType;
  amount_encrypted: string;
  amount_hash: string;
  reason?: string | null;
  balance_after_encrypted: string;
  linked_income_id?: string | null;
  date?: string;
}

export interface VaultTransactionDecrypted extends Omit<VaultTransaction, 'amount_encrypted' | 'amount_hash' | 'balance_after_encrypted'> {
  amount: number;
  balance_after: number;
}

// ============================================================
// TABLE: subscriptions
// ============================================================

export interface Subscription {
  id: string;
  profile_id: string;
  name: string;
  amount_encrypted: string;
  currency: Currency;
  amount_inr_encrypted: string | null;
  billing_day: number | null;
  billing_cycle: BillingCycle;
  category_id: string | null;
  is_active: boolean;
  next_billing_date: string | null;
  last_paid_date: string | null;
  auto_match_keywords: string[] | null;
  remind_days_before: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionCreate {
  profile_id: string;
  name: string;
  amount_encrypted: string;
  currency?: Currency;
  amount_inr_encrypted?: string | null;
  billing_day?: number | null;
  billing_cycle?: BillingCycle;
  category_id?: string | null;
  is_active?: boolean;
  next_billing_date?: string | null;
  last_paid_date?: string | null;
  auto_match_keywords?: string[] | null;
  remind_days_before?: number;
  notes?: string | null;
}

export interface SubscriptionDecrypted extends Omit<Subscription, 'amount_encrypted' | 'amount_inr_encrypted'> {
  amount: number;
  amount_inr: number | null;
}

// ============================================================
// TABLE: monthly_summaries
// ============================================================

export interface MonthlySummary {
  id: string;
  profile_id: string;
  month_year: string;
  total_allowance_encrypted: string | null;
  total_bonus_encrypted: string | null;
  total_expenses_encrypted: string | null;
  total_subscriptions_encrypted: string | null;
  total_pass_through_encrypted: string | null;
  vault_deposits_encrypted: string | null;
  vault_withdrawals_encrypted: string | null;
  daily_average_encrypted: string | null;
  category_breakdown: Record<string, string> | null; // { "Food": encrypted_amount }
  needs_vs_wants: { needs: string; wants: string } | null; // encrypted values
  burn_rate_data: unknown[] | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlySummaryCreate {
  profile_id: string;
  month_year: string;
  total_allowance_encrypted?: string | null;
  total_bonus_encrypted?: string | null;
  total_expenses_encrypted?: string | null;
  total_subscriptions_encrypted?: string | null;
  total_pass_through_encrypted?: string | null;
  vault_deposits_encrypted?: string | null;
  vault_withdrawals_encrypted?: string | null;
  daily_average_encrypted?: string | null;
  category_breakdown?: Record<string, string> | null;
  needs_vs_wants?: { needs: string; wants: string } | null;
  burn_rate_data?: unknown[] | null;
  ai_summary?: string | null;
}

export interface MonthlySummaryDecrypted extends Omit<
  MonthlySummary,
  | 'total_allowance_encrypted'
  | 'total_bonus_encrypted'
  | 'total_expenses_encrypted'
  | 'total_subscriptions_encrypted'
  | 'total_pass_through_encrypted'
  | 'vault_deposits_encrypted'
  | 'vault_withdrawals_encrypted'
  | 'daily_average_encrypted'
  | 'category_breakdown'
  | 'needs_vs_wants'
> {
  total_allowance: number | null;
  total_bonus: number | null;
  total_expenses: number | null;
  total_subscriptions: number | null;
  total_pass_through: number | null;
  vault_deposits: number | null;
  vault_withdrawals: number | null;
  daily_average: number | null;
  category_breakdown: Record<string, number> | null;
  needs_vs_wants: { needs: number; wants: number } | null;
}

// ============================================================
// TABLE: ai_learning
// ============================================================

export interface AiLearning {
  id: string;
  profile_id: string;
  merchant_keyword: string;
  ai_suggested_category: string | null;
  user_corrected_category: string;
  user_corrected_subcategory: string | null;
  is_need: boolean | null;
  occurrence_count: number;
  created_at: string;
  updated_at: string;
}

export interface AiLearningCreate {
  profile_id: string;
  merchant_keyword: string;
  ai_suggested_category?: string | null;
  user_corrected_category: string;
  user_corrected_subcategory?: string | null;
  is_need?: boolean | null;
  occurrence_count?: number;
}

// No encrypted fields

// ============================================================
// TABLE: sms_templates
// ============================================================

export interface SmsTemplate {
  id: string;
  profile_id: string;
  bank_name: string;
  sms_pattern: string;
  amount_group: number;
  merchant_group: number | null;
  type_indicator: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SmsTemplateCreate {
  profile_id: string;
  bank_name: string;
  sms_pattern: string;
  amount_group?: number;
  merchant_group?: number | null;
  type_indicator?: string | null;
  is_active?: boolean;
}

// No encrypted fields

// ============================================================
// TABLE: notifications
// ============================================================

export interface Notification {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface NotificationCreate {
  profile_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read?: boolean;
  action_url?: string | null;
}

// No encrypted fields

// ============================================================
// TABLE: app_settings
// ============================================================

export interface AppSettings {
  id: string;
  profile_id: string;
  exchange_rate_usd_inr: number;
  exchange_rate_updated_at: string | null;
  theme: string;
  tasker_webhook_secret: string | null;
  ai_categorization_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSettingsCreate {
  profile_id: string;
  exchange_rate_usd_inr?: number;
  exchange_rate_updated_at?: string | null;
  theme?: string;
  tasker_webhook_secret?: string | null;
  ai_categorization_enabled?: boolean;
}

// No encrypted fields

// ============================================================
// BUSINESS LOGIC: Budget (Section 7.1)
// ============================================================

export interface BudgetState {
  totalAllowance: number;
  totalBonus: number;
  totalExpenses: number;
  expectedSubscriptions: number;
  dayOfMonth: number;
  daysInMonth: number;
  isWeekend: boolean;
}

export interface BudgetResult {
  availableBudget: number;
  dailyLimit: number;
  burnRate: number;
  burnStatus: BurnStatus;
  projectedMonthEnd: number;
  daysUntilBroke: number | null;
  weeklyBudget: number;
}

// ============================================================
// BUSINESS LOGIC: Subscription Matching (Section 7.2)
// ============================================================

export interface SubscriptionMatchResult {
  subscription_id: string;
  subscription_name: string;
  confidence: number;
  auto_match: boolean;
}

// ============================================================
// BUSINESS LOGIC: Anomaly Detection (Section 7.3)
// ============================================================

export interface AnomalyResult {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  details: Record<string, unknown>;
}

// ============================================================
// SMS Parsing (Section 12)
// ============================================================

export interface ParsedSMS {
  amount: number;
  type: SMSTransactionType;
  merchant: string | null;
  account_last4: string | null;
  date: string | null;
  reference: string | null;
  bank: string | null;
  raw: string;
  confidence: number;
}

// ============================================================
// UTILITY TYPES
// ============================================================

/** Return type from the calculate_monthly_budget SQL function */
export interface MonthlyBudgetQueryResult {
  month: string;
  total_income: Array<{ amount: string; type: IncomeType }>;
  total_expenses: Array<{ amount: string; category: string | null }>;
  days_remaining: number;
  days_elapsed: number;
}

/** Encryption key bundle held in memory */
export interface DerivedKeyBundle {
  key: CryptoKey;
  salt: Uint8Array;
}
