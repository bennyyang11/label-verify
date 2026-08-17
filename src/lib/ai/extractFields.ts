import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { ExtractedLabel, FieldKey } from "@/types";
import { getClient, MODEL } from "./client";
import { ExtractedLabelSchema, FIELD_KEYS } from "./schema";
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_TEXT } from "./prompt";

const VALID_FIELD_KEYS = new Set<string>(FIELD_KEYS);

/** Image media types Claude vision accepts that we support (PRD FR-1). */
export type SupportedMediaType = "image/jpeg" | "image/png" | "image/webp";

export interface ImageInput {
  /** Base64-encoded image bytes (no data: URI prefix). */
  base64: string;
  mediaType: SupportedMediaType;
}

/**
 * Build the message content array for one or more label images.
 * Pure + exported so it can be unit-tested without hitting the API.
 */
export function buildContent(
  images: ImageInput[],
): Anthropic.ContentBlockParam[] {
  if (images.length === 0) {
    throw new Error("At least one label image is required.");
  }
  const imageBlocks: Anthropic.ContentBlockParam[] = images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.mediaType, data: img.base64 },
  }));
  return [...imageBlocks, { type: "text", text: EXTRACTION_USER_TEXT }];
}

/**
 * Read label image(s) with Claude vision and return the structured
 * `ExtractedLabel` contract — observed facts only. Verdicts happen in the
 * comparison engine (PRD §6).
 */
export async function extractFields(
  images: ImageInput[],
  opts: { timeoutMs?: number } = {},
): Promise<ExtractedLabel> {
  const client = getClient();

  const response = await client.messages.parse(
    {
      model: MODEL,
      max_tokens: 2048,
      // Structured extraction, not deep reasoning — keep latency under the ~5s budget.
      thinking: { type: "disabled" },
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildContent(images) }],
      output_config: {
        format: zodOutputFormat(ExtractedLabelSchema),
      },
    },
    opts.timeoutMs ? { timeout: opts.timeoutMs } : undefined,
  );

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Vision model did not return a parseable label structure.");
  }

  // Keep only recognized field keys — guards against a stray value (e.g. the
  // model naming a field outside our set) without failing the whole extraction.
  const unreadableFields = parsed.unreadableFields.filter((f): f is FieldKey =>
    VALID_FIELD_KEYS.has(f),
  );

  return { ...parsed, unreadableFields };
}
