"use client";

import type { FieldVerdict, VerifyResponse } from "@/types";
import { STATUS_DISPLAY } from "./fieldConfig";

interface Props {
  data: VerifyResponse;
  onReset: () => void;
}

export default function ResultsCard({ data, onReset }: Props) {
  const { result, meta } = data;
  const warning = result.fields.find((f) => f.field === "governmentWarning");
  const others = result.fields.filter((f) => f.field !== "governmentWarning");

  const pass = result.overall === "pass";
  // How many application fields were actually compared (i.e. the agent entered a
  // value). With none entered, a "pass" only means the warning checked out — so we
  // must not claim "all fields match".
  const comparedCount = others.filter((f) => f.status !== "skipped").length;
  const verdict = !pass
    ? {
        tone: "border-warn-line bg-warn-bg",
        iconTone: "bg-warn text-white",
        eyebrowCls: "text-warn",
        eyebrow: "Action required",
        title: "Some fields need review",
        body: "One or more fields could not be matched automatically. Review the details below before deciding.",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM12 3l9 16.5H3L12 3Z"
          />
        ),
      }
    : comparedCount === 0
      ? {
          tone: "border-edge bg-well",
          iconTone: "bg-skip text-white",
          eyebrowCls: "text-muted",
          eyebrow: "Nothing to compare",
          title: "Enter application values to verify the label",
          body: "No application values were entered, so only the government warning could be checked. The fields below were not compared against the label.",
          icon: (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          ),
        }
      : {
          tone: "border-ok-line bg-ok-bg",
          iconTone: "bg-ok text-white",
          eyebrowCls: "text-ok",
          eyebrow: "Verification complete",
          title: "All checked fields match the label",
          body: "Every value you entered in the application matches the label artwork.",
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          ),
        };

  return (
    <div className="space-y-6">
      {meta.mock && (
        <p className="rounded-lg border border-warn-line bg-warn-bg px-4 py-3 text-sm font-medium text-warn">
          Demonstration mode — no API key is configured, so these results are sample
          data and do not reflect an actual label read.
        </p>
      )}

      {/* Overall verdict — decision-support, never "rejected". */}
      <div
        className={`flex items-start gap-4 rounded-xl border p-6 shadow-card ${verdict.tone}`}
      >
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${verdict.iconTone}`}
          aria-hidden
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {verdict.icon}
          </svg>
        </span>
        <div>
          <p
            className={`text-xs font-bold uppercase tracking-wide ${verdict.eyebrowCls}`}
          >
            {verdict.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink">{verdict.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{verdict.body}</p>
        </div>
      </div>

      {/* Government warning — called out on its own. */}
      {warning && (
        <section>
          <SectionLabel>Required statement</SectionLabel>
          <WarningRow verdict={warning} />
        </section>
      )}

      {/* Field-by-field ledger. */}
      {others.length > 0 && (
        <section>
          <SectionLabel>Field comparison</SectionLabel>
          <div className="overflow-hidden rounded-xl border border-edge bg-card shadow-card">
            {others.map((f) => (
              <FieldRow key={f.field} verdict={f} />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-edge bg-card px-6 py-4 shadow-card">
        <span className="font-mono text-xs text-faint">
          {meta.mock ? "sample" : meta.model} · {(meta.latencyMs / 1000).toFixed(1)}s ·{" "}
          {meta.imageCount} image{meta.imageCount === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-dark"
        >
          Verify another label
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-faint">
      {children}
    </p>
  );
}

function StatusBadge({ status }: { status: FieldVerdict["status"] }) {
  const d = STATUS_DISPLAY[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${d.tag}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {d.label}
    </span>
  );
}

function FieldRow({ verdict }: { verdict: FieldVerdict }) {
  return (
    <div className="border-t border-edge px-5 py-4 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{verdict.label}</h3>
        <StatusBadge status={verdict.status} />
      </div>
      {verdict.status !== "skipped" && (
        <dl className="mt-3 grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
            Application
          </dt>
          <dd className="font-mono text-sm text-ink">{verdict.claimed ?? "—"}</dd>
          <dt className="text-xs font-semibold uppercase tracking-wide text-faint">
            Label
          </dt>
          <dd className="font-mono text-sm text-ink">{verdict.found ?? "—"}</dd>
        </dl>
      )}
      {verdict.note && verdict.status !== "match" && (
        <p className="mt-3 rounded-lg bg-well px-3 py-2 text-sm leading-relaxed text-muted">
          {verdict.note}
        </p>
      )}
    </div>
  );
}

function WarningRow({ verdict }: { verdict: FieldVerdict }) {
  const d = STATUS_DISPLAY[verdict.status];
  return (
    <div className={`rounded-xl border p-5 shadow-card ${d.row}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink">
          Government Health Warning
        </h3>
        <StatusBadge status={verdict.status} />
      </div>
      {verdict.note && (
        <p className="mt-2 text-sm leading-relaxed text-muted">{verdict.note}</p>
      )}
      {verdict.found && verdict.status !== "match" && (
        <p className="mt-3 rounded-lg border border-edge bg-card px-3.5 py-2.5 font-mono text-xs leading-relaxed text-ink">
          {verdict.found}
        </p>
      )}
    </div>
  );
}
