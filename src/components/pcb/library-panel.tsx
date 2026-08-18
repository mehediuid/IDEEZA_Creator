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
import type { LibCommonTab, LibFilter, LibPrice } from "@/lib/pcb/types";

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

// All Library — sidebar category tree (Figma 445:204996).
type Branch = { label: string; leaves?: string[]; children?: { label: string; leaves: string[] }[] };
const CATEGORY_TREE: Branch[] = [
  {
    label: "AD8497ARMZ",
    children: [
      { label: "Adaptor", leaves: ["D8497ARMZ", "8497ARMZ", "497ARMZ", "D8497ARMZ", "UD8497ARMZ", "ER8497ARMZ"] },
      { label: "AD8497ARMZ", leaves: [] },
      { label: "AD8497ARMZ", leaves: [] },
      { label: "AD8497ARMZ", leaves: [] },
    ],
  },
  { label: "Adafruit" },
  { label: "Anti-static, ESD, clean room product" },
  { label: "Audio products" },
  { label: "Audio & video" },
  { label: "Battery products" },
  { label: "Boxes, Enclosures, Racks" },
  { label: "Bushings, grommets" },
  { label: "Bushings, grommets" },
  { label: "Bushings, grommets" },
  { label: "Bushings, grommets" },
  { label: "Bushings, grommets" },
  { label: "Bushings, grommets" },
  { label: "Cable assemblies" },
  { label: "Capacitors" },
  { label: "Crystals, oscillators, Resonators" },
];

