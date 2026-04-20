/**
 * Mihon-Style Chapter Parser
 *
 * Architecture:
 * - Valid numeric chapters: sorted by chapterNumber (ascending)
 * - Special chapters: kept separate, never assigned chapterNumber 0
 * - "Continue reading" always uses latest valid numeric chapter
 */

import { SourceChapter } from '../sources/types';

/**
 * Extended chapter with special detection
 */
export interface ParsedChapter extends SourceChapter {
  // Always numeric to satisfy SourceChapter contract.
  chapterNumber: number;
  isSpecial: boolean;
  // For ordering: numeric chapters use their number, specials use Infinity.
  sortKey: number;
}

/**
 * Patterns that indicate a special/non-numeric chapter
 */
const SPECIAL_PATTERNS = [
  /prologue/i,
  /epilogue/i,
  /extra/i,
  /omake/i,
  /side\s*story/i,
  /bonus/i,
  /announcement/i,
  /hiatus/i,
  /notice/i,
  /interview/i,
  /special/i,
  /one\s*shot/i,
];

/**
 * Extract numeric chapter from raw text.
 * Returns null if no valid number found (special chapter).
 *
 * Examples:
 *   "Chapter 5" → 5
 *   "Ch. 10.5" → 10.5
 *   "5" → 5
 *   "Prologue" → null
 *   "Extra: Omake" → null
 */
export function extractChapterNumber(rawText: string): number | null {
  if (!rawText) return null;

  const text = rawText.trim();

  // 1. Check for special patterns first
  if (SPECIAL_PATTERNS.some(pattern => pattern.test(text))) {
    return null;
  }

  // 2. Try to extract numeric chapter
  // Matches: "5", "Chapter 5", "Ch.5", "5.5", "Extra 10.5" (if not caught above)
  const patterns = [
    /chapter\s*(\d+(?:\.\d+)?)/i,      // "Chapter 5", "Chapter 5.5"
    /ch\.?\s*(\d+(?:\.\d+)?)/i,        // "Ch.5", "Ch 5"
    /^(\d+(?:\.\d+)?)$/,               // "5", "5.5" (standalone number)
    /(\d+(?:\.\d+)?)\s*(?:\/|$)/i,     // "5 /" or "5" at end
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  // 3. Fallback: try to find ANY positive number in the string
  const numbers = text.match(/\d+(?:\.\d+)?/g);
  if (numbers) {
    for (const numStr of numbers) {
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  // No valid number found - this is a special chapter
  return null;
}

/**
 * Parse a raw chapter into a ParsedChapter with special detection
 */
export function parseChapter(raw: {
  id: string;
  title: string;
  chapterNumber?: number;  // Optional: pre-parsed number from source
  dateUpload?: string;
}): ParsedChapter {
  // If source already provided a valid chapterNumber, use it
  if (raw.chapterNumber !== undefined && raw.chapterNumber !== null && raw.chapterNumber > 0) {
    return {
      ...raw,
      chapterNumber: raw.chapterNumber,
      isSpecial: false,
      sortKey: raw.chapterNumber,
    };
  }

  // Otherwise, parse from title
  const extractedNumber = extractChapterNumber(raw.title);
  const isSpecial = extractedNumber === null;
  const normalizedChapterNumber = isSpecial ? 0 : extractedNumber;

  return {
    ...raw,
    chapterNumber: normalizedChapterNumber,
    isSpecial,
    sortKey: isSpecial ? Infinity : normalizedChapterNumber,
  };
}
