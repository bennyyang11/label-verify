import BatchVerifier from "@/components/BatchVerifier";

export default function BatchPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:py-14">
      <header className="mb-10 max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-dark">
          Batch review
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Verify many labels at once
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">
          Upload a set of labels — optionally with a CSV of expected application values —
          and review every result in a single table.
        </p>
      </header>

      <BatchVerifier />
    </main>
  );
}
