import { describe, it, expect } from "vitest";
import { buildContent } from "./extractFields";
import { ExtractedLabelSchema } from "./schema";
import { mockExtractedLabel } from "./mock";

describe("buildContent", () => {
  it("emits one image block per image plus a trailing text instruction", () => {
    const content = buildContent([
      { base64: "AAAA", mediaType: "image/png" },
      { base64: "BBBB", mediaType: "image/jpeg" },
    ]);
    expect(content).toHaveLength(3);
    expect(content[0]).toMatchObject({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: "AAAA" },
    });
    expect(content[2].type).toBe("text");
  });

  it("throws when given no images", () => {
    expect(() => buildContent([])).toThrow(/at least one/i);
  });
});

describe("schema ↔ contract alignment", () => {
  it("the mock extraction validates against the structured-output schema", () => {
    // Guards that ExtractedLabel, the Zod schema, and the mock stay in sync.
    expect(() => ExtractedLabelSchema.parse(mockExtractedLabel())).not.toThrow();
  });
});
