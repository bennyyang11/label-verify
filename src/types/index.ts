/**
 * Core domain types for the label verification engine.
 *
 * Flow (see PRD §6): the vision model returns an `ExtractedLabel` (observed facts
 * only — no verdicts). The comparison engine compares it against `ApplicationData`
 * (the agent's claimed values) and produces a `VerificationResult`. All verdicts
 * are decided in our code, never by the LLM.
 */

/** The label fields we verify (PRD FR-2). `governmentWarning` is handled specially. */
export type FieldKey =
  | "brand"
  | "classType"
  | "abv"
  | "netContents"
  | "producer"
  | "countryOfOrigin"
  | "governmentWarning";

/** Human-readable labels for the UI + verdict messages. */
export const FIELD_LABELS: Record<FieldKey, string> = {
  brand: "Brand Name",
  classType: "Class / Type",
  abv: "Alcohol Content",
  netContents: "Net Contents",
  producer: "Bottler / Producer",
  countryOfOrigin: "Country of Origin",
  governmentWarning: "Government Warning",
};

/**
 * Values the agent claims the application says. All optional — an agent may only
 * fill in the fields they care about, and optional fields (e.g. country of origin
 * for a domestic product) may legitimately be blank.
 */
export interface ApplicationData {
  brand?: string;
  classType?: string;
  abv?: string;
  netContents?: string;
  producer?: string;
  countryOfOrigin?: string;
}

/**
 * What the vision model returns after reading the label image(s).
 * Observed facts only. `null` means "not found on the label".
 */
export interface ExtractedLabel {
  brand: string | null;
  classType: string | null;
  abv: string | null;
  netContents: string | null;
  producer: string | null;
  countryOfOrigin: string | null;

  /** The government warning text, verbatim (original casing preserved), or null if absent. */
  warningText: string | null;
  /** Does the "GOVERNMENT WARNING:" heading appear in ALL CAPS? */
  warningIsAllCaps: boolean;
  /** Does the "GOVERNMENT WARNING:" heading appear bold? */
  warningIsBold: boolean;
  /** Does the warning appear suspiciously small / buried relative to other text? */
  warningTextSuspiciouslySmall: boolean;

  /** 0–1 confidence per field the model reported. */
  confidence: Partial<Record<FieldKey, number>>;
  /** Fields the model genuinely could not read (bad image, glare, etc.). */
  unreadableFields: FieldKey[];
}

export type VerdictStatus =
  | "match" // claimed value matches the label
  | "mismatch" // claimed value conflicts with the label (or a warning violation)
  | "unreadable" // couldn't read this field from the image
  | "review" // needs a human look (e.g. warning not found — check back label)
  | "skipped"; // agent provided no claimed value, nothing to compare

/** Per-field result. Always shows claimed vs found vs why (PRD FR-1a: decision-support). */
export interface FieldVerdict {
  field: FieldKey;
  label: string;
  status: VerdictStatus;
  claimed: string | null;
  found: string | null;
  confidence: number | null;
  /** Plain-language explanation of the verdict, shown to the agent. */
  note?: string;
}

/** The full result for one application. */
export interface VerificationResult {
  fields: FieldVerdict[];
  /** "pass" only if nothing needs attention; otherwise "attention". Never auto-rejects. */
  overall: "pass" | "attention";
}

/** Metadata returned alongside a verification (for the UI + debugging). */
export interface VerifyMeta {
  model: string;
  latencyMs: number;
  imageCount: number;
  /** True when run without an API key (canned extraction) — clearly surfaced in the UI. */
  mock: boolean;
}

/** Successful `/api/verify` response body. */
export interface VerifyResponse {
  result: VerificationResult;
  meta: VerifyMeta;
}

/** Error `/api/verify` response body. */
export interface VerifyError {
  error: string;
  /** Machine-readable code for the UI to branch on. */
  code:
    | "no_images"
    | "too_many_images"
    | "unsupported_type"
    | "file_too_large"
    | "bad_application_data"
    | "timeout"
    | "rate_limited"
    | "ai_error"
    | "server_error";
}
