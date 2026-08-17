import Verifier from "@/components/Verifier";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:py-14">
      <header className="mb-10 max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-dark">
          Single label review
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Verify a label against its application
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">
          Upload the label artwork and enter the values from the application. The label
          is read automatically and any discrepancy is flagged for your review.
        </p>
      </header>

      <Verifier />

      <footer className="mt-16 border-t border-edge pt-6">
        <p className="max-w-2xl text-sm leading-relaxed text-faint">
          Prototype. Verifies brand name, class/type, alcohol content, net contents,
          bottler/producer, country of origin, and the government health warning.
        </p>
      </footer>
    </main>
  );
}
