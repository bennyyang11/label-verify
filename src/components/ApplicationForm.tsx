"use client";

import type { ApplicationData } from "@/types";
import { FORM_FIELDS } from "./fieldConfig";

interface Props {
  values: ApplicationData;
  onChange: (values: ApplicationData) => void;
  disabled?: boolean;
}

export default function ApplicationForm({ values, onChange, disabled }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        Enter the values from the application. Leave a field blank to skip it.
      </p>
      {FORM_FIELDS.map((field) => (
        <div key={field.key}>
          <label
            htmlFor={field.key}
            className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-ink"
          >
            <span>{field.label}</span>
            {field.hint && (
              <span className="text-xs font-normal text-faint">{field.hint}</span>
            )}
          </label>
          <input
            id={field.key}
            type="text"
            value={values[field.key] ?? ""}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(e) => onChange({ ...values, [field.key]: e.target.value })}
            className="w-full rounded-lg border border-edge-strong bg-card px-3.5 py-2.5 text-base text-ink transition-colors placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
        </div>
      ))}
    </div>
  );
}
