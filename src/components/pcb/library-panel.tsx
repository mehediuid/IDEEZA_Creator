"use client";

// IDEEZA PCB Software — left-panel Library browser.
// Two views: Common Library (per-domain category tree) and All Library (a
// marketplace — category tree in the sidebar + a wide results-table flyout that
// overlays the canvas, with a selected-part detail strip). Faithful to Figma
// 445:204996 / 206940 / 210432 / 214833 and the right-click menu 2224:115245.

import * as React from "react";
import { Icon } from "@/lib/pcb/icons";
import { Button, SearchInput } from "@/components/ideeza";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { glyphFor } from "@/components/pcb/placed-objects";
import { allParts, pushRecent, readFavorites, toggleFavorite, type CatalogPart } from "@/lib/pcb/part-catalog";
import { nextDesignator, type CanvasObject, type LibCommonTab, type LibFilter, type LibPrice, type LibVerif } from "@/lib/pcb/types";

// ── module-scope pure data + helpers ──

const VIEW_ITEMS: { label: string; value: "common" | "all" }[] = [
  { label: "Common Library", value: "common" },
  { label: "All Library", value: "all" },
];

// Common Library is a browsable grid of symbol-preview cards. Each card shows
// the actual schematic/PCB symbol, a name, and a variant dropdown (package /
// value). Clicking the preview drops that part on the canvas.
type SymbolKind =
  | "resistor" | "capacitor" | "power" | "ground" | "inductor" | "diode"
  | "connector" | "ic" | "via" | "pad" | "frame" | "fiducial" | "hole";

type LibCard = { name: string; kind: string; symbol: SymbolKind; variants: string[] };
type CommonGroup = { name: string; cards: LibCard[] };

// Schematic symbols drawn on a 48×32 canvas, centered, stroked in currentColor.
// (the old hand-drawn SYMBOLS map is gone: cards preview the real placed
// geometry via `glyphFor`, so there is only one source for a symbol.)

const R_PKGS = ["0402", "0603", "0805", "1206"];
const C_PKGS = ["0402", "0603", "0805", "1210"];

const COMMON_GROUPS: Record<LibCommonTab, CommonGroup[]> = {
  schematic: [
    { name: "Supply Flag", cards: [
      { name: "VCC", kind: "vcc5v", symbol: "power", variants: ["VCC", "VDD", "VBAT"] },
      { name: "+5V", kind: "vcc5v", symbol: "power", variants: ["+5V", "+3.3V", "+12V"] },
      { name: "GND", kind: "pgnd", symbol: "ground", variants: ["GND", "AGND", "PGND"] },
    ] },
    { name: "Resistor", cards: [
      { name: "R 0402", kind: "resistor", symbol: "resistor", variants: R_PKGS },
      { name: "R 0603", kind: "resistor", symbol: "resistor", variants: R_PKGS },
    ] },
    { name: "Capacitor", cards: [
      { name: "C 0402", kind: "capacitor", symbol: "capacitor", variants: C_PKGS },
      { name: "C 0603", kind: "capacitor", symbol: "capacitor", variants: C_PKGS },
    ] },
    { name: "Discrete", cards: [
      { name: "Inductor", kind: "inductor", symbol: "inductor", variants: ["0603", "0805", "1210"] },
      { name: "Diode", kind: "diode", symbol: "diode", variants: ["SOD-123", "SOD-323", "SMA"] },
    ] },
    { name: "Connector / IC", cards: [
      { name: "Header 2x5", kind: "component", symbol: "connector", variants: ["2x5", "2x8", "1x4"] },
      { name: "IC (SOIC)", kind: "component", symbol: "ic", variants: ["SOIC-8", "SOIC-14", "TSSOP-20"] },
    ] },
  ],
  // #112 — the board set: real land patterns (the same glyphs Convert places),
  // pads, vias and the copper/outline objects, so a click drops board copper.
  pcb: [
    { name: "Footprints", cards: [
      { name: "Chip 0805 (R/C/L)", kind: "fp0805", symbol: "pad", variants: R_PKGS },
      { name: "SOD-123 diode", kind: "fpSOD123", symbol: "pad", variants: ["SOD-123", "SOD-323"] },
      { name: "SOT-23", kind: "fpSOT23", symbol: "pad", variants: ["SOT-23", "SOT-23-5"] },
      { name: "SOIC-8", kind: "fpSOIC8", symbol: "pad", variants: ["SOIC-8", "SOIC-14"] },
    ] },
    // Pad · Via · Board Outline · Fill Region are the top toolbar's (#110), so
    // they are deliberately absent here — no control lives in two places.
    // Test points, shaped pads and mounting holes are the palette's (#119/#120).
    { name: "Land patterns", cards: [
      { name: "Fiducial", kind: "pad", symbol: "fiducial", variants: ["1.0mm", "1.5mm"] },
    ] },
    { name: "Copper", cards: [
      { name: "Copper region", kind: "polygon", symbol: "pad", variants: ["Top", "Bottom"] },
      { name: "Slot region", kind: "slot", symbol: "pad", variants: ["Rounded"] },
    ] },
  ],
  panel: [
    { name: "Panel Frames", cards: [
      { name: "Frame", kind: "boardOutline", symbol: "frame", variants: ["100×80", "160×100"] },
    ] },
    { name: "Fiducials", cards: [
      { name: "Fiducial", kind: "pad", symbol: "fiducial", variants: ["1.0mm", "1.5mm"] },
    ] },
    { name: "Tooling Holes", cards: [
      { name: "Tooling Hole", kind: "mountingHole", symbol: "hole", variants: ["3.0mm", "4.0mm"] },
    ] },
  ],
};

