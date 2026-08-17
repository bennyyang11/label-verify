import { describe, it, expect } from "vitest";
import { parseExpectedCsv, buildTemplateCsv, buildResultsCsv } from "./csv";
import type { VerificationResult } from "@/types";

describe("parseExpectedCsv", () => {
  it("maps filename rows to application data with friendly headers", () => {
    const csv = [
      "filename,brand,class_type,abv,net_contents,country_of_origin",
      "a.jpg,Old Tom Distillery,Bourbon Whiskey,45%,750 mL,",
      "b.jpg,Stone's Throw,Vodka,40%,1L,France",
    ].join("\n");
    const parsed = parseExpectedCsv(csv);
    expect(parsed?.rowCount).toBe(2);
    expect(parsed?.map["a.jpg"]).toEqual({
      brand: "Old Tom Distillery",
      classType: "Bourbon Whiskey",
      abv: "45%",
      netContents: "750 mL",
    });
    expect(parsed?.map["b.jpg"].countryOfOrigin).toBe("France");
  });

  it("ignores rows without a filename and tolerates header casing/spacing", () => {
    const csv = "Filename, Brand , ABV\nx.png, Acme , 5%\n,orphan,9%";
    const parsed = parseExpectedCsv(csv);
    expect(parsed?.rowCount).toBe(1);
    expect(parsed?.map["x.png"]).toEqual({ brand: "Acme", abv: "5%" });
  });

  it("returns null for empty input", () => {
    expect(parseExpectedCsv("")).toBeNull();
  });
});

describe("buildTemplateCsv", () => {
  it("includes the expected header columns", () => {
    const t = buildTemplateCsv();
    expect(t).toContain("filename");
    expect(t).toContain("class_type");
    expect(t).toContain("country_of_origin");
  });
});

describe("buildResultsCsv", () => {
  it("flattens per-field statuses and collects mismatch notes", () => {
    const result: VerificationResult = {
      overall: "attention",
      fields: [
        { field: "brand", label: "Brand Name", status: "match", claimed: "X", found: "X", confidence: 1 },
        {
          field: "abv",
          label: "Alcohol Content",
          status: "mismatch",
          claimed: "40%",
          found: "45%",
          confidence: 1,
          note: "claims 40% but label shows 45%",
        },
      ],
    };
    const csv = buildResultsCsv([{ filename: "a.jpg", result }]);
    expect(csv).toContain("a.jpg");
    expect(csv).toContain("attention");
    expect(csv).toContain("claims 40%");
  });

  it("marks errored rows", () => {
    const csv = buildResultsCsv([{ filename: "bad.jpg", error: "timeout" }]);
    expect(csv).toContain("error");
    expect(csv).toContain("timeout");
  });
});
