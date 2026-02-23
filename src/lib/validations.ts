// ============================================================
// KHARCHA — Centralized Zod Validation Schemas
// Every server action and API route validates through these.
// See: MASTER_PROJECT_DOCUMENT.md Section 6.6
// ============================================================

import { z } from 'zod';

// ============================================================
// SHARED FIELD SCHEMAS
// ============================================================

/**
 * Validates a plaintext amount string before encryption.
 * Used client-side to validate user input before encrypting.
 *
 * Rules:
 *   - 1–10 digits, optionally followed by 1–2 decimal places
 *   - Must be positive (> 0)
 *   - Max: 9,999,999.99 (fits Indian college-student scale)
 */
export const amountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Invalid amount format')
  .refine((val) => parseFloat(val) > 0, 'Amount must be positive')
  .refine((val) => parseFloat(val) <= 9999999.99, 'Amount too large');

export type AmountInput = z.infer<typeof amountSchema>;

/** Base64-encoded encrypted blob from encryptAmount() */
const encryptedField = z.string().trim().min(1, 'Encrypted value required').max(1000);

/** Hex-encoded SHA-256 hash from hashAmount() — always 64 hex chars */
const hashField = z.string().regex(/^[a-f0-9]{64}$/, 'Invalid hash format');

/** ISO date string: YYYY-MM-DD */
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

/** Time string: HH:MM (24-hour) */
const timeField = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM');

/** UUID v4 */
const uuidField = z.string().uuid();

/** Currency enum */
const currencyField = z.enum(['INR', 'USD']);

// ============================================================
// 1. PIN SCHEMA
// ============================================================

/**
 * PIN: 4–6 numeric digits.
 * Used for setup, verification, and change flows.
 */
export const pinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
}).strict();

export type PinInput = z.infer<typeof pinSchema>;

// ============================================================
// 2. CREATE TRANSACTION (expense)
// ============================================================

/**
 * Creates a new expense transaction.
 * `amount_encrypted` and `amount_hash` are produced client-side
 * via encryptAndHash() before calling the server action.
 */
export const createTransactionSchema = z.object({
  amount_encrypted: encryptedField,
  amount_hash: hashField,
  currency: currencyField.default('INR'),
  category_id: uuidField.optional(),
  description: z.string().trim().min(1, 'Description required').max(200),
  merchant: z.string().trim().max(100).optional(),
  is_pass_through: z.boolean().default(false),
  linked_income_id: uuidField.optional(),
  is_need: z.boolean().default(true),
  date: dateField.optional(),
  time: timeField.optional(),
}).strict();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// ============================================================
// 3. UPDATE TRANSACTION
// ============================================================

/**
 * Partial update of an existing transaction.
 * `id` is always required; all other fields are optional.
 */
export const updateTransactionSchema = z.object({
  id: uuidField,
  amount_encrypted: encryptedField.optional(),
  amount_hash: hashField.optional(),
  currency: currencyField.optional(),
  category_id: uuidField.nullable().optional(),
  description: z.string().trim().min(1).max(200).optional(),
  merchant: z.string().trim().max(100).nullable().optional(),
  is_pass_through: z.boolean().optional(),
  linked_income_id: uuidField.nullable().optional(),
  is_need: z.boolean().optional(),
  date: dateField.optional(),
  time: timeField.nullable().optional(),
}).strict();

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

// ============================================================
// 4. CREATE INCOME
// ============================================================

/**
 * Creates a new income entry (allowance, bonus, pass-through, etc.).
 */
export const createIncomeSchema = z.object({
  amount_encrypted: encryptedField,
  amount_hash: hashField,
  currency: currencyField.default('INR'),
  type: z.enum([
    'allowance',
    'emergency_fund',
    'festival_bonus',
    'pass_through',
    'vault_replenish',
    'other',
  ]),
  description: z.string().trim().max(200).optional(),
  pass_through_for: z.string().trim().max(200).optional(),
  date: dateField.optional(),
}).strict();

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;

// ============================================================
// 5. CREATE SUBSCRIPTION
// ============================================================

/**
 * Creates a tracked subscription (Netflix, Spotify, etc.).
 * Amount is encrypted; billing_day is the day-of-month for matching.
 */
export const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1, 'Name required').max(100),
  amount_encrypted: encryptedField,
  currency: currencyField,
  billing_day: z.number().int().min(1).max(31),
  billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
  category_id: uuidField.optional(),
  auto_match_keywords: z
    .array(z.string().trim().max(50))
    .max(10)
    .optional(),
  remind_days_before: z.number().int().min(0).max(14).default(3),
}).strict();

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

/**
 * Partial update of an existing subscription.
 * All fields optional — only provided fields are written.
 * `id` is passed separately to the server action.
 */
export const updateSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  amount_encrypted: encryptedField.optional(),
  amount_inr_encrypted: encryptedField.nullable().optional(),
  currency: z.enum(['INR', 'USD']).optional(),
  billing_day: z.number().int().min(1).max(31).nullable().optional(),
  billing_cycle: z.enum(['monthly', 'yearly']).optional(),
  category_id: uuidField.nullable().optional(),
  is_active: z.boolean().optional(),
  next_billing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').nullable().optional(),
  last_paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').nullable().optional(),
  auto_match_keywords: z.array(z.string().trim().max(50)).max(10).nullable().optional(),
  remind_days_before: z.number().int().min(0).max(14).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
}).strict();

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

// ============================================================
// 6. SMS PASTE
// ============================================================

/**
 * Raw SMS text pasted by user for parsing.
 * Min 10 chars (shortest plausible bank SMS).
 * Max 500 chars (longest observed Indian bank SMS).
 */
export const smsPasteSchema = z.object({
  sms_text: z.string().trim().min(10, 'SMS too short').max(500, 'SMS too long'),
}).strict();

export type SmsPasteInput = z.infer<typeof smsPasteSchema>;

// ============================================================
// 7. VAULT TRANSACTION
// ============================================================

/**
 * Deposit or withdrawal from the emergency vault.
 */
export const vaultTransactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']),
  amount_encrypted: encryptedField,
  amount_hash: hashField,
  reason: z.string().trim().min(1, 'Reason required').max(200),
}).strict();

export type VaultTransactionInput = z.infer<typeof vaultTransactionSchema>;

// ============================================================
// 8. PROFILE UPDATE
// ============================================================

/**
 * Partial profile settings update.
 * Only the fields the user can change from the settings page.
 */
export const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(1).max(50).optional(),
  monthly_budget_alert_pct: z.number().int().min(50).max(100).optional(),
  daily_limit_enabled: z.boolean().optional(),
  notification_enabled: z.boolean().optional(),
}).strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ============================================================
// 9. CATEGORY
// ============================================================

/**
 * Create or update a custom expense category.
 * Icon: Lucide icon name (e.g. "UtensilsCrossed").
 * Color: hex color for the category badge.
 */
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name required').max(50),
  icon: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex code like #A37B6F'),
}).strict();

export type CategoryInput = z.infer<typeof categorySchema>;
