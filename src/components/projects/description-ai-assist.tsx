"use client";

// "Update with AI" on a project description (P2-SAVE-8, Figma Q6-5…8; built
// once here, so the save step's field and the project page's inline editor
// share it — P2-TABS-21 as changed, C15).
//
// One press, with Undo:
// - Idle: a quiet pill, "Update with AI".
// - Running: the pill becomes Cancel, and the field's polite line says
//   "Reading your {n} products' descriptions… this can take up to 40 seconds."
//   The textarea stays editable.
// - Done: the textarea holds the result as unsaved text; "Written from your
//   {n} products — review it, then save." with Undo, which puts back the text
//   from before the first run. The pill reads "Regenerate".
// - Model unreachable (the route's fallback, a failed request, or no answer
//   in 50 s): the products' own sentences joined (describe.ts, the save
//   step's prefill), with "The AI wasn't reachable, so this joins your
//   products' own descriptions." Nothing is invented.
//
// Nothing is written to a store here: the caller's Save does that.
// It shows only once two or more products have a description (Figma
// 41505:136211).

import * as React from "react";
import { AiMagicIcon, Cancel01Icon, Undo02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { DESCRIBE_MAX, describableCount, joinDescriptions, type DescribedProduct } from "@/lib/manual/describe";
import { cn } from "@/lib/utils";

/** The client's own bound: the route gives the model 45 s, then answers with its fallback. */
const CLIENT_TIMEOUT_MS = 50_000;

type AiState =
  | { kind: "idle" }
  // `was`: a Regenerate's finished run, which Cancel goes back to.
  | { kind: "running"; before: string; was: { fallback: boolean } | null }
  | { kind: "done"; before: string; fallback: boolean };

export type DescriptionAiAssist = {
  /** At least two products have a description. When false, `pill` and `status` are null. */
  shown: boolean;
  /** The pill, for beside the field's label. */
  pill: React.ReactNode;
  /** The field's polite line and Undo, for under the textarea. */
  status: React.ReactNode;
  /** The field holds text a run wrote, not undone — P2-TABS-22's "saved through Use this". */
  wrote: boolean;
  running: boolean;
  /** Starts a run. `before` is the text Undo restores (the field's value by default). */
  start: (before?: string) => void;
  /** Stops a run, or forgets a finished one, leaving the text as it is. */
  reset: () => void;
};

async function describe(products: readonly DescribedProduct[], signal: AbortSignal): Promise<{ text: string; fallback: boolean }> {
  const res = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "project", products }),
    signal,
  });
  if (!res.ok) throw new Error(`refine ${res.status}`);
  const data = (await res.json()) as { refined?: unknown; fallback?: unknown };
  const text = typeof data.refined === "string" ? data.refined.trim() : "";
  if (!text) throw new Error("empty");
  return { text: Array.from(text).slice(0, DESCRIBE_MAX).join(""), fallback: data.fallback === true };
}

export function useDescriptionAiAssist({
  products,
  value,
  onReplace,
  pillClassName,
}: {
  products: readonly DescribedProduct[];
  /** The field's current text. */
  value: string;
  /** Puts `text` in the field, as unsaved text. */
  onReplace: (text: string) => void;
  /** Layout only: the pill's height at phone width (44 px targets). */
  pillClassName?: string;
}): DescriptionAiAssist {
  const [state, setState] = React.useState<AiState>({ kind: "idle" });
  const run = React.useRef<AbortController | null>(null);
  const n = describableCount(products);
  const shown = n >= 2;

  // The latest words and handler, for the answer that lands later.
  const latest = React.useRef({ products, onReplace });
  React.useEffect(() => {
    latest.current = { products, onReplace };
  });
  React.useEffect(() => () => run.current?.abort(), []);

  const stop = React.useCallback(() => {
    run.current?.abort();
    run.current = null;
  }, []);

  const start = React.useCallback(
    (before?: string) => {
      stop();
      const ctrl = new AbortController();
      run.current = ctrl;
      const timer = window.setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
      // Undo goes back to the maker's own words, however many times it regenerates.
      setState((s) =>
        s.kind === "idle"
          ? { kind: "running", before: before ?? value, was: null }
          : { kind: "running", before: s.before, was: s.kind === "done" ? { fallback: s.fallback } : s.was },
      );
      const asked = latest.current.products;
      describe(asked, ctrl.signal)
        .catch(() => ({ text: joinDescriptions(asked), fallback: true }))
        .then((out) => {
          window.clearTimeout(timer);
          // Cancelled, or superseded by another run: this answer is nobody's.
          if (run.current !== ctrl) return;
          run.current = null;
          latest.current.onReplace(out.text);
          setState((s) => (s.kind === "running" ? { kind: "done", before: s.before, fallback: out.fallback } : s));
        });
    },
    [stop, value],
  );

  const cancel = () => {
    stop();
    setState((s) =>
      s.kind !== "running" ? s : s.was ? { kind: "done", before: s.before, fallback: s.was.fallback } : { kind: "idle" },
    );
  };
  const undo = () => {
    if (state.kind !== "done") return;
    onReplace(state.before);
    setState({ kind: "idle" });
  };
  const reset = React.useCallback(() => {
    stop();
    setState({ kind: "idle" });
  }, [stop]);

  if (!shown) {
    return { shown, pill: null, status: null, wrote: false, running: false, start, reset };
  }

  const running = state.kind === "running";
  const pill = (
    <button
      type="button"
      onClick={running ? cancel : () => start()}
      className={cn(
        "inline-flex min-h-[32px] shrink-0 items-center gap-2 rounded-full border border-solid border-border bg-bg-surface px-5 text-sm font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
        pillClassName,
      )}
    >
      <Icon icon={running ? Cancel01Icon : AiMagicIcon} size={16} />
      {running ? "Cancel" : state.kind === "done" ? "Regenerate" : "Update with AI"}
    </button>
  );

  const line =
    state.kind === "running"
      ? `Reading your ${n} products' descriptions… this can take up to 40 seconds.`
      : state.kind === "done"
        ? state.fallback
          ? "The AI wasn't reachable, so this joins your products' own descriptions."
          : `Written from your ${n} products — review it, then save.`
        : "";

  // One polite region, mounted with the field and empty until a run starts,
  // so each line is read when it changes (P2-SAVE-16).
  const status = (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", !line && "sr-only")}>
      <p aria-live="polite" className="min-w-0 text-sm text-text-secondary">
        {line}
      </p>
      {state.kind === "done" && (
        <button
          type="button"
          onClick={undo}
          className={cn(
            "inline-flex min-h-[32px] items-center gap-2 rounded-sm text-sm font-semibold text-text-secondary outline-none transition-colors duration-normal ease-decelerate hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
            pillClassName,
          )}
        >
          <Icon icon={Undo02Icon} size={16} />
          Undo
        </button>
      )}
    </div>
  );

  const wrote = state.kind === "done" || (state.kind === "running" && state.was !== null);
  return { shown, pill, status, wrote, running, start, reset };
}
