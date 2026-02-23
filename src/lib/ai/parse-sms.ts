// ============================================================
// KHARCHA — AI SMS Parsing Fallback
// Section 12.2 of KHARCHA_MASTER_PROJECT_DOCUMENT.md
//
// Used when the regex parser (src/lib/algorithms/sms-parser.ts)
// fails to extract a valid amount (confidence < 0.5).
//
// Calls Claude Sonnet 4.5 to parse the SMS and returns the same
// ParsedSMS shape as the regex parser, with confidence set to 1.0
// to indicate the AI has confirmed the extraction.
//
// Usage:
//   import { parseSMS }        from '@/lib/algorithms/sms-parser';
//   import { parseSMSWithAI }  from '@/lib/ai/parse-sms';
//
//   const regex = parseSMS(smsText);
//   const result = regex.confidence >= 0.5
//     ? regex
//     : (await parseSMSWithAI(smsText)) ?? regex; // fallback to low-conf regex
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import type { ParsedSMS } from '@/types';

// ── Prompt ────────────────────────────────────────────────────────────────────

const SMS_PARSE_PROMPT = `Parse this Indian bank SMS and extract transaction details.
Return ONLY valid JSON with no markdown:
{
  "amount": number,
  "type": "debit" or "credit",
  "merchant": "merchant name or null",
  "date": "YYYY-MM-DD or null",
  "account_last4": "last 4 digits or null"
}

SMS: "{sms_text}"`;

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parse an Indian bank SMS using Claude Sonnet 4.5.
 *
 * Returns a fully-populated ParsedSMS with confidence = 1.0 on success.
 * Returns null if:
 *   - ANTHROPIC_API_KEY is not set
 *   - Claude fails to return parseable JSON
 *   - The parsed amount is <= 0 (clearly invalid)
 *
 * The caller is expected to fall back to the low-confidence regex result
 * when this function returns null.
 */
export async function parseSMSWithAI(smsText: string): Promise<ParsedSMS | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[parse-sms] ANTHROPIC_API_KEY not set — AI SMS fallback unavailable');
    return null;
  }

  const client = new Anthropic({ apiKey });

  // Truncate to 500 chars — that's the max observed Indian bank SMS length
  const prompt = SMS_PARSE_PROMPT.replace('{sms_text}', smsText.substring(0, 500));

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 200,
      messages:   [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') return null;

    // Strip any accidental markdown fences
    const jsonText = content.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(jsonText) as {
      amount:        number;
      type:          'debit' | 'credit';
      merchant:      string | null;
      date:          string | null;
      account_last4: string | null;
    };

    // Reject if amount is missing or nonsensical
    if (!parsed.amount || parsed.amount <= 0) return null;

    return {
      amount:        parsed.amount,
      type:          parsed.type === 'credit' ? 'credit' : 'debit',
      merchant:      parsed.merchant      ?? null,
      account_last4: parsed.account_last4 ?? null,
      date:          parsed.date          ?? null,
      reference:     null,  // AI doesn't extract reference numbers
      bank:          null,  // AI doesn't detect bank
      raw:           smsText,
      confidence:    1.0,   // AI-confirmed parsing = maximum confidence
    };
  } catch (error) {
    console.error('[parse-sms] Claude API error:', error);
    return null;
  }
}
