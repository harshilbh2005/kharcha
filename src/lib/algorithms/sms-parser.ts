// ============================================================
// KHARCHA — Indian Bank SMS Parser
// Section 12.1 of KHARCHA_MASTER_PROJECT_DOCUMENT.md
//
// Parses bank SMS alerts from HDFC, SBI, ICICI, Axis, Kotak,
// Paytm, PhonePe, Google Pay, Bank of Baroda, and other Indian
// banks using regex patterns.
//
// Usage:
//   const result = parseSMS("Rs.350.00 debited from a/c **1234...");
//   if (result.confidence >= 0.5) { /* use result */ }
//   else { /* fall back to AI parser */ }
// ============================================================

import type { ParsedSMS } from '@/types';

// ─── Pattern definitions ──────────────────────────────────────────────────────

interface PatternDef {
  regex: RegExp;
  /** Capture group index for the amount string */
  amountGroup: number;
  /** Capture group index for "debited"/"credited"; null if forceType is used */
  typeGroup: number | null;
  /** Capture group index for the last-4 account digits (optional) */
  accountGroup?: number;
  /** Capture group index for a merchant name (optional) */
  merchantGroup?: number;
  /** Override transaction type — used for patterns where type is implicit */
  forceType?: 'debit' | 'credit';
}

// Amount prefix — matches Rs., Rs, INR, and ₹ (with optional trailing space)
// Used across all patterns for consistency.
// Note: ₹ is the Unicode Rupee Sign (U+20B9)
const AMT = '(?:Rs\\.?|INR\\s?|\\u20B9\\s?)';

/**
 * Master patterns covering Indian bank SMS formats.
 *
 * Order matters: more specific patterns first.
 * Pattern 3 (Amt Debited/Credited) must come before generic "debited" patterns
 * to avoid partial matches.
 */
