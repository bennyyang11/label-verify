import { z } from "zod";
import type { ApplicationData } from "@/types";
import type { SupportedMediaType } from "@/lib/ai/extractFields";

/** Upload limits (PRD FR-1 / FR-6). */
export const MAX_IMAGES = 5; // front + back + a little slack
export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB per image
/** Whole-request ceiling, checked against Content-Length before we buffer the body. */
export const MAX_TOTAL_BYTES = MAX_IMAGES * MAX_FILE_BYTES + 1024 * 1024; // + 1 MB slack
export const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function isSupportedMediaType(t: string): t is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as string[]).includes(t);
}

/**
 * Claimed application data. Every field optional — agents fill in only what they
 * have, and optional fields (e.g. country of origin) may legitimately be blank.
 * Empty strings are coerced to undefined so the engine treats them as "not provided".
 */
const emptyToUndefined = z
  .string()
  .trim()
  .transform((s) => (s === "" ? undefined : s))
  .optional();

export const ApplicationDataSchema = z
  .object({
    brand: emptyToUndefined,
    classType: emptyToUndefined,
    abv: emptyToUndefined,
    netContents: emptyToUndefined,
    producer: emptyToUndefined,
    countryOfOrigin: emptyToUndefined,
  })
  .strip();

/** Parse a JSON string of claimed application data. Returns null if invalid. */
export function parseApplicationData(raw: string | null): ApplicationData | null {
  if (raw == null) return {};
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = ApplicationDataSchema.safeParse(json);
  return result.success ? result.data : null;
}
