"use client";

// What the viewer draws over the model, from the parts' screen bounds: the
// hover ground and ring (Figma 47167:27397 / 27400), the selection's halo,
// dashed outer ring and ring (47167:27434 / 27437 / 27438), the part's
// tooltip (47167:27411) and the isolated badge (47167:27539). The grounds
// sit behind the canvas — the model is drawn over them — the rings in front.

import * as React from "react";
import { Layers01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Tooltip } from "@/components/ideeza";
import type { ScreenBox } from "./viewer-types";

// Figma's sizes, relative to the ring drawn round the part: the hover ground
// is 100×50 round a 71×48 ring, the selection halo 103×70 and its dashed
// ring 89×60 round a 71×49 one.
const HOVER_GROUND = { w: 1.41, h: 1.05 };
const SELECT_HALO = { w: 1.45, h: 1.43 };
const SELECT_OUTER = { w: 1.25, h: 1.22 };

function Ellipse({
  box,
  k = { w: 1, h: 1 },
  className,
}: {
  box: ScreenBox;
  k?: { w: number; h: number };
  className: string;
}) {
  const w = box.w * k.w;
  const h = box.h * k.h;
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute rounded-[50%] ${className}`}
      style={{ left: box.x + box.w / 2 - w / 2, top: box.y + box.h / 2 - h / 2, width: w, height: h }}
    />
  );
}

/** Behind the canvas. */
export function Grounds({ hover, selected }: { hover?: ScreenBox; selected?: ScreenBox }) {
  return (
    <>
      {selected && <Ellipse box={selected} k={SELECT_HALO} className="bg-bg-brand-subtle" />}
      {hover && !sameBox(hover, selected) && (
        <Ellipse box={hover} k={HOVER_GROUND} className="bg-bg-brand-subtle opacity-80" />
      )}
    </>
  );
}

/** In front of the canvas. */
export function Rings({
  hover,
  selected,
  tooltip,
}: {
  hover?: ScreenBox;
  selected?: ScreenBox;
  tooltip?: string;
}) {
  return (
    <>
      {selected && (
        <>
          <Ellipse box={selected} k={SELECT_OUTER} className="border border-dashed border-[var(--color-bg-brand)] opacity-70" />
          <Ellipse box={selected} className="border-[2.5px] border-solid border-[var(--color-bg-brand)]" />
        </>
      )}
      {hover && !sameBox(hover, selected) && (
        <Ellipse box={hover} className="border-2 border-solid border-[var(--color-bg-brand)]" />
      )}
      {hover && tooltip && (
        // 10 px over the ring, centred on it.
        <span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
          style={{ left: hover.x + hover.w / 2, top: hover.y - 10 }}
        >
          <Tooltip label={tooltip} />
        </span>
      )}
    </>
  );
}

export function IsolatedBadge({ of }: { of: number }) {
  return (
    <Badge tone="brand-outline" icon={<Icon icon={Layers01Icon} size={12} />}>
      Isolated · 1 of {of} {of === 1 ? "part" : "parts"}
    </Badge>
  );
}

function sameBox(a?: ScreenBox, b?: ScreenBox) {
  return !!a && !!b && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.w - b.w) < 1;
}
