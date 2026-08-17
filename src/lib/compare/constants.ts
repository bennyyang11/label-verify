/**
 * The exact TTB Government Health Warning Statement (27 CFR §16.21).
 * This is the canonical target for the strict warning match (PRD FR-3).
 * The "GOVERNMENT WARNING:" heading must additionally be ALL CAPS and bold —
 * that formatting is checked separately via the vision model's observed flags.
 */
export const CANONICAL_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not " +
  "drink alcoholic beverages during pregnancy because of the risk of birth defects. " +
  "(2) Consumption of alcoholic beverages impairs your ability to drive a car or " +
  "operate machinery, and may cause health problems.";
