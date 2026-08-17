import Papa from "papaparse";
import type { ApplicationData, FieldVerdict, VerificationResult } from "@/types";

/**
 * CSV helpers for batch mode (PRD FR-4): parse a sheet of expected values,
 * generate a downloadable template, and export results.
 *
 * Expected CSV: one row per label. A `filename` column maps each row to the
 * uploaded image of the same name; the other columns are the claimed fields.
 */

/** Accepts a few friendly header spellings → our ApplicationData keys. */
const HEADER_ALIASES: Record<string, keyof ApplicationData> = {
  brand: "brand",
  class_type: "classType",
  classtype: "classType",
  type: "classType",
  abv: "abv",
  alcohol: "abv",
  net_contents: "netContents",
  netcontents: "netContents",
  "net contents": "netContents",
  producer: "producer",
  bottler: "producer",
  country_of_origin: "countryOfOrigin",
  countryoforigin: "countryOfOrigin",
  country: "countryOfOrigin",
};

export interface ParsedExpected {
  /** filename → claimed application data */
  map: Record<string, ApplicationData>;
  rowCount: number;
}

/** Parse the expected-values CSV. Returns null if it isn't usable CSV. */
export function parseExpectedCsv(text: string): ParsedExpected | null {
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (!res.data.length) return null;

  const map: Record<string, ApplicationData> = {};
  for (const raw of res.data) {
    const filename = (raw.filename ?? "").trim();
    if (!filename) continue;
    const data: ApplicationData = {};
    for (const [header, value] of Object.entries(raw)) {
      const key = HEADER_ALIASES[header];
      const trimmed = (value ?? "").trim();
      if (key && trimmed) data[key] = trimmed;
    }
    // Key by lowercased filename so matching to uploads is case-insensitive.
    map[filename.toLowerCase()] = data;
  }
  return { map, rowCount: Object.keys(map).length };
}

/** A downloadable template so agents know the expected columns. */
export function buildTemplateCsv(): string {
  return Papa.unparse({
    fields: [
      "filename",
      "brand",
      "class_type",
      "abv",
      "net_contents",
      "producer",
      "country_of_origin",
    ],
    data: [
      [
        "old-tom-front.jpg",
        "Old Tom Distillery",
        "Kentucky Straight Bourbon Whiskey",
        "45% Alc./Vol. (90 Proof)",
        "750 mL",
        "Old Tom Distillery, Bardstown, KY",
        "",
      ],
    ],
  });
}

/** Flatten verification results into a results CSV for export. */
export function buildResultsCsv(
  rows: { filename: string; result?: VerificationResult; error?: string }[],
): string {
  const data = rows.map((row) => {
    const base: Record<string, string> = {
      filename: row.filename,
      overall: row.error ? "error" : (row.result?.overall ?? ""),
    };
    if (row.error) base.notes = row.error;
    for (const f of row.result?.fields ?? []) {
      base[f.field] = f.status;
    }
    const notes = (row.result?.fields ?? [])
      .filter((f: FieldVerdict) => f.status === "mismatch" || f.status === "review")
      .map((f) => `${f.label}: ${f.note ?? f.status}`)
      .join(" | ");
    if (notes) base.notes = notes;
    return base;
  });
  return Papa.unparse(data);
}
