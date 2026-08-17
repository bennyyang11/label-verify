import type { ExtractedLabel } from "@/types";
import { CANONICAL_WARNING } from "@/lib/compare/constants";

/**
 * A canned extraction for the OLD TOM DISTILLERY sample, used for local UI work
 * and tests before an ANTHROPIC_API_KEY is configured. Not used in production.
 */
export function mockExtractedLabel(): ExtractedLabel {
  return {
    brand: "OLD TOM DISTILLERY",
    classType: "Kentucky Straight Bourbon Whiskey",
    abv: "45% Alc./Vol. (90 Proof)",
    netContents: "750 mL",
    producer: "Old Tom Distillery, Bardstown, KY",
    countryOfOrigin: null,
    warningText: CANONICAL_WARNING,
    warningIsAllCaps: true,
    warningIsBold: true,
    warningTextSuspiciouslySmall: false,
    confidence: {
      brand: 0.99,
      classType: 0.97,
      abv: 0.98,
      netContents: 0.98,
      producer: 0.95,
      countryOfOrigin: 0,
      governmentWarning: 0.96,
    },
    unreadableFields: [],
  };
}
