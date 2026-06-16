"use client";

// IDEEZA PCB Software — Schematic page (canvas).
// Drives the visible drawing border + title block from the right-panel
// properties so editing a value in the Properties panel updates the canvas
// immediately. Mirrors the Figma title-block layout (Schematic / Board / Page
// header row, Review row, Version / Size / Page / Total row, IDEEZA footer).

import * as React from "react";
import { usePcbState } from "@/lib/pcb/store";

// Approximate page sizes in pixels (landscape). A4 ≈ 920×640 was the original
// hardcoded value; other sizes scale proportionally.
const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  A0: { w: 1840, h: 1280 },
  A1: { w: 1480, h: 1040 },
  A2: { w: 1160, h: 820 },
  A3: { w: 1040, h: 720 },
  A4: { w: 920, h: 640 },
  A5: { w: 740, h: 520 },
  Letter: { w: 920, h: 700 },
  Legal: { w: 920, h: 1180 },
  Tabloid: { w: 1180, h: 720 },
};

function toLetters(n: number): string {
  // 0 → A, 1 → B, ... 25 → Z, 26 → AA, ...
  let s = "";
  let x = n;
  do {
    s = String.fromCharCode(65 + (x % 26)) + s;
    x = Math.floor(x / 26) - 1;
  } while (x >= 0);
  return s;
}

function findValue(
  fields: Array<{ key: string; on: boolean; valueOn: boolean; value: string }>,
  key: string,
  fallback = "-",
): string {
  const f = fields.find((it) => it.key === key);
  if (!f) return fallback;
  if (!f.on || !f.valueOn) return fallback;
  return f.value || fallback;
}

// When the user hasn't picked a custom color we render with the theme-aware
// text-primary token so the border + title block stay legible in both light
// and dark mode. Any non-default hex is rendered verbatim.
const DEFAULT_STROKE = "#1E1E1E";
function resolveStroke(color: string): string {
  if (!color || color.trim().toLowerCase() === DEFAULT_STROKE.toLowerCase()) {
    return "var(--color-text-primary)";
  }
  return color;
}

export function SchematicCanvas() {
  const state = usePcbState();
  const b = state.schemBorder;
  const page = PAGE_SIZES[b.size] ?? PAGE_SIZES.A4;
  const stroke = resolveStroke(b.color);
  const xN = Math.max(1, Math.min(40, parseInt(b.xRegion, 10) || 1));
  const yN = Math.max(1, Math.min(40, parseInt(b.yRegion, 10) || 1));

  const RULER_PAD = 26;
  const innerLeft = RULER_PAD;
  const innerTop = RULER_PAD;
  const innerW = page.w - RULER_PAD * 2;
  const innerH = page.h - RULER_PAD * 2;
  const colStep = innerW / xN;
  const rowStep = innerH / yN;

  const labelStart = b.regionStart.toLowerCase();
  const numbersOnTop = labelStart.includes("top");
  const lettersOnLeft = labelStart.includes("left");

  const showTitle = state.schemTitleShow && b.showTitleBlock;
  const titleW = Math.min(450, page.w - 80);
  // Drawing position: corner of the title block
  const dPos = b.drawing.toLowerCase();
  const titleRight = dPos.includes("right");
  const titleBottom = dPos.includes("bottom");

  const tFields = state.schemTitleFields;

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 60,
        width: page.w,
        height: page.h,
        background: "var(--color-bg-surface)",
        border: `var(--border-width-1) solid ${stroke}`,
        boxShadow: "var(--elevation-3)",
        color: stroke,
      }}
    >
      {/* column number labels (top + bottom) */}
      {Array.from({ length: xN }).map((_, i) => {
        const label = String(numbersOnTop ? i + 1 : xN - i);
        const cx = innerLeft + colStep * (i + 0.5);
        return (
          <React.Fragment key={`col-${i}`}>
            <div
              style={{
                position: "absolute",
                top: 4,
                left: cx - 6,
                fontSize: "var(--font-size-xs)",
                color: stroke,
                opacity: 0.75,
              }}
            >
              {label}
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 4,
                left: cx - 6,
                fontSize: "var(--font-size-xs)",
                color: stroke,
                opacity: 0.75,
              }}
            >
              {label}
            </div>
          </React.Fragment>
        );
      })}

      {/* row letter labels (left + right) */}
      {Array.from({ length: yN }).map((_, i) => {
        const label = lettersOnLeft ? toLetters(i) : toLetters(yN - 1 - i);
        const cy = innerTop + rowStep * (i + 0.5);
        return (
          <React.Fragment key={`row-${i}`}>
            <div
              style={{
                position: "absolute",
                left: 6,
                top: cy - 6,
                fontSize: "var(--font-size-xs)",
                color: stroke,
                opacity: 0.75,
              }}
            >
              {label}
            </div>
            <div
              style={{
                position: "absolute",
                right: 6,
                top: cy - 6,
                fontSize: "var(--font-size-xs)",
                color: stroke,
                opacity: 0.75,
              }}
            >
              {label}
            </div>
          </React.Fragment>
        );
      })}

      {/* inner drawing area border */}
      <div
        style={{
          position: "absolute",
          left: innerLeft,
          top: innerTop,
          width: innerW,
          height: innerH,
          border: `var(--border-width-1-5) solid ${stroke}`,
        }}
      />

      {/* title block */}
      {showTitle && (
        <TitleBlock
          stroke={stroke}
          width={titleW}
          right={titleRight}
          bottom={titleBottom}
          fields={tFields}
        />
      )}
    </div>
  );
}