const SMS_PATTERNS: PatternDef[] = [
  // ── Pattern 1: "Amt Debited:INR XXX, Ac XXXX" (ICICI) ────────────────────
  {
    regex: new RegExp(
      `Amt\\s+(Debited|Credited):?\\s*${AMT}(\\d[\\d,]*\\.?\\d{0,2}),?\\s*(?:Ac|A\\/C)\\s*[Xx]*(\\d{4})`,
      'i',
    ),
    amountGroup: 2,
    typeGroup: 1,
    accountGroup: 3,
  },

  // ── Pattern 2: "Rs.XXX debited/credited from/to a/c **XXXX" (HDFC, Axis, BOB)
  {
    regex: new RegExp(
      `${AMT}(\\d[\\d,]*\\.?\\d{0,2})\\s+(?:has\\s+been\\s+)?(debited|credited)\\s+(?:from|to)\\s+(?:a\\/c|A\\/C|your\\s+(?:a\\/c|account))\\s*\\**(?:no\\.?\\s*)?[Xx]*(\\d{4})`,
      'i',
    ),
    amountGroup: 1,
    typeGroup: 2,
    accountGroup: 3,
  },

  // ── Pattern 3: "a/c XXXX debited/credited by Rs.XXX" (SBI, Kotak, BOB) ────
  {
    regex: new RegExp(
      `(?:a\\/c|Ac|A\\/C)\\s*[Xx]*(\\d{4})\\s+(?:(?:has\\s+been\\s+)?(debited|credited)\\s+(?:by|for|with)|(?:debited|credited)(?:\\s+by)?)\\s+${AMT}(\\d[\\d,]*\\.?\\d{0,2})`,
      'i',
    ),
    amountGroup: 3,
    typeGroup: 2,
    accountGroup: 1,
  },

  // ── Pattern 4: "You sent/paid ₹XXX to MERCHANT" (Google Pay) ─────────────
  {
    regex: new RegExp(
      `(?:You\\s+(?:sent|paid)|Money\\s+sent:?)\\s*${AMT}(\\d[\\d,]*\\.?\\d{0,2})\\s+to\\s+(.+?)(?:\\s+using|\\s+on|\\s+via|\\s*\\.|\\s+Google|\\s+GPay|\\s+UPI|\\s*$)`,
      'i',
    ),
    amountGroup: 1,
    typeGroup: null,
    merchantGroup: 2,
    forceType: 'debit',
  },

  // ── Pattern 5: "Sent Rs.XXX to MERCHANT" (PhonePe) ───────────────────────
  {
    regex: new RegExp(
      `Sent\\s+${AMT}(\\d[\\d,]*\\.?\\d{0,2})\\s+to\\s+(.+?)(?:\\s+from|\\s+via|\\s*\\.|\\s+PhonePe|\\s+UPI|\\s*$)`,
      'i',
    ),
    amountGroup: 1,
    typeGroup: null,
    merchantGroup: 2,
    forceType: 'debit',
  },

  // ── Pattern 6: "Payment of Rs.XXX to MERCHANT successful" (PhonePe) ──────
  {
    regex: new RegExp(
      `Payment\\s+of\\s+${AMT}(\\d[\\d,]*\\.?\\d{0,2})\\s+to\\s+(.+?)(?:\\s+successful|\\s+completed|\\s+done|\\s+via|\\s*\\.|\\s*$)`,
      'i',
    ),
    amountGroup: 1,
    typeGroup: null,
    merchantGroup: 2,
    forceType: 'debit',
  },

  // ── Pattern 7: "Paid Rs.XXX to MERCHANT" (Paytm, PhonePe, GPay) ──────────
  {
    regex: new RegExp(
      `Paid\\s+${AMT}(\\d[\\d,]*\\.?\\d{0,2})\\s+to\\s+(.+?)(?:\\s+from|\\s+via|\\s+using|\\s*\\.?\\s*$)`,
      'i',
    ),
    amountGroup: 1,
    typeGroup: null,
    merchantGroup: 2,
    forceType: 'debit',
  },

  // ── Pattern 8: "₹XXX received from SENDER" / "Money received: ₹XXX" ─────
  {
    regex: new RegExp(
      `(?:Money\\s+received:?\\s*)?${AMT}(\\d[\\d,]*\\.?\\d{0,2})\\s+received\\s+from\\s+(.+?)(?:\\s+via|\\s+through|\\s+in|\\s*\\.|\\s+UPI|\\s+Google|\\s+GPay|\\s*$)`,
      'i',
    ),
    amountGroup: 1,
    typeGroup: null,
    merchantGroup: 2,
    forceType: 'credit',
  },

  // ── Pattern 9: "Received Rs.XXX from SENDER" ─────────────────────────────
  {
    regex: new RegExp(
      `Received\\s+${AMT}(\\d[\\d,]*\\.?\\d{0,2})\\s+from\\s+(.+?)(?:\\s+in|\\s+to|\\s+your|\\s+via|\\s*\\.?\\s*$)`,
      'i',
    ),
    amountGroup: 1,
    typeGroup: null,
    merchantGroup: 2,
    forceType: 'credit',
  },

  // ── Pattern 10: "debited ₹XXX from your BOB/bank account" (generic) ──────
  {
    regex: new RegExp(
      `(?:debited|deducted)\\s+${AMT}(\\d[\\d,]*\\.?\\d{0,2})\\s+from\\s+(?:your\\s+)?(?:a\\/c|account|bank)`,
      'i',
    ),
    amountGroup: 1,
    typeGroup: null,
    forceType: 'debit',
  },

  // ── Pattern 11: "credited ₹XXX to your account" (generic) ────────────────
  {
    regex: new RegExp(
      `(?:credited)\\s+${AMT}(\\d[\\d,]*\\.?\\d{0,2})\\s+(?:to|in)\\s+(?:your\\s+)?(?:a\\/c|account|bank)`,
      'i',
    ),
    amountGroup: 1,
    typeGroup: null,
    forceType: 'credit',
  },
];

// ─── Merchant extraction from UPI/info fields ─────────────────────────────────