// All Library — the sidebar tree is DERIVED from the real catalogue (family →
// packages, live counts), so it can never list a category with nothing in it.
const KIND_FAMILY: Record<string, string> = {
  resistor: "Resistors",
  capacitor: "Capacitors",
  inductor: "Inductors",
  diode: "Diodes",
  transistor: "Transistors",
  ic: "ICs",
  connector: "Connectors",
};
const libFamilyOf = (p: CatalogPart) => KIND_FAMILY[p.kind] ?? "Other parts";

// PRD 2026-08-30 — the tab row carries origin/access; "Verified" moved out to
// the Verification control below (§9.1: one filter must not live in two rows).
const FILTER_ITEMS: { label: string; value: LibFilter }[] = [
  { label: "All", value: "all" },
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
  { label: "AI-Generated", value: "ai" },
];

const VERIF_ITEMS: { label: string; value: LibVerif }[] = [
  { label: "All", value: "all" },
  { label: "Verified", value: "verified" },
  { label: "Not Verified", value: "unverified" },
];

const PRICE_ITEMS: { label: string; value: LibPrice }[] = [
  { label: "All", value: "all" },
  { label: "Free", value: "free" },
  { label: "Premium", value: "premium" },
];

// All Library — one row per real catalogue part (system catalogue + the parts
// the user authored via Project ▸ New ▸ Part). origin + verified are the PRD's
// two independent dimensions: today's system rows are human-submitted and
// verified, a personal part is unverified + private until reviewed, and
// AI-generated rows appear when IDEEZA part generation starts writing them.
type LibRow = {
  id: string; p: CatalogPart; family: string;
  origin: "human" | "ai"; verified: boolean; access: "public" | "private"; paid: boolean;
};
const isPersonal = (p: CatalogPart) => p.id.startsWith("own_");
const buildLibRows = (): LibRow[] =>
  allParts().map((p) => ({
    id: p.id,
    p,
    family: libFamilyOf(p),
    // Origin and verification come from the part record itself (PRD §9.2) —
    // the curated catalogue defaults to human + verified, a personal part is
    // unverified until reviewed.
    origin: p.origin ?? "human",
    verified: isPersonal(p) ? false : p.verified ?? true,
    access: isPersonal(p) ? "private" : "public",
    // Library entries are free today; a premium marketplace price is a listing
    // property, not the part's unit price.
    paid: false,
  }));

// Package → the land-pattern glyph that really exists for it (footprint
// preview); a package with no pattern yet says so instead of faking one.
const FP_GLYPH: [RegExp, string][] = [
  [/^(0402|0603|0805|1206|1210|1806)$/i, "fp0805"],
  [/SOD/i, "fpSOD123"],
  [/^SOT-23/i, "fpSOT23"],
  [/SOIC|TSSOP/i, "fpSOIC8"],
];
const fpGlyphFor = (pkg: string): string | null => FP_GLYPH.find(([re]) => re.test(pkg))?.[1] ?? null;

const CARET =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg>';
const CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>';
// Not Verified — a hollow clock, deliberately low-weight: "waiting for review",
// never an error (PRD §8). AI-Generated — a sparkle chip in the brand accent, a
// different shape class from the verification icons so the two can't be misread
// as one dimension and can co-exist on a row (PRD FR-5).
const UNVERIFIED_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
const AI_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z"/></svg>';

// ── Sidebar (left panel content) ──────────────────────────────────────────────

