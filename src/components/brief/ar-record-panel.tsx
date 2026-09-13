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
    <div
      style={{
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-xl)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
          <span
            style={{
              width: 36,
              height: 36,
              flex: "0 0 36px",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-bg-subtle)",
              color: "var(--color-text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              Record on your phone
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginTop: 2,
              }}
            >
              Scan the code with your phone camera to open the IDEEZA app.
            </div>
          </div>
        </div>
        <span
          style={{
            flex: "0 0 auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: "var(--color-bg-warning-subtle)",
            color: "var(--color-text-warning)",
            borderRadius: "var(--radius-full)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span
            className="ix-ar-dot"
            style={{
              width: 7,
              height: 7,
              flex: "0 0 7px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-bg-warning)",
            }}
          />
          Waiting for phone
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            flex: "0 0 auto",
          }}
        >
          <div
            style={{
              padding: 12,
              background: "var(--color-bg-subtle)",
              borderRadius: "var(--radius-lg)",
              display: "inline-flex",
            }}
          >
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
                  style={{ fill: "var(--color-white)" }}
                />
                <path d={qr.path} style={{ fill: "var(--color-gray-900)" }} />
              </svg>
            ) : (
              <span
                style={{
                  width: QR_PX,
                  height: QR_PX,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--color-text-tertiary)",
                  padding: 16,
                }}
              >
                Preparing the scan code…
              </span>
            )}
          </div>
          <p
            style={{
              maxWidth: QR_PX + 24,
              margin: 0,
              fontSize: 11,
              lineHeight: 1.5,
              color: "var(--color-text-tertiary)",
            }}
          >
            The IDEEZA phone app isn&apos;t released yet — this page will pick
            the clip up automatically once it is.
          </p>
        </div>

        <div style={{ flex: "1 1 240px", minWidth: 200 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.6,
              color: "var(--color-text-secondary)",
              marginBottom: 10,
            }}
          >
            HOW IT WORKS
          </div>
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {STEPS.map((s, i) => (
              <li key={s.title} style={{ display: "flex", gap: 10 }}>
                <span
                  style={{
                    flex: "0 0 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--color-text-brand)",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.5,
                  }}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {s.title}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "var(--color-text-secondary)",
                      marginTop: 1,
                    }}
                  >
                    {s.sub}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div
        style={{
          borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
          paddingTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          No phone nearby?
        </span>
        <button
          type="button"
          onClick={onSwitchToAi}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-brand)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
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
