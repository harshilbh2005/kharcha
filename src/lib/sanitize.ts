// ============================================================
// KHARCHA — Input Sanitization Utilities
// Strips HTML tags and normalizes text inputs to prevent XSS
// and injection attacks.
//
// Applied to all user-facing text inputs either via Zod
// transforms or directly in server actions.
// ============================================================

/**
 * Strips HTML tags from a string and normalizes whitespace.
 *
 * Removes:
 *   - All HTML/XML tags (e.g. <script>, <img>, <a href=...>)
 *   - Null bytes
 *   - Control characters (except newline \n and tab \t)
 *
 * Preserves:
 *   - Unicode characters (Indian languages, symbols)
 *   - Newlines and tabs (for multi-line inputs like notes)
 *   - Leading/trailing whitespace (handled by Zod's .trim())
 */
export function stripHtmlTags(input: string): string {
  return input
    // Remove HTML/XML tags
    .replace(/<[^>]*>/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except \n (10), \r (13), \t (9)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse multiple spaces into one (not newlines)
    .replace(/ {2,}/g, ' ');
}

/**
 * Strict sanitizer for single-line inputs (descriptions, names, merchants).
 * Strips HTML tags AND normalizes to single-line (no newlines).
 */
export function sanitizeText(input: string): string {
  return stripHtmlTags(input)
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
 * Sanitizer for multi-line inputs (notes, reasons).
 * Strips HTML tags but preserves newlines.
 */
export function sanitizeMultiLineText(input: string): string {
  return stripHtmlTags(input).trim();
}

/**
 * Sanitize SMS text: strip HTML, keep printable chars + common Unicode.
 * More aggressive than sanitizeText — limits to 500 chars for processing.
 */
export function sanitizeSMS(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ') // keep printable chars
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);               // max SMS length for processing
}
