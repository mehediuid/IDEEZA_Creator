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
import type { LibCommonTab, LibFilter, LibPrice } from "@/lib/pcb/types";

// ── module-scope pure data + helpers ──

const VIEW_ITEMS: { label: string; value: "common" | "all" }[] = [
  { label: "Common Library", value: "common" },
  { label: "All Library", value: "all" },
];

const COMMON_TABS: { label: string; value: LibCommonTab }[] = [
  { label: "Schematic", value: "schematic" },
  { label: "PCB", value: "pcb" },
  { label: "Panel", value: "panel" },
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
const SYMBOLS: Record<SymbolKind, React.ReactNode> = {
  resistor: <><path d="M2 16h8M38 16h8" /><rect x="10" y="10" width="28" height="12" rx="1" /></>,
  capacitor: <><path d="M2 16h18M20 6v20M28 6v20M28 16h18" /></>,
  power: <><path d="M24 28V10M14 10h20" /><path d="M24 10l-3 -5M24 10l3 -5" /></>,
  ground: <><path d="M24 4v14M14 18h20M18 23h12M21 28h6" /></>,
  inductor: <path d="M2 18h6a5 5 0 0 1 10 0 5 5 0 0 1 10 0 5 5 0 0 1 10 0h6" />,
  diode: <><path d="M2 16h14M32 16h14M32 8v16" /><path d="M16 8l16 8-16 8z" fill="currentColor" stroke="none" /></>,
  connector: <><rect x="14" y="6" width="20" height="20" rx="2" /><path d="M6 11h8M6 21h8M14 11v10" /></>,
  ic: <><rect x="12" y="6" width="24" height="20" rx="2" /><path d="M6 11h6M6 16h6M6 21h6M36 11h6M36 16h6M36 21h6" /></>,
  via: <><circle cx="24" cy="16" r="9" /><circle cx="24" cy="16" r="3.5" fill="currentColor" stroke="none" /></>,
  pad: <rect x="12" y="8" width="24" height="16" rx="2" fill="currentColor" stroke="none" opacity="0.85" />,
  frame: <rect x="6" y="5" width="36" height="22" rx="1" strokeDasharray="3 3" />,
  fiducial: <><circle cx="24" cy="16" r="7" fill="currentColor" stroke="none" opacity="0.85" /><circle cx="24" cy="16" r="11" /></>,
  hole: <><circle cx="24" cy="16" r="9" /><circle cx="24" cy="16" r="4" /></>,
};

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
  pcb: [
    { name: "Footprints", cards: [
      { name: "R 0402", kind: "component", symbol: "pad", variants: R_PKGS },
      { name: "C 0603", kind: "component", symbol: "pad", variants: C_PKGS },
    ] },
    { name: "Vias", cards: [
      { name: "Via", kind: "via", symbol: "via", variants: ["0.3/0.6", "0.2/0.45", "0.25/0.5"] },
    ] },
    { name: "Pads", cards: [
      { name: "SMD Pad", kind: "pad", symbol: "pad", variants: ["Round", "Rect", "Oval"] },
      { name: "TH Pad", kind: "pad", symbol: "hole", variants: ["0.8mm", "1.0mm"] },
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

  const groups = COMMON_GROUPS[state.libCommonTab];
  const cq = commonQuery.trim().toLowerCase();

  const toggle = (k: string) => setExpanded((e) => ({ ...e, [k]: !e[k] }));

  // Cascading placement: each click drops the part at a slightly offset spot
  // so successive clicks don't stack objects directly on top of each other.
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
          <div style={{ display: "flex", gap: "var(--spacing-3)", padding: "var(--spacing-5) var(--spacing-7) var(--spacing-5)" }}>
            {COMMON_TABS.map((t) => {
              const active = state.libCommonTab === t.value;
              return (
                <div
                  key={t.value}
                  className="ix-tab"
                  onClick={() => actions.setLibCommonTab(t.value)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "var(--spacing-2) var(--spacing-4)",
                    borderRadius: "var(--radius-full)",
                    background: active ? "var(--color-bg-brand-subtle)" : "transparent",
                    color: active ? "var(--color-text-brand)" : "var(--color-text-tertiary)",
                    border: `var(--border-width-1) solid ${active ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
                  }}
                >
                  {t.label}
                </div>
              );
            })}
          </div>

          <div style={{ padding: "var(--spacing-0) var(--spacing-7) var(--spacing-6)" }}>
            <SearchInput value={commonQuery} onValueChange={setCommonQuery} placeholder="Search parts & compo.." />
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-4)" }}>
                    {cards.map((c, i) => (
                      <PartCard key={`${g.name}-${c.name}-${i}`} card={c} onPlace={() => placeFromLib(c.kind)} />
                    ))}
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
function PartCard({ card, onPlace }: { card: LibCard; onPlace: () => void }) {
  const [variant, setVariant] = React.useState(card.variants[0]);
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `var(--border-width-1) solid ${hover ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--color-bg-surface)",
        transition: "border-color .14s, box-shadow .14s",
        boxShadow: hover ? "var(--elevation-2)" : "none",
      }}
    >
      <button
        type="button"
        onClick={onPlace}
        title={`Place ${card.name} (${variant})`}
        aria-label={`Place ${card.name} ${variant}`}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          height: 58, background: "var(--color-bg-page)", border: "none",
          borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
          cursor: "pointer", color: hover ? "var(--color-violet-600)" : "var(--color-text-secondary)",
          transition: "color .14s",
        }}
      >
        <svg width="52" height="34" viewBox="0 0 48 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {SYMBOLS[card.symbol]}
        </svg>
      </button>
      <VariantDropdown name={card.name} variant={variant} variants={card.variants} onChange={setVariant} />
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
