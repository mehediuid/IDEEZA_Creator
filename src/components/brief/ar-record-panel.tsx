"use client";

// Step 2, AR branch — "Record on your phone".
//
// The panel's whole job is the hand-off: a real, scannable deep link into the
// phone app, what to do with it, and an honest waiting state while nothing
// comes back. The QR is encoded here and now (`qrSvgPath`), not a picture of a
// code — it round-trips `${origin}/brief/ar/${projectId}` through any scanner.
//
// Nothing on this page can make a clip arrive: `state.arClip` is written by the
// phone app, which isn't released yet. So the chip says "Waiting for phone" and
// Continue stays shut rather than letting a listing reach mint with an AR
// selection and no footage — and the note under the code says so in words.

import * as React from "react";
import { qrFits, qrSvgPath } from "@/lib/brief/qr";

const STEPS: { title: string; sub: string }[] = [
  {
    title: "Open the IDEEZA app",
    sub: "Install it first if you have not — App Store or Google Play.",
  },
  {
    title: "Scan this code",
    sub: "The app opens straight into this build, no searching.",
  },
  {
    title: "Record a 10s clip",
    sub: "Walk around the product. The app trims and uploads it here.",
  },
];

/** The rendered edge of the QR plate, in px. */
const QR_PX = 200;

// The deep link is built from the page's own origin, which only exists in the
// browser. `useSyncExternalStore` is how a client-only value is read without a
// hydration mismatch: the server pass (and the hydrating client pass) take the
// empty snapshot, then the real origin lands. The origin never changes while
// the page is open, so there is nothing to subscribe to.
const subscribeNever = () => () => {};
const clientOrigin = () => window.location.origin;
const serverOrigin = () => "";

export function ArRecordPanel({
  projectId,
  onSwitchToAi,
}: {
  projectId: string;
  /** Picks the AI card instead — the way out when there's no phone to hand. */
  onSwitchToAi: () => void;
}) {
  const origin = React.useSyncExternalStore(
    subscribeNever,
    clientOrigin,
    serverOrigin,
  );

  const deepLink = origin ? `${origin}/brief/ar/${projectId}` : "";
  const qr = React.useMemo(
    () => (deepLink && qrFits(deepLink) ? qrSvgPath(deepLink) : null),
    [deepLink],
  );

  return (
    <div className="flex flex-col gap-[16px] rounded-xl border border-solid border-border bg-bg-surface p-[18px]">
      <div className="flex items-start justify-between gap-[12px]">
        <div className="flex min-w-0 gap-[12px]">
          <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-text-secondary">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="6" y="2" width="12" height="20" rx="2.5" />
              <circle cx="12" cy="17.5" r="1" />
              <path d="M9 6h6" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="text-lg font-bold text-text-primary">
              Record on your phone
            </div>
            <div className="mt-[2px] text-sm text-text-secondary">
              Scan the code with your phone camera to open the IDEEZA app.
            </div>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-[6px] rounded-full bg-bg-warning-subtle px-[10px] py-[4px] text-sm font-semibold text-text-warning">
          <span className="ix-ar-dot h-[7px] w-[7px] shrink-0 rounded-full bg-bg-warning" />
          Waiting for phone
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-[20px]">
        <div className="flex shrink-0 flex-col items-center gap-[8px]">
          <div className="inline-flex rounded-lg bg-bg-subtle p-[12px]">
            {qr ? (
              /* A code is a physical thing before it is a picture: dark modules
                 on a light field is what a camera can lock onto, so the plate
                 keeps the primitives rather than the theme-flipping surface
                 tokens (in light mode these ARE bg-surface / text-primary).
                 The quiet zone is inside the viewBox, so the rect spans the
                 whole `size` — without it the margin would be transparent and
                 the code would not scan on this plate. */
              <svg
                width={QR_PX}
                height={QR_PX}
                viewBox={`0 0 ${qr.size} ${qr.size}`}
                shapeRendering="crispEdges"
                role="img"
                aria-label={`Scan to open ${deepLink} in the IDEEZA app`}
                data-ar-qr
              >
                <rect
                  x={0}
                  y={0}
                  width={qr.size}
                  height={qr.size}
                  className="fill-[var(--color-white)]"
                />
                <path d={qr.path} className="fill-[var(--color-gray-900)]" />
              </svg>
            ) : (
              <span className="inline-flex h-[200px] w-[200px] items-center justify-center p-[16px] text-center text-sm text-text-tertiary">
                Preparing the scan code…
              </span>
            )}
          </div>
          <p className="m-0 max-w-[224px] text-sm leading-relaxed text-text-tertiary">
            The IDEEZA phone app isn&apos;t released yet — this page will pick
            the clip up automatically once it is.
          </p>
        </div>

        <div className="min-w-[200px] flex-[1_1_240px]">
          <div className="mb-[10px] text-sm font-semibold text-text-primary">
            How it works
          </div>
          <ol className="m-0 flex list-none flex-col gap-[10px] p-0">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-[10px]">
                <span
                  className="flex-[0_0_14px] tabular-nums text-sm font-bold leading-relaxed text-text-brand"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-text-primary">
                    {s.title}
                  </span>
                  <span className="mt-[1px] block text-sm leading-relaxed text-text-secondary">
                    {s.sub}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex items-center justify-between gap-[12px] border-t border-solid border-border-subtle pt-[12px]">
        <span className="text-sm text-text-secondary">
          No phone nearby?
        </span>
        <button
          type="button"
          onClick={onSwitchToAi}
          className="border-none bg-transparent p-0 font-sans text-sm font-semibold text-text-brand"
        >
          Switch to AI instead
        </button>
      </div>

      <style>{`
        @keyframes ix-ar-dot-kf { 0%, 100% { opacity: 1 } 50% { opacity: .3 } }
        .ix-ar-dot { animation: ix-ar-dot-kf 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ix-ar-dot { animation: none; }
        }
      `}</style>
    </div>
  );
}
