import type { FieldKey } from "@/types";
import {
  normalizeText,
  parseAbv,
  parseVolumeMl,
} from "./normalize";

export interface FieldComparison {
  matches: boolean;
  /** Plain-language reason, shown when there's a mismatch. */
  note?: string;
}

/**
 * Lenient comparison of a claimed value against what the label said (PRD FR-3).
 * Case/punctuation differences never fail; ABV and net contents compare by value.
 */
export function compareField(
  field: FieldKey,
  claimed: string,
  found: string,
): FieldComparison {
  switch (field) {
    case "abv":
      return compareAbv(claimed, found);
    case "netContents":
      return compareNetContents(claimed, found);
    default:
      return compareLenientText(claimed, found);
  }
}

function compareLenientText(claimed: string, found: string): FieldComparison {
  if (normalizeText(claimed) === normalizeText(found)) return { matches: true };
  return {
    matches: false,
    note: `Application says "${claimed}" but the label reads "${found}".`,
  };
}

function compareAbv(claimed: string, found: string): FieldComparison {
  const a = parseAbv(claimed);
  const b = parseAbv(found);
  // If we can read a percentage from both, compare numerically (tolerant of formatting).
  if (a != null && b != null) {
    if (Math.abs(a - b) < 0.05) return { matches: true };
    return {
      matches: false,
      note: `Application claims ${a}% but the label shows ${b}%.`,
    };
  }
  // Fall back to lenient text if we couldn't parse a number from one side.
  return compareLenientText(claimed, found);
}

function compareNetContents(claimed: string, found: string): FieldComparison {
  const a = parseVolumeMl(claimed);
  const b = parseVolumeMl(found);
  if (a != null && b != null) {
    if (Math.abs(a - b) < 0.5) return { matches: true };
    return {
      matches: false,
      note: `Application claims "${claimed}" but the label reads "${found}".`,
    };
  }
  // One side has no recognizable unit — e.g. an agent typing "750" for a "750 mL"
  // label. Same quantity, just shorthand; treat equal bare numbers as a match,
  // consistent with the lenient ABV comparison above.
  const an = leadingNumber(claimed);
  const bn = leadingNumber(found);
  if (an != null && bn != null && Math.abs(an - bn) < 0.001) {
    return { matches: true };
  }
  return compareLenientText(claimed, found);
}

/** First number in a string, e.g. "750 mL" -> 750, "1.75L" -> 1.75. */
function leadingNumber(input: string): number | null {
  const m = input.match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}
