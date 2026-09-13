"use client";

// Static previews of an authored package's real geometry.
//
// They draw the very objects the editors produced — not a stand-in picture — so
// a card, an import result and a detail page can all show what will actually be
// placed, from one renderer. Both auto-fit their content to the box, so the same
// component works at card size and at detail size.
//
// Typed on the geometry alone rather than on `PackageDraft`, so a `SavedPackage`
// read back from the library renders through the same code.

import * as React from "react";
import { type FpObj, type FpPad, type SymObj, type SymPin } from "@/lib/package/types";

export type Drawable = { symbol: SymObj[]; footprint: FpObj[] };

const pinsOf = (d: Drawable) => d.symbol.filter((o): o is SymPin => o.kind === "pin").sort((a, b) => a.num - b.num);
const padsOf = (d: Drawable) => d.footprint.filter((o): o is FpPad => o.kind === "pad");

function EmptyBox({ label }: { label: string }) {
  return (
    <div className="grid h-full w-full place-items-center rounded-[var(--radius-lg)] bg-bg-subtle">
      <span className="font-display text-2xs font-regular text-text-tertiary">{label}</span>
    </div>
  );
}

export function SymbolThumb({ draft, w = 320, h = 170 }: { draft: Drawable; w?: number; h?: number }) {
  const pins = pinsOf(draft);
  const rects = draft.symbol.filter((o): o is Extract<SymObj, { kind: "rect" }> => o.kind === "rect");
  const xs = [...pins.map((p) => p.x), ...rects.flatMap((r) => [r.x, r.x + r.w])];
  const ys = [...pins.map((p) => p.y), ...rects.flatMap((r) => [r.y, r.y + r.h])];
  if (!xs.length) return <EmptyBox label="No symbol" />;

  const spanX = Math.max(20, Math.max(...xs) - Math.min(...xs));
  const spanY = Math.max(20, Math.max(...ys) - Math.min(...ys));
  const k = Math.min((w - 30) / spanX, (h - 30) / spanY);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const sx = (v: number) => w / 2 + (v - cx) * k;
  const sy = (v: number) => h / 2 + (v - cy) * k;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="block h-full w-full rounded-[var(--radius-lg)] bg-bg-subtle"
      role="img"
      aria-label={`${pins.length}-pin symbol preview`}
    >
      {rects.map((r) => (
        <rect
          key={r.id}
          x={sx(r.x)}
          y={sy(r.y)}
          width={r.w * k}
          height={r.h * k}
          fill="var(--color-bg-brand-subtle)"
          stroke="var(--color-text-primary)"
          strokeWidth={1.2}
        />
      ))}
      {pins.map((p) => {
        const d = p.angle === 0 ? [1, 0] : p.angle === 90 ? [0, 1] : p.angle === 180 ? [-1, 0] : [0, -1];
        return (
          <g key={p.id}>
            <line
              x1={sx(p.x)}
              y1={sy(p.y)}
              x2={sx(p.x + d[0] * p.length)}
              y2={sy(p.y + d[1] * p.length)}
              stroke="var(--color-text-primary)"
              strokeWidth={1.2}
            />
            <circle cx={sx(p.x)} cy={sy(p.y)} r={2} fill="none" stroke="var(--color-text-primary)" strokeWidth={1.1} />
          </g>
        );
      })}
    </svg>
  );
}

export function FootprintThumb({ draft, w = 320, h = 170 }: { draft: Drawable; w?: number; h?: number }) {
  const pads = padsOf(draft);
  if (!pads.length) return <EmptyBox label="No footprint" />;

  const minX = Math.min(...pads.map((p) => p.x - p.w / 2));
  const maxX = Math.max(...pads.map((p) => p.x + p.w / 2));
  const minY = Math.min(...pads.map((p) => p.y - p.h / 2));
  const maxY = Math.max(...pads.map((p) => p.y + p.h / 2));
  const k = Math.min((w - 30) / Math.max(0.5, maxX - minX), (h - 30) / Math.max(0.5, maxY - minY));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const sx = (mm: number) => w / 2 + (mm - cx) * k;
  const sy = (mm: number) => h / 2 + (mm - cy) * k;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="block h-full w-full rounded-[var(--radius-lg)] bg-bg-subtle"
      role="img"
      aria-label={`${pads.length}-pad footprint preview`}
    >
      {pads.map((p) => {
        const pw = Math.max(1.5, p.w * k);
        const ph = Math.max(1.5, p.h * k);
        const round = p.shape === "THT round" || p.shape === "SMD round";
        const fill = p.padKind === "Mounting" ? "var(--color-pad-mechanical)" : "var(--color-pad-copper)";
        return round ? (
          <circle key={p.id} cx={sx(p.x)} cy={sy(p.y)} r={pw / 2} fill={fill} />
        ) : (
          <rect key={p.id} x={sx(p.x) - pw / 2} y={sy(p.y) - ph / 2} width={pw} height={ph} fill={fill} />
        );
      })}
    </svg>
  );
}