const MERCHANT_PATTERNS: RegExp[] = [
  /(?:to\s+VPA\s+)(.+?)(?:@|\s+UPI|\s*\.?\s*$)/i,
  /(?:UPI[:\s/]+)(.+?)(?:\/|\s+Ref|\s*$)/i,
  /(?:Info:\s*UPI\/)(.+?)(?:\/|\s*$)/i,
  /(?:towards?\s+(?:UPI[-\s]?)?)(.+?)(?:\s+Ref|\s*\.?\s*$)/i,
  /(?:transfer\s+to\s+)(.+?)(?:\s+Ref|\s*$)/i,
  /(?:at\s+)([A-Za-z][A-Za-z\s&'-]{2,30})(?:\s+on|\s+via|\s*$)/i,
  // Google Pay / PhonePe specific merchant extraction
  /(?:to\s+)(.+?)(?:\s+on\s+Google\s*Pay|\s+on\s+GPay|\s+via\s+PhonePe)/i,
];

// ─── Date patterns & normalisation ───────────────────────────────────────────

const DATE_PATTERNS: RegExp[] = [
  /(\d{2}[-\/]\d{2}[-\/](?:\d{2}|\d{4}))/,    // DD-MM-YY or DD-MM-YYYY
  /(\d{2}[A-Za-z]{3}\d{2,4})/,                 // DDMmmYY (21Feb26)
  /on\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,      // on 21 February 2026
  /(\d{4}[-\/]\d{2}[-\/]\d{2})/,               // YYYY-MM-DD (ISO, some GPay formats)
];

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04',
  may: '05', jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
};

/** Normalise a raw date string to YYYY-MM-DD. Returns raw on failure. */
function normaliseDate(raw: string): string {
  // YYYY-MM-DD (ISO format — already normalised)
  const iso = raw.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // DD-MM-YY or DD-MM-YYYY
  const dmy = raw.match(/^(\d{2})[-\/](\d{2})[-\/](\d{2,4})$/);
  if (dmy) {
    const [, dd, mm, yy] = dmy;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    return `${yyyy}-${mm}-${dd}`;
  }

  // DDMmmYY — e.g. "21Feb26"
  const dmY = raw.match(/^(\d{2})([A-Za-z]{3})(\d{2,4})$/);
  if (dmY) {
    const [, dd, mon, yy] = dmY;
    const mm = MONTH_MAP[mon.toLowerCase()];
    if (mm) {
      const yyyy = yy.length === 2 ? `20${yy}` : yy;
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // "21 February 2026" or "21 Feb 2026"
  const spelled = raw.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (spelled) {
    const [, d, mon, yyyy] = spelled;
    const mm = MONTH_MAP[mon.substring(0, 3).toLowerCase()];
    if (mm) return `${yyyy}-${mm}-${d.padStart(2, '0')}`;
  }

  return raw;
}

// ─── Bank detection ───────────────────────────────────────────────────────────

const BANK_HINTS: [string, RegExp][] = [
  ['HDFC', /hdfc|HDB/i],
  ['SBI', /sbi|state\s*bank/i],
  ['ICICI', /icici/i],
  ['Axis', /axis\s*bank|axisbank/i],
  ['Kotak', /kotak/i],
  ['Paytm', /paytm/i],
  ['PhonePe', /phonepe|phone\s*pe/i],
  ['Google Pay', /google\s*pay|gpay\b/i],
  ['Bank of Baroda', /bank\s*of\s*baroda|\bBOB\b|baroda/i],
  ['IDFC', /idfc/i],
  ['Yes Bank', /yes\s*bank/i],
  ['IndusInd', /indusind/i],
  ['PNB', /punjab\s*national|pnb\b/i],
  ['BOI', /bank\s*of\s*india|\bBOI\b/],
  ['Union Bank', /union\s*bank/i],
  ['Canara Bank', /canara/i],
  ['Federal Bank', /federal\s*bank/i],
];

function detectBank(text: string): string | null {
  for (const [name, pattern] of BANK_HINTS) {
    if (pattern.test(text)) return name;
  }
  return null;
}

// ─── Merchant cleaning ────────────────────────────────────────────────────────

function cleanMerchant(raw: string): string {
  return raw
    .replace(/@[\w.]+/g, '')     // strip UPI handles (@merchant)
    .replace(/\b\d{4,}\b/g, '')  // strip long numeric strings
    .replace(/[-_]/g, ' ')       // separators → spaces
    .replace(/\s+/g, ' ')        // collapse whitespace
    .trim();
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Parse an Indian bank SMS and return structured transaction data.
 *
 * Confidence rubric:
 *   0.70  base (amount + type extracted)
 *   +0.10 merchant detected
 *   +0.07 date detected
 *   +0.05 account last-4 detected
 *   +0.03 reference number detected
 *   ───────────────────────────────
 *   max 0.95 (1.0 reserved for AI-confirmed)
 *
 * If confidence < 0.5 (amount not found), the caller should
 * fall back to the AI parser (src/lib/ai/parse-sms.ts, Phase 7).
 */
export function parseSMS(smsText: string): ParsedSMS {
  const text = smsText.trim();

  const result: ParsedSMS = {
    amount: 0,
    type: 'debit',
    merchant: null,
    account_last4: null,
    date: null,
    reference: null,
    bank: detectBank(text),
    raw: text,
    confidence: 0,
  };

  // ── Amount + type matching ──────────────────────────────────────────────────
  for (const pattern of SMS_PATTERNS) {
    const match = text.match(pattern.regex);
    if (!match) continue;

    const amountStr = match[pattern.amountGroup]?.replace(/,/g, '');
    const parsed = parseFloat(amountStr ?? '');
    if (isNaN(parsed) || parsed <= 0) continue;

    result.amount = parsed;

    if (pattern.forceType) {
      result.type = pattern.forceType;
    } else if (pattern.typeGroup !== null && match[pattern.typeGroup]) {
      result.type =
        match[pattern.typeGroup].toLowerCase() === 'credited' ? 'credit' : 'debit';
    }

    if (pattern.accountGroup && match[pattern.accountGroup]) {
      result.account_last4 = match[pattern.accountGroup];
    }

    if (pattern.merchantGroup && match[pattern.merchantGroup]) {
      result.merchant = cleanMerchant(match[pattern.merchantGroup]);
    }

    break; // stop after first successful pattern
  }

  // ── Merchant fallback: secondary UPI/info patterns ──────────────────────────
  if (!result.merchant) {
    for (const mp of MERCHANT_PATTERNS) {
      const m = text.match(mp);
      if (m?.[1]) {
        const cleaned = cleanMerchant(m[1]);
        if (cleaned.length >= 2) {
          result.merchant = cleaned;
          break;
        }
      }
    }
  }

  // ── Date extraction ─────────────────────────────────────────────────────────
  for (const dp of DATE_PATTERNS) {
    const m = text.match(dp);
    if (m?.[1]) {
      result.date = normaliseDate(m[1]);
      break;
    }
  }

  // ── Reference number ────────────────────────────────────────────────────────
  const refMatch = text.match(
    /(?:Ref(?:erence)?\s*(?:No\.?\s*)?:?\s*|UPI\s*Ref\s*:?\s*|Google\s*Pay\s*Ref\s*:?\s*|PhonePe\s*(?:UPI\s*)?Ref\s*:?\s*)(\d{6,})/i,
  );
  if (refMatch?.[1]) result.reference = refMatch[1];

  // ── Confidence scoring ──────────────────────────────────────────────────────
  if (result.amount > 0) {
    let conf = 0.70;
    if (result.merchant)      conf += 0.10;
    if (result.date)          conf += 0.07;
    if (result.account_last4) conf += 0.05;
    if (result.reference)     conf += 0.03;
    result.confidence = Math.min(conf, 0.95);
  }

  return result;
}
