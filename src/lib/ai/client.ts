import Anthropic from "@anthropic-ai/sdk";

/**
 * The vision model used for label extraction.
 *
 * Default is `claude-opus-4-8` (most capable). Override via `ANTHROPIC_MODEL` —
 * because the PRD's ≤5s latency is a hard kill-criterion, a faster tier
 * (`claude-sonnet-4-6`, or `claude-haiku-4-5`) may be the right production
 * choice for this structured-extraction task. We measure latency once a key is
 * present (PRD Phase 2) and tune this knob from there.
 */
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

let cached: Anthropic | null = null;

/** Lazily construct the Anthropic client. Throws a clear error if no key is set. */
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key.",
    );
  }
  // Bound retries: the SDK default (2 with exponential backoff) can blow past
  // the ~5s interactive budget on a transient 429/5xx. Fail fast instead.
  cached ??= new Anthropic({ maxRetries: 1 });
  return cached;
}

/** Whether a key is configured — lets the UI/API degrade gracefully without one. */
export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
