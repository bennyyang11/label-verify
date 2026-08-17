import { z } from "zod";

/**
 * Zod schema mirroring the `ExtractedLabel` contract (PRD §6). The vision model
 * is forced to return exactly this shape via structured outputs — observed facts
 * only, no verdicts. The comparison engine decides everything downstream.
 */
export const FIELD_KEYS = [
  "brand",
  "classType",
  "abv",
  "netContents",
  "producer",
  "countryOfOrigin",
  "governmentWarning",
] as const;

export const ExtractedLabelSchema = z.object({
  brand: z.string().nullable(),
  classType: z.string().nullable(),
  abv: z.string().nullable(),
  netContents: z.string().nullable(),
  producer: z.string().nullable(),
  countryOfOrigin: z.string().nullable(),

  // Government warning — verbatim text plus observed formatting facts.
  warningText: z.string().nullable(),
  warningIsAllCaps: z.boolean(),
  warningIsBold: z.boolean(),
  warningTextSuspiciouslySmall: z.boolean(),

  // 0–1 confidence per field.
  confidence: z.object({
    brand: z.number(),
    classType: z.number(),
    abv: z.number(),
    netContents: z.number(),
    producer: z.number(),
    countryOfOrigin: z.number(),
    governmentWarning: z.number(),
  }),

  // Fields the model genuinely couldn't read (glare, blur, bad angle).
  // Kept as a loose string array so a stray value never fails the whole parse;
  // extractFields() filters this down to valid FieldKeys (see FIELD_KEYS).
  unreadableFields: z.array(z.string()),
});

export type ExtractedLabelOutput = z.infer<typeof ExtractedLabelSchema>;
