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
// An empty colour means "follow the theme" — the border then uses the ink token
// and stays legible in light and dark. `#1E1E1E` is still accepted for documents
// saved when that hex was the stored default, but nothing writes it any more, so
// a user who deliberately picks near-black now gets near-black.
const LEGACY_DEFAULT_STROKE = "#1e1e1e";
function resolveStroke(color: string): string {
  if (!color || color.trim().toLowerCase() === LEGACY_DEFAULT_STROKE) {
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
      data-sheet-frame
      style={{
        position: "absolute",
        top: 60,
        left: 60,
        width: page.w,
        height: page.h,
        background: "transparent",
        color: stroke,
      }}
    >
      {/* design area — a distinct surface panel inside the corner brackets,
          with its own subtle square grid, sitting on the darker canvas. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: innerLeft,
          top: innerTop,
          width: innerW,
          height: innerH,
          background: "var(--color-bg-surface)",
          backgroundImage:
            "linear-gradient(var(--color-canvas-grid) 1px, transparent 1px), linear-gradient(90deg, var(--color-canvas-grid) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          borderRadius: "var(--radius-md)",
          pointerEvents: "none",
        }}
      />

      {/* column number labels (top + bottom) */}
      {b.show && b.zoneRefOn && Array.from({ length: xN }).map((_, i) => {
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
                opacity: 0.5,
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
                opacity: 0.5,
              }}
            >
              {label}
            </div>
          </React.Fragment>
        );
      })}

      {/* row letter labels (left + right) */}
      {b.show && b.zoneRefOn && Array.from({ length: yN }).map((_, i) => {
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
                opacity: 0.5,
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
                opacity: 0.5,
              }}
            >
              {label}
            </div>
          </React.Fragment>
        );
      })}

      {/* violet corner brackets mark the sheet boundary (no full frame). */}
      {b.show && <CornerBrackets left={innerLeft} top={innerTop} width={innerW} height={innerH} />}

      {/* title block */}
      {showTitle && (
        <TitleBlock
          width={titleW}
          right={titleRight}
          bottom={titleBottom}
          fields={tFields}
          sheetSize={`${b.size} ${b.orientation}`}
          // Project defaults to the project actually open, so the card names it
          // instead of dropping the row when nobody typed one (UIUX-68).
          projectName={(state.recentProjects.find((p) => p.id === state.activeProjectId) || {}).name}
        />
      )}
    </div>
  );
}

// Violet L-brackets marking the four corners of the drawing area — the sheet
// boundary the reference uses instead of a heavy ruled frame.
function CornerBrackets({ left, top, width, height }: { left: number; top: number; width: number; height: number }) {
  const ARM = 22;
  const T = 1.5;
  const c = "color-mix(in srgb, var(--color-violet-600) 78%, transparent)";
  const base: React.CSSProperties = { position: "absolute", width: ARM, height: ARM, pointerEvents: "none" };
  return (
    <>
      <div style={{ ...base, left, top, borderTop: `${T}px solid ${c}`, borderLeft: `${T}px solid ${c}`, borderTopLeftRadius: 6 }} />
      <div style={{ ...base, left: left + width - ARM, top, borderTop: `${T}px solid ${c}`, borderRight: `${T}px solid ${c}`, borderTopRightRadius: 6 }} />
      <div style={{ ...base, left, top: top + height - ARM, borderBottom: `${T}px solid ${c}`, borderLeft: `${T}px solid ${c}`, borderBottomLeftRadius: 6 }} />
      <div style={{ ...base, left: left + width - ARM, top: top + height - ARM, borderBottom: `${T}px solid ${c}`, borderRight: `${T}px solid ${c}`, borderBottomRightRadius: 6 }} />
    </>
  );
}

// Title block — a clean card (logo · board name · schematic subtitle · meta
// row) rather than a ruled table. Every value stays wired to the title fields.
function TitleBlock({
  width,
  right,
  bottom,
  fields,
  sheetSize,
  projectName,
}: {
  width: number;
  right: boolean;
  bottom: boolean;
  fields: Array<{ key: string; on: boolean; valueOn: boolean; value: string }>;
  sheetSize?: string;
  projectName?: string;
}) {
  const title = findValue(fields, "title", "") || "Untitled Board";
  const docNo = findValue(fields, "docNo", "");
  const rev = findValue(fields, "revision", "");
  const date = findValue(fields, "date", "");
  const author = findValue(fields, "author", "");
  const sheetNo = findValue(fields, "sheetNo", "");
  const company = findValue(fields, "company", "");
  const project = findValue(fields, "project", "");
  // Sheet size is not stored on the field — it *is* the border's paper size.
  const sizeOn = fields.some((f) => f.key === "sheetSize" && f.on);

  // UIUX-68 — every value carries its own label. The card used to print a dense
  // unlabelled strip ("Ayaan K. · Rev C 1/2 SB-001 A4 Landscape 2026-07-16"), so
  // a reader had to already know the schema to tell a doc number from a date,
  // and Project never showed at all.
  const has = (v: string) => !!v && v !== "—" && v !== "-";
  const rows: Array<[string, string]> = [];
  // Company is a labelled value, not the header: the header printed the company
  // *or* "IDEEZA" as a fallback, so an unset company read as our branding.
  if (has(company)) rows.push(["Company", company]);
  const projectValue = has(project) ? project : projectName;
  if (has(projectValue || "")) rows.push(["Project", projectValue!]);
  if (has(author)) rows.push(["Author", author]);
  if (has(docNo)) rows.push(["Doc No.", docNo]);
  if (has(rev)) rows.push(["Revision", rev]);
  if (has(sheetNo)) rows.push(["Sheet", sheetNo]);
  if (has(date)) rows.push(["Date", date]);
  if (sizeOn && sheetSize) rows.push(["Size", sheetSize]);

  return (
    <div
      style={{
        position: "absolute",
        ...(right ? { right: 34 } : { left: 34 }),
        ...(bottom ? { bottom: 34 } : { top: 34 }),
        width: Math.min(width, 320),
        border: "var(--border-width-1) solid var(--color-canvas-card-border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--color-canvas-card)",
        boxShadow: "var(--elevation-3)",
        padding: "var(--spacing-6) var(--spacing-7)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-3)",
      }}
    >
      {/* logo + company */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
        <span style={{ width: 20, height: 20, borderRadius: "var(--radius-full)", background: "var(--color-violet-600)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--color-text-on-brand)"><path d="M6 4l14 8-14 8z" /></svg>
        </span>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-violet-600)", letterSpacing: 0.2 }}>
          IDEEZA
        </span>
      </div>

      {/* sheet title — the one value big enough to read as the heading */}
      <div>
        <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={title}>
          {title}
        </div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>Schematic sheet</div>
      </div>

      {/* the rest as label / value pairs, the way a real title block reads */}
      {rows.length > 0 && (
        <div
          data-title-block-fields
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            columnGap: "var(--spacing-5)",
            rowGap: 2,
            borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
            paddingTop: "var(--spacing-3)",
          }}
        >
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>{label}</span>
              <span
                data-field={label}
                title={value}
                style={{ fontSize: "var(--font-size-xs)", fontWeight: 500, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {value}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