function TitleBlock({
  stroke,
  width,
  right,
  bottom,
  fields,
}: {
  stroke: string;
  width: number;
  right: boolean;
  bottom: boolean;
  fields: Array<{ key: string; on: boolean; valueOn: boolean; value: string }>;
}) {
  const cellStyle = (last = false): React.CSSProperties => ({
    borderRight: last ? "none" : `var(--border-width-1) solid ${stroke}`,
    borderBottom: `var(--border-width-1) solid ${stroke}`,
    padding: "var(--spacing-2) var(--spacing-4)",
    fontSize: "var(--font-size-xs)",
    color: stroke,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  });
  const labelHead = (): React.CSSProperties => ({
    ...cellStyle(false),
    fontWeight: 600,
  });
  return (
    <div
      style={{
        position: "absolute",
        ...(right ? { right: 30 } : { left: 30 }),
        ...(bottom ? { bottom: 30 } : { top: 30 }),
        width,
        border: `var(--border-width-1-5) solid ${stroke}`,
        background: "var(--color-bg-surface)",
        color: stroke,
        boxShadow: "var(--elevation-1)",
      }}
    >
      {/* row 1 — header labels */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr" }}>
        <div style={labelHead()}>Schematic</div>
        <div style={labelHead()}>Board</div>
        <div style={{ ...cellStyle(true), fontWeight: 600 }}>Page</div>
        {/* row 2 — values */}
        <div style={cellStyle()}>{findValue(fields, "schematic", "—")}</div>
        <div style={cellStyle()}>{findValue(fields, "boardName", "—")}</div>
        <div style={cellStyle(true)}>{findValue(fields, "pageName", "—")}</div>
      </div>

      {/* row 3 — Review : description */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2.2fr" }}>
        <div style={{ ...cellStyle(false), fontWeight: 600 }}>Review</div>
        <div style={cellStyle(true)}>{findValue(fields, "description", "—")}</div>
      </div>

      {/* row 4 — Reviewed / Version / Size / Page / Total */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr .8fr .8fr 1fr 1fr" }}>
        <div style={{ ...cellStyle(false), fontWeight: 600 }}>Reviewed</div>
        <div style={{ ...cellStyle(false), fontWeight: 600 }}>Version</div>
        <div style={{ ...cellStyle(false), fontWeight: 600 }}>Size</div>
        <div style={{ ...cellStyle(false), fontWeight: 600 }}>Page</div>
        <div style={{ ...cellStyle(true), fontWeight: 600 }}>Total</div>
        <div style={cellStyle()}>{findValue(fields, "reviewed", "—")}</div>
        <div style={cellStyle()}>{findValue(fields, "version", "—")}</div>
        <div style={cellStyle()}>{findValue(fields, "pageSize", "—")}</div>
        <div style={cellStyle()}>{findValue(fields, "pageNo", "—")}</div>
        <div style={cellStyle(true)}>{findValue(fields, "pageCount", "—")}</div>
      </div>

      {/* footer — company logo + drawn + create date + company name */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr .8fr 1fr 1.2fr" }}>
        <div
          style={{
            padding: "var(--spacing-4)",
            borderRight: `var(--border-width-1) solid ${stroke}`,
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-3)",
            fontWeight: 700,
            color: "var(--color-violet-600)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "var(--radius-full)",
              background: "var(--color-violet-600)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-on-brand)",
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            ▶
          </span>
          IDEEZA
        </div>
        <div
          style={{
            padding: "var(--spacing-4)",
            borderRight: `var(--border-width-1) solid ${stroke}`,
            fontSize: "var(--font-size-xs)",
            color: stroke,
          }}
        >
          {findValue(fields, "drawn", "—")}
        </div>
        <div
          style={{
            padding: "var(--spacing-4)",
            borderRight: `var(--border-width-1) solid ${stroke}`,
            fontSize: "var(--font-size-xs)",
            color: stroke,
          }}
        >
          {findValue(fields, "createDate", "—")}
        </div>
        <div style={{ padding: "var(--spacing-4)", fontSize: "var(--font-size-xs)", color: stroke }}>
          {findValue(fields, "company", "—")}
        </div>
      </div>
    </div>
  );
}
