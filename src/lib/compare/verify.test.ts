import { describe, it, expect } from "vitest";
import type { ApplicationData, ExtractedLabel } from "@/types";
import { verifyLabel } from "./verify";
import { CANONICAL_WARNING } from "./constants";

const OLD_TOM: ApplicationData = {
  brand: "Old Tom Distillery",
  classType: "Kentucky Straight Bourbon Whiskey",
  abv: "45%",
  netContents: "750 mL",
  producer: "Old Tom Distillery, Bardstown, KY",
};

function fullLabel(): ExtractedLabel {
  return {
    brand: "OLD TOM DISTILLERY",
    classType: "Kentucky Straight Bourbon Whiskey",
    abv: "45% Alc./Vol. (90 Proof)",
    netContents: "750ml",
    producer: "Old Tom Distillery, Bardstown, KY",
    countryOfOrigin: null,
    warningText: CANONICAL_WARNING,
    warningIsAllCaps: true,
    warningIsBold: true,
    warningTextSuspiciouslySmall: false,
    confidence: { brand: 0.99 },
    unreadableFields: [],
  };
}

const byField = (r: ReturnType<typeof verifyLabel>) =>
  Object.fromEntries(r.fields.map((f) => [f.field, f]));

describe("verifyLabel (integration)", () => {
  it("passes a fully matching label", () => {
    const r = verifyLabel(OLD_TOM, fullLabel());
    expect(r.overall).toBe("pass");
    expect(byField(r).brand.status).toBe("match");
    expect(byField(r).governmentWarning.status).toBe("match");
  });

  it("flags attention on an ABV mismatch", () => {
    const label = fullLabel();
    label.abv = "40% Alc./Vol.";
    const r = verifyLabel(OLD_TOM, label);
    expect(r.overall).toBe("attention");
    expect(byField(r).abv.status).toBe("mismatch");
  });

  it("skips optional fields the agent left blank", () => {
    const r = verifyLabel(OLD_TOM, fullLabel());
    expect(byField(r).countryOfOrigin.status).toBe("skipped");
  });

  it("marks a field unreadable only when the model flagged it as such", () => {
    const label = fullLabel();
    label.brand = null;
    label.unreadableFields = ["brand"];
    const r = verifyLabel(OLD_TOM, label);
    expect(byField(r).brand.status).toBe("unreadable");
    expect(r.overall).toBe("attention");
  });

  it("treats a claimed-but-absent field as a mismatch, not unreadable", () => {
    const label = fullLabel();
    label.brand = null; // readable image, but no brand found on the label
    const r = verifyLabel(OLD_TOM, label);
    expect(byField(r).brand.status).toBe("mismatch");
    expect(byField(r).brand.note).toContain("wasn't found");
  });

  it("never errors on an empty application + empty label", () => {
    const empty: ExtractedLabel = {
      brand: null,
      classType: null,
      abv: null,
      netContents: null,
      producer: null,
      countryOfOrigin: null,
      warningText: null,
      warningIsAllCaps: false,
      warningIsBold: false,
      warningTextSuspiciouslySmall: false,
      confidence: {},
      unreadableFields: [],
    };
    const r = verifyLabel({}, empty);
    expect(r.fields).toHaveLength(7);
    // warning missing -> review, everything else skipped
    expect(r.overall).toBe("attention");
  });
});
