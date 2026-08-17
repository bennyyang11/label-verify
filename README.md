# TTB Label Verification

A prototype that helps TTB compliance agents verify that an alcohol label's artwork matches the data in its application. Upload a label photo (or a few hundred), and the app reads each label with a vision model and checks it field-by-field — fast, and simple enough for a non-technical user.

---

## What it does

Compliance agents spend much of their day on what is essentially matching: does the brand name on the label match the application? The ABV? Is the government warning present and correct? This tool automates that matching so agents can focus on judgment calls.

For each label it verifies:

- **Brand name**
- **Class / type** designation
- **Alcohol content** (ABV / proof)
- **Net contents**
- **Bottler / producer** name & address
- **Country of origin** (imports)
- **Government Health Warning Statement** (mandatory)

It returns a clear per-field verdict — **match / mismatch / needs-review / not-checked** — with *what was claimed*, *what the label said*, and *why*. It is **decision support**: it flags and explains; it never auto-rejects. The agent makes the call.

## Key features

| Feature | Notes |
|---|---|
| **Single-label check** | Drop a photo (front + back), enter the application values, get a result card |
| **Batch mode** | Upload hundreds of labels + an optional CSV of expected values → results table + CSV export |
| **Two matching modes** | *Lenient* for brand/type/etc. (case- and punctuation-insensitive, unit-aware), *strict* for the government warning |
| **Multi-image** | Front + back in one check (the warning usually lives on the back) |
| **Imperfect images** | The vision model reads through glare, angle, and low light |
| **Simple, high-contrast UI** | Large fonts, one obvious action — built for varied tech comfort |

## How it works

```
Image(s) + claimed data
        │
        ▼
  /api/verify  ──►  Claude vision (extract fields + warning formatting flags)
        │
        ▼
  comparison engine   ── lenient(brand, type, abv, …)
   (our code)         ── strict(government warning: wording + ALL-CAPS + bold + size)
        │
        ▼
  per-field VerificationResult  ──►  results UI
```

**The vision model only observes; our code decides.** This split is deliberate — and the government warning forces it:

- The warning's **exact wording** is matched against the canonical TTB statement **in code** (deterministic and auditable — far more reliable than asking an LLM "is this word-for-word correct?").
- The warning's **formatting** (is `GOVERNMENT WARNING:` actually **bold** and **ALL CAPS**?) can only be *seen* by the vision model.

So the model returns the field text **plus** observed formatting booleans, and the comparison engine makes every verdict. Benefits: the matching logic is unit-tested, the verdicts are explainable ("here's exactly why it failed"), and latency is unchanged (still one vision call).

The two matching modes reflect a real tension surfaced in the stakeholder interviews: brand names need *judgment* ("STONE'S THROW" == "Stone's Throw"), while the warning must be *exact* (title-case "Government Warning" is a rejection). See `src/lib/compare/`.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Anthropic SDK** (`@anthropic-ai/sdk`) — Claude vision with **structured outputs** (Zod schema → guaranteed response shape)
- **react-dropzone** (uploads), **papaparse** (CSV), **vitest** (tests)

## Getting started

