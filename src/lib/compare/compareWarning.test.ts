import { describe, it, expect } from "vitest";
import type { ExtractedLabel } from "@/types";
import { compareWarning } from "./compareWarning";
import { CANONICAL_WARNING } from "./constants";

/** A correctly-formatted warning as the vision model would report it. */
function goodWarning(): ExtractedLabel {
  return {
    brand: null,
    classType: null,
    abv: null,
    netContents: null,
    producer: null,
    countryOfOrigin: null,
    warningText: CANONICAL_WARNING,
    warningIsAllCaps: true,
    warningIsBold: true,
    warningTextSuspiciouslySmall: false,
    confidence: {},
    unreadableFields: [],
  };
}

describe("compareWarning (PRD FR-3 strict)", () => {
  it("passes the exact, correctly-formatted warning", () => {
    expect(compareWarning(goodWarning()).status).toBe("match");
  });

  it("tolerates extra whitespace / line breaks in the wording", () => {
    const e = goodWarning();
    e.warningText = CANONICAL_WARNING.replace(/ /g, "  ").replace("(2)", "\n(2)");
    expect(compareWarning(e).status).toBe("match");
  });

  it("fails title-case heading (Jenny's catch) via the all-caps flag", () => {
    const e = goodWarning();
    e.warningIsAllCaps = false;
    const r = compareWarning(e);
    expect(r.status).toBe("mismatch");
    expect(r.note).toContain("ALL CAPS");
  });

  it("fails a non-bold heading", () => {
    const e = goodWarning();
    e.warningIsBold = false;
    expect(compareWarning(e).note).toContain("bold");
  });

  it("fails reworded / altered text", () => {
    const e = goodWarning();
    e.warningText = CANONICAL_WARNING.replace(
      "operate machinery",
      "operate heavy machinery",
    );
    const r = compareWarning(e);
    expect(r.status).toBe("mismatch");
    expect(r.note).toContain("word-for-word");
  });

  it("fails suspiciously small / buried text", () => {
    const e = goodWarning();
    e.warningTextSuspiciouslySmall = true;
    expect(compareWarning(e).note).toContain("small");
  });

  it("flags a missing warning for review (could be on the back label)", () => {
    const e = goodWarning();
    e.warningText = null;
    const r = compareWarning(e);
    expect(r.status).toBe("review");
    expect(r.note).toContain("back label");
  });

  it("reports multiple problems at once", () => {
    const e = goodWarning();
    e.warningIsAllCaps = false;
    e.warningIsBold = false;
    const r = compareWarning(e);
    expect(r.note).toContain("ALL CAPS");
    expect(r.note).toContain("bold");
  });
});