export function LibraryPanel() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [commonQuery, setCommonQuery] = React.useState("");
  const [allQuery, setAllQuery] = React.useState("");
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({ "0": true, "0.0": true });

  // #112 — board mode gets the board library (the pcb set existed but the panel
  // always showed the schematic one). The segmented control below still lets you
  // browse the other sets on purpose.
  const modeTab: LibCommonTab = state.mode === "schematic" ? "schematic" : "pcb";
  const [pickedTab, setPickedTab] = React.useState<LibCommonTab | null>(null);
  const commonTab: LibCommonTab = pickedTab ?? modeTab;
  const groups = COMMON_GROUPS[commonTab];
  const cq = commonQuery.trim().toLowerCase();

  const toggle = (k: string) => setExpanded((e) => ({ ...e, [k]: !e[k] }));

  // Cascading placement: each click drops the part at a slightly offset spot
  // so successive clicks don't stack objects directly on top of each other.
  // #123 — card density, and #125 — which card is open in the detail strip.
  const [big, setBig] = React.useState(true);
  const [variantOf, setVariantOf] = React.useState<Record<string, string>>({});
  const [picked, setPicked] = React.useState<{ key: string; card: LibCard; group: string } | null>(null);
  // UIUX-73 — how tall the detail preview is, remembered with the document so
  // it doesn't snap back to a thumbnail every time you open the panel.
  const storedH = Number((state.boardSettings ?? {}).libPreviewH);
  const previewH = Math.min(260, Math.max(66, Number.isFinite(storedH) && storedH ? storedH : 140));
  const setPreviewH = (h: number) =>
    actions.setBoardSetting("libPreviewH", Math.min(260, Math.max(66, Math.round(h))));
  const placeCount = React.useRef(0);
  const placeFromLib = (kind: string) => {
    const n = placeCount.current++;
    actions.placeObject(kind, 120 + (n % 8) * 28, 120 + (n % 8) * 28);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* view tabs (underline text tabs, Figma) */}
      <div style={{ display: "flex", gap: "var(--spacing-10)", padding: "var(--spacing-1) var(--spacing-7) var(--spacing-0)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        {VIEW_ITEMS.map((t) => {
          const active = state.libView === t.value;
          return (
            <div
              key={t.value}
              className="ix-tab"
              onClick={() => actions.setLibView(t.value)}
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                paddingBottom: "var(--spacing-4)",
                color: active ? "var(--color-text-brand)" : "var(--color-text-tertiary)",
                borderBottom: `var(--border-width-2) solid ${active ? "var(--color-violet-600)" : "transparent"}`,
                marginBottom: -1,
              }}
            >
              {t.label}
            </div>
          );
        })}
      </div>

      {state.libView === "common" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-5) var(--spacing-7) var(--spacing-3)" }}>
            <div style={{ display: "flex", background: "var(--color-bg-subtle)", borderRadius: "var(--radius-lg)", padding: 2, gap: 2, flex: 1 }}>
              {([["schematic", "Symbols"], ["pcb", "Board"], ["panel", "Panel"]] as const).map(([v, label]) => {
                const on = commonTab === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPickedTab(v)}
                    style={{ flex: 1, padding: "var(--spacing-2) var(--spacing-3)", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "var(--font-size-xs)", fontWeight: 600, background: on ? "var(--color-violet-600)" : "transparent", color: on ? "var(--color-text-on-brand)" : "var(--color-text-secondary)" }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-pressed={big}
              title={big ? "Smaller cards" : "Bigger cards"}
              onClick={() => setBig((v) => !v)}
              style={{ flex: "0 0 auto", padding: "var(--spacing-2) var(--spacing-4)", borderRadius: "var(--radius-md)", border: "var(--border-width-1) solid var(--color-border-default)", background: "var(--color-bg-surface)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              {big ? "S" : "L"}
            </button>
          </div>
          <div style={{ padding: "var(--spacing-0) var(--spacing-7) var(--spacing-5)" }}>
            <SearchInput value={commonQuery} onValueChange={setCommonQuery} placeholder={commonTab === "pcb" ? "Search footprints & pads" : "Search parts & components"} />
          </div>
          {/* #107 — Place a Part left the top toolbar; the library is its home. */}
          <div style={{ padding: "var(--spacing-0) var(--spacing-7) var(--spacing-5)" }}>
            <button
              type="button"
              className="ix-btn"
              onClick={() => actions.openPicker(commonTab === "pcb" ? "Parts" : "Parts")}
              style={{ width: "100%", padding: "var(--spacing-4)", borderRadius: "var(--radius-lg)", border: "var(--border-width-1) solid var(--color-violet-600)", background: "var(--color-bg-brand-subtle)", color: "var(--color-text-brand)", fontWeight: 600, fontSize: "var(--font-size-sm)", cursor: "pointer", fontFamily: "inherit" }}
            >
              Place a Part…
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-0) var(--spacing-6) var(--spacing-6)" }}>
            {groups.map((g) => {
              const cards = g.cards.filter(
                (c) => cq === "" || c.name.toLowerCase().includes(cq) || g.name.toLowerCase().includes(cq),
              );
              if (cards.length === 0) return null;
              return (
                <div key={g.name} style={{ marginBottom: "var(--spacing-5)" }}>
                  <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, letterSpacing: 0.3, color: "var(--color-text-secondary)", padding: "var(--spacing-2) var(--spacing-1) var(--spacing-3)" }}>
                    {g.name}
                  </div>
                  {/* #123 — auto-fit: a wider panel gives bigger cards, so the
                      symbol/footprint is actually readable. */}
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${big ? 150 : 108}px, 1fr))`, gap: "var(--spacing-4)" }}>
                    {cards.map((c, i) => {
                      const key = `${g.name}-${c.name}-${i}`;
                      return (
                        <PartCard
                          key={key}
                          card={c}
                          tall={big}
                          variant={variantOf[key] ?? c.variants[0]}
                          onVariant={(v) => setVariantOf((m) => ({ ...m, [key]: v }))}
                          selected={picked?.key === key}
                          onSelect={() => setPicked({ key, card: c, group: g.name })}
                          onPlace={() => placeFromLib(c.kind)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {groups.every((g) => g.cards.every((c) => cq !== "" && !c.name.toLowerCase().includes(cq) && !g.name.toLowerCase().includes(cq))) && (
              <div style={{ padding: "var(--spacing-8) var(--spacing-2)", textAlign: "center", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
                No parts match “{commonQuery}”.
              </div>
            )}
          </div>

          {/* #125 — what a click is about to add: a bigger preview of the real
              symbol, the numbers that matter, and the Place button. */}
          {picked && (
            <div style={{ flex: "0 0 auto", borderTop: "var(--border-width-1) solid var(--color-border-default)", background: "var(--color-bg-surface)", padding: "var(--spacing-5) var(--spacing-7)", display: "flex", gap: "var(--spacing-6)", alignItems: "center", position: "relative" }}>
              {/* UIUX-73 — the preview was a fixed 92×66 box with no way to
                  enlarge it, so a dense footprint couldn't be read. Drag this
                  edge to resize; the size is remembered with the document. */}
              <div
                role="separator"
                aria-label="Resize the preview"
                aria-orientation="horizontal"
                aria-valuenow={previewH}
                aria-valuemin={66}
                aria-valuemax={260}
                tabIndex={0}
                onKeyDown={(e) => {
                  const step = e.key === "ArrowUp" ? 16 : e.key === "ArrowDown" ? -16 : 0;
                  if (!step) return;
                  e.preventDefault();
                  setPreviewH(previewH + step);
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startH = previewH;
                  const move = (ev: PointerEvent) => setPreviewH(startH + (startY - ev.clientY));
                  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }}
                style={{ position: "absolute", top: -3, left: 0, right: 0, height: 7, cursor: "ns-resize" }}
              />
              <div style={{ width: Math.round(previewH * 1.4), height: previewH, flex: "0 0 auto", borderRadius: "var(--radius-md)", border: "var(--border-width-1) solid var(--color-border-subtle)", background: "var(--color-bg-page)", display: "grid", placeItems: "center", color: "var(--color-violet-600)" }}>
                <svg width={Math.round(previewH * 1.3)} height={Math.round(previewH * 0.9)} viewBox="-36 -24 72 48" style={{ overflow: "visible" }}>
                  <g stroke="currentColor" fill="none">{glyphFor(picked.card.kind)}</g>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {picked.card.name}
                </div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: 2 }}>
                  {picked.group} · {variantOf[picked.key] ?? picked.card.variants[0]} · places a <b>{picked.card.kind}</b>
                </div>
                <div style={{ fontSize: "var(--font-size-2xs, 10px)", color: "var(--color-text-tertiary)", marginTop: 2 }}>
                  {picked.card.variants.length > 1 ? `${picked.card.variants.length} variants — pick one on the card` : "single variant"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => placeFromLib(picked.card.kind)}
                style={{ flex: "0 0 auto", padding: "var(--spacing-3) var(--spacing-7)", borderRadius: "var(--radius-lg)", border: "none", background: "var(--color-violet-600)", color: "var(--color-text-on-brand)", fontWeight: 700, fontSize: "var(--font-size-sm)", cursor: "pointer", fontFamily: "inherit" }}
              >
                Place
              </button>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => setPicked(null)}
                style={{ flex: "0 0 auto", width: 24, height: 24, borderRadius: "var(--radius-md)", border: "none", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          )}
        </>
      )}

      {state.libView === "all" && (
        <>
          {/* search — filters the category tree below (the flyout's own search
              filters the result rows) */}
          <div style={{ padding: "var(--spacing-5) var(--spacing-7) var(--spacing-4)" }}>
            <SearchInput value={allQuery} onValueChange={setAllQuery} placeholder="Search categories & parts" />
          </div>

          {/* category tree — derived from the real catalogue: family → package,
              each with its live part count; picking one filters the results. */}
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-0) var(--spacing-4) var(--spacing-6)" }}>
            {(() => {
              const aq = allQuery.trim().toLowerCase();
              const parts = allParts().filter(
                (p) =>
                  aq === "" ||
                  libFamilyOf(p).toLowerCase().includes(aq) ||
                  p.part.toLowerCase().includes(aq) ||
                  p.pkg.toLowerCase().includes(aq) ||
                  p.mfr.toLowerCase().includes(aq),
              );
              const fams = new Map<string, Map<string, number>>();
              for (const p of parts) {
                const fam = libFamilyOf(p);
                const pkgs = fams.get(fam) ?? new Map<string, number>();
                pkgs.set(p.pkg, (pkgs.get(p.pkg) ?? 0) + 1);
                fams.set(fam, pkgs);
              }
              const famList = [...fams.entries()].sort((a, b) => a[0].localeCompare(b[0]));
              if (!famList.length)
                return (
                  <div style={{ padding: "var(--spacing-8) var(--spacing-4)", textAlign: "center", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
                    No categories match “{allQuery}”.
                  </div>
                );
              return (
                <>
                  <TreeRow
                    label={`All parts (${parts.length})`}
                    depth={0}
                    caret="none"
                    selected={state.libCat === null}
                    onClick={() => actions.setLibCat(null)}
                  />
                  {famList.map(([fam, pkgs]) => {
                    const open = !!expanded[fam];
                    const count = [...pkgs.values()].reduce((a, b) => a + b, 0);
                    const famSel = state.libCat?.family === fam && !state.libCat?.pkg;
                    return (
                      <div key={fam}>
                        <TreeRow
                          label={`${fam} (${count})`}
                          depth={0}
                          caret={open ? "open" : "closed"}
                          selected={famSel}
                          onClick={() => {
                            toggle(fam);
                            actions.setLibCat({ family: fam, pkg: null });
                          }}
                        />
                        {open &&
                          [...pkgs.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([pkg, n]) => (
                            <TreeRow
                              key={pkg}
                              label={`${pkg} (${n})`}
                              depth={1}
                              caret="none"
                              selected={state.libCat?.family === fam && state.libCat?.pkg === pkg}
                              onClick={() => actions.setLibCat({ family: fam, pkg })}
                            />
                          ))}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

// A single library card: symbol preview (click to place) + variant dropdown.
// #123/#124/#125 — one card: it previews the REAL symbol that will be placed
// (`glyphFor`, the same geometry the canvas draws, so the two can't drift), it
// says on hover what a click does, and a click selects it for the detail strip
// instead of dropping a part on the board behind your back. Double-click still
// places straight away for people who know what they want.
function PartCard({
  card, variant, onVariant, selected, onSelect, onPlace, tall,
}: {
  card: LibCard;
  variant: string;
  onVariant: (v: string) => void;
  selected: boolean;
  onSelect: () => void;
  onPlace: () => void;
  tall: boolean;
}) {
  const [hover, setHover] = React.useState(false);
  // Keyboard focus has to light the card the way hover does, or the Place
  // affordance below is mouse-only.
  const [focus, setFocus] = React.useState(false);
  const lit = hover || selected || focus;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `var(--border-width-1) solid ${selected ? "var(--color-violet-600)" : lit ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--color-bg-surface)",
        transition: "border-color .14s, box-shadow .14s, transform .14s",
        boxShadow: lit ? "var(--elevation-2)" : "none",
        transform: hover ? "translateY(-1px)" : "none",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onDoubleClick={onPlace}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        // A role="button" owes both keys, and Space would otherwise scroll.
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPlace(); }
        }}
        title={`${card.name} · ${variant} — click for details, double-click to place`}
        aria-label={`${card.name} ${variant}`}
        style={{
          position: "relative", width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          height: tall ? 96 : 62, background: "var(--color-bg-page)",
          borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
          cursor: "pointer", color: lit ? "var(--color-violet-600)" : "var(--color-text-secondary)",
          // The card clips its overflow, so the focus ring has to sit inside it.
          outlineOffset: -3,
          transition: "color .14s",
        }}
      >
        {/* the real placed geometry, scaled into the card */}
        <svg width="100%" height={tall ? 86 : 54} viewBox="-34 -22 68 44" style={{ display: "block", overflow: "visible" }}>
          <g stroke="currentColor" fill="none">{glyphFor(card.kind)}</g>
        </svg>
        {/* #124 — hover says what a click will do, before it happens */}
        {lit && (
          <button
            type="button"
            className="ix-tool"
            onClick={(e) => { e.stopPropagation(); onPlace(); }}
            style={{
              position: "absolute", right: 6, bottom: 6, padding: "3px 9px", borderRadius: 999,
              border: "var(--border-width-1) solid var(--color-violet-600)",
              background: "var(--color-bg-brand-subtle)", color: "var(--color-text-brand)",
              fontSize: "var(--font-size-2xs, 10px)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Place
          </button>
        )}
      </div>
      <VariantDropdown name={card.name} variant={variant} variants={card.variants} onChange={onVariant} />
    </div>
  );
}

function VariantDropdown({ name, variant, variants, onChange }: { name: string; variant: string; variants: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "var(--spacing-2)", padding: "var(--spacing-3) var(--spacing-4)", background: "transparent",
          border: "none", cursor: "pointer", fontFamily: "inherit",
          fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--color-text-primary)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name} · {variant}</span>
        <span style={{ width: 11, height: 11, flex: "0 0 auto", color: "var(--color-text-tertiary)", transform: open ? "rotate(90deg)" : "none", transition: "transform .12s" }}><Icon html={CARET} /></span>
      </button>
      {open && (
        <div role="listbox" style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 2, zIndex: 40, background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", boxShadow: "var(--elevation-4)", padding: "var(--spacing-1)", maxHeight: 160, overflowY: "auto" }}>
          {variants.map((v) => (
            <div
              key={v}
              role="option"
              aria-selected={v === variant}
              className="ix-row"
              onClick={() => { onChange(v); setOpen(false); }}
              style={{ padding: "var(--spacing-2) var(--spacing-4)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "var(--font-size-xs)", fontWeight: v === variant ? 700 : 500, color: v === variant ? "var(--color-text-brand)" : "var(--color-text-secondary)", background: v === variant ? "var(--color-bg-brand-subtle)" : "transparent" }}
            >
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TreeRow({ label, depth, caret, selected, onClick }: { label: string; depth: number; caret: "open" | "closed" | "none"; selected?: boolean; onClick?: () => void }) {
  return (
    <div
      className="ix-row"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
        padding: "var(--spacing-3) var(--spacing-4)",
        paddingLeft: `calc(var(--spacing-4) + ${depth * 16}px)`,
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        background: selected ? "var(--color-bg-brand-subtle)" : "transparent",
      }}
    >
      <span style={{ width: 12, height: 12, flex: "0 0 auto", display: "inline-flex", color: "var(--color-text-tertiary)", transform: caret === "open" ? "rotate(90deg)" : "none", visibility: caret === "none" ? "hidden" : "visible" }}>
        <Icon html={CARET} />
      </span>
      <span style={{ fontSize: "var(--font-size-sm)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: selected ? "var(--color-text-brand)" : "var(--color-text-secondary)", fontWeight: selected ? 600 : 500 }}>
        {label}
      </span>
    </div>
  );
}

// ── Results flyout (overlays the canvas) ────────────────────────────────────

export function AllLibraryFlyout() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [query, setQuery] = React.useState("");
  const [favs, setFavs] = React.useState<string[]>(() => readFavorites());
  // The rows are the REAL catalogue (system parts + the user's own from
  // Project ▸ New ▸ Part) — not demo data.
  const rows = React.useMemo(buildLibRows, []);
  // PRD FR-3/FR-9 — tabs, verification, price, the sidebar's category pick and
  // search AND-combine over the rows.
  const q = query.trim().toLowerCase();
  const cat = state.libCat;
  const visibleRows = rows.filter((r) =>
    (state.libFilter === "all" || (state.libFilter === "ai" ? r.origin === "ai" : r.access === state.libFilter)) &&
    (state.libVerif === "all" || (state.libVerif === "verified") === r.verified) &&
    (state.libPrice === "all" || (state.libPrice === "premium") === r.paid) &&
    (!cat || (r.family === cat.family && (!cat.pkg || r.p.pkg === cat.pkg))) &&
    (q === "" ||
      r.p.part.toLowerCase().includes(q) ||
      r.p.mfr.toLowerCase().includes(q) ||
      r.p.pkg.toLowerCase().includes(q) ||
      r.p.features.some((f) => f.toLowerCase().includes(q))),
  );
  // A row filtered out of view can't stay "selected" behind the user's back.
  const sel = visibleRows.find((r) => r.id === state.libSelected) || null;

  // "Use" — the same real placement the part picker does: next free
  // designator, MPN/package/manufacturer on the object, Recent updated.
  const placePart = (p: CatalogPart) => {
    pushRecent(p.id);
    const inPcb = state.mode === "pcb" || state.mode === "2d";
    const des = nextDesignator(state.objects, p.kind);
    let n = state.objects.length + 1;
    while (state.objects.some((o) => o.id === `obj_lib${n}`)) n++;
    const id = `obj_lib${n}`;
    const offset = (state.objects.length % 5) * 30;
    actions.merge({
      objects: [
        ...state.objects,
        {
          id,
          kind: p.kind,
          x: 420 + offset,
          y: 300 + offset,
          rotation: 0,
          text: des ?? p.part,
          footprint: p.pkg,
          comment: p.mfr,
          scope: inPcb ? "pcb" : undefined,
          layer: inPcb ? state.activePcbLayer : undefined,
          sheetId: inPcb ? undefined : state.activeSheetId,
          props: { mpn: p.part, package: p.pkg, manufacturer: p.mfr },
        } as CanvasObject,
      ],
      selectedIds: [id],
    });
    actions.flashToast(des ? `Placed ${des} — ${p.part} (${p.pkg})` : `Placed ${p.part} (${p.pkg})`);
  };
  // UIUX-73 — the verified-parts preview column was a fixed 96px strip, so the
  // symbol and footprint were squeezed into thumbnails you couldn't read. It is
  // draggable now, and the previews grow with it. Remembered with the document.
  const PREV_MIN = 96;
  const PREV_MAX = 320;
  const storedW = Number((state.boardSettings ?? {}).libAllPreviewW);
  const previewW = Math.min(PREV_MAX, Math.max(PREV_MIN, Number.isFinite(storedW) && storedW ? storedW : PREV_MIN));
  const setPreviewW = (w: number) =>
    actions.setBoardSetting("libAllPreviewW", Math.min(PREV_MAX, Math.max(PREV_MIN, Math.round(w))));
  const onPreviewDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = previewW;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => setPreviewW(startW - (ev.clientX - startX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 292,
        top: 96,
        width: 600,
        maxHeight: "calc(100% - 120px)",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--elevation-5)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* filter pills + search */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-7) var(--spacing-8) var(--spacing-4)" }}>
        {FILTER_ITEMS.map((f) => {
          const active = state.libFilter === f.value;
          return (
            <div
              key={f.value}
              className="ix-tab"
              onClick={() => actions.setLibFilter(f.value)}
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
                cursor: "pointer",
                padding: "var(--spacing-2) var(--spacing-6)",
                borderRadius: "var(--radius-full)",
                color: active ? "var(--color-text-brand)" : "var(--color-text-tertiary)",
                border: `var(--border-width-1) solid ${active ? "var(--color-border-brand)" : "transparent"}`,
              }}
            >
              {f.label}
            </div>
          );
        })}
        <div style={{ marginLeft: "auto", width: 150 }}>
          <SearchInput value={query} onValueChange={setQuery} placeholder="Search" />
        </div>
      </div>

      {/* verification segmented control + price radios — one row (PRD §7.2:
          verification sits next to Price; origin lives in the tabs above) */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--spacing-4) var(--spacing-7)", padding: "var(--spacing-0) var(--spacing-8) var(--spacing-5)" }}>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>Verification</span>
        <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
          {VERIF_ITEMS.map((v) => {
            const active = state.libVerif === v.value;
            return (
              <button
                key={v.value}
                type="button"
                aria-pressed={active}
                onClick={() => actions.setLibVerif(v.value)}
                style={{
                  padding: "var(--spacing-1) var(--spacing-4)",
                  borderRadius: "var(--radius-full)",
                  fontFamily: "inherit",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `var(--border-width-1) solid ${active ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
                  background: active ? "var(--color-bg-brand-subtle)" : "transparent",
                  color: active ? "var(--color-text-brand)" : "var(--color-text-tertiary)",
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>Price</span>
        {PRICE_ITEMS.map((p) => {
          const active = state.libPrice === p.value;
          return (
            <div key={p.value} onClick={() => actions.setLibPrice(p.value)} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer" }}>
              <span style={{ width: 16, height: 16, borderRadius: "var(--radius-full)", border: `var(--border-width-1-5) solid ${active ? "var(--color-violet-600)" : "var(--color-border-strong)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {active && <span style={{ width: 8, height: 8, borderRadius: "var(--radius-full)", background: "var(--color-violet-600)" }} />}
              </span>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{p.label}</span>
            </div>
          );
        })}
      </div>

      {/* table + (when selected) preview column */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* header */}
          <div style={{ display: "flex", padding: "var(--spacing-4) var(--spacing-8)", background: "var(--color-bg-brand-subtle)", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)" }}>
            <span style={{ flex: 2 }}>Part</span>
            <span style={{ flex: 1.2 }}>Manufacturer</span>
            <span style={{ flex: 2 }}>Description</span>
          </div>
          {/* rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {visibleRows.length === 0 && (
              <div style={{ padding: "var(--spacing-8)", textAlign: "center", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
                No parts match these filters — clear a filter or the search to widen.
              </div>
            )}
            {visibleRows.map((r) => {
              const selected = state.libSelected === r.id;
              return (
                <div
                  key={r.id}
                  className="ix-row"
                  onClick={() => actions.setLibSelected(r.id)}
                  onDoubleClick={() => placePart(r.p)}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); actions.setLibSelected(r.id); actions.openLibCtx(e); }}
                  title={`${r.p.part} · ${r.p.pkg} — click for details, double-click to place`}
                  style={{ display: "flex", alignItems: "center", padding: "var(--spacing-4) var(--spacing-8)", cursor: "pointer", background: selected ? "var(--color-bg-brand-subtle)" : "transparent", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}
                >
                  <div style={{ flex: 2, display: "flex", alignItems: "center", gap: "var(--spacing-3)", minWidth: 0 }}>
                    {/* the real symbol the row places, as its icon */}
                    <svg width={24} height={16} viewBox="-34 -22 68 44" style={{ flex: "0 0 auto", color: "var(--color-violet-600)", overflow: "visible" }}>
                      <g stroke="currentColor" fill="none">{glyphFor(r.p.kind)}</g>
                    </svg>
                    <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: selected ? "var(--color-text-brand)" : "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.p.part}</span>
                    {favs.includes(r.id) && (
                      <span title="Favourite" style={{ flex: "0 0 auto", color: "var(--color-text-warning)", fontSize: 11, lineHeight: 1 }}>★</span>
                    )}
                    {r.verified ? (
                      <span
                        title="Verified — symbol, footprint and metadata reviewed"
                        style={{ width: 14, height: 14, flex: "0 0 auto", borderRadius: "var(--radius-full)", background: "var(--color-text-success)", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Icon html={CHECK_SVG} size={10} />
                      </span>
                    ) : (
                      <span
                        title={r.origin === "ai" ? "AI-Generated — not yet human-verified" : "Not verified yet — no quality guarantee"}
                        style={{ width: 14, height: 14, flex: "0 0 auto", color: "var(--color-text-warning)", display: "flex" }}
                      >
                        <Icon html={UNVERIFIED_SVG} size={14} />
                      </span>
                    )}
                    {r.origin === "ai" && (
                      <span
                        title="AI-Generated — produced by IDEEZA part generation"
                        style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: "var(--radius-full)", background: "var(--color-bg-brand-subtle)", color: "var(--color-text-brand)", fontSize: "var(--font-size-2xs, 10px)", fontWeight: 700 }}
                      >
                        <Icon html={AI_SVG} size={10} /> AI
                      </span>
                    )}
                  </div>
                  <span style={{ flex: 1.2, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.p.mfr}</span>
                  <span style={{ flex: 2, fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.p.features.join(", ")} · {r.p.pkg}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* preview column (only when a row is selected) — drag its edge to read
            the symbol and footprint at a real size, not as 56px thumbnails. */}
        {sel && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize preview"
              aria-valuenow={previewW}
              aria-valuemin={PREV_MIN}
              aria-valuemax={PREV_MAX}
              tabIndex={0}
              onPointerDown={onPreviewDrag}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") { e.preventDefault(); setPreviewW(previewW + 16); }
                else if (e.key === "ArrowRight") { e.preventDefault(); setPreviewW(previewW - 16); }
                else if (e.key === "Home") { e.preventDefault(); setPreviewW(PREV_MAX); }
                else if (e.key === "End") { e.preventDefault(); setPreviewW(PREV_MIN); }
              }}
              title="Drag to resize the preview"
              style={{ width: 7, flex: "0 0 auto", cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}
            >
              <span style={{ width: 3, height: 26, borderRadius: "var(--radius-full)", background: "var(--color-border-strong)" }} />
            </div>
            <div style={{ width: previewW, flex: "0 0 auto", borderLeft: "var(--border-width-1) solid var(--color-border-subtle)", padding: "var(--spacing-5)", display: "flex", flexDirection: "column", gap: "var(--spacing-5)", overflowY: "auto" }}>
              {/* the REAL geometry: the symbol the row places, and the land
                  pattern its package maps to (honest when none exists yet) */}
              <PreviewGlyph label="Symbol" kind={sel.p.kind} size={previewW - 24} />
              <PreviewGlyph label="Footprint" kind={fpGlyphFor(sel.p.pkg)} size={previewW - 24} board emptyText={`No land pattern for ${sel.p.pkg} yet`} />
            </div>
          </>
        )}
      </div>

      {/* selected detail strip — the row's REAL data (catalogue stock/price),
          and Use really places the part like the picker does */}
      {sel && (
        <div style={{ borderTop: "var(--border-width-1) solid var(--color-border-subtle)", padding: "var(--spacing-5) var(--spacing-8)" }}>
          <div style={{ fontSize: "var(--font-size-xs)", fontStyle: "italic", color: "var(--color-text-tertiary)", marginBottom: "var(--spacing-3)" }}>
            All Library &gt; <span style={{ color: "var(--color-text-brand)" }}>{sel.family}</span> &gt; {sel.p.part}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", marginBottom: "var(--spacing-4)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Package: <b>{sel.p.pkg}</b></span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Stock: <span style={{ color: "var(--color-text-error)", fontWeight: 600 }}>{sel.p.stock}</span></span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Unit price: <span style={{ color: "var(--color-text-error)", fontWeight: 700 }}>{sel.p.price}</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sel.p.features.join(" · ")}</span>
            <span style={{ marginLeft: "auto" }} />
            <Button hierarchy="primary" size="sm" onClick={() => placePart(sel.p)}>Use</Button>
          </div>
        </div>
      )}

      {/* right-click context menu — real commands on the right-clicked row */}
      {state.libCtx && sel && (
        <>
          <div onClick={actions.closeLibCtx} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
          <div style={{ position: "fixed", left: state.libCtx.x, top: state.libCtx.y, zIndex: 999, minWidth: 184, padding: "var(--spacing-2)", background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", boxShadow: "var(--elevation-2)" }}>
            {[
              { label: `Place ${sel.p.part}`, run: () => placePart(sel.p) },
              { label: favs.includes(sel.id) ? "Remove from Favourites" : "Add to Favourites", run: () => setFavs(toggleFavorite(sel.id)) },
            ].map((item) => (
              <div
                key={item.label}
                className="ix-row"
                onClick={() => { item.run(); actions.closeLibCtx(); }}
                style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", padding: "var(--spacing-3) var(--spacing-4)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// A real preview: the same glyph geometry the canvas draws (`glyphFor`), on the
// sheet ground for symbols and the board ground for land patterns. A package
// with no pattern yet says so instead of showing a stand-in doodle.
function PreviewGlyph({ label, kind, size = 96, board = false, emptyText }: {
  label: string;
  kind: string | null;
  size?: number;
  board?: boolean;
  emptyText?: string;
}) {
  const h = Math.round(size * 0.72);
  return (
    <div>
      <div style={{ fontSize: "var(--font-size-2xs, 10px)", fontWeight: 700, letterSpacing: 0.3, color: "var(--color-text-tertiary)", marginBottom: "var(--spacing-2)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        data-preview={label.toLowerCase()}
        style={{
          width: size,
          height: h,
          borderRadius: "var(--radius-md)",
          border: "var(--border-width-1) solid var(--color-border-default)",
          background: board ? "var(--color-pcb-substrate, #14532d)" : "var(--color-bg-page)",
          color: board ? "var(--color-pcb-pad, #d8a838)" : "var(--color-violet-600)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {kind ? (
          <svg width={Math.round(size * 0.82)} height={Math.round(h * 0.8)} viewBox="-36 -24 72 48" style={{ overflow: "visible" }}>
            <g stroke="currentColor" fill="none">{glyphFor(kind)}</g>
          </svg>
        ) : (
          <span style={{ fontSize: "var(--font-size-xs)", color: board ? "rgba(255,255,255,.75)" : "var(--color-text-tertiary)", padding: "var(--spacing-4)", textAlign: "center" }}>
            {emptyText ?? "No preview yet"}
          </span>
        )}
      </div>
    </div>
  );
}
