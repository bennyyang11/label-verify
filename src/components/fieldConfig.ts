import type { ApplicationData, VerdictStatus } from "@/types";

/** The claimed-data form fields, in display order. Keys match ApplicationData. */
export const FORM_FIELDS: {
  key: keyof ApplicationData;
  label: string;
  placeholder: string;
  hint?: string;
}[] = [
  { key: "brand", label: "Brand Name", placeholder: "OLD TOM DISTILLERY" },
  {
    key: "classType",
    label: "Class / Type",
    placeholder: "Kentucky Straight Bourbon Whiskey",
  },
  { key: "abv", label: "Alcohol Content", placeholder: "45% Alc./Vol. (90 Proof)" },
  { key: "netContents", label: "Net Contents", placeholder: "750 mL" },
  {
    key: "producer",
    label: "Bottler / Producer",
    placeholder: "Old Tom Distillery, Bardstown, KY",
  },
  {
    key: "countryOfOrigin",
    label: "Country of Origin",
    placeholder: "France",
    hint: "Imports only",
  },
];

/**
 * Visual treatment per verdict status. `tag` styles the small inline status pill
 * (tinted, rounded); `row` styles a full callout container.
 */
export const STATUS_DISPLAY: Record<
  VerdictStatus,
  { label: string; tag: string; row: string }
> = {
  match: {
    label: "Match",
    tag: "border-ok-line bg-ok-bg text-ok",
    row: "border-ok-line bg-ok-bg",
  },
  mismatch: {
    label: "Mismatch",
    tag: "border-bad-line bg-bad-bg text-bad",
    row: "border-bad-line bg-bad-bg",
  },
  unreadable: {
    label: "Unreadable",
    tag: "border-warn-line bg-warn-bg text-warn",
    row: "border-warn-line bg-warn-bg",
  },
  review: {
    label: "Review Required",
    tag: "border-warn-line bg-warn-bg text-warn",
    row: "border-warn-line bg-warn-bg",
  },
  skipped: {
    label: "Not Checked",
    tag: "border-skip-line bg-skip-bg text-skip",
    row: "border-skip-line bg-skip-bg",
  },
};