// The 6 view icons above the category tree (icon #2 = schematic is active).
const TREE_TOOLBAR: { key: string; svg: string }[] = [
  { key: "grid", svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>' },
  { key: "schematic", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 12h3l2-6 4 12 2-6h7"/></svg>' },
  { key: "footprint", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M3 9v6M21 9v6M9 3h6M9 21h6"/></svg>' },
  { key: "cube", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 3v9l8 4.5M12 12L4 16.5"/></svg>' },
  { key: "doc", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h6M10 16h6"/></svg>' },
  { key: "graph", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="9" r="2"/><circle cx="9" cy="18" r="2"/><path d="M8 7l8 1M8 8l1 8"/></svg>' },
];

const FILTER_ITEMS: { label: string; value: LibFilter }[] = [
  { label: "All", value: "all" },
  { label: "Verified", value: "verified" },
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
];

const PRICE_ITEMS: { label: string; value: LibPrice }[] = [
  { label: "All", value: "all" },
  { label: "Free", value: "free" },
  { label: "Premium", value: "premium" },
];

// All Library — results table rows (Figma 445:206940). Same part, many authors.
type Row = { id: string; title: string; author: string; desc: string; paid: boolean };
const ALL_ROWS: Row[] = [
  { id: "r1", title: "D8497ARMZ", author: "Esther Howard", desc: "IC MCU 8BIT 32KB FLAS…", paid: false },
  { id: "r2", title: "D8497ARMZ", author: "Ralph Edwards", desc: "IC MCU 8BIT 32KB FLAS…", paid: false },
  { id: "r3", title: "D8497ARMZ", author: "Jacob Jones", desc: "IC MCU 8BIT 32KB FLAS…", paid: false },
  { id: "r4", title: "D8497ARMZ", author: "Leslie Alexander", desc: "IC MCU 8BIT 32KB FLAS…", paid: false },
  { id: "r5", title: "D8497ARMZ", author: "Kristin Watson", desc: "IC MCU 8BIT 32KB FLAS…", paid: false },
  { id: "r6", title: "D8497ARMZ", author: "Floyd Miles", desc: "IC MCU 8BIT 32KB FLAS…", paid: true },
  { id: "r7", title: "D8497ARMZ", author: "Cameron Williamson", desc: "IC MCU 8BIT 32KB FLAS…", paid: false },
  { id: "r8", title: "D8497ARMZ", author: "Cameron Williamson", desc: "IC MCU 8BIT 32KB FLASH…", paid: true },
];

const CTX_ITEMS = ["Refresh", "Add to Common Library", "Remove form Library"];

const CARET =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg>';
const CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>';
const CHIP_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M3 9v6M21 9v6M9 3h6M9 21h6"/></svg>';

// ── Sidebar (left panel content) ──────────────────────────────────────────────

export function LibraryPanel() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [commonQuery, setCommonQuery] = React.useState("");
  const [allQuery, setAllQuery] = React.useState("");
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({ "0": true, "0.0": true });
  const [treeSel, setTreeSel] = React.useState("0.0.0");

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
          {/* search */}
          <div style={{ padding: "var(--spacing-5) var(--spacing-7) var(--spacing-4)" }}>
            <SearchInput value={allQuery} onValueChange={setAllQuery} placeholder="Search parts & compo.." />
          </div>

          {/* 6-icon view toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", padding: "var(--spacing-0) var(--spacing-8) var(--spacing-4)" }}>
            {TREE_TOOLBAR.map((ic) => {
              const active = ic.key === "schematic";
              return (
                <div key={ic.key} className="ix-btn" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}>
                  <span style={{ width: 17, height: 17, color: active ? "var(--color-violet-600)" : "var(--color-text-tertiary)" }}>
                    <Icon html={ic.svg} size={17} />
                  </span>
                  <span style={{ width: 14, height: 2, borderRadius: 2, background: active ? "var(--color-violet-600)" : "transparent" }} />
                </div>
              );
            })}
          </div>

          {/* category tree */}
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-0) var(--spacing-4) var(--spacing-6)" }}>
            {CATEGORY_TREE.map((b, i) => {
              const bk = String(i);
              const hasChildren = !!b.children?.length;
              const bOpen = !!expanded[bk];
              return (
                <div key={bk}>
                  <TreeRow label={b.label} depth={0} caret={hasChildren ? (bOpen ? "open" : "closed") : "none"} onClick={() => hasChildren && toggle(bk)} />
                  {hasChildren && bOpen && b.children!.map((c, j) => {
                    const ck = `${bk}.${j}`;
                    const cOpen = !!expanded[ck];
                    return (
                      <div key={ck}>
                        <TreeRow label={c.label} depth={1} caret={c.leaves.length ? (cOpen ? "open" : "closed") : "none"} onClick={() => c.leaves.length && toggle(ck)} />
                        {cOpen && c.leaves.map((leaf, k) => {
                          const lk = `${ck}.${k}`;
                          return <TreeRow key={lk} label={leaf} depth={2} caret="none" selected={treeSel === lk} onClick={() => setTreeSel(lk)} />;
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
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
  const sel = ALL_ROWS.find((r) => r.id === state.libSelected) || null;

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

      {/* price radios */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-7)", padding: "var(--spacing-0) var(--spacing-8) var(--spacing-5)" }}>
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
            <span style={{ flex: 2 }}>Title</span>
            <span style={{ flex: 1.4 }}>Create by</span>
            <span style={{ flex: 2 }}>Description</span>
          </div>
          {/* rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {ALL_ROWS.map((r) => {
              const selected = state.libSelected === r.id;
              return (
                <div
                  key={r.id}
                  className="ix-row"
                  onClick={() => actions.setLibSelected(r.id)}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); actions.openLibCtx(e); }}
                  style={{ display: "flex", alignItems: "center", padding: "var(--spacing-4) var(--spacing-8)", cursor: "pointer", background: selected ? "var(--color-bg-brand-subtle)" : "transparent", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}
                >
                  <div style={{ flex: 2, display: "flex", alignItems: "center", gap: "var(--spacing-3)", minWidth: 0 }}>
                    <span style={{ width: 16, height: 16, flex: "0 0 auto", color: "var(--color-violet-600)" }}><Icon html={CHIP_SVG} size={16} /></span>
                    <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: selected ? "var(--color-text-brand)" : "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</span>
                    <span style={{ width: 14, height: 14, flex: "0 0 auto", borderRadius: "var(--radius-full)", background: "var(--color-text-success)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon html={CHECK_SVG} size={10} /></span>
                  </div>
                  <span style={{ flex: 1.4, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.author}</span>
                  <span style={{ flex: 2, fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* preview thumbnails (only when a row is selected) */}
        {sel && (
          <div style={{ width: 96, flex: "0 0 auto", borderLeft: "var(--border-width-1) solid var(--color-border-subtle)", padding: "var(--spacing-5)", display: "flex", flexDirection: "column", gap: "var(--spacing-5)" }}>
            <PreviewBox kind="sym" />
            <PreviewBox kind="pcb" />
            <PreviewBox kind="3d" />
          </div>
        )}
      </div>

      {/* selected detail strip */}
      {sel && (
        <div style={{ borderTop: "var(--border-width-1) solid var(--color-border-subtle)", padding: "var(--spacing-5) var(--spacing-8)" }}>
          <div style={{ fontSize: "var(--font-size-xs)", fontStyle: "italic", color: "var(--color-text-tertiary)", marginBottom: "var(--spacing-3)" }}>
            Parts & Agile module &gt; AD8497ARMZ &gt; <span style={{ color: "var(--color-text-brand)" }}>Adaptor</span> &gt; 497ARMZ D8497ARMZ
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", marginBottom: "var(--spacing-4)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>DIgiKey Stock: <span style={{ color: "var(--color-text-error)", fontWeight: 600 }}>20490</span></span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>LCSC Stock <span style={{ color: "var(--color-text-error)", fontWeight: 600 }}>1123</span></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>Price: <span style={{ color: "var(--color-text-error)", fontWeight: 700 }}>{sel.paid ? "Paid" : "$0.5"}</span></span>
            <span style={{ marginLeft: "auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", cursor: "pointer" }}>Report</span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-brand)", fontWeight: 600, cursor: "pointer" }}>See Details</span>
            <Button hierarchy="primary" size="sm">Use</Button>
          </div>
        </div>
      )}

      {/* right-click context menu + backdrop */}
      {state.libCtx && (
        <>
          <div onClick={actions.closeLibCtx} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
          <div style={{ position: "fixed", left: state.libCtx.x, top: state.libCtx.y, zIndex: 999, minWidth: 184, padding: "var(--spacing-2)", background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", boxShadow: "var(--elevation-2)" }}>
            {CTX_ITEMS.map((item) => (
              <div key={item} className="ix-row" onClick={actions.closeLibCtx} style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", padding: "var(--spacing-3) var(--spacing-4)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                {item}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PreviewBox({ kind }: { kind: "sym" | "pcb" | "3d" }) {
  const bg = kind === "pcb" ? "#1a1a1a" : "var(--color-bg-surface)";
  return (
    <div style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", border: "var(--border-width-1) solid var(--color-border-default)", background: bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {kind === "sym" && <svg width="40" height="20" viewBox="0 0 40 20"><path d="M2 10h6l2-6 4 12 4-12 4 12 2-6h12" fill="none" stroke="#1a1a1a" strokeWidth="1.3" /></svg>}
      {kind === "pcb" && <svg width="40" height="40" viewBox="0 0 40 40"><rect x="12" y="14" width="16" height="9" fill="none" stroke="#e34c4c" strokeWidth="1.5" /><rect x="8" y="17" width="5" height="3" fill="#d8a838" /><rect x="27" y="17" width="5" height="3" fill="#d8a838" /></svg>}
      {kind === "3d" && <svg width="40" height="30" viewBox="0 0 40 30"><rect x="8" y="11" width="24" height="9" rx="1" fill="#2f6db5" /><rect x="6" y="13" width="3" height="5" fill="#888" /><rect x="31" y="13" width="3" height="5" fill="#888" /></svg>}
    </div>
  );
}
