import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedLabel, VerifyError, VerifyResponse } from "@/types";
import { extractFields, hasApiKey, MODEL, mockExtractedLabel } from "@/lib/ai";
import type { ImageInput } from "@/lib/ai";
import { verifyLabel } from "@/lib/compare";
import {
  isSupportedMediaType,
  MAX_FILE_BYTES,
  MAX_IMAGES,
  MAX_TOTAL_BYTES,
  parseApplicationData,
} from "@/lib/validation";

export const runtime = "nodejs";
// Hang-guard ceiling for the platform; the ~5s target is met via model choice,
// and we additionally pass a request timeout to the SDK (below).
export const maxDuration = 30;

// Kept below maxDuration/2 so even a retried timeout (SDK maxRetries=1) returns a
// clean `timeout` response before the platform kills the function.
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS ?? 12000);

function fail(code: VerifyError["code"], error: string, status: number): Response {
  return Response.json({ code, error } satisfies VerifyError, { status });
}

/**
 * POST /api/verify
 * Multipart form:
 *   - images: one or more label image files (front + back)
 *   - application: JSON string of the claimed field values
 * Returns a per-field VerificationResult (decision-support; never auto-rejects).
 */
export async function POST(request: Request): Promise<Response> {
  // Reject oversized uploads before buffering the whole body into memory.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_TOTAL_BYTES) {
    return fail("file_too_large", "Upload is too large. Reduce the image size.", 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("server_error", "Could not read the upload.", 400);
  }

  // --- Validate images ---
  const files = form.getAll("images").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return fail("no_images", "Upload at least one label image.", 400);
  }
  if (files.length > MAX_IMAGES) {
    return fail(
      "too_many_images",
      `Too many images — ${MAX_IMAGES} max (front + back is plenty).`,
      400,
    );
  }

  const images: ImageInput[] = [];
  for (const file of files) {
    const mediaType = file.type;
    if (!isSupportedMediaType(mediaType)) {
      return fail(
        "unsupported_type",
        `Unsupported file type "${mediaType || "unknown"}". Use JPG, PNG, or WebP.`,
        400,
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return fail(
        "file_too_large",
        `"${file.name}" is too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB).`,
        400,
      );
    }
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    images.push({ base64, mediaType });
  }

  // --- Validate claimed application data ---
  const appField = form.get("application");
  const application = parseApplicationData(
    typeof appField === "string" ? appField : null,
  );
  if (application === null) {
    return fail("bad_application_data", "Application data was not valid JSON.", 400);
  }

  // --- Extract (or mock when no key) + compare ---
  const start = Date.now();
  const usingMock = !hasApiKey();
  let extracted: ExtractedLabel;
  try {
    extracted = usingMock
      ? mockExtractedLabel()
      : await extractFields(images, { timeoutMs: REQUEST_TIMEOUT_MS });
  } catch (err) {
    return handleAiError(err);
  }

  const result = verifyLabel(application, extracted);
  const body: VerifyResponse = {
    result,
    meta: {
      model: usingMock ? "mock" : MODEL,
      latencyMs: Date.now() - start,
      imageCount: images.length,
      mock: usingMock,
    },
  };
  return Response.json(body);
}

function handleAiError(err: unknown): Response {
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return fail("timeout", "The label read timed out. Try again.", 504);
  }
  if (err instanceof Anthropic.RateLimitError) {
    return fail("rate_limited", "Too many requests right now. Try again shortly.", 429);
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return fail("ai_error", "AI service authentication failed (check the API key).", 502);
  }
  if (err instanceof Anthropic.APIError) {
    return fail("ai_error", "The AI service had a problem reading the label.", 502);
  }
  console.error("verify: unexpected error", err);
  return fail("server_error", "Something went wrong reading the label.", 500);
}