### Prerequisites
- **Node.js 20 or newer** (developed on 22) — verify with `node -v`.
- **An Anthropic API key** — create one at [console.anthropic.com](https://console.anthropic.com) → **API Keys**. This is separate from a Claude.ai subscription; it's usage-based and a few test reads cost pennies. (No key yet? The app still runs in **mock mode** — see step 4.)

### Run it locally

```bash
# 1. Clone the repository and enter it
git clone https://github.com/bennyyang11/label-verify.git
cd label-verify

# 2. Install dependencies
npm install

# 3. Create your env file and add your API key
cp .env.example .env.local
#    then open .env.local and fill in ANTHROPIC_API_KEY (see below)

# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000** in your browser.

**Your `.env.local` should contain:**
```bash
ANTHROPIC_API_KEY=sk-ant-...            # required for real label reads
ANTHROPIC_MODEL=claude-sonnet-4-6       # recommended — meets the ~5s target (the in-code default is opus, which is slower)
# REQUEST_TIMEOUT_MS=12000              # optional — per-request timeout in ms
```

> **No API key?** The app still runs in **mock mode** — every read returns a clearly-labeled sample extraction so you can click through the entire flow end to end. Real verification requires a key.

### Try it with the included fixtures
With the dev server running, drag any image from `test-labels/batch/` onto the **Single** tab — or open the **Batch** tab, drop the whole `test-labels/batch/` folder, and attach `test-labels/batch/expected.csv`. That CSV holds the application values for each fixture; the behavior each fixture exercises is described under [QA](#qa).

### Other commands
```bash
npm test            # unit tests — comparison engine + CSV parsing
npm run build       # production build
npm run lint        # lint
```

## Usage

**Single label:** **Single** tab → drop the front (and back) image → fill in the application values (leave any field blank to skip it) → **Verify label**.

**Batch:** **Batch** tab → drop many labels → optionally attach a CSV of expected values (download the template; match rows to images by a `filename` column) → **Verify** → review the table, expand any row for detail, **Export CSV**. Without a CSV it runs extract-only and still flags warning issues.

## QA

Two layers of testing:

- **Unit tests** (`npm test`) cover the comparison engine for every scenario (`src/lib/compare/*.test.ts`) — lenient brand/type/ABV/net-contents matching and the strict government-warning checks (wording, ALL-CAPS, bold, buried text). These run with no API key.
- **End-to-end fixtures** in `test-labels/` are a controlled set of generated labels — one behavior each: clean pass, ABV mismatch, title-case warning, reworded warning, glare/rotation, accented import + country of origin, ABV-exempt wine, and a front/back split (warning on the back). `test-labels/batch/expected.csv` holds the application values for each. With a real API key, every fixture reproduces the behavior it's named for.

## Approach & key decisions

- **Photo → vision LLM → verify.** No OCR vendor, no custom model, no training. A vision LLM reads imperfect images well and extracts structured fields in one call.
- **Hybrid verdict (model extracts, code decides)** — for testability, auditability, and correct warning handling (above).
- **Logic before UI** — the comparison engine was built and fully unit-tested before any interface existed.
- **Structured outputs** — the model is *forced* to return our exact contract via a Zod schema, so there's no brittle JSON parsing.
- **Decision-support, not auto-reject** — honoring the agents' need for judgment; every verdict is explained and overridable.

## Assumptions

- **Standalone prototype** — no COLA integration (explicitly out of scope per the brief).
- **No persistence** — images are processed in memory per request; nothing is stored. (Production would need PII/retention handling — out of scope here.)
- **Input** — agents type/paste the application values (single) or provide a CSV (batch). Supported images: JPG, PNG, WebP.
- **Warning target** — the canonical TTB statement in 27 CFR §16.21; the `GOVERNMENT WARNING:` heading must be all-caps and bold.
- **Brand/type/etc.** tolerate case, punctuation, accents, and unit formatting; **the warning does not**.

## Trade-offs & limitations

- **Latency vs. model.** The ≤5s target is a real constraint. The default model is `claude-opus-4-8`; for production this task (structured extraction) likely wants the faster **Sonnet 4.6 / Haiku 4.5** tier — a one-line `ANTHROPIC_MODEL` change. Tuned against real reads during QA.
- **Network / firewall (production).** The customer network blocks many outbound ML endpoints. This prototype calls the Anthropic API directly; in production the call would route through **Azure** (they're already on Azure/FedRAMP) to stay inside the network boundary.
- **Batch scale.** Processing is bounded at 6 concurrent requests; at true 300-label volume some requests may hit rate limits — those surface per-row as "Failed" with the reason rather than crashing the batch. A production version would use the Batches API or server-side queueing.
- **ABV tolerance.** ABV is matched ~exactly; TTB allows small per-class tolerances (e.g. ±0.3% for some spirits) not yet encoded — flagged for review rather than silently passed.
- **Image size.** Up to 8 MB/image is sent as-is; client-side downscaling (e.g. `sharp`) would trim latency on large phone photos but adds a heavy native dependency, so it's left out of the prototype.
- **Warning bold/size detection** depends on the vision model's reading of formatting; clear images are reliable, but extreme cases may warrant a second look (which the decision-support framing already encourages).

## Project structure

```
src/
  app/
    page.tsx              single-label page
    batch/page.tsx        batch page
    api/verify/route.ts   POST /api/verify (validate → extract → compare)
    layout.tsx, globals.css
  components/              Verifier, BatchVerifier, ImageDropzone, ApplicationForm, ResultsCard, Nav
  lib/
    compare/              the verdict engine (lenient + strict) — fully unit-tested
    ai/                   Claude vision extraction (structured outputs) + mock
    csv.ts, validation.ts, upload.ts
  types/                  shared domain types
```

## Deployment

Deployed on **Vercel** (Node runtime — Vercel detects Next.js automatically, no extra config):

1. Import the repository in Vercel.
2. Under **Project → Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your key
   - `ANTHROPIC_MODEL` = `claude-sonnet-4-6`
3. Deploy.

Environment variables only apply to the **next** build, so if you add them after the first deploy, trigger a redeploy. Without a key the deployed app still loads but runs in mock mode.
