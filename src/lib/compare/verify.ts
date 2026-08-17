import type {
  ApplicationData,
  ExtractedLabel,
  FieldKey,
  FieldVerdict,
  VerificationResult,
} from "@/types";
import { FIELD_LABELS } from "@/types";
import { compareField } from "./compareField";
import { compareWarning } from "./compareWarning";

/** Text fields compared against claimed application data, in display order. */
const TEXT_FIELDS: Exclude<FieldKey, "governmentWarning">[] = [
  "brand",
  "classType",
  "abv",
  "netContents",
  "producer",
  "countryOfOrigin",
];

/**
 * Compare the agent's claimed application data against what the vision model read
 * off the label, producing one verdict per field plus an overall status.
 *
 * Decision-support posture (PRD FR-1a): this never "rejects". It flags what needs
 * attention and explains why; the agent makes the call.
 */
export function verifyLabel(
  claimed: ApplicationData,
  extracted: ExtractedLabel,
): VerificationResult {
  const fields: FieldVerdict[] = [];

  for (const field of TEXT_FIELDS) {
    fields.push(verifyTextField(field, claimed[field], extracted));
  }

  fields.push(compareWarning(extracted));

  const needsAttention = fields.some(
    (f) => f.status === "mismatch" || f.status === "unreadable" || f.status === "review",
  );

  return { fields, overall: needsAttention ? "attention" : "pass" };
}

function verifyTextField(
  field: Exclude<FieldKey, "governmentWarning">,
  claimedValue: string | undefined,
  extracted: ExtractedLabel,
): FieldVerdict {
  const found = extracted[field];
  const confidence = extracted.confidence[field] ?? null;
  const base = {
    field,
    label: FIELD_LABELS[field],
    claimed: claimedValue?.trim() || null,
    found,
    confidence,
  };

  // Agent left this field blank — nothing to verify against.
  if (!claimedValue || claimedValue.trim() === "") {
    return { ...base, status: "skipped", note: "No claimed value provided." };
  }

  // Model flagged this field as genuinely unreadable (glare, blur, bad angle).
  if (extracted.unreadableFields.includes(field)) {
    return {
      ...base,
      status: "unreadable",
      note: "Couldn't read this field from the label — try a clearer image.",
    };
  }

  // Field is readable but absent: the agent claims a value the label doesn't show.
  // That's a real discrepancy, not an image problem.
  if (found == null || found.trim() === "") {
    return {
      ...base,
      status: "mismatch",
      note: `Application claims "${claimedValue.trim()}" but this field wasn't found on the label.`,
    };
  }

  const result = compareField(field, claimedValue, found);
  return {
    ...base,
    status: result.matches ? "match" : "mismatch",
    note: result.note,
  };
}
