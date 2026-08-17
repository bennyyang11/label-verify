import { describe, it, expect } from "vitest";
import { normalizeText, normalizeWarning, parseAbv, parseVolumeMl } from "./normalize";

describe("normalizeText", () => {
  it("folds case and punctuation so brand variants collapse", () => {
    expect(normalizeText("STONE'S THROW")).toBe(normalizeText("Stone's Throw"));
  });

  it("collapses whitespace and trims", () => {
    expect(normalizeText("  Old   Tom  Distillery ")).toBe("old tom distillery");
  });

  it("handles accented characters", () => {
    expect(normalizeText("Café Société")).toBe("cafe societe");
  });
});

describe("normalizeWarning", () => {
  it("collapses newlines/whitespace and drops punctuation to a word sequence", () => {
    expect(normalizeWarning("GOVERNMENT WARNING:\n  (1) According")).toBe(
      "government warning 1 according",
    );
  });

  it("is insensitive to punctuation noise but keeps the words", () => {
    expect(normalizeWarning("birth defects.")).toBe(normalizeWarning("birth defects"));
    expect(normalizeWarning("(1) According")).toBe(normalizeWarning("1. According"));
  });
});

describe("parseAbv", () => {
  it("reads a plain percentage", () => {
    expect(parseAbv("45% Alc./Vol. (90 Proof)")).toBe(45);
  });
  it("reads decimals", () => {
    expect(parseAbv("13.5% ABV")).toBe(13.5);
  });
  it("falls back to proof / 2 when no percentage", () => {
    expect(parseAbv("90 Proof")).toBe(45);
  });
  it("returns null when nothing numeric", () => {
    expect(parseAbv("bottled by hand")).toBeNull();
  });
});

describe("parseVolumeMl", () => {
  it("treats 750 mL and 750ml identically", () => {
    expect(parseVolumeMl("750 mL")).toBe(parseVolumeMl("750ml"));
  });
  it("converts liters to ml", () => {
    expect(parseVolumeMl("1.75L")).toBeCloseTo(1750);
  });
  it("converts fl oz", () => {
    expect(parseVolumeMl("12 fl oz")).toBeCloseTo(354.88, 1);
  });
  it("returns null for unknown units", () => {
    expect(parseVolumeMl("a splash")).toBeNull();
  });
});
