"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import type { ApplicationData, VerificationResult, VerifyError } from "@/types";
import { STATUS_DISPLAY } from "./fieldConfig";
import { MAX_FILE_BYTES } from "@/lib/validation";
import { ACCEPT, ACCEPTED_LABEL, describeRejections, MAX_FILE_MB } from "@/lib/upload";
import {
  buildResultsCsv,
  buildTemplateCsv,
  parseExpectedCsv,
} from "@/lib/csv";

const CONCURRENCY = 6;

type RowStatus = "pending" | "running" | "done" | "error";
interface BatchRow {
  id: string;
  name: string;
  file: File;
  expected: ApplicationData;
  status: RowStatus;
  result?: VerificationResult;
  error?: string;
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number,
) {
  let idx = 0;
  const next = async (): Promise<void> => {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length || 1) }, next),
  );
}

export default function BatchVerifier() {
  const [files, setFiles] = useState<File[]>([]);
  const [expectedMap, setExpectedMap] = useState<Record<string, ApplicationData> | null>(
    null,
  );
  const [csvName, setCsvName] = useState<string | null>(null);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [phase, setPhase] = useState<"setup" | "running" | "done">("setup");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejected, setRejected] = useState<string[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_FILE_BYTES,
    disabled: phase !== "setup",
    onDrop: (accepted, fileRejections) => {
      setFiles((prev) => [...prev, ...accepted]);
      setRejected(describeRejections(fileRejections));
    },
  });

  const matched = useMemo(() => {
    if (!expectedMap) return 0;
    return files.filter((f) => expectedMap[f.name.toLowerCase()]).length;
  }, [files, expectedMap]);

  // Stable so memoized rows don't re-render when an unrelated row updates.
  const toggle = useCallback(
    (id: string) => setExpandedId((cur) => (cur === id ? null : id)),
    [],
  );

  async function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseExpectedCsv(text);
    if (!parsed) {
      setExpectedMap(null);
      setCsvName(`${file.name} (couldn't read as CSV)`);
      return;
    }
    setExpectedMap(parsed.map);
    setCsvName(file.name);
  }

  function patch(id: string, p: Partial<BatchRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  async function run() {
    const initial: BatchRow[] = files.map((file, i) => ({
      id: `${i}-${file.name}`,
      name: file.name,
      file,
      expected: expectedMap?.[file.name.toLowerCase()] ?? {},
      status: "pending",
    }));
    setRows(initial);
    setPhase("running");

    await runPool(
      initial,
      async (row) => {
        patch(row.id, { status: "running" });
        const form = new FormData();
        form.append("images", row.file);
        form.append("application", JSON.stringify(row.expected));
        try {
          const res = await fetch("/api/verify", { method: "POST", body: form });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as VerifyError | null;
            patch(row.id, { status: "error", error: err?.error ?? "Failed" });
            return;
          }
          const data = await res.json();
          patch(row.id, { status: "done", result: data.result });
        } catch {
          patch(row.id, { status: "error", error: "Network error" });
        }
      },
      CONCURRENCY,
    );
    setPhase("done");
  }

  function reset() {
    setFiles([]);
    setExpectedMap(null);
    setCsvName(null);
    setRows([]);
    setExpandedId(null);
    setRejected([]);
    setPhase("setup");
  }

  const summary = useMemo(() => {
    const done = rows.filter((r) => r.status === "done");
    return {
      total: rows.length,
      finished: rows.filter((r) => r.status === "done" || r.status === "error").length,
      pass: done.filter((r) => r.result?.overall === "pass").length,
      attention: done.filter((r) => r.result?.overall === "attention").length,
      errors: rows.filter((r) => r.status === "error").length,
    };
  }, [rows]);

  // ---------- Setup view ----------
  if (phase === "setup") {
    return (
      <div className="space-y-6">
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            isDragActive
              ? "border-primary bg-primary-soft"
              : "border-edge-strong bg-well hover:border-primary"
          }`}
        >
          <input {...getInputProps()} />
          <span
            className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft"
            aria-hidden
          >
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
          </span>
          <p className="mt-4 text-sm font-semibold text-ink">Drag label images here</p>
          <p className="mt-1 text-sm text-muted">
            {files.length > 0
              ? `${files.length} image${files.length === 1 ? "" : "s"} ready for verification`
              : "Or click to browse. Select as many as you need."}
          </p>
          <p className="mt-3 text-xs text-faint">
            {ACCEPTED_LABEL} · up to {MAX_FILE_MB} MB each
          </p>
        </div>

        {rejected.length > 0 && (
          <ul role="alert" className="space-y-1 text-sm font-medium text-bad">
            {rejected.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        )}

        {files.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted">
              {files.length} image{files.length === 1 ? "" : "s"} selected
            </span>
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setRejected([]);
              }}
              className="rounded-lg border border-edge-strong bg-card px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="rounded-xl border border-edge bg-card p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-faint">
            Expected values · optional
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Upload a CSV to verify each label against its application. Match rows to
            images using a{" "}
            <code className="rounded-md bg-well px-1.5 py-0.5 font-mono text-xs text-ink">
              filename
            </code>{" "}
            column. Without a CSV, each label is read and checked for the government
            warning only.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="cursor-pointer rounded-lg border border-edge-strong px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary">
              Choose CSV
              <input type="file" accept=".csv,text/csv" onChange={onCsv} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => downloadText("label-check-template.csv", buildTemplateCsv())}
              className="text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary-dark"
            >
              Download template
            </button>
            {csvName && (
              <span className="font-mono text-xs text-muted">
                {csvName} · matched {matched} of {files.length}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={files.length === 0}
          className="w-full rounded-lg bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-edge disabled:text-faint disabled:shadow-none"
        >
          Verify {files.length || ""} label{files.length === 1 ? "" : "s"}
        </button>
      </div>
    );
  }

  // ---------- Running / done view ----------
  const pct = summary.total ? Math.round((summary.finished / summary.total) * 100) : 0;
  return (
    <div className="space-y-6">
      <SummaryBar summary={summary} running={phase === "running"} pct={pct} />

      <div className="overflow-hidden rounded-xl border border-edge bg-card shadow-card">
        <table className="w-full text-left">
          <thead className="border-b border-edge bg-well">
            <tr className="text-xs font-bold uppercase tracking-wide text-faint">
              <th className="px-4 py-3 font-bold">Label</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Summary</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <BatchRowView
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={toggle}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-edge bg-card px-6 py-4 shadow-card">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-edge-strong px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Start over
        </button>
        <button
          type="button"
          disabled={phase !== "done"}
          onClick={() =>
            downloadText(
              "label-check-results.csv",
              buildResultsCsv(
                rows.map((r) => ({ filename: r.name, result: r.result, error: r.error })),
              ),
            )
          }
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:bg-edge disabled:text-faint disabled:shadow-none"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}

function SummaryBar({
  summary,
  running,
  pct,
}: {
  summary: { total: number; finished: number; pass: number; attention: number; errors: number };
  running: boolean;
  pct: number;
}) {
  return (
    <div className="rounded-xl border border-edge bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-lg font-bold text-ink">
          {running
            ? `Reading labels — ${summary.finished} of ${summary.total}`
            : `Complete — ${summary.total} labels`}
        </span>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ok-line bg-ok-bg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ok">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {summary.pass} matched
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warn-line bg-warn-bg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warn">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {summary.attention} to review
          </span>
          {summary.errors > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-bad-line bg-bad-bg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-bad">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {summary.errors} failed
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-edge">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const BatchRowView = memo(function BatchRowView({
  row,
  expanded,
  onToggle,
}: {
  row: BatchRow;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const overall =
    row.status === "error"
      ? { text: "Failed", cls: "border-bad-line bg-bad-bg text-bad" }
      : row.status === "done"
        ? row.result?.overall === "pass"
          ? { text: "Matches", cls: "border-ok-line bg-ok-bg text-ok" }
          : { text: "Review", cls: "border-warn-line bg-warn-bg text-warn" }
        : {
            text: row.status === "running" ? "Reading…" : "Waiting",
            cls: "border-edge bg-well text-muted",
          };

  const issues =
    row.result?.fields.filter((f) => f.status === "mismatch" || f.status === "review")
      .length ?? 0;

  return (
    <>
      <tr
        className="cursor-pointer border-t border-edge transition-colors first:border-t-0 hover:bg-well"
        onClick={() => onToggle(row.id)}
      >
        <td className="px-4 py-3 font-mono text-xs text-ink">{row.name}</td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${overall.cls}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {overall.text}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-muted">
          {row.status === "error"
            ? row.error
            : row.status === "done"
              ? issues > 0
                ? `${issues} item${issues === 1 ? "" : "s"} to review`
                : "All checks passed"
              : "—"}
        </td>
      </tr>
      {expanded && row.result && (
        <tr className="bg-well">
          <td colSpan={3} className="px-4 py-3">
            <div className="space-y-2">
              {row.result.fields.map((f) => {
                const d = STATUS_DISPLAY[f.status];
                return (
                  <div key={f.field} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${d.tag}`}
                    >
                      {d.label}
                    </span>
                    <span className="w-36 shrink-0 font-semibold text-ink">
                      {f.label}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {f.status === "skipped"
                        ? "not checked"
                        : f.note ?? `${f.claimed ?? "—"} → ${f.found ?? "—"}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
});
