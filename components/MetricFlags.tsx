"use client";

import React from "react";
import { splitOnFlagged } from "@/lib/metricGuard";

/**
 * Surfaces the metric audit from /api/rewrite-bullets.
 *
 * The server decides what counts as an invented or dropped figure; these
 * components only display that verdict. Keeping the judgement server-side means
 * there is one source of truth and the browser never re-derives the rule.
 */

/**
 * Render text with the flagged figures highlighted.
 * Falls back to plain text when nothing is flagged.
 */
export function HighlightedMetrics({
  text,
  flagged,
}: {
  text: string;
  flagged?: string[];
}) {
  if (!flagged || flagged.length === 0) return <>{text}</>;

  // splitOnFlagged puts the matches on the odd indices.
  const parts = splitOnFlagged(text, flagged);

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="bg-amber-200 text-amber-950 font-semibold rounded px-1"
            title="Not present in your original bullet — verify before using"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/** Banner shown above the rewritten bullets when the audit found something. */
export function MetricNotice({
  tone,
  message,
}: {
  tone: "warning" | "info";
  message: string;
}) {
  const styles =
    tone === "warning"
      ? "bg-amber-50 border-amber-300 text-amber-900"
      : "bg-sky-50 border-sky-300 text-sky-900";

  return (
    <div className={`flex gap-3 items-start rounded-lg border px-4 py-3 text-sm ${styles}`}>
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {tone === "warning" ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 005 19z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        )}
      </svg>
      <p>{message}</p>
    </div>
  );
}
