"use client";

import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { MAX_FILE_BYTES, MAX_IMAGES } from "@/lib/validation";
import { ACCEPT, ACCEPTED_LABEL, describeRejections, MAX_FILE_MB } from "@/lib/upload";

interface Props {
  images: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export default function ImageDropzone({ images, onChange, disabled }: Props) {
  const [errors, setErrors] = useState<string[]>([]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_FILE_BYTES,
    disabled,
    noClick: images.length > 0, // once there are images, click the button instead
    onDrop: (accepted, rejected) => {
      const room = Math.max(0, MAX_IMAGES - images.length);
      const toAdd = accepted.slice(0, room);
      onChange([...images, ...toAdd]);

      const msgs = describeRejections(rejected);
      if (accepted.length > toAdd.length) {
        msgs.push(`You can upload up to ${MAX_IMAGES} images — extra files weren't added.`);
      }
      setErrors(msgs);
    },
  });

  // Object URLs for previews — revoke when images change/unmount to avoid leaks.
  const previews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  );
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary-soft"
            : "border-edge-strong bg-well"
        } ${images.length === 0 ? "cursor-pointer hover:border-primary" : ""} ${
          disabled ? "opacity-60" : ""
        }`}
      >
        <input {...getInputProps()} />
        {images.length === 0 ? (
          <div className="py-8">
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
            <p className="mt-4 text-sm font-semibold text-ink">
              Drag label images here
            </p>
            <p className="mt-1 text-sm text-muted">
              Or click to browse. Include the front and back when available.
            </p>
            <p className="mt-3 text-xs text-faint">
              {ACCEPTED_LABEL} · up to {MAX_FILE_MB} MB each · {MAX_IMAGES} max
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {previews.map((p, i) => (
                <div
                  key={p.url}
                  className="group relative overflow-hidden rounded-lg border border-edge bg-card shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`Label ${i + 1}`}
                    className="h-28 w-full object-contain"
                  />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`Remove image ${i + 1}`}
                      className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink/75 text-sm leading-none text-white transition-colors hover:bg-bad"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {images.length < MAX_IMAGES && !disabled && (
              <button
                type="button"
                onClick={open}
                className="mt-4 rounded-lg border border-edge-strong bg-card px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                Add another image
              </button>
            )}
          </>
        )}
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1 text-sm font-medium text-bad">
          {errors.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
