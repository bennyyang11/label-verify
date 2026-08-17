import { describe, it, expect } from "vitest";
import { compareField } from "./compareField";

describe("compareField — lenient text (PRD Dave's case)", () => {
  it("passes brand names that differ only in case/punctuation", () => {
    expect(compareField("brand", "Stone's Throw", "STONE'S THROW").matches).toBe(true);
  });

  it("fails genuinely different brand names", () => {
    const r = compareField("brand", "Old Tom Distillery", "New Tom Distillery");
    expect(r.matches).toBe(false);
    expect(r.note).toContain("Old Tom Distillery");
  });

  it("passes class/type with different spacing", () => {
    expect(
      compareField(
        "classType",
        "Kentucky Straight Bourbon Whiskey",
        "kentucky straight  bourbon whiskey",
      ).matches,
    ).toBe(true);
  });
});

describe("compareField — ABV (numeric)", () => {
  it("matches 45% against the full label string", () => {
    expect(compareField("abv", "45%", "45% Alc./Vol. (90 Proof)").matches).toBe(true);
  });
  it("fails a real ABV mismatch", () => {
    const r = compareField("abv", "40%", "45% Alc./Vol.");
    expect(r.matches).toBe(false);
    expect(r.note).toContain("40");
  });
});

describe("compareField — net contents (unit-agnostic)", () => {
  it("matches 750 mL against 750ml", () => {
    expect(compareField("netContents", "750 mL", "750ml").matches).toBe(true);
  });
  it("matches 1.75L against 1750 mL", () => {
    expect(compareField("netContents", "1.75L", "1750 mL").matches).toBe(true);
  });
  it("fails a real volume mismatch", () => {
    expect(compareField("netContents", "750 mL", "375 mL").matches).toBe(false);
  });
  it("matches a bare number against the same number with a unit (agent shorthand)", () => {
    expect(compareField("netContents", "750", "750 mL").matches).toBe(true);
    expect(compareField("netContents", "1.75", "1.75 L").matches).toBe(true);
  });
  it("still fails a bare number that differs from the label quantity", () => {
    expect(compareField("netContents", "500", "750 mL").matches).toBe(false);
  });
});
