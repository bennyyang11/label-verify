/**
 * Normalization helpers used by the comparison engine.
 *
 * Two distinct philosophies (PRD FR-3):
 *  - Lenient text fields (brand, type, producer…): strip case + punctuation so
 *    "STONE'S THROW" == "Stone's Throw".
 *  - Numeric fields (ABV, net contents): parse the meaningful number so
 *    "750 mL" == "750ml" and "45% Alc./Vol. (90 Proof)" == "45%".
 */

/**
 * Lenient text normalizer: lowercase, replace any non-alphanumeric run with a
 * single space, collapse whitespace, trim. Unicode-aware so accented brands work.
 */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD") // decompose accented chars into base + combining mark
    .replace(/\p{M}/gu, "") // strip diacritics so "Café" == "Cafe"
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Word-level normalizer for the strict warning wording check. Lowercases, drops
 * punctuation, and collapses whitespace/newlines so the comparison is on the
 * sequence of words+numbers only.
 *
 * Rationale (PRD §10): the meaningful warning cheats are word-level (reworded /
 * missing / added clauses) and formatting (ALL-CAPS, bold, font size — each
 * enforced via a separate flag). A stray punctuation or line-break difference is
 * OCR noise, not a violation, and must not false-fail a legitimate warning.
 * Digits are kept so the "(1)"/"(2)" clause markers still register as words.
 */
export function normalizeWarning(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract the alcohol-by-volume percentage as a number.
 * "45% Alc./Vol. (90 Proof)" -> 45, "13.5% ABV" -> 13.5. Returns null if none.
 * Prefers an explicit percentage; falls back to "<n> proof" / 2.
 */
export function parseAbv(input: string): number | null {
  const pct = input.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return parseFloat(pct[1]);
  const proof = input.match(/(\d+(?:\.\d+)?)\s*proof/i);
  if (proof) return parseFloat(proof[1]) / 2;
  return null;
}

/** Volume units we recognize, expressed as a multiplier to milliliters. */
const UNIT_TO_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  millilitre: 1,
  millilitres: 1,
  cl: 10,
  centiliter: 10,
  centiliters: 10,
  l: 1000,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
  floz: 29.5735,
  oz: 29.5735,
  pt: 473.176,
  pint: 473.176,
  qt: 946.353,
  quart: 946.353,
  gal: 3785.41,
  gallon: 3785.41,
  gallons: 3785.41,
};

/**
 * Parse net contents into a milliliter value for unit-agnostic comparison.
 * "750 mL" -> 750, "1.75L" -> 1750, "1 fl oz" -> ~29.6. Returns null if unparseable.
 */
export function parseVolumeMl(input: string): number | null {
  const m = input
    .toLowerCase()
    .match(/(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|[a-z]+)/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const unit = m[2].replace(/[.\s]/g, ""); // "fl oz" -> "floz"
  const factor = UNIT_TO_ML[unit];
  if (factor == null) return null;
  return value * factor;
}
