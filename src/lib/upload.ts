import type { FileRejection } from "react-dropzone";
import { MAX_FILE_BYTES, MAX_IMAGES, SUPPORTED_MEDIA_TYPES } from "./validation";

/**
 * Client-side upload filters, derived from the same limits the API enforces
 * (src/lib/validation.ts) so the dropzones and the server can never drift apart.
 */

/** react-dropzone `accept` map — keyed by MIME type, no extension constraint. */
export const ACCEPT: Record<string, string[]> = Object.fromEntries(
  SUPPORTED_MEDIA_TYPES.map((t) => [t, []]),
);

/** Human-readable accepted formats, e.g. for helper text and error messages. */
export const ACCEPTED_LABEL = "JPG, PNG, or WebP";

/** Per-file size ceiling, in whole MB, for display. */
export const MAX_FILE_MB = Math.round(MAX_FILE_BYTES / 1024 / 1024);

/**
 * Turn react-dropzone rejections into plain-language messages an agent can act on.
 * One line per rejected file, plus a single summary line if too many were dropped.
 */
export function describeRejections(rejections: FileRejection[]): string[] {
  const msgs: string[] = [];
  for (const { file, errors } of rejections) {
    const codes = new Set(errors.map((e) => e.code));
    if (codes.has("too-many-files")) continue; // summarized once below
    if (codes.has("file-invalid-type")) {
      msgs.push(`"${file.name}" isn't a supported image — use ${ACCEPTED_LABEL}.`);
    } else if (codes.has("file-too-large")) {
      msgs.push(`"${file.name}" is larger than ${MAX_FILE_MB} MB.`);
    } else {
      msgs.push(`"${file.name}" couldn't be added.`);
    }
  }
  if (rejections.some((r) => r.errors.some((e) => e.code === "too-many-files"))) {
    msgs.push(`You can upload up to ${MAX_IMAGES} images at a time.`);
  }
  return msgs;
}
