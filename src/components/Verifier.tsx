"use client";

import { useState } from "react";
import type { ApplicationData, VerifyError, VerifyResponse } from "@/types";
import ImageDropzone from "./ImageDropzone";
import ApplicationForm from "./ApplicationForm";
import ResultsCard from "./ResultsCard";

type Status = "idle" | "loading" | "done" | "error";

export default function Verifier() {
  const [images, setImages] = useState<File[]>([]);
  const [values, setValues] = useState<ApplicationData>({});
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const busy = status === "loading";
  const canSubmit = images.length > 0 && !busy;

  async function submit() {
    setStatus("loading");
    setErrorMsg(null);

    const form = new FormData();
    images.forEach((f) => form.append("images", f));
    form.append("application", JSON.stringify(values));

    try {
      const res = await fetch("/api/verify", { method: "POST", body: form });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as VerifyError | null;
        setErrorMsg(err?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setResult((await res.json()) as VerifyResponse);
      setStatus("done");
    } catch {
      setErrorMsg("Couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  function reset() {
    setImages([]);
    setValues({});
    setResult(null);
    setErrorMsg(null);
    setStatus("idle");
  }

  if (status === "done" && result) {
    return <ResultsCard data={result} onReset={reset} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-edge bg-card p-6 shadow-card">
          <StepHeading n={1} title="Label image" />
          <ImageDropzone images={images} onChange={setImages} disabled={busy} />
        </section>
        <section className="rounded-xl border border-edge bg-card p-6 shadow-card">
          <StepHeading n={2} title="Application details" />
          <ApplicationForm values={values} onChange={setValues} disabled={busy} />
        </section>
      </div>

      {status === "error" && errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-bad-line bg-bad-bg px-4 py-3 text-sm font-medium text-bad"
        >
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-edge bg-card p-5 shadow-card">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-3 rounded-lg bg-primary px-8 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-edge disabled:text-faint disabled:shadow-none"
        >
          {busy ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden
              />
              Reading label…
            </>
          ) : (
            "Verify label"
          )}
        </button>
        {images.length === 0 && (
          <p className="text-sm text-faint">Add a label image to begin.</p>
        )}
      </div>
    </div>
  );
}

function StepHeading({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
        {n}
      </span>
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink">{title}</h2>
    </div>
  );
}
