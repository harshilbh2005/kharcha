// ============================================================
// KHARCHA — AI Categorization (3-Tier System)
// Section 11.1 of KHARCHA_MASTER_PROJECT_DOCUMENT.md
//
// Tier 1: ai_learning table lookup  — free, instant, user-specific
// Tier 2: KEYWORD_RULES static map  — free, instant
// Tier 3: Claude Sonnet 4.5 API    — ~$0.001/call, cached after
//
// Expected API calls: ~10-20/month after initial learning phase.
// After first encounter, every merchant is cached → Tier 1.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import type { CategorizationResult } from '@/types';

// ── Prompt ────────────────────────────────────────────────────────────────────

const CATEGORIZE_PROMPT = `You are a transaction categorizer for a personal expense tracker in India.

Given a transaction description, categorize it.

CATEGORIES (use exact names):
- Food & Dining (subcategories: Restaurant, Delivery, Groceries, Cafe, Street Food)
- Transport (subcategories: Uber/Ola, Auto, Fuel, Metro, Bus, Parking)
- Entertainment (subcategories: Movies, Games, Streaming, Events, Outings)
- Shopping (subcategories: Clothes, Electronics, Amazon, Flipkart, General)
- Subscriptions (subcategories: Streaming, SaaS, Membership, Cloud)
- Education (subcategories: Books, Courses, Stationery, Fees)
- Health (subcategories: Medicine, Doctor, Gym, Supplements)
- Utilities (subcategories: Mobile Recharge, Internet, Electricity)
- Personal (subcategories: Grooming, Gifts, Charity)
- Other (subcategories: Miscellaneous)

Respond ONLY with JSON, no markdown, no explanation:
{
  "category": "exact category name",
  "subcategory": "subcategory or null",
  "is_need": true/false,
  "confidence": 0.0-1.0
}

Transaction: "{description}" Amount: {amount} {currency}`;

// ── Keyword Rules (Tier 2) ────────────────────────────────────────────────────

interface KeywordRule {
  category: string;
  subcategory: string;
  is_need: boolean;
}

