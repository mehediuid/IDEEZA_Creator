"use client";

// Generate video › AR — "Record on your phone" (owner, 2026-10-12: the Figma's
// AR card, back from the Brief's old video step). The panel's job is the
// hand-off: a real, scannable code (`qrSvgPath`, encoded here, not a picture
// of one) for this product's page, what to do with it, and an honest waiting
// state — the IDEEZA phone app that records and sends the clip isn't
// released, so nothing comes back yet and the dialog offers AI instead.

import * as React from "react";
import { qrFits, qrSvgPath } from "@/lib/video/qr";

const STEPS: { title: string; sub: string }[] = [
  { title: "Open the IDEEZA app", sub: "Install it first if you haven't — App Store or Google Play." },
  { title: "Scan this code", sub: "The app opens straight on this product." },
  { title: "Record a 10-second clip", sub: "Walk around the product. The app trims it and sends it here." },
];

/** The rendered edge of the code, in px. */
const QR_PX = 176;

// The link is built from the page's origin, which only exists in the browser: the server pass
// takes the empty snapshot, then the real origin lands (it never changes while the page is open).
const subscribeNever = () => () => {};
const clientOrigin = () => window.location.origin;
const serverOrigin = () => "";

export function ArRecordPanel({
  projectId,
  productId,
  onSwitchToAi,
}: {
  projectId: string;
  productId: string;
  /** Picks the AI card instead — the way out while the phone app isn't out. */
  onSwitchToAi: () => void;
}) {
  const origin = React.useSyncExternalStore(subscribeNever, clientOrigin, serverOrigin);
  const link = origin ? `${origin}/projects/${encodeURIComponent(projectId)}/products/${encodeURIComponent(productId)}` : "";
  const qr = React.useMemo(() => (link && qrFits(link) ? qrSvgPath(link) : null), [link]);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-solid border-border bg-bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-md font-semibold text-text-primary">Record on your phone</p>
          <p className="mt-1 text-sm text-text-secondary">Scan the code with your phone camera to open IDEEZA on this product.</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-bg-warning-subtle px-[10px] py-[4px] text-sm font-semibold text-[color:var(--color-text-warning)]">
          <span aria-hidden className="size-[7px] rounded-full bg-[color:var(--color-text-warning)] motion-safe:animate-pulse" />
          Waiting for phone
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <div className="flex shrink-0 flex-col items-center gap-3">
          <div className="inline-flex rounded-lg bg-bg-subtle p-4">
            {qr ? (
              // Dark modules on a light field — what a camera locks onto — in both themes.
              <svg
                width={QR_PX}
                height={QR_PX}
                viewBox={`0 0 ${qr.size} ${qr.size}`}
                shapeRendering="crispEdges"
                role="img"
                aria-label={`Scan to open ${link}`}
              >
                <rect x={0} y={0} width={qr.size} height={qr.size} className="fill-[var(--color-white)]" />
                <path d={qr.path} className="fill-[var(--color-gray-900)]" />
              </svg>
            ) : (
              <span className="inline-flex size-[176px] items-center justify-center p-6 text-center text-sm text-text-tertiary">
                Preparing the code…
              </span>
            )}
          </div>
          <p className="max-w-[208px] text-center text-xs leading-relaxed text-text-tertiary">
            The IDEEZA phone app isn&apos;t released yet. Once it is, the clip shows up here by itself.
          </p>
        </div>
        <ol className="m-0 flex min-w-[200px] flex-[1_1_220px] list-none flex-col gap-4 p-0">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span aria-hidden className="w-[14px] shrink-0 text-sm font-bold tabular-nums text-text-brand">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-text-primary">{s.title}</span>
                <span className="mt-[2px] block text-sm leading-relaxed text-text-secondary">{s.sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-border pt-4">
        <span className="text-sm text-text-secondary">No phone app yet?</span>
        <button
          type="button"
          onClick={onSwitchToAi}
          className="min-h-[24px] rounded-sm text-sm font-semibold text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
        >
          Use AI instead
        </button>
      </div>
    </div>
  );
}
