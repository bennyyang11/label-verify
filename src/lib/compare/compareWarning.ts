import type { ExtractedLabel, FieldVerdict } from "@/types";
import { FIELD_LABELS } from "@/types";
import { CANONICAL_WARNING } from "./constants";
import { normalizeWarning } from "./normalize";

/**
 * Strict verification of the Government Warning (PRD FR-3).
 *
 * Three independent requirements, each checked separately so the agent gets a
 * precise reason:
 *   1. Wording matches the canonical statement word-for-word.
 *   2. The "GOVERNMENT WARNING:" heading is ALL CAPS.
 *   3. That heading is bold.
 * Plus a buried-text guard (suspiciously small font).
 *
 * If no warning is found at all, this is "review" not "fail" — it's usually on the
 * back label, which the agent may not have uploaded (PRD FR-1a).
 */
export function compareWarning(extracted: ExtractedLabel): FieldVerdict {
  const base = {
    field: "governmentWarning" as const,
    label: FIELD_LABELS.governmentWarning,
    claimed: CANONICAL_WARNING,
    found: extracted.warningText,
    confidence: extracted.confidence.governmentWarning ?? null,
  };

  if (!extracted.warningText || extracted.warningText.trim() === "") {
    return {
      ...base,
      status: "review",
      note:
        "No government warning detected. It's usually on the back label — if you only " +
        "uploaded the front, add the back image. Otherwise this is a labeling violation.",
    };
  }

  const problems: string[] = [];

  if (normalizeWarning(extracted.warningText) !== normalizeWarning(CANONICAL_WARNING)) {
    problems.push("the wording does not match the required statement word-for-word");
  }
  if (!extracted.warningIsAllCaps) {
    problems.push('"GOVERNMENT WARNING:" must be in ALL CAPS');
  }
  if (!extracted.warningIsBold) {
    problems.push('"GOVERNMENT WARNING:" must be bold');
  }
  if (extracted.warningTextSuspiciouslySmall) {
    problems.push("the warning text appears too small or buried");
  }

  if (problems.length === 0) {
    return { ...base, status: "match", note: "Exact match, correctly formatted." };
  }

  // Capitalize the first problem for a clean sentence.
  const joined = problems.join("; ");
  return {
    ...base,
    status: "mismatch",
    note: `Government warning issue: ${joined}.`,
  };
}