// Sorted from longest → shortest at match time to prefer specific matches.
// Keys are lowercase; matched via case-insensitive substring search.
export const KEYWORD_RULES: Record<string, KeywordRule> = {
  // ── Food & Dining — Delivery ─────────────────────────────────────────────
  'zomato':            { category: 'Food & Dining', subcategory: 'Delivery',   is_need: false },
  'swiggy':            { category: 'Food & Dining', subcategory: 'Delivery',   is_need: false },
  'uber eats':         { category: 'Food & Dining', subcategory: 'Delivery',   is_need: false },
  'dunzo':             { category: 'Food & Dining', subcategory: 'Delivery',   is_need: false },
  'magicpin':          { category: 'Food & Dining', subcategory: 'Delivery',   is_need: false },
  'eatsure':           { category: 'Food & Dining', subcategory: 'Delivery',   is_need: false },

  // ── Food & Dining — Restaurant chains ────────────────────────────────────
  'mcdonalds':         { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  "mcdonald's":        { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'dominos':           { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  "domino's":          { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'pizza hut':         { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'kfc':               { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'burger king':       { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'subway':            { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'haldirams':         { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  "haldiram's":        { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'barbeque nation':   { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'barbeque':          { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'biryani blues':     { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'biryani by kilo':   { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'paradise biryani':  { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'wow momo':          { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'chaayos':           { category: 'Food & Dining', subcategory: 'Cafe',       is_need: false },
  'chai point':        { category: 'Food & Dining', subcategory: 'Cafe',       is_need: false },
  'faasos':            { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'box8':              { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },

  // ── Food & Dining — Cafe ─────────────────────────────────────────────────
  'starbucks':         { category: 'Food & Dining', subcategory: 'Cafe',       is_need: false },
  'cafe coffee day':   { category: 'Food & Dining', subcategory: 'Cafe',       is_need: false },
  'ccd':               { category: 'Food & Dining', subcategory: 'Cafe',       is_need: false },
  'barista':           { category: 'Food & Dining', subcategory: 'Cafe',       is_need: false },
  'third wave':        { category: 'Food & Dining', subcategory: 'Cafe',       is_need: false },
  'blue tokai':        { category: 'Food & Dining', subcategory: 'Cafe',       is_need: false },

  // ── Food & Dining — Groceries ────────────────────────────────────────────
  'bigbasket':         { category: 'Food & Dining', subcategory: 'Groceries',  is_need: true  },
  'blinkit':           { category: 'Food & Dining', subcategory: 'Groceries',  is_need: true  },
  'zepto':             { category: 'Food & Dining', subcategory: 'Groceries',  is_need: true  },
  'dmart':             { category: 'Food & Dining', subcategory: 'Groceries',  is_need: true  },
  'reliance fresh':    { category: 'Food & Dining', subcategory: 'Groceries',  is_need: true  },
  'more supermarket':  { category: 'Food & Dining', subcategory: 'Groceries',  is_need: true  },
  'grofers':           { category: 'Food & Dining', subcategory: 'Groceries',  is_need: true  },
  'instamart':         { category: 'Food & Dining', subcategory: 'Groceries',  is_need: true  },
  'swiggy instamart':  { category: 'Food & Dining', subcategory: 'Groceries',  is_need: true  },
  'smart bazaar':      { category: 'Food & Dining', subcategory: 'Groceries',  is_need: true  },

  // ── Transport ────────────────────────────────────────────────────────────
  'uber':              { category: 'Transport', subcategory: 'Uber/Ola',       is_need: true  },
  'ola cabs':          { category: 'Transport', subcategory: 'Uber/Ola',       is_need: true  },
  'rapido':            { category: 'Transport', subcategory: 'Auto',           is_need: true  },
  'metro card':        { category: 'Transport', subcategory: 'Metro',          is_need: true  },
  'bmtc':              { category: 'Transport', subcategory: 'Bus',            is_need: true  },
  'redbus':            { category: 'Transport', subcategory: 'Bus',            is_need: true  },
  'petrol':            { category: 'Transport', subcategory: 'Fuel',           is_need: true  },
  'diesel':            { category: 'Transport', subcategory: 'Fuel',           is_need: true  },
  'hp petrol':         { category: 'Transport', subcategory: 'Fuel',           is_need: true  },
  'hp pump':           { category: 'Transport', subcategory: 'Fuel',           is_need: true  },
  'indian oil':        { category: 'Transport', subcategory: 'Fuel',           is_need: true  },
  'bharat petroleum':  { category: 'Transport', subcategory: 'Fuel',           is_need: true  },
  'irctc':             { category: 'Transport', subcategory: 'Bus',            is_need: true  },
  'indigo':            { category: 'Transport', subcategory: 'Bus',            is_need: false },
  'spicejet':          { category: 'Transport', subcategory: 'Bus',            is_need: false },
  'air india':         { category: 'Transport', subcategory: 'Bus',            is_need: false },
  'ixigo':             { category: 'Transport', subcategory: 'Bus',            is_need: false },
  'makemytrip':        { category: 'Transport', subcategory: 'Bus',            is_need: false },
  'goibibo':           { category: 'Transport', subcategory: 'Bus',            is_need: false },
  'namma metro':       { category: 'Transport', subcategory: 'Metro',          is_need: true  },
  'delhi metro':       { category: 'Transport', subcategory: 'Metro',          is_need: true  },
  'mumbai metro':      { category: 'Transport', subcategory: 'Metro',          is_need: true  },
  'parking':           { category: 'Transport', subcategory: 'Parking',        is_need: true  },

  // ── Shopping ─────────────────────────────────────────────────────────────
  'amazon':            { category: 'Shopping', subcategory: 'Amazon',          is_need: false },
  'flipkart':          { category: 'Shopping', subcategory: 'Flipkart',        is_need: false },
  'myntra':            { category: 'Shopping', subcategory: 'Clothes',         is_need: false },
  'ajio':              { category: 'Shopping', subcategory: 'Clothes',         is_need: false },
  'nykaa':             { category: 'Shopping', subcategory: 'General',         is_need: false },
  'meesho':            { category: 'Shopping', subcategory: 'General',         is_need: false },
  'snapdeal':          { category: 'Shopping', subcategory: 'General',         is_need: false },
  'shopclues':         { category: 'Shopping', subcategory: 'General',         is_need: false },
  'croma':             { category: 'Shopping', subcategory: 'Electronics',     is_need: false },
  'reliance digital':  { category: 'Shopping', subcategory: 'Electronics',     is_need: false },
  'vijay sales':       { category: 'Shopping', subcategory: 'Electronics',     is_need: false },
  'decathlon':         { category: 'Shopping', subcategory: 'General',         is_need: false },
  'h&m':               { category: 'Shopping', subcategory: 'Clothes',         is_need: false },
  'zara':              { category: 'Shopping', subcategory: 'Clothes',         is_need: false },
  'westside':          { category: 'Shopping', subcategory: 'Clothes',         is_need: false },
  'pantaloons':        { category: 'Shopping', subcategory: 'Clothes',         is_need: false },
  'max fashion':       { category: 'Shopping', subcategory: 'Clothes',         is_need: false },

  // ── Subscriptions — Streaming ────────────────────────────────────────────
  'netflix':           { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'spotify':           { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'youtube premium':   { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'youtube':           { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'hotstar':           { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'disney+ hotstar':   { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'disney hotstar':    { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'amazon prime':      { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'prime video':       { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'apple music':       { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'apple tv':          { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'jiosaavn':          { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'jio saavn':         { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'gaana':             { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'zee5':              { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'sonyliv':           { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'mxplayer':          { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'voot':              { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },
  'aha':               { category: 'Subscriptions', subcategory: 'Streaming',  is_need: false },

  // ── Subscriptions — SaaS / Cloud ─────────────────────────────────────────
  'github':            { category: 'Subscriptions', subcategory: 'SaaS',       is_need: true  },
  'github copilot':    { category: 'Subscriptions', subcategory: 'SaaS',       is_need: true  },
  'chatgpt':           { category: 'Subscriptions', subcategory: 'SaaS',       is_need: false },
  'openai':            { category: 'Subscriptions', subcategory: 'SaaS',       is_need: false },
  'notion':            { category: 'Subscriptions', subcategory: 'SaaS',       is_need: true  },
  'figma':             { category: 'Subscriptions', subcategory: 'SaaS',       is_need: true  },
  'vercel':            { category: 'Subscriptions', subcategory: 'Cloud',      is_need: true  },
  'aws':               { category: 'Subscriptions', subcategory: 'Cloud',      is_need: false },
  'google one':        { category: 'Subscriptions', subcategory: 'Cloud',      is_need: false },
  'icloud':            { category: 'Subscriptions', subcategory: 'Cloud',      is_need: false },
  'dropbox':           { category: 'Subscriptions', subcategory: 'Cloud',      is_need: false },
  'adobe':             { category: 'Subscriptions', subcategory: 'SaaS',       is_need: false },
  'canva':             { category: 'Subscriptions', subcategory: 'SaaS',       is_need: false },
  'grammarly':         { category: 'Subscriptions', subcategory: 'SaaS',       is_need: false },
  'claude':            { category: 'Subscriptions', subcategory: 'SaaS',       is_need: false },
  'anthropic':         { category: 'Subscriptions', subcategory: 'SaaS',       is_need: false },
  'zoom':              { category: 'Subscriptions', subcategory: 'SaaS',       is_need: true  },
  'slack':             { category: 'Subscriptions', subcategory: 'SaaS',       is_need: true  },

  // ── Utilities ────────────────────────────────────────────────────────────
  'jio recharge':      { category: 'Utilities', subcategory: 'Mobile Recharge', is_need: true },
  'airtel recharge':   { category: 'Utilities', subcategory: 'Mobile Recharge', is_need: true },
  'vi recharge':       { category: 'Utilities', subcategory: 'Mobile Recharge', is_need: true },
  'bsnl recharge':     { category: 'Utilities', subcategory: 'Mobile Recharge', is_need: true },
  'mobile recharge':   { category: 'Utilities', subcategory: 'Mobile Recharge', is_need: true },
  'phone recharge':    { category: 'Utilities', subcategory: 'Mobile Recharge', is_need: true },
  'recharge':          { category: 'Utilities', subcategory: 'Mobile Recharge', is_need: true },
  'electricity bill':  { category: 'Utilities', subcategory: 'Electricity',    is_need: true  },
  'bescom':            { category: 'Utilities', subcategory: 'Electricity',    is_need: true  },
  'msedcl':            { category: 'Utilities', subcategory: 'Electricity',    is_need: true  },
  'tata power':        { category: 'Utilities', subcategory: 'Electricity',    is_need: true  },
  'bses':              { category: 'Utilities', subcategory: 'Electricity',    is_need: true  },
  'broadband':         { category: 'Utilities', subcategory: 'Internet',       is_need: true  },
  'wifi bill':         { category: 'Utilities', subcategory: 'Internet',       is_need: true  },
  'act fibernet':      { category: 'Utilities', subcategory: 'Internet',       is_need: true  },
  'hathway':           { category: 'Utilities', subcategory: 'Internet',       is_need: true  },
  'jio fiber':         { category: 'Utilities', subcategory: 'Internet',       is_need: true  },
  'airtel fiber':      { category: 'Utilities', subcategory: 'Internet',       is_need: true  },
  'tata sky':          { category: 'Utilities', subcategory: 'Internet',       is_need: true  },
  'dish tv':           { category: 'Utilities', subcategory: 'Internet',       is_need: false },

  // ── Education ────────────────────────────────────────────────────────────
  'udemy':             { category: 'Education', subcategory: 'Courses',        is_need: true  },
  'coursera':          { category: 'Education', subcategory: 'Courses',        is_need: true  },
  'edx':               { category: 'Education', subcategory: 'Courses',        is_need: true  },
  'byju':              { category: 'Education', subcategory: 'Courses',        is_need: true  },
  "byjus":             { category: 'Education', subcategory: 'Courses',        is_need: true  },
  'unacademy':         { category: 'Education', subcategory: 'Courses',        is_need: true  },
  'vedantu':           { category: 'Education', subcategory: 'Courses',        is_need: true  },
  'whitehat jr':       { category: 'Education', subcategory: 'Courses',        is_need: true  },
  'scaler':            { category: 'Education', subcategory: 'Courses',        is_need: true  },
  'coding ninjas':     { category: 'Education', subcategory: 'Courses',        is_need: true  },
  'leetcode':          { category: 'Education', subcategory: 'Courses',        is_need: true  },
  'skillshare':        { category: 'Education', subcategory: 'Courses',        is_need: true  },

  // ── Health ───────────────────────────────────────────────────────────────
  'apollo pharmacy':   { category: 'Health', subcategory: 'Medicine',          is_need: true  },
  'medplus':           { category: 'Health', subcategory: 'Medicine',          is_need: true  },
  'netmeds':           { category: 'Health', subcategory: 'Medicine',          is_need: true  },
  '1mg':               { category: 'Health', subcategory: 'Medicine',          is_need: true  },
  'pharmeasy':         { category: 'Health', subcategory: 'Medicine',          is_need: true  },
  'wellness forever':  { category: 'Health', subcategory: 'Medicine',          is_need: true  },
  'cult.fit':          { category: 'Health', subcategory: 'Gym',               is_need: false },
  'cult fit':          { category: 'Health', subcategory: 'Gym',               is_need: false },
  'crossfit':          { category: 'Health', subcategory: 'Gym',               is_need: false },
  'fitness first':     { category: 'Health', subcategory: 'Gym',               is_need: false },
  'gold gym':          { category: 'Health', subcategory: 'Gym',               is_need: false },

  // ── Personal ─────────────────────────────────────────────────────────────
  'salon':             { category: 'Personal', subcategory: 'Grooming',        is_need: false },
  'haircut':           { category: 'Personal', subcategory: 'Grooming',        is_need: false },
  'barbershop':        { category: 'Personal', subcategory: 'Grooming',        is_need: false },
  'waxing':            { category: 'Personal', subcategory: 'Grooming',        is_need: false },
  'laundry':           { category: 'Personal', subcategory: 'Grooming',        is_need: true  },
  'dry clean':         { category: 'Personal', subcategory: 'Grooming',        is_need: true  },

  // ── Entertainment ────────────────────────────────────────────────────────
  'bookmyshow':        { category: 'Entertainment', subcategory: 'Movies',     is_need: false },
  'pvr cinemas':       { category: 'Entertainment', subcategory: 'Movies',     is_need: false },
  'inox':              { category: 'Entertainment', subcategory: 'Movies',     is_need: false },
  'cinepolis':         { category: 'Entertainment', subcategory: 'Movies',     is_need: false },
  'carnival cinemas':  { category: 'Entertainment', subcategory: 'Movies',     is_need: false },
  'steam':             { category: 'Entertainment', subcategory: 'Games',      is_need: false },
  'epic games':        { category: 'Entertainment', subcategory: 'Games',      is_need: false },
  'google play games': { category: 'Entertainment', subcategory: 'Games',      is_need: false },
  'lenskart':          { category: 'Shopping', subcategory: 'General',         is_need: false },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Lowercase + collapse whitespace for consistent matching. */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Extract a short keyword to use as the ai_learning cache key.
 * Strips special chars, collapses spaces, caps at 50 characters.
 */
export function extractMerchantKeyword(description: string): string {
  return normalizeText(description)
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50);
}

// ── Tier 2: Keyword matching ──────────────────────────────────────────────────

function matchKeywords(
  description: string,
): (KeywordRule & { confidence: number }) | null {
  const normalized = normalizeText(description);

  // Try longest keywords first — avoids 'kfc' matching before 'kfc near me' etc.
  const sortedKeys = Object.keys(KEYWORD_RULES).sort((a, b) => b.length - a.length);

  for (const keyword of sortedKeys) {
    if (normalized.includes(keyword)) {
      return { ...KEYWORD_RULES[keyword], confidence: 0.90 };
    }
  }
  return null;
}

// ── Tier 3: Claude API ────────────────────────────────────────────────────────

async function callClaudeAPI(
  description: string,
  amount: number,
  currency = 'INR',
): Promise<Omit<CategorizationResult, 'source'> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[categorize] ANTHROPIC_API_KEY not set — skipping AI tier');
    return null;
  }

  const client = new Anthropic({ apiKey });
  const prompt = CATEGORIZE_PROMPT
    .replace('{description}', description)
    .replace('{amount}', String(amount))
    .replace('{currency}', currency);

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') return null;

    // Strip accidental markdown fences before parsing
    const jsonText = content.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(jsonText) as {
      category: string;
      subcategory: string | null;
      is_need: boolean;
      confidence: number;
    };

    return {
      category:    parsed.category    ?? 'Other',
      subcategory: parsed.subcategory ?? null,
      is_need:     Boolean(parsed.is_need),
      confidence:  Math.min(Math.max(Number(parsed.confidence) || 0.7, 0), 1),
    };
  } catch (error) {
    console.error('[categorize] Claude API error:', error);
    return null;
  }
}

// ── Save / update ai_learning ──────────────────────────────────────────────────

/**
 * Upsert a merchant→category mapping into the ai_learning table.
 *
 * If the keyword already exists for this profile, the category is
 * overwritten and occurrence_count is incremented (tracks confidence).
 * If it doesn't exist, a new row is inserted with occurrence_count = 1.
 */
export async function saveAiLearning(
  profileId: string,
  merchantKeyword: string,
  userCorrectedCategory: string,
  userCorrectedSubcategory: string | null,
  isNeed: boolean,
  aiSuggestedCategory?: string | null,
): Promise<void> {
  const supabase = await createClient();

  // Check for existing record (select before upsert for occurrence_count increment)
  const { data: existing } = await supabase
    .from('ai_learning')
    .select('id, occurrence_count')
    .eq('profile_id', profileId)
    .eq('merchant_keyword', merchantKeyword)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('ai_learning')
      .update({
        user_corrected_category:    userCorrectedCategory,
        user_corrected_subcategory: userCorrectedSubcategory,
        is_need:                    isNeed,
        ai_suggested_category:      aiSuggestedCategory ?? null,
        occurrence_count:           (existing.occurrence_count ?? 0) + 1,
        updated_at:                 new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) console.error('[saveAiLearning] update error:', error);
  } else {
    const { error } = await supabase.from('ai_learning').insert({
      profile_id:                 profileId,
      merchant_keyword:           merchantKeyword,
      user_corrected_category:    userCorrectedCategory,
      user_corrected_subcategory: userCorrectedSubcategory,
      is_need:                    isNeed,
      ai_suggested_category:      aiSuggestedCategory ?? null,
      occurrence_count:           1,
    });

    if (error) console.error('[saveAiLearning] insert error:', error);
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Categorize a transaction using the 3-tier system.
 *
 *   Tier 1 (cache):    Check ai_learning for known merchant — free, instant
 *   Tier 2 (keywords): Check KEYWORD_RULES map            — free, instant
 *   Tier 3 (AI):       Call Claude Sonnet 4.5             — ~$0.001/call
 *
 * After a Tier 3 call the result is stored in ai_learning so the
 * same merchant is handled by Tier 1 on every future request.
 */
export async function categorizeTransaction(
  description: string,
  amount: number,
  profileId: string,
  currency = 'INR',
): Promise<CategorizationResult> {
  const normalized = normalizeText(description);
  const merchantKeyword = extractMerchantKeyword(description);

  // ── Tier 1: ai_learning table ──────────────────────────────────────────────
  try {
    const supabase = await createClient();
    const { data: learnings } = await supabase
      .from('ai_learning')
      .select('merchant_keyword, user_corrected_category, user_corrected_subcategory, is_need')
      .eq('profile_id', profileId)
      .order('occurrence_count', { ascending: false });

    if (learnings) {
      for (const entry of learnings) {
        const kw = (entry.merchant_keyword as string | null)?.toLowerCase();
        if (kw && normalized.includes(kw)) {
          return {
            category:    entry.user_corrected_category as string,
            subcategory: (entry.user_corrected_subcategory as string | null) ?? null,
            is_need:     Boolean(entry.is_need),
            confidence:  0.97,
            source:      'cache',
          };
        }
      }
    }
  } catch (error) {
    console.error('[categorize] Tier 1 error:', error);
    // Non-fatal — fall through to Tier 2
  }

  // ── Tier 2: Keyword rules ──────────────────────────────────────────────────
  const keywordMatch = matchKeywords(description);
  if (keywordMatch) {
    return {
      category:    keywordMatch.category,
      subcategory: keywordMatch.subcategory,
      is_need:     keywordMatch.is_need,
      confidence:  keywordMatch.confidence,
      source:      'keywords',
    };
  }

  // ── Tier 3: Claude API ─────────────────────────────────────────────────────
  const aiResult = await callClaudeAPI(description, amount, currency);
  if (aiResult) {
    // Cache result — next call for this merchant hits Tier 1 (free)
    await saveAiLearning(
      profileId,
      merchantKeyword,
      aiResult.category,
      aiResult.subcategory,
      aiResult.is_need,
      aiResult.category, // ai_suggested = same as what AI returned
    );
    return { ...aiResult, source: 'ai' };
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  return {
    category:   'Other',
    subcategory: 'Miscellaneous',
    is_need:    false,
    confidence: 0.1,
    source:     'keywords',
  };
}
