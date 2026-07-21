"use client";

// IDEEZA PCB — left-panel Project navigator. Data-driven from the live design:
// Sheets (project → schematic sheets + PCB), Nets, Parts and Objects tabs all
// list REAL objects/nets/sheets, with click actions and a right-click menu.

import * as React from "react";
import { createPortal } from "react-dom";
import { DsIcon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { computeNets } from "@/lib/pcb/nets";
import type { CanvasObject } from "@/lib/pcb/types";

type MenuItem = { divider: true } | { label: string; icon?: string; run: () => void; danger?: boolean };
type Row = {
  id: string;
  label: string;
  meta?: string;
  icon: string;
  depth: number;
  active?: boolean;
  hasCaret?: boolean;
  open?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  menu?: MenuItem[];
  renameKind?: "sheet" | "net";
  renameCurrent?: string;
};

const PART_KINDS = new Set(["resistor", "resistorBox", "capacitor", "inductor", "diode", "opamp", "currentSource", "ic", "component", "transistor"]);
const isPart = (o: CanvasObject) => PART_KINDS.has(o.kind) || o.kind.startsWith("fp") || !!o.footprint;
const WIRELIKE = new Set(["wire", "bus", "track", "ratsnest", "diffPair"]);
const NETLIKE = new Set(["net", "netLabel", "netFlag", "globalLabel", "hierLabel", "netBusLabel"]);

function iconForKind(kind: string): string {
  if (WIRELIKE.has(kind)) return "wire";
  if (isPart({ kind } as CanvasObject)) return "foot";
  if (NETLIKE.has(kind)) return "wire";
  return "sch";
}
function designator(o: CanvasObject): string {
  return (o.text && o.text.trim()) || (o.comment && o.comment.trim()) || o.kind;
}
function useProjectName(): string {
  const [name, setName] = React.useState("Design");
  React.useEffect(() => {
    try {
      const active = window.localStorage.getItem("ideeza:manual:active");
      const arr = JSON.parse(window.localStorage.getItem("ideeza:manual:projects") || "[]");
      const p = Array.isArray(arr) ? arr.find((x: { id?: string }) => x.id === active) : null;
      if (p?.name || p?.productName) setName(p.name || p.productName);
    } catch {}
  }, []);
  return name;
}

export function ProjectNavigator({ query }: { query: string }) {
  const state = usePcbState();
  const actions = usePcbActions();
  const projName = useProjectName();
  const [exp, setExp] = React.useState<Record<string, boolean>>({ __proj: true, __schem: true });
  const [menu, setMenu] = React.useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [renaming, setRenaming] = React.useState<{ id: string; kind: "sheet" | "net"; val: string } | null>(null);
  const q = query.trim().toLowerCase();
  const match = (...s: (string | undefined)[]) => q === "" || s.some((x) => (x ?? "").toLowerCase().includes(q));
  const toggle = (k: string) => setExp((e) => ({ ...e, [k]: e[k] === false ? true : (e[k] === undefined ? false : false) }));
  const isOpen = (k: string, def = true) => (exp[k] === undefined ? def : exp[k]);

  const openMenu = (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    if (!items.length) return;
    setMenu({ x: e.clientX, y: e.clientY, items });
  };
  const startRename = (id: string, kind: "sheet" | "net", current: string) => setRenaming({ id, kind, val: current });
  const commitRename = () => {
    if (!renaming) return;
    if (renaming.kind === "sheet") actions.renameSheet(renaming.id, renaming.val);
    else actions.renameNet(renaming.id, renaming.val);
    setRenaming(null);
  };

  const rows: Row[] = [];
  const objs = state.objects;

  if (state.leftSub === "page") {
    // Project → Schematic (sheets) + PCB
    rows.push({ id: "__proj", label: projName, icon: "page", depth: 0, hasCaret: true, open: isOpen("__proj"), onToggle: () => toggle("__proj") });
    if (isOpen("__proj")) {
      rows.push({ id: "__schem", label: "Schematic", icon: "sch", depth: 1, hasCaret: true, open: isOpen("__schem"), onToggle: () => toggle("__schem"),
        menu: [{ label: "Add sheet", icon: "page", run: () => actions.addSheet() }] });
      if (isOpen("__schem")) {
        state.schematicSheets.filter((sh) => match(sh.name)).forEach((sh) =>
          rows.push({
            id: sh.id, label: sh.name, icon: "sch", depth: 2,
            active: state.mode === "schematic" && state.activeSheetId === sh.id,
            onClick: () => { actions.setMode("schematic"); actions.gotoSheet(sh.id); },
            renameKind: "sheet", renameCurrent: sh.name,
            menu: [
              { label: "Go to sheet", icon: "page", run: () => { actions.setMode("schematic"); actions.gotoSheet(sh.id); } },
              { label: "Rename", icon: "prop", run: () => startRename(sh.id, "sheet", sh.name) },
              { label: "Add sheet", icon: "page", run: () => actions.addSheet() },
              { divider: true },
              { label: "Delete sheet", icon: "del", danger: true, run: () => actions.deleteSheet(sh.id) },
            ],
          }),
        );
      }
      if (match("PCB")) rows.push({ id: "__pcb", label: "PCB", icon: "pcb", depth: 1, active: state.mode === "pcb" || state.mode === "2d", onClick: () => actions.setMode("pcb") });
    }
  } else if (state.leftSub === "net") {
    // Live connectivity in schematic (no stored `net`); stamped `o.net` in PCB.
    let entries: { name: string; count: number }[];
    if (state.mode === "schematic") {
      const first = state.schematicSheets[0]?.id;
      const sch = objs.filter((o) => (!o.scope || o.scope === "schematic") && (o.sheetId ?? first) === state.activeSheetId);
      entries = computeNets(sch).nets.map((n) => ({ name: n.name, count: n.memberIds.length }));
    } else {
      const counts = new Map<string, number>();
      objs.forEach((o) => { if (o.net) counts.set(o.net, (counts.get(o.net) ?? 0) + 1); });
      entries = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
    }
    entries.filter((e) => match(e.name)).forEach((e) =>
      rows.push({
        id: "net:" + e.name, label: e.name, meta: `${e.count} obj`, icon: "wire", depth: 0,
        active: state.highlightedNet === e.name,
        onClick: () => actions.highlightNet(state.highlightedNet === e.name ? null : e.name),
        menu: [
          { label: "Highlight net", icon: "wire", run: () => actions.highlightNet(e.name) },
          { label: "Unhighlight all", icon: "wire", run: () => actions.unhighlightAll() },
          { label: "Select all on net", icon: "copy", run: () => actions.selectByNet(e.name) },
        ],
      }),
    );
  } else if (state.leftSub === "component") {
    objs.filter(isPart).filter((o) => match(designator(o), o.footprint, o.comment)).forEach((o) =>
      rows.push({
        id: o.id, label: designator(o), meta: o.footprint || (o.props as Record<string, unknown> | undefined)?.value as string || o.kind,
        icon: "foot", depth: 0, active: state.selectedIds.includes(o.id),
        onClick: () => { actions.selectPlaced(o.id, false); actions.zoomFit("selection"); },
        menu: [
          { label: "Select", icon: "copy", run: () => { actions.selectPlaced(o.id, false); actions.zoomFit("selection"); } },
          { label: "Properties", icon: "prop", run: () => { actions.selectPlaced(o.id, false); actions.setRightTab("properties"); } },
          ...(objs.some((t) => t.sourceId === o.id) ? [{ label: "Cross probe to PCB", icon: "find", run: () => actions.crossProbe(o.id) } as MenuItem] : []),
          { divider: true },
          { label: "Delete", icon: "del", danger: true, run: () => actions.removeObjects([o.id]) },
        ],
      }),
    );
  } else {
    // Objects — grouped by kind
    const byKind = new Map<string, CanvasObject[]>();
    objs.forEach((o) => { (byKind.get(o.kind) ?? byKind.set(o.kind, []).get(o.kind)!).push(o); });
    [...byKind.keys()].sort().forEach((kind) => {
      const items = byKind.get(kind)!.filter((o) => match(designator(o), o.net, kind));
      if (!items.length) return;
      const gk = "grp:" + kind;
      rows.push({ id: gk, label: kind, meta: String(byKind.get(kind)!.length), icon: iconForKind(kind), depth: 0, hasCaret: true, open: isOpen(gk, false), onToggle: () => toggle(gk) });
      if (isOpen(gk, false)) {
        items.forEach((o) =>
          rows.push({
            id: o.id, label: designator(o), meta: o.net, icon: iconForKind(kind), depth: 1,
            active: state.selectedIds.includes(o.id),
            onClick: () => { actions.selectPlaced(o.id, false); actions.zoomFit("selection"); },
            menu: [
              { label: "Select", icon: "copy", run: () => actions.selectPlaced(o.id, false) },
              { label: "Properties", icon: "prop", run: () => { actions.selectPlaced(o.id, false); actions.setRightTab("properties"); } },
              ...(o.net ? [{ label: "Highlight net", icon: "wire", run: () => actions.highlightNet(o.net!) } as MenuItem] : []),
              { divider: true },
              { label: "Delete", icon: "del", danger: true, run: () => actions.removeObjects([o.id]) },
            ],
          }),
        );
      }
    });
  }

  const emptyMsg =
    state.leftSub === "net" ? (state.mode === "schematic" ? "No nets yet — draw wires between component pins." : "No nets yet — convert to PCB or route to generate nets.")
    : state.leftSub === "component" ? "No parts yet — place components or convert the schematic."
    : state.leftSub === "object" ? "No objects yet — place something on the canvas."
    : null;
  const leafCount = rows.filter((r) => !r.hasCaret).length;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-2) var(--spacing-4) var(--spacing-6)" }} onScroll={() => menu && setMenu(null)}>
      {rows.map((n) => {
        const renamingThis = renaming?.id === n.id;
        return (
          <div
            key={n.id}
            className="ix-row"
            onClick={() => (n.onToggle ? n.onToggle() : n.onClick?.())}
            onContextMenu={(e) => openMenu(e, n.menu ?? [])}
            style={{
              display: "flex", alignItems: "center", gap: "var(--spacing-3)",
              padding: "var(--spacing-3) var(--spacing-4) var(--spacing-3)", paddingLeft: 8 + n.depth * 16,
              borderRadius: "var(--radius-md)", cursor: "pointer",
              background: n.active ? "var(--color-bg-brand-subtle)" : "transparent",
            }}
          >
            {n.hasCaret ? (
              <span style={{ width: 13, height: 13, display: "inline-flex", flex: "0 0 auto", color: "var(--color-text-tertiary)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${n.open ? 90 : 0}deg)`, transition: "transform .15s" }}><path d="M9 6l6 6-6 6" /></svg>
              </span>
            ) : (
              <span style={{ width: 13, flex: "0 0 auto" }} />
            )}
            <span style={{ width: 15, height: 15, flex: "0 0 auto", color: n.active ? "var(--color-violet-600)" : "var(--color-text-tertiary)" }}>
              <DsIcon name={n.icon} size={15} />
            </span>
            {renamingThis ? (
              <input
                autoFocus
                value={renaming!.val}
                onChange={(e) => setRenaming((r) => (r ? { ...r, val: e.target.value } : r))}
                onClick={(e) => e.stopPropagation()}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === "Enter") commitRename(); else if (e.key === "Escape") setRenaming(null); }}
                style={{ flex: 1, minWidth: 0, background: "var(--color-bg-subtle)", border: "var(--border-width-1) solid var(--color-border-brand)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", padding: "1px 6px", outline: "none" }}
              />
            ) : (
              <span style={{ flex: 1, minWidth: 0, fontSize: "var(--font-size-sm)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: n.active ? "var(--color-text-brand)" : "var(--color-text-primary)", fontWeight: n.hasCaret ? 600 : 500 }}>{n.label}</span>
            )}
            {n.meta && !renamingThis && (
              <span style={{ flex: "0 0 auto", fontSize: "var(--font-size-2xs)", color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>{n.meta}</span>
            )}
          </div>
        );
      })}

      {emptyMsg && leafCount === 0 && (
        <div style={{ padding: "var(--spacing-6) var(--spacing-5)", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>{emptyMsg}</div>
      )}

      {menu && <NavMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  );
}

// Portalled, viewport-clamped right-click menu for navigator rows.
function NavMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ x, y });
  React.useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    let nx = x, ny = y;
    if (x + r.width > window.innerWidth - 8) nx = window.innerWidth - 8 - r.width;
    if (y + r.height > window.innerHeight - 8) ny = window.innerHeight - 8 - r.height;
    if (nx !== pos.x || ny !== pos.y) setPos({ x: Math.max(8, nx), y: Math.max(8, ny) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ position: "fixed", top: pos.y, left: pos.x, zIndex: 300, minWidth: 190, background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-lg)", boxShadow: "var(--elevation-6)", padding: "var(--spacing-3)" }}
    >
      {items.map((it, i) =>
        "divider" in it ? (
          <div key={i} style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-4)" }} />
        ) : (
          <div
            key={i}
            className="ix-mi"
            onClick={() => { it.run(); onClose(); }}
            style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-3) var(--spacing-5)", borderRadius: "var(--radius-md)", cursor: "pointer" }}
          >
            <span style={{ width: 15, height: 15, flex: "0 0 auto", color: it.danger ? "var(--color-text-error)" : "var(--color-text-secondary)" }}><DsIcon name={it.icon} size={15} /></span>
            <span style={{ fontSize: "var(--font-size-sm)", color: it.danger ? "var(--color-text-error)" : "var(--color-text-primary)" }}>{it.label}</span>
          </div>
        ),
      )}
    </div>,
    document.body,
  );
}
