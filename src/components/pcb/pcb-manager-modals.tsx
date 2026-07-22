"use client";

// IDEEZA PCB Software — Phase 3 manager modals.
// Layer / Net Class / Differential Pair / Equal Length Group / Pad Pair Group /
// Copper / Tear Drop / Remove Unused Pad / PCB DRC. Opened from the PCB-mode
// Tools menu. Each modal is wired to its dedicated state slice in the store
// (add / remove / edit), with undo/redo via mergeWithHistory.

import * as React from "react";
import {
  Button,
  IconButton,
  Checkbox as DsCheckbox,
  Select as DsSelect,
  NumberInput,
} from "@/components/ideeza";
import { Icon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import type { ModalId } from "@/lib/pcb/types";
import { ListPanel, EmptyResults, TransferArrows, ModalTabBar, FilterInput } from "@/components/pcb/modal-kit";
import { PCB_RULE_TREE, CLEARANCE_COLS, defaultClearanceRows, type ClearanceRow } from "@/lib/pcb/design-rules-data";
import { rulesToDrcConfig } from "@/lib/pcb/drc-rules-map";

const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const PLUS_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const MINUS_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>';
const UP_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14l6-6 6 6"/></svg>';
const DOWN_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10l6 6 6-6"/></svg>';

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 85,
        background: "rgba(20,8,30,.34)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function Card({
  width,
  maxHeight = "86%",
  children,
}: {
  width: number;
  maxHeight?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width,
        maxHeight,
        background: "var(--color-bg-surface)",
        borderRadius: "var(--radius-2xl)",
        boxShadow: "var(--elevation-6)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        animation: "ideeza-rise .22s cubic-bezier(.2,.9,.3,1.1)",
      }}
    >
      {children}
    </div>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 24px",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        flex: "0 0 auto",
      }}
    >
      <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)" }}>
        {title}
      </span>
      <IconButton hierarchy="ghost" size="sm" aria-label="Close" onClick={onClose} icon={<Icon html={CLOSE_SVG} />} />
    </div>
  );
}

function Footer({
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  extraLeft,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  extraLeft?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-5)",
        padding: "var(--spacing-7) var(--spacing-12)",
        borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
        flex: "0 0 auto",
      }}
    >
      {extraLeft}
      <Button hierarchy="secondary" size="md" onClick={onCancel} style={{ marginLeft: extraLeft ? undefined : "auto" }}>
        Cancel
      </Button>
      <Button hierarchy="primary" size="md" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );
}

function CompactInput({
  value,
  onChange,
  width = 90,
  type = "text",
}: {
  value: string | number;
  onChange: (v: string) => void;
  width?: number;
  type?: "text" | "number";
}) {
  return (
    <input
      type={type}
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width,
        padding: "var(--spacing-2) var(--spacing-4)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        fontFamily: "var(--font-family-body)",
        color: "var(--color-text-primary)",
        background: "var(--color-bg-surface)",
        outline: "none",
      }}
    />
  );
}

function ColorSwatch({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  // The swatch shows the value as-is (a token var() renders correctly), but the
  // native <input type=color> needs a #hex, so resolve a var()/named color to
  // its computed hex off the rendered swatch. Editing then stores a real hex.
  const ref = React.useRef<HTMLSpanElement>(null);
  const [hex, setHex] = React.useState(/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000");
  React.useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(color)) { setHex(color); return; }
    const el = ref.current;
    if (!el) return;
    const m = getComputedStyle(el).backgroundColor.match(/\d+/g);
    if (m) setHex("#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join(""));
  }, [color]);
  return (
    <span
      ref={ref}
      style={{
        position: "relative",
        display: "inline-block",
        width: 22,
        height: 22,
        borderRadius: "var(--radius-sm)",
        background: color,
        border: "var(--border-width-1) solid var(--color-border-default)",
        cursor: "pointer",
      }}
    >
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", border: "none", padding: 0 }}
      />
    </span>
  );
}

function RowBtn({
  onClick,
  icon,
  title,
}: {
  onClick: () => void;
  icon: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 24,
        height: 24,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-sm)",
        background: "var(--color-bg-surface)",
        color: "var(--color-text-secondary)",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <Icon html={icon} size={12} />
    </button>
  );
}

const thStyle: React.CSSProperties = {
  fontSize: "var(--font-size-xs)",
  fontWeight: 700,
  color: "var(--color-text-secondary)",
  textAlign: "left",
  padding: "var(--spacing-3) var(--spacing-4)",
  background: "var(--color-bg-subtle)",
  position: "sticky",
  top: 0,
};

const tdStyle: React.CSSProperties = {
  padding: "var(--spacing-3) var(--spacing-4)",
  fontSize: "var(--font-size-sm)",
  color: "var(--color-text-primary)",
  borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
};

// ── Layer Manager ────────────────────────────────────────────────────────────
function LayerManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const layerTypes: Array<{ label: string; value: string }> = [
    { label: "Signal", value: "signal" },
    { label: "Plane", value: "plane" },
    { label: "Silkscreen", value: "silkscreen" },
    { label: "Paste", value: "paste" },
    { label: "Solder mask", value: "soldermask" },
    { label: "Drill", value: "drill" },
    { label: "Mechanical", value: "mechanical" },
  ];
  return (
    <Overlay>
      <Card width={980}>
        <Header title="Layer Manager" onClose={actions.closeModal} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Color</th>
                <th style={thStyle}>Transparency</th>
                <th style={thStyle}>Visible</th>
                <th style={thStyle}>Locked</th>
                <th style={thStyle}>Order</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {state.pcbLayers.map((l, i) => (
                <tr key={l.id}>
                  <td style={{ ...tdStyle, color: "var(--color-text-tertiary)" }}>{i + 1}</td>
                  <td style={tdStyle}>
                    <CompactInput value={l.name} width={170} onChange={(v) => actions.setPcbLayerName(l.id, v)} />
                  </td>
                  <td style={tdStyle}>
                    <DsSelect
                      value={layerTypes.find((t) => t.value === l.type)?.label ?? "Signal"}
                      options={layerTypes.map((t) => ({ label: t.label, value: t.label }))}
                      minWidth={120}
                    />
                  </td>
                  <td style={tdStyle}>
                    <ColorSwatch color={l.color} onChange={(hex) => actions.setPcbLayerColor(l.id, hex)} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput
                      type="number"
                      value={l.transparency}
                      width={70}
                      onChange={(v) => actions.setPcbLayerTransparency(l.id, parseInt(v || "0", 10))}
                    />
                  </td>
                  <td style={tdStyle}>
                    <span onClick={() => actions.togglePcbLayerVis(l.id)} style={{ cursor: "pointer", display: "inline-flex" }}>
                      <DsCheckbox checked={l.visible} size="md" />
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span onClick={() => actions.togglePcbLayerLock(l.id)} style={{ cursor: "pointer", display: "inline-flex" }}>
                      <DsCheckbox checked={l.locked} size="md" />
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                      <RowBtn onClick={() => actions.movePcbLayer(l.id, -1)} icon={UP_SVG} title="Move up" />
                      <RowBtn onClick={() => actions.movePcbLayer(l.id, 1)} icon={DOWN_SVG} title="Move down" />
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <RowBtn onClick={() => actions.removePcbLayer(l.id)} icon={MINUS_SVG} title="Remove" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Footer
          onCancel={actions.closeModal}
          onConfirm={actions.closeModal}
          extraLeft={
            <Button hierarchy="secondary" size="md" onClick={actions.addPcbLayer}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-2)" }}>
                <Icon html={PLUS_SVG} size={12} /> Add Layer
              </span>
            </Button>
          }
        />
      </Card>
    </Overlay>
  );
}

// ── Net Class Manager ────────────────────────────────────────────────────────
// ── Popup 6 — transfer-list layout shared by Net Class + Equal Length ───────
// PDF spec: left Classes/Groups list (filter, +Add/×Delete), middle "Not
// Selected" nets, transfer arrows, right "Selected" nets, footer Apply/
// Confirm/Cancel. Only the title differs between the two managers.
function TransferManagerBody({
  title,
  groups,
  assignedOf,
  onAdd,
  onDelete,
  onAssign,
}: {
  title: string;
  groups: { id: string; name: string }[];
  assignedOf: (id: string) => string[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onAssign: (id: string, nets: string[]) => void;
}) {
  const state = usePcbState();
  const actions = usePcbActions();
  const allNets = React.useMemo(() => {
    const names = new Set<string>(state.pcbNets.map((n) => n.name));
    for (const o of state.objects) if (o.net) names.add(o.net);
    return [...names];
  }, [state.pcbNets, state.objects]);

  const [selGroup, setSelGroup] = React.useState<string | null>(groups[0]?.id ?? null);
  const [pickLeft, setPickLeft] = React.useState<string | null>(null);
  const [pickRight, setPickRight] = React.useState<string | null>(null);
  const group = groups.find((g) => g.id === selGroup) ?? null;
  const assigned = group ? assignedOf(group.id) : [];
  const notSelected = allNets.filter((n) => !assigned.includes(n));

  const moveRight = () => {
    if (!group || !pickLeft) return;
    onAssign(group.id, [...assigned, pickLeft]);
    setPickLeft(null);
  };
  const moveLeft = () => {
    if (!group || !pickRight) return;
    onAssign(group.id, assigned.filter((n) => n !== pickRight));
    setPickRight(null);
  };

  return (
    <Overlay>
      <Card width={860}>
        <Header title={title} onClose={actions.closeModal} />
        <div style={{ flex: 1, display: "flex", gap: 14, padding: "16px 24px", minHeight: 340 }}>
          <div style={{ width: 220, flex: "0 0 auto", display: "flex" }}>
            <ListPanel
              title="Classes"
              items={groups.map((g) => g.name)}
              selected={group?.name ?? null}
              onSelect={(name) => setSelGroup(groups.find((g) => g.name === name)?.id ?? null)}
              height={256}
              headerRight={
                <span style={{ display: "inline-flex", gap: 4 }}>
                  <RowBtn onClick={onAdd} icon={PLUS_SVG} title="Add" />
                  <RowBtn onClick={() => { if (group) { onDelete(group.id); setSelGroup(null); } }} icon={MINUS_SVG} title="Delete selected" />
                </span>
              }
            />
          </div>
          <ListPanel title="Not Selected" items={notSelected} selected={pickLeft} onSelect={setPickLeft} height={256} />
          <TransferArrows onRight={moveRight} onLeft={moveLeft} />
          <ListPanel title="Selected" items={assigned} selected={pickRight} onSelect={setPickRight} height={256} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Button hierarchy="secondary" size="md" onClick={() => actions.flashToast(`${title} applied`)}>Apply</Button>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={() => { actions.flashToast(`${title} saved`); actions.closeModal(); }}>Confirm</Button>
        </div>
      </Card>
    </Overlay>
  );
}

function NetClassManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  return (
    <TransferManagerBody
      title="Net Class Manager"
      groups={state.pcbNetClasses}
      assignedOf={(id) => state.pcbNetClasses.find((c) => c.id === id)?.nets ?? []}
      onAdd={actions.addNetClass}
      onDelete={actions.removeNetClass}
      onAssign={(id, nets) => actions.setNetClassField(id, { nets })}
    />
  );
}

// ── Differential Pair Manager — Popup 3 (Schematic + 2D, identical) ─────────
// PDF spec: left pair list (filter + Add/Delete), right Positive/Negative net
// dropdowns each with a "Click To Select Network" canvas-pick button, footer
// "Automatic Generation…" (opens the Auto Create sub-dialog) + Apply/Confirm/
// Cancel. Auto Create: suffix fields + Search + checkbox results table.
function useAllNetNames() {
  const state = usePcbState();
  return React.useMemo(() => {
    const names = new Set<string>(state.pcbNets.map((n) => n.name));
    for (const o of state.objects) if (o.net) names.add(o.net);
    for (const p of state.pcbDiffPairs) {
      if (p.netA) names.add(p.netA);
      if (p.netB) names.add(p.netB);
    }
    return [...names];
  }, [state.pcbNets, state.objects, state.pcbDiffPairs]);
}

function NetSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "7px 10px",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        fontFamily: "inherit",
        color: "var(--color-text-primary)",
        background: "var(--color-bg-surface)",
        outline: "none",
      }}
    >
      <option value="">— select net —</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function DiffPairManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const nets = useAllNetNames();
  const pairs = state.pcbDiffPairs;
  const [selId, setSelId] = React.useState<string | null>(pairs[0]?.id ?? null);
  const [autoOpen, setAutoOpen] = React.useState(false);
  const sel = pairs.find((p) => p.id === selId) ?? null;

  const pickFromCanvas = (which: "P" | "N") => {
    actions.flashToast(`Click a ${which === "P" ? "positive" : "negative"} net on the canvas (canvas pick coming with net highlighting)`);
  };

  return (
    <Overlay>
      <Card width={760}>
        <Header title="Differential Pairs" onClose={actions.closeModal} />
        <div style={{ flex: 1, display: "flex", gap: 16, padding: "16px 24px", minHeight: 340 }}>
          {/* Left — pair list + filter; header +Add / ×Delete */}
          <div style={{ width: 250, flex: "0 0 auto", display: "flex" }}>
            <ListPanel
              title="Pairs"
              items={pairs.map((p) => p.name)}
              selected={sel?.name ?? null}
              onSelect={(name) => setSelId(pairs.find((p) => p.name === name)?.id ?? null)}
              height={252}
              headerRight={
                <span style={{ display: "inline-flex", gap: 4 }}>
                  <RowBtn onClick={() => { actions.addDiffPair(); actions.flashToast("Pair added"); }} icon={PLUS_SVG} title="Add pair" />
                  <RowBtn onClick={() => { if (sel) { actions.removeDiffPair(sel.id); setSelId(null); } }} icon={MINUS_SVG} title="Delete selected pair" />
                </span>
              }
            />
          </div>

          {/* Right — net pickers for the selected pair */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {sel ? (
              <>
                <label style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Positive Net
                </label>
                <NetSelect ariaLabel="Positive net" value={sel.netA} options={nets} onChange={(v) => actions.setDiffPairField(sel.id, { netA: v })} />
                <Button hierarchy="secondary" size="sm" onClick={() => pickFromCanvas("P")}>Click To Select Network</Button>

                <label style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 10 }}>
                  Negative Net
                </label>
                <NetSelect ariaLabel="Negative net" value={sel.netB} options={nets} onChange={(v) => actions.setDiffPairField(sel.id, { netB: v })} />
                <Button hierarchy="secondary" size="sm" onClick={() => pickFromCanvas("N")}>Click To Select Network</Button>

                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Pair Name
                  </label>
                  <CompactInput value={sel.name} width={220} onChange={(v) => actions.setDiffPairField(sel.id, { name: v })} />
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: "var(--font-size-sm)" }}>
                Select a pair on the left, or add one with +
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Button hierarchy="secondary" size="md" onClick={() => setAutoOpen(true)}>Automatic Generation…</Button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-5)" }}>
            <Button hierarchy="secondary" size="md" onClick={() => actions.flashToast("Differential pairs applied")}>Apply</Button>
            <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
            <Button hierarchy="primary" size="md" onClick={() => { actions.flashToast("Differential pairs saved"); actions.closeModal(); }}>Confirm</Button>
          </div>
        </div>
      </Card>
      {autoOpen && <AutoCreateDiffPairDialog onClose={() => setAutoOpen(false)} />}
    </Overlay>
  );
}

// "Auto Create Differential Pair" sub-dialog — matches suffixed net pairs and
// bulk-adds the ticked rows.
function AutoCreateDiffPairDialog({ onClose }: { onClose: () => void }) {
  const state = usePcbState();
  const actions = usePcbActions();
  const nets = useAllNetNames();
  const [posSuffix, setPosSuffix] = React.useState("+");
  const [negSuffix, setNegSuffix] = React.useState("−");
  const [results, setResults] = React.useState<{ title: string; pos: string; neg: string; checked: boolean }[] | null>(null);

  const search = () => {
    const norm = (s: string) => (s === "−" ? "-" : s);
    const p = norm(posSuffix) || "+";
    const n = norm(negSuffix) || "-";
    // Try the literal suffixes, plus the conventional _P/_N pair as a fallback.
    const found: { title: string; pos: string; neg: string; checked: boolean }[] = [];
    const seen = new Set<string>();
    for (const net of nets) {
      const base =
        net.endsWith(p) ? net.slice(0, -p.length)
        : net.toUpperCase().endsWith("_P") ? net.slice(0, -2)
        : null;
      if (!base || seen.has(base)) continue;
      const negCandidates = [base + n, base + "_N", base + "_n"];
      const neg = negCandidates.find((c) => nets.includes(c));
      if (!neg) continue;
      seen.add(base);
      found.push({ title: base.replace(/[_-]$/, ""), pos: net, neg, checked: true });
    }
    setResults(found);
  };

  const confirm = () => {
    const picked = (results ?? []).filter((r) => r.checked);
    if (picked.length === 0) {
      actions.flashToast("No pairs ticked");
      return;
    }
    const existing = new Set(state.pcbDiffPairs.map((x) => `${x.netA}|${x.netB}`));
    const added = picked
      .filter((r) => !existing.has(`${r.pos}|${r.neg}`))
      .map((r, i) => ({
        id: `dp_auto_${Date.now()}_${i}`,
        name: r.title,
        netA: r.pos,
        netB: r.neg,
        gap: 8,
        width: 8,
      }));
    actions.merge({ pcbDiffPairs: [...state.pcbDiffPairs, ...added] });
    actions.flashToast(`Added ${added.length} differential pair${added.length === 1 ? "" : "s"}`);
    onClose();
  };

  const suffixInput = (label: string, value: string, onChange: (v: string) => void) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
      {label}
      <CompactInput value={value} width={54} onChange={onChange} />
    </label>
  );

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 90, background: "rgba(20,8,30,.34)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card width={620} maxHeight="80%">
        <Header title="Auto Create Differential Pair" onClose={onClose} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 24px", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", flexWrap: "wrap" }}>
          {suffixInput("Positive Net Suffix", posSuffix, setPosSuffix)}
          {suffixInput("Negative Net Suffix", negSuffix, setNegSuffix)}
          <div style={{ marginLeft: "auto" }}>
            <Button hierarchy="primary" size="sm" onClick={search}>Search</Button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 200 }}>
          {results === null ? (
            <div style={{ padding: "36px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "var(--font-size-sm)" }}>
              Set the suffixes and press Search to find matching net pairs.
            </div>
          ) : results.length === 0 ? (
            <EmptyResults />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 40 }} aria-label="Include" />
                  <th style={thStyle}>Differential Pair Title</th>
                  <th style={thStyle}>Positive Net</th>
                  <th style={thStyle}>Negative Net</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.title} onClick={() => setResults((rs) => rs!.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))} style={{ cursor: "pointer" }}>
                    <td style={tdStyle}>
                      <input type="checkbox" checked={r.checked} readOnly aria-label={`Include ${r.title}`} />
                    </td>
                    <td style={tdStyle}>{r.title}</td>
                    <td style={tdStyle}>{r.pos}</td>
                    <td style={tdStyle}>{r.neg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-6) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={confirm}>Apply</Button>
          <Button hierarchy="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={confirm}>Confirm</Button>
        </div>
      </Card>
    </div>
  );
}

// ── Equal Length Group Manager — Popup 6 (same transfer layout) ─────────────
function EqualLengthManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  return (
    <TransferManagerBody
      title="Equal Length Group Manager"
      groups={state.pcbEqualLength}
      assignedOf={(id) => state.pcbEqualLength.find((g) => g.id === id)?.nets ?? []}
      onAdd={actions.addEqualLengthGroup}
      onDelete={actions.removeEqualLengthGroup}
      onAssign={(id, nets) => actions.setEqualLengthField(id, { nets })}
    />
  );
}

// ── Pad Pair Group Manager — Popup 6 pad-picker variant ─────────────────────
// PDF spec: Groups list left (+/× between Groups and the picker), middle
// pad-picker (All-nets filter, Pad1/Pad2 each with a "select pad(s)" button,
// `>` adds the pair), right Selected pairs (× removes an entry). Pairs are
// stored on the group's `pads` string, "; "-joined ("P1 - P2; P3 - P4").
function parsePadPairs(pads: string): string[] {
  return pads.split(";").map((s) => s.trim()).filter(Boolean);
}

function PadPairManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const groups = state.pcbPadPairs;
  const [selGroup, setSelGroup] = React.useState<string | null>(groups[0]?.id ?? null);
  const [netFilter, setNetFilter] = React.useState("All nets");
  const [pad1, setPad1] = React.useState("");
  const [pad2, setPad2] = React.useState("");
  const [selFilter, setSelFilter] = React.useState("");
  const group = groups.find((g) => g.id === selGroup) ?? null;
  const pairs = group ? parsePadPairs(group.pads) : [];

  // Pads on the board: placed pad objects (P1…Pn) plus their nets.
  const pads = React.useMemo(
    () =>
      state.objects
        .filter((o) => o.kind === "pad")
        .map((o, i) => ({ name: `P${i + 1}`, net: o.net ?? "" })),
    [state.objects],
  );
  const nets = ["All nets", ...new Set(pads.map((p) => p.net).filter(Boolean))];
  const visiblePads = pads.filter((p) => netFilter === "All nets" || p.net === netFilter);

  const pickPad = (which: 1 | 2) => {
    // Canvas pick placeholder: cycles through the available pads for now.
    if (visiblePads.length === 0) {
      actions.flashToast("No pads on the board yet — place pads first");
      return;
    }
    const cur = which === 1 ? pad1 : pad2;
    const idx = (visiblePads.findIndex((p) => p.name === cur) + 1) % visiblePads.length;
    (which === 1 ? setPad1 : setPad2)(visiblePads[idx].name);
  };

  const addPair = () => {
    if (!group) {
      actions.flashToast("Select a group first");
      return;
    }
    if (!pad1 || !pad2 || pad1 === pad2) {
      actions.flashToast("Pick two different pads");
      return;
    }
    const entry = `${pad1} - ${pad2}`;
    if (pairs.includes(entry)) {
      actions.flashToast("Pair already in the group");
      return;
    }
    actions.setPadPairField(group.id, { pads: [...pairs, entry].join("; ") });
    setPad1("");
    setPad2("");
  };
  const removePair = (entry: string) => {
    if (!group) return;
    actions.setPadPairField(group.id, { pads: pairs.filter((p) => p !== entry).join("; ") });
  };

  // PDF #16-17: each pad is set by picking from the dropdown OR by the
  // "select pad(s)" canvas-pick button.
  const padField = (label: string, value: string, setValue: (v: string) => void, pick: () => void) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)" }}>{label}:</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <select
          value={value}
          aria-label={label}
          onChange={(e) => setValue(e.target.value)}
          style={{ flex: 1, minWidth: 0, padding: "6px 10px", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", color: value ? "var(--color-text-primary)" : "var(--color-text-tertiary)", background: "var(--color-bg-surface)", outline: "none" }}
        >
          <option value="">— pick pad —</option>
          {visiblePads.map((p) => (
            <option key={p.name} value={p.name}>{p.name}{p.net ? ` (${p.net})` : ""}</option>
          ))}
        </select>
        {value && <RowBtn onClick={() => setValue("")} icon={MINUS_SVG} title={`Clear ${label}`} />}
      </div>
      <Button hierarchy="secondary" size="sm" onClick={pick}>select pad(s)</Button>
    </div>
  );

  return (
    <Overlay>
      <Card width={880}>
        <Header title="Pad Pair Group Manager" onClose={actions.closeModal} />
        <div style={{ flex: 1, display: "flex", gap: 14, padding: "16px 24px", minHeight: 340 }}>
          {/* Groups + add/delete */}
          <div style={{ width: 210, flex: "0 0 auto", display: "flex" }}>
            <ListPanel
              title="Groups"
              items={groups.map((g) => g.name)}
              selected={group?.name ?? null}
              onSelect={(name) => setSelGroup(groups.find((g) => g.name === name)?.id ?? null)}
              height={256}
              headerRight={
                <span style={{ display: "inline-flex", gap: 4 }}>
                  <RowBtn onClick={actions.addPadPair} icon={PLUS_SVG} title="Add group" />
                  <RowBtn onClick={() => { if (group) { actions.removePadPair(group.id); setSelGroup(null); } }} icon={MINUS_SVG} title="Delete selected group" />
                </span>
              }
            />
          </div>

          {/* Pad picker */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)", padding: 12 }}>
            <DsSelect
              size="sm"
              value={netFilter}
              onChange={setNetFilter}
              options={nets.map((n) => ({ label: n, value: n }))}
            />
            {padField("Pad1", pad1, setPad1, () => pickPad(1))}
            {padField("Pad2", pad2, setPad2, () => pickPad(2))}
          </div>

          {/* > add + Selected pairs */}
          <div style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
            <button type="button" aria-label="Add pair to group" title="Add pair to group" onClick={addPair} style={{ width: 34, height: 30, border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", background: "var(--color-bg-surface)", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              &gt;
            </button>
          </div>
          <div style={{ width: 250, flex: "0 0 auto", display: "flex", flexDirection: "column", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "8px 10px", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", background: "var(--color-bg-subtle)", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>
              Selected
            </div>
            <div style={{ padding: "8px 10px 4px" }}>
              <FilterInput value={selFilter} onChange={setSelFilter} ariaLabel="Filter selected pairs" />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 6px 8px" }}>
              {pairs.filter((p) => p.toLowerCase().includes(selFilter.toLowerCase())).length === 0 ? (
                <EmptyResults />
              ) : (
                pairs
                  .filter((p) => p.toLowerCase().includes(selFilter.toLowerCase()))
                  .map((p) => (
                    <div key={p} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "5px 8px", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p}</span>
                      <RowBtn onClick={() => removePair(p)} icon={MINUS_SVG} title={`Remove ${p}`} />
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-5)", padding: "var(--spacing-7) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Button hierarchy="secondary" size="md" onClick={() => actions.flashToast("Pad pair groups applied")}>Apply</Button>
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={() => { actions.flashToast("Pad pair groups saved"); actions.closeModal(); }}>Confirm</Button>
        </div>
      </Card>
    </Overlay>
  );
}

// ── Copper Manager ───────────────────────────────────────────────────────────
function CopperManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const layerOpts = state.pcbLayers.map((l) => ({ label: l.name, value: l.id }));
  const netOpts = state.pcbNets.map((n) => ({ label: n.name, value: n.name }));
  return (
    <Overlay>
      <Card width={960}>
        <Header title="Copper Manager" onClose={actions.closeModal} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Layer</th>
                <th style={thStyle}>Net</th>
                <th style={thStyle}>Clearance</th>
                <th style={thStyle}>Thermal</th>
                <th style={thStyle}>Hatched</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {state.pcbCoppers.map((c) => (
                <tr key={c.id}>
                  <td style={tdStyle}>
                    <CompactInput value={c.name} width={170} onChange={(v) => actions.setCopperField(c.id, { name: v })} />
                  </td>
                  <td style={tdStyle}>
                    <DsSelect
                      value={state.pcbLayers.find((l) => l.id === c.layer)?.name ?? ""}
                      options={layerOpts.map((o) => ({ label: o.label, value: o.label }))}
                      minWidth={140}
                    />
                  </td>
                  <td style={tdStyle}>
                    <DsSelect
                      value={c.net}
                      options={netOpts}
                      minWidth={110}
                    />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput type="number" value={c.clearance} width={80} onChange={(v) => actions.setCopperField(c.id, { clearance: parseFloat(v) || 0 })} />
                  </td>
                  <td style={tdStyle}>
                    <span onClick={() => actions.setCopperField(c.id, { thermal: !c.thermal })} style={{ cursor: "pointer", display: "inline-flex" }}>
                      <DsCheckbox checked={c.thermal} size="md" />
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span onClick={() => actions.setCopperField(c.id, { hatched: !c.hatched })} style={{ cursor: "pointer", display: "inline-flex" }}>
                      <DsCheckbox checked={c.hatched} size="md" />
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <RowBtn onClick={() => actions.removeCopper(c.id)} icon={MINUS_SVG} title="Remove" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Footer
          onCancel={actions.closeModal}
          onConfirm={actions.closeModal}
          extraLeft={
            <Button hierarchy="secondary" size="md" onClick={actions.addCopper}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-2)" }}>
                <Icon html={PLUS_SVG} size={12} /> Add Copper
              </span>
            </Button>
          }
        />
      </Card>
    </Overlay>
  );
}

// ── Tear Drop ────────────────────────────────────────────────────────────────
function TearDropModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const td = state.pcbTearDrop;
  const row = (label: string, control: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", padding: "var(--spacing-4) var(--spacing-0)" }}>
      <span style={{ width: 200, flex: "0 0 auto", fontSize: "var(--font-size-md)", fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</span>
      <div style={{ flex: 1 }}>{control}</div>
    </div>
  );
  const toggleRow = (label: string, on: boolean, onToggle: () => void) =>
    row(
      label,
      <span onClick={onToggle} style={{ cursor: "pointer", display: "inline-flex" }}>
        <DsCheckbox checked={on} size="md" />
      </span>,
    );
  return (
    <Overlay>
      <Card width={560}>
        <Header title="Tear Drop" onClose={actions.closeModal} />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-9) var(--spacing-12)" }}>
          {toggleRow("Enable Tear Drop", td.enabled, () => actions.setTearDrop({ enabled: !td.enabled }))}
          {row(
            "Shape",
            <DsSelect
              value={td.shape}
              options={[
                { label: "Curve", value: "Curve" },
                { label: "Line", value: "Line" },
              ]}
              minWidth={140}
              onChange={(v) => actions.setTearDrop({ shape: v as "Curve" | "Line" })}
            />,
          )}
          {row(
            "Ratio (%)",
            <NumberInput value={String(td.ratio)} onChange={(v) => actions.setTearDrop({ ratio: parseInt(v || "0", 10) })} min={0} />,
          )}
          {toggleRow("Apply to Via", td.applyToVia, () => actions.setTearDrop({ applyToVia: !td.applyToVia }))}
          {toggleRow("Apply to Pad", td.applyToPad, () => actions.setTearDrop({ applyToPad: !td.applyToPad }))}
          {toggleRow("Apply to Track", td.applyToTrack, () => actions.setTearDrop({ applyToTrack: !td.applyToTrack }))}
        </div>
        <Footer onCancel={actions.closeModal} onConfirm={actions.closeModal} confirmLabel="Apply" />
      </Card>
    </Overlay>
  );
}

// ── Remove Unused Pad ────────────────────────────────────────────────────────
function RemoveUnusedPadModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const opts = state.removeUnusedPadOpts;
  const row = (label: string, on: boolean, onToggle: () => void) => (
    <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-4) var(--spacing-0)", cursor: "pointer" }}>
      <DsCheckbox checked={on} size="md" />
      <span style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>{label}</span>
    </div>
  );
  return (
    <Overlay>
      <Card width={480}>
        <Header title="Remove Unused Pad" onClose={actions.closeModal} />
        <div style={{ flex: 1, padding: "var(--spacing-9) var(--spacing-12)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-7)", lineHeight: 1.55 }}>
            Removes unconnected pads on the selected layers. Use with caution — operation cannot be merged with subsequent edits as a single undo step.
          </div>
          {row("Top Layer", opts.topLayer, () => actions.setRemoveUnusedPadOpts({ topLayer: !opts.topLayer }))}
          {row("Bottom Layer", opts.bottomLayer, () => actions.setRemoveUnusedPadOpts({ bottomLayer: !opts.bottomLayer }))}
          {row("Inner Layers", opts.innerLayer, () => actions.setRemoveUnusedPadOpts({ innerLayer: !opts.innerLayer }))}
          {row("Keep pads with thermal connection", opts.keepConnected, () => actions.setRemoveUnusedPadOpts({ keepConnected: !opts.keepConnected }))}
        </div>
        <Footer onCancel={actions.closeModal} onConfirm={actions.closeModal} confirmLabel="Remove" />
      </Card>
    </Overlay>
  );
}

// ── PCB Design Rule Check (IPC / DAC-2552) ───────────────────────────────────
// ── Popup 4 — Design Rules (2D/PCB) ─────────────────────────────────────────
// Confirmed live in the PDF to be a different, larger dialog than the
// schematic one. Four tabs: Rule Management (rule tree + name/Default/Delete
// + unit + All/Layered + 13-type clearance matrix) · Net Rule · Net-Net Rule
// · Region Rule. Footer: Import/Export Config, Restore Default, Apply,
// Confirm, Cancel. Config survives reopen within the session.
type PcbViaSpan = { name: string; startLayer: string; endLayer: string; viaSize: string };

type PcbRuleEntry = {
  name: string;
  category: string;
  leaf: string;
  isDefault: boolean;
  // Safe Spacing edits the clearance matrix; Blind/Buried Via edits a span
  // table; every other leaf edits the typed form its RULE_EDITORS entry
  // describes (flat fields and/or per-layer tables).
  clearance?: ClearanceRow[];
  params?: Record<string, number | boolean | string>;
  spans?: PcbViaSpan[];
};

type PcbRulesConfig = {
  rules: PcbRuleEntry[];
  selected: string; // rule name
  unit: "mm" | "mil";
  layered: boolean;
  netRules: Record<string, string>; // net name → rule name
  netNetRules: { net1: string; net2: string; rule: string }[];
  regionRules: Record<string, string>; // region name → rule name
};

// ── Rule-editor schemas (Ideeza_Popup_Full_Parameter_List.pdf, Popup 4) ────
// Every rule type renders exactly the EasyEDA form the parameter list
// describes: flat field sections, per-layer tables (All / Top / Bottom rows),
// the clearance matrix, or the blind/buried-via span table. "len" values are
// stored in mm and convert with the Unit dropdown.
type FieldDef = { key: string; label: string; type: "len" | "number"; def: number; neg?: boolean };
type Section = { title?: string; fields: FieldDef[] };
type ColDef = { key: string; label: string; type: "len" | "select"; options?: string[]; def: number | string };
type TableDef = { key: string; title: string; columns: ColDef[] };
type RuleEditorDef =
  | { kind: "matrix" }
  | { kind: "fields"; sections: Section[] }
  | { kind: "layerTables"; tables: TableDef[]; extraSections?: Section[] }
  | { kind: "spanTable" };

const LAYER_ROWS = [
  { key: "all", label: "All" },
  { key: "top", label: "Top Layer" },
  { key: "bottom", label: "Bottom Layer" },
] as const;

const SPOKE_COLS: ColDef[] = [
  { key: "conn", label: "Connection Type", type: "select", options: ["Spoke", "Direct", "None"], def: "Spoke" },
  { key: "spokeWidth", label: "Spoke Width", type: "len", def: 0.4 },
  { key: "spokeSpacing", label: "Spoke Spacing", type: "len", def: 0.6 },
  { key: "spokeAngles", label: "Spoke Angles", type: "select", options: ["45°", "90°"], def: "90°" },
];

const RULE_EDITORS: Record<string, RuleEditorDef> = {
  "Safe Spacing": { kind: "matrix" },
  "Other Spacing": {
    kind: "fields",
    sections: [
      {
        fields: [
          { key: "compToComp", label: "Component to Component", type: "len", def: 0.254 },
          { key: "thJointToSmd", label: "TH Solder Joint to SMD Component", type: "len", def: 0.254 },
          { key: "holeToHole", label: "Hole to Hole", type: "len", def: 0.3 },
        ],
      },
    ],
  },
  "Track": {
    kind: "layerTables",
    tables: [
      {
        key: "strokeWidth",
        title: "Stroke Width",
        columns: [
          { key: "min", label: "Min", type: "len", def: 0.102 },
          { key: "def", label: "Default", type: "len", def: 0.254 },
          { key: "max", label: "Max", type: "len", def: 10 },
        ],
      },
    ],
  },
  "Net Length Range": {
    kind: "fields",
    sections: [
      {
        fields: [
          { key: "min", label: "Minimum", type: "len", def: 0 },
          { key: "max", label: "Maximum", type: "len", def: 100 },
        ],
      },
    ],
  },
  "Net Length Tolerance": {
    kind: "fields",
    sections: [{ fields: [{ key: "tolerance", label: "+/- tolerance", type: "len", def: 1 }] }],
  },
  "Differential Pair": {
    kind: "layerTables",
    tables: [
      {
        key: "strokeWidth",
        title: "Stroke Width",
        columns: [
          { key: "min", label: "Min", type: "len", def: 0.102 },
          { key: "def", label: "Default", type: "len", def: 0.152 },
          { key: "max", label: "Max", type: "len", def: 2 },
        ],
      },
      {
        key: "spacing",
        title: "Spacing",
        columns: [
          { key: "min", label: "Min", type: "len", def: 0.152 },
          { key: "def", label: "Default", type: "len", def: 0.152 },
        ],
      },
    ],
    extraSections: [
      {
        title: "Differential Pair Length Tolerance",
        fields: [{ key: "lengthToleranceMax", label: "Max", type: "len", def: 0.5 }],
      },
    ],
  },
  "Blind/Buried Via": { kind: "spanTable" },
  "Via Size": {
    kind: "fields",
    sections: [
      {
        title: "Via Outer Diameter",
        fields: [
          { key: "outerMin", label: "Min", type: "len", def: 0.4 },
          { key: "outerDef", label: "Default", type: "len", def: 0.61 },
          { key: "outerMax", label: "Max", type: "len", def: 6 },
        ],
      },
      {
        title: "Via Inner Diameter",
        fields: [
          { key: "innerMin", label: "Min", type: "len", def: 0.2 },
          { key: "innerDef", label: "Default", type: "len", def: 0.305 },
          { key: "innerMax", label: "Max", type: "len", def: 3 },
        ],
      },
    ],
  },
  "Plane Zone": {
    kind: "layerTables",
    tables: [{ key: "multiPad", title: "Multi-layer Pad", columns: SPOKE_COLS }],
  },
  "Copper Zone": {
    kind: "layerTables",
    tables: [
      { key: "singlePad", title: "Single-layer Pad", columns: SPOKE_COLS },
      { key: "multiPad", title: "Multi-layer Pad", columns: SPOKE_COLS },
      {
        key: "track",
        title: "Track",
        columns: [{ key: "conn", label: "Connection Type", type: "select", options: ["Direct", "Spoke", "None"], def: "Direct" }],
      },
    ],
  },
  "Paste Mask": {
    kind: "fields",
    sections: [
      {
        title: "Pad",
        fields: [
          { key: "padTop", label: "Top Layer Expansion", type: "len", def: 0, neg: true },
          { key: "padBottom", label: "Bottom Layer Expansion", type: "len", def: 0, neg: true },
        ],
      },
      {
        title: "Test Point",
        fields: [
          { key: "tpTop", label: "Top Layer Expansion", type: "len", def: 0, neg: true },
          { key: "tpBottom", label: "Bottom Layer Expansion", type: "len", def: 0, neg: true },
        ],
      },
    ],
  },
  "Solder Mask": {
    kind: "fields",
    sections: [
      {
        title: "Pad",
        fields: [
          { key: "padTop", label: "Top Layer Expansion", type: "len", def: 0.102, neg: true },
          { key: "padBottom", label: "Bottom Layer Expansion", type: "len", def: 0.102, neg: true },
        ],
      },
      {
        title: "Via",
        fields: [
          { key: "viaTop", label: "Top Layer Expansion", type: "len", def: 0.102, neg: true },
          { key: "viaBottom", label: "Bottom Layer Expansion", type: "len", def: 0.102, neg: true },
        ],
      },
      {
        title: "Test Point",
        fields: [
          { key: "tpTop", label: "Top Layer Expansion", type: "len", def: 0.102, neg: true },
          { key: "tpBottom", label: "Bottom Layer Expansion", type: "len", def: 0.102, neg: true },
        ],
      },
    ],
  },
};

// PDF-canonical default rule name per leaf.
const DEFAULT_RULE_NAMES: Record<string, string> = {
  "Safe Spacing": "copperThickness1oz",
  "Other Spacing": "otherClearance",
  "Track": "trackWidth",
  "Net Length Range": "netLength",
  "Net Length Tolerance": "netLengthTolerance",
  "Differential Pair": "differentialPair",
  "Blind/Buried Via": "blindVia",
  "Via Size": "viaSize",
  "Plane Zone": "innerPlane",
  "Copper Zone": "copperRegion",
  "Paste Mask": "pasteMaskExpansion",
  "Solder Mask": "solderMaskExpansion",
};

function defaultRuleName(leaf: string): string {
  return DEFAULT_RULE_NAMES[leaf] ?? "rule";
}

function defaultParamsFor(leaf: string): Record<string, number | boolean | string> {
  const ed = RULE_EDITORS[leaf];
  const out: Record<string, number | boolean | string> = {};
  if (!ed) return out;
  if (ed.kind === "fields") {
    for (const s of ed.sections) for (const f of s.fields) out[f.key] = f.def;
  } else if (ed.kind === "layerTables") {
    for (const t of ed.tables)
      for (const row of LAYER_ROWS)
        for (const c of t.columns) out[`${t.key}.${row.key}.${c.key}`] = c.def;
    for (const s of ed.extraSections ?? []) for (const f of s.fields) out[f.key] = f.def;
  }
  return out;
}

function defaultSpans(): PcbViaSpan[] {
  return [{ name: "BB1", startLayer: "Top Layer", endLayer: "Bottom Layer", viaSize: DEFAULT_RULE_NAMES["Via Size"] }];
}

function makeRule(category: string, leaf: string, name: string, isDefault: boolean): PcbRuleEntry {
  const ed = RULE_EDITORS[leaf];
  if (ed?.kind === "matrix") return { name, category, leaf, isDefault, clearance: defaultClearanceRows() };
  if (ed?.kind === "spanTable") return { name, category, leaf, isDefault, spans: defaultSpans() };
  return { name, category, leaf, isDefault, params: defaultParamsFor(leaf) };
}

// Coerce a rule entry (possibly saved by an older session) into the shape its
// editor expects: right storage kind, all default keys present.
function ensureRuleShape(rule: PcbRuleEntry): PcbRuleEntry {
  const ed = RULE_EDITORS[rule.leaf];
  if (!ed) return rule;
  if (ed.kind === "matrix") {
    return { ...rule, params: undefined, spans: undefined, clearance: rule.clearance ?? defaultClearanceRows() };
  }
  if (ed.kind === "spanTable") {
    return { ...rule, params: undefined, clearance: undefined, spans: rule.spans?.length ? rule.spans : defaultSpans() };
  }
  return { ...rule, clearance: undefined, spans: undefined, params: { ...defaultParamsFor(rule.leaf), ...(rule.params ?? {}) } };
}

// Every leaf ships with one named default rule so the whole tree is live.
function defaultPcbRulesConfig(): PcbRulesConfig {
  const rules: PcbRuleEntry[] = [];
  for (const cat of PCB_RULE_TREE) {
    for (const leaf of cat.leaves) {
      const name = leaf === "Safe Spacing" ? "copperThickness1oz" : defaultRuleName(leaf);
      rules.push(makeRule(cat.category, leaf, name, leaf === "Safe Spacing"));
    }
  }
  return {
    rules,
    selected: "copperThickness1oz",
    unit: "mm",
    layered: false,
    netRules: {},
    netNetRules: [],
    regionRules: {},
  };
}

// Older session configs may predate per-leaf rules, the PDF-canonical rule
// names, or the typed editor shapes — migrate all three.
const LEGACY_RULE_NAMES: Record<string, string> = {
  otherSpacingDefault: "otherClearance",
  trackDefault: "trackWidth",
  netLengthRangeDefault: "netLength",
  netLengthToleranceDefault: "netLengthTolerance",
  differentialPairDefault: "differentialPair",
  blindBuriedViaDefault: "blindVia",
  viaSizeDefault: "viaSize",
  planeZoneDefault: "innerPlane",
  copperZoneDefault: "copperRegion",
  pasteMaskDefault: "pasteMaskExpansion",
  solderMaskDefault: "solderMaskExpansion",
};

function hydratePcbRulesConfig(saved: PcbRulesConfig): PcbRulesConfig {
  const renamed = (n: string) => LEGACY_RULE_NAMES[n] ?? n;
  let rules = saved.rules.map((r) => ensureRuleShape({ ...r, name: renamed(r.name) }));
  for (const cat of PCB_RULE_TREE) {
    for (const leaf of cat.leaves) {
      if (!rules.some((r) => r.leaf === leaf)) {
        rules.push(makeRule(cat.category, leaf, defaultRuleName(leaf), false));
      }
    }
  }
  // Drop duplicate names (rename collisions keep the first occurrence).
  const seen = new Set<string>();
  rules = rules.filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true)));
  const names = new Set(rules.map((r) => r.name));
  const remap = (m: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(m)) out[k] = names.has(renamed(v)) ? renamed(v) : rules[0].name;
    return out;
  };
  return {
    ...saved,
    rules,
    selected: names.has(renamed(saved.selected)) ? renamed(saved.selected) : rules[0].name,
    netRules: remap(saved.netRules ?? {}),
    regionRules: remap(saved.regionRules ?? {}),
    netNetRules: (saved.netNetRules ?? []).map((e) => ({ ...e, rule: names.has(renamed(e.rule)) ? renamed(e.rule) : rules[0].name })),
  };
}

let savedPcbRulesConfig: PcbRulesConfig | null = null;

// Manufacturer fabrication-capability presets (footer dropdown) — seed the
// key minimums as a starting point, exactly like EasyEDA's preset picker.
const CAPABILITY_PRESETS: Record<string, { trackMin: number; clearanceBase: number; viaOuterMin: number; viaInnerMin: number }> = {
  "JLCPCB Capability (Two Layer)": { trackMin: 0.127, clearanceBase: 0.127, viaOuterMin: 0.457, viaInnerMin: 0.305 },
  "JLCPCB Capability (Multi Layer)": { trackMin: 0.09, clearanceBase: 0.09, viaOuterMin: 0.45, viaInnerMin: 0.2 },
};

function applyCapabilityPreset(cfg: PcbRulesConfig, presetName: string): PcbRulesConfig {
  const p = CAPABILITY_PRESETS[presetName];
  if (!p) return cfg;
  return {
    ...cfg,
    rules: cfg.rules.map((r) => {
      if (r.leaf === "Track" && r.params) {
        const params = { ...r.params };
        for (const row of LAYER_ROWS) {
          params[`strokeWidth.${row.key}.min`] = p.trackMin;
          const def = Number(params[`strokeWidth.${row.key}.def`] ?? p.trackMin);
          params[`strokeWidth.${row.key}.def`] = Math.max(def, p.trackMin);
        }
        return { ...r, params };
      }
      if (r.leaf === "Via Size" && r.params) {
        return { ...r, params: { ...r.params, outerMin: p.viaOuterMin, innerMin: p.viaInnerMin } };
      }
      if (r.leaf === "Safe Spacing" && r.clearance) {
        // Preset raises any clearance below the fab's minimum up to it.
        return { ...r, clearance: r.clearance.map((row) => ({ ...row, values: row.values.map((v) => Math.max(v, p.clearanceBase)) })) };
      }
      return r;
    }),
  };
}

const PCB_RULE_TABS = ["Rule Management", "Net Rule", "Net-Net Rule", "Region Rule"];

function PcbDrcModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [tab, setTab] = React.useState("Rule Management");
  const [cfg, setCfg] = React.useState<PcbRulesConfig>(() =>
    savedPcbRulesConfig ? hydratePcbRulesConfig(savedPcbRulesConfig) : defaultPcbRulesConfig(),
  );
  const fileRef = React.useRef<HTMLInputElement>(null);

  const nets = React.useMemo(() => {
    const names = new Set<string>(state.pcbNets.map((n) => n.name));
    for (const o of state.objects) if (o.net) names.add(o.net);
    return [...names];
  }, [state.pcbNets, state.objects]);
  // Named board regions — the region-type objects placed on the canvas.
  const regions = React.useMemo(
    () =>
      state.objects
        .filter((o) => ["polygon", "fillRegion", "slot", "prohibitedRegion", "constraintRegion"].includes(o.kind))
        .map((o, i) => `${o.kind === "polygon" ? "Copper" : o.kind === "fillRegion" ? "Fill" : o.kind === "slot" ? "Slot" : o.kind === "prohibitedRegion" ? "Prohibited" : "Constraint"} Region ${i + 1}`),
    [state.objects],
  );

  const rule = cfg.rules.find((r) => r.name === cfg.selected) ?? cfg.rules[0];
  const ruleNames = cfg.rules.map((r) => r.name);
  const ruleLabel = (name: string) => {
    const r = cfg.rules.find((x) => x.name === name);
    return r?.isDefault ? `${name}(Default)` : name;
  };
  const ruleTypeOf = (name: string) => {
    const r = cfg.rules.find((x) => x.name === name);
    return r ? `${r.category} – ${r.leaf}` : "—";
  };

  const save = () => {
    savedPcbRulesConfig = cfg; // session UI cache (re-open shows the same edits)
    actions.setPcbDrcConfig(rulesToDrcConfig(cfg.rules)); // drives runDrcCheck for real
  };
  const applyPreset = (name: string) => {
    setCfg((c) => applyCapabilityPreset(c, name));
    actions.flashToast(`${name} applied as starting point`);
  };
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ideeza-pcb-design-rules.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    actions.flashToast("PCB rule config exported");
  };
  const importConfig = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PcbRulesConfig;
        if (parsed && Array.isArray(parsed.rules)) {
          setCfg(hydratePcbRulesConfig({ ...defaultPcbRulesConfig(), ...parsed }));
          actions.flashToast("PCB rule config imported");
          return;
        }
      } catch {}
      actions.flashToast("Not a valid PCB rule config file");
    };
    reader.readAsText(file);
  };

  const selectStyle: React.CSSProperties = {
    padding: "5px 8px",
    border: "var(--border-width-1) solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--font-size-sm)",
    fontFamily: "inherit",
    color: "var(--color-text-primary)",
    background: "var(--color-bg-surface)",
    outline: "none",
    maxWidth: 240,
  };

  return (
    <Overlay>
      <Card width={1040} maxHeight="90%">
        <Header title="Design Rules" onClose={actions.closeModal} />
        <ModalTabBar tabs={PCB_RULE_TABS} active={tab} onChange={setTab} />

        <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 380 }}>
          {tab === "Rule Management" && (
            <>
              {/* Rule tree — every leaf is clickable and owns ≥1 named rule */}
              <div style={{ width: 230, flex: "0 0 auto", overflowY: "auto", borderRight: "var(--border-width-1) solid var(--color-border-subtle)", padding: "12px 10px" }}>
                {PCB_RULE_TREE.map((cat) => (
                  <div key={cat.category} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4, padding: "4px 8px" }}>
                      {cat.category}
                    </div>
                    {cat.leaves.map((leaf) => {
                      const leafRules = cfg.rules.filter((r) => r.leaf === leaf);
                      const leafActive = leafRules.some((r) => r.name === cfg.selected);
                      return (
                        <div key={leaf}>
                          <div
                            onClick={() => {
                              // Selecting a leaf jumps to its first named rule.
                              if (leafRules[0]) setCfg((c) => ({ ...c, selected: leafRules[0].name }));
                            }}
                            className="ix-mi"
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "4px 8px 4px 16px", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", cursor: "pointer", color: "var(--color-text-primary)", fontWeight: leafActive ? 600 : 500 }}
                          >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{leaf}</span>
                            {/* PDF #3: + beside each rule-type heading — adds a named rule of this type */}
                            <button
                              type="button"
                              aria-label={`Add ${leaf} rule`}
                              title={`Add ${leaf} rule`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const base = defaultRuleName(leaf);
                                let n = 2;
                                while (cfg.rules.some((r) => r.name === `${base}${n}`)) n++;
                                const fresh = makeRule(cat.category, leaf, `${base}${n}`, false);
                                setCfg((c) => ({ ...c, rules: [...c.rules, fresh], selected: fresh.name }));
                              }}
                              style={{ width: 18, height: 18, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-sm)", background: "var(--color-bg-surface)", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}
                            >
                              +
                            </button>
                          </div>
                          {leafRules.map((r) => {
                            const on = r.name === cfg.selected;
                            return (
                              <div
                                key={r.name}
                                onClick={() => setCfg((c) => ({ ...c, selected: r.name }))}
                                className="ix-mi"
                                style={{ padding: "4px 8px 4px 28px", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", cursor: "pointer", color: on ? "var(--color-violet-600)" : "var(--color-text-secondary)", fontWeight: on ? 600 : 500, background: on ? "var(--color-bg-brand-subtle)" : "transparent", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                title={r.name}
                              >
                                {r.name}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Rule pane */}
              <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "14px 18px" }}>
                {rule ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <label style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>Name:</label>
                      <CompactInput value={rule.name} width={220} onChange={(v) => setCfg((c) => ({ ...c, selected: v, rules: c.rules.map((r) => (r.name === rule.name ? { ...r, name: v } : r)) }))} />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                        <input type="checkbox" checked={rule.isDefault} onChange={() => setCfg((c) => ({ ...c, rules: c.rules.map((r) => ({ ...r, isDefault: r.name === rule.name ? !r.isDefault : false })) }))} />
                        Default
                      </label>
                      <Button hierarchy="secondary" size="sm" onClick={() => {
                        if (cfg.rules.filter((r) => r.leaf === rule.leaf).length <= 1) { actions.flashToast(`${rule.leaf} needs at least one rule`); return; }
                        setCfg((c) => { const rest = c.rules.filter((r) => r.name !== rule.name); return { ...c, rules: rest, selected: rest.find((r) => r.leaf === rule.leaf)?.name ?? rest[0].name }; });
                      }}>Delete</Button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "12px 0" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
                        Unit:
                        <select value={cfg.unit} onChange={(e) => setCfg((c) => ({ ...c, unit: e.target.value as "mm" | "mil" }))} style={selectStyle} aria-label="Unit">
                          <option value="mm">mm</option>
                          <option value="mil">mil</option>
                        </select>
                      </label>
                      <div role="radiogroup" aria-label="Layer scope" style={{ display: "flex", gap: 14 }}>
                        {[["All", false] as const, ["Layered", true] as const].map(([label, v]) => (
                          <label key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                            <input type="radio" name="layerScope" checked={cfg.layered === v} onChange={() => setCfg((c) => ({ ...c, layered: v }))} />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                    {(() => {
                      const ed = RULE_EDITORS[rule.leaf];
                      const onParam = (key: string, v: number | string) =>
                        setCfg((c) => ({
                          ...c,
                          rules: c.rules.map((r) =>
                            r.name === rule.name ? { ...r, params: { ...r.params, [key]: v } } : r,
                          ),
                        }));
                      if (!ed) return <EmptyResults label="No editor for this rule type." />;
                      if (ed.kind === "matrix") {
                        return (
                          <ClearanceMatrix
                            rows={rule.clearance ?? defaultClearanceRows()}
                            unit={cfg.unit}
                            onCell={(ri, ci, v) =>
                              setCfg((c) => ({
                                ...c,
                                rules: c.rules.map((r) =>
                                  r.name !== rule.name
                                    ? r
                                    : { ...r, clearance: (r.clearance ?? defaultClearanceRows()).map((row, i) => (i === ri ? { ...row, values: row.values.map((x, j) => (j === ci ? v : x)) } : row)) },
                                ),
                              }))
                            }
                          />
                        );
                      }
                      if (ed.kind === "spanTable") {
                        return (
                          <SpanTable
                            spans={rule.spans ?? defaultSpans()}
                            layers={state.pcbLayers.map((l) => l.name)}
                            viaSizeRules={cfg.rules.filter((r) => r.leaf === "Via Size").map((r) => r.name)}
                            onChange={(spans) =>
                              setCfg((c) => ({
                                ...c,
                                rules: c.rules.map((r) => (r.name === rule.name ? { ...r, spans } : r)),
                              }))
                            }
                          />
                        );
                      }
                      if (ed.kind === "layerTables") {
                        return <LayerTables def={ed} params={rule.params ?? {}} unit={cfg.unit} onParam={onParam} />;
                      }
                      return <FieldSections sections={ed.sections} params={rule.params ?? {}} unit={cfg.unit} onParam={onParam} />;
                    })()}
                  </>
                ) : (
                  <EmptyResults />
                )}
              </div>
            </>
          )}

          {tab === "Net Rule" && (
            <RuleAssignTable
              columns={["Type", "Name", "Rule", "Rule Type"]}
              rows={nets.map((n) => ({ key: n, cells: ["Net", n] }))}
              valueOf={(n) => cfg.netRules[n] ?? cfg.rules.find((r) => r.isDefault)?.name ?? ruleNames[0]}
              ruleNames={ruleNames}
              ruleLabel={ruleLabel}
              ruleTypeOf={ruleTypeOf}
              onAssign={(key, ruleName) => setCfg((c) => ({ ...c, netRules: { ...c.netRules, [key]: ruleName } }))}
            />
          )}

          {tab === "Net-Net Rule" && (
            <NetNetRuleTable
              cfg={cfg}
              nets={nets}
              ruleNames={ruleNames}
              ruleLabel={ruleLabel}
              ruleTypeOf={ruleTypeOf}
              onChange={(netNetRules) => setCfg((c) => ({ ...c, netNetRules }))}
            />
          )}

          {tab === "Region Rule" && (
            <RuleAssignTable
              columns={["Region Name", "Rule", "Rule Type"]}
              rows={regions.map((r) => ({ key: r, cells: [r] }))}
              valueOf={(r) => cfg.regionRules[r] ?? cfg.rules.find((x) => x.isDefault)?.name ?? ruleNames[0]}
              ruleNames={ruleNames}
              ruleLabel={ruleLabel}
              ruleTypeOf={ruleTypeOf}
              onAssign={(key, ruleName) => setCfg((c) => ({ ...c, regionRules: { ...c.regionRules, [key]: ruleName } }))}
            />
          )}
        </div>

        {/* Footer — spec set: capability preset, Import/Export Config, Restore
            Default (scoped to the selected rule), Apply, Confirm, Cancel */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-6) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto", flexWrap: "wrap" }}>
          <select
            value=""
            aria-label="Board capability preset"
            onChange={(e) => { if (e.target.value) applyPreset(e.target.value); e.target.value = ""; }}
            style={{ ...ruleSelectStyle, maxWidth: 240, color: "var(--color-text-secondary)" }}
          >
            <option value="">Board capability preset…</option>
            {Object.keys(CAPABILITY_PRESETS).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <Button hierarchy="secondary" size="sm" onClick={() => fileRef.current?.click()}>Import Config</Button>
          <Button hierarchy="secondary" size="sm" onClick={exportConfig}>Export Config</Button>
          <Button hierarchy="secondary" size="sm" onClick={() => {
            if (!rule) return;
            setCfg((c) => ({ ...c, rules: c.rules.map((r) => (r.name === rule.name ? makeRule(r.category, r.leaf, r.name, r.isDefault) : r)) }));
            actions.flashToast(`"${rule.name}" restored to factory defaults`);
          }}>Restore Default</Button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importConfig(f); e.target.value = ""; }} />
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-4)" }}>
            <Button hierarchy="secondary" size="md" onClick={() => { save(); actions.flashToast("PCB design rules applied"); }}>Apply</Button>
            <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
            <Button hierarchy="primary" size="md" onClick={() => { save(); actions.flashToast("PCB design rules saved"); actions.closeModal(); }}>Confirm</Button>
          </div>
        </div>
      </Card>
    </Overlay>
  );
}

// Unit helpers — rule values are stored in mm; mil is a display conversion.
const MM_PER_MIL = 0.0254;
const mmToUnit = (mm: number, unit: string) => (unit === "mil" ? +(mm / MM_PER_MIL).toFixed(2) : mm);
const unitToMm = (v: number, unit: string) => (unit === "mil" ? +(v * MM_PER_MIL).toFixed(4) : v);

// Shared numeric input for rule forms.
function RuleNumInput({
  value,
  onCommit,
  unit,
  isLen,
  allowNeg,
  ariaLabel,
  width = 96,
}: {
  value: number;
  onCommit: (mmValue: number) => void;
  unit: string;
  isLen: boolean;
  allowNeg?: boolean;
  ariaLabel: string;
  width?: number;
}) {
  const display = isLen ? mmToUnit(value, unit) : value;
  return (
    <input
      type="number"
      value={String(display)}
      step={isLen ? 0.001 : 1}
      aria-label={ariaLabel}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        if (isNaN(n) || (!allowNeg && n < 0)) return;
        onCommit(isLen ? unitToMm(n, unit) : n);
      }}
      style={{ width, padding: "5px 8px", textAlign: "right", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", fontVariantNumeric: "tabular-nums", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none" }}
    />
  );
}

const ruleSelectStyle: React.CSSProperties = {
  padding: "5px 8px",
  border: "var(--border-width-1) solid var(--color-border-default)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--font-size-sm)",
  fontFamily: "inherit",
  color: "var(--color-text-primary)",
  background: "var(--color-bg-surface)",
  outline: "none",
};

function RuleSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4, margin: "6px 0 2px" }}>
      {children}
    </div>
  );
}

// Sectioned flat fields (Other Spacing, Net Length, Via Size, mask expansions…).
function FieldSections({
  sections,
  params,
  unit,
  onParam,
}: {
  sections: Section[];
  params: Record<string, number | boolean | string>;
  unit: string;
  onParam: (key: string, value: number | string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 440 }}>
      {sections.map((s, i) => (
        <React.Fragment key={s.title ?? i}>
          {s.title && <RuleSectionTitle>{s.title}</RuleSectionTitle>}
          {s.fields.map((f) => (
            <label key={f.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
              <span>{f.label}{f.type === "len" ? ` (${unit})` : ""}</span>
              <RuleNumInput
                value={Number(params[f.key] ?? f.def)}
                onCommit={(v) => onParam(f.key, v)}
                unit={unit}
                isLen={f.type === "len"}
                allowNeg={f.neg}
                ariaLabel={`${s.title ? s.title + " " : ""}${f.label}`}
              />
            </label>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

// Per-layer tables (Track / Differential Pair / Plane & Copper Zone): rows
// All / Top Layer / Bottom Layer, columns numeric or dropdown.
function LayerTables({
  def,
  params,
  unit,
  onParam,
}: {
  def: Extract<RuleEditorDef, { kind: "layerTables" }>;
  params: Record<string, number | boolean | string>;
  unit: string;
  onParam: (key: string, value: number | string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {def.tables.map((t) => (
        <div key={t.key}>
          <RuleSectionTitle>{t.title}</RuleSectionTitle>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, position: "static" }}>Layer</th>
                {t.columns.map((c) => (
                  <th key={c.key} style={{ ...thStyle, position: "static" }}>
                    {c.label}{c.type === "len" ? ` (${unit})` : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LAYER_ROWS.map((row) => (
                <tr key={row.key}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "var(--color-text-secondary)" }}>{row.label}</td>
                  {t.columns.map((c) => {
                    const pk = `${t.key}.${row.key}.${c.key}`;
                    const raw = params[pk] ?? c.def;
                    return (
                      <td key={c.key} style={tdStyle}>
                        {c.type === "select" ? (
                          <select value={String(raw)} aria-label={`${t.title} ${row.label} ${c.label}`} onChange={(e) => onParam(pk, e.target.value)} style={ruleSelectStyle}>
                            {(c.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <RuleNumInput value={Number(raw)} onCommit={(v) => onParam(pk, v)} unit={unit} isLen ariaLabel={`${t.title} ${row.label} ${c.label}`} width={84} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {def.extraSections && <FieldSections sections={def.extraSections} params={params} unit={unit} onParam={onParam} />}
    </div>
  );
}

// Blind/buried via span table — +/↑/↓/× row controls; Name, Start Layer,
// End Layer, Via Size (from the Via Size rule list) per row.
function SpanTable({
  spans,
  layers,
  viaSizeRules,
  onChange,
}: {
  spans: PcbViaSpan[];
  layers: string[];
  viaSizeRules: string[];
  onChange: (spans: PcbViaSpan[]) => void;
}) {
  const [sel, setSel] = React.useState(0);
  const patch = (i: number, p: Partial<PcbViaSpan>) => onChange(spans.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const move = (dir: -1 | 1) => {
    const j = sel + dir;
    if (sel < 0 || j < 0 || j >= spans.length) return;
    const next = [...spans];
    [next[sel], next[j]] = [next[j], next[sel]];
    onChange(next);
    setSel(j);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <RowBtn onClick={() => { onChange([...spans, { name: `BB${spans.length + 1}`, startLayer: layers[0] ?? "Top Layer", endLayer: layers[1] ?? "Bottom Layer", viaSize: viaSizeRules[0] ?? "" }]); setSel(spans.length); }} icon={PLUS_SVG} title="Add span" />
        <RowBtn onClick={() => move(-1)} icon={UP_SVG} title="Move span up" />
        <RowBtn onClick={() => move(1)} icon={DOWN_SVG} title="Move span down" />
        <RowBtn onClick={() => { if (spans.length <= 1) return; onChange(spans.filter((_, i) => i !== sel)); setSel(0); }} icon={MINUS_SVG} title="Delete selected span" />
      </div>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, position: "static" }}>Name</th>
            <th style={{ ...thStyle, position: "static" }}>Start Layer</th>
            <th style={{ ...thStyle, position: "static" }}>End Layer</th>
            <th style={{ ...thStyle, position: "static" }}>Via Size</th>
          </tr>
        </thead>
        <tbody>
          {spans.map((s, i) => (
            <tr key={i} onClick={() => setSel(i)} style={{ background: sel === i ? "var(--color-bg-brand-subtle)" : "transparent", cursor: "pointer" }}>
              <td style={tdStyle}>
                <CompactInput value={s.name} width={110} onChange={(v) => patch(i, { name: v })} />
              </td>
              {(["startLayer", "endLayer"] as const).map((k) => (
                <td key={k} style={tdStyle}>
                  <select value={s[k]} aria-label={k === "startLayer" ? "Start layer" : "End layer"} onChange={(e) => patch(i, { [k]: e.target.value })} style={ruleSelectStyle}>
                    {layers.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
              ))}
              <td style={tdStyle}>
                <select value={s.viaSize} aria-label="Via size rule" onChange={(e) => patch(i, { viaSize: e.target.value })} style={ruleSelectStyle}>
                  {viaSizeRules.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
        Blind/buried via span definitions, checked in priority order.
      </div>
    </div>
  );
}

// 13-type lower-triangular clearance matrix with editable cells.
function ClearanceMatrix({
  rows,
  unit,
  onCell,
}: {
  rows: ClearanceRow[];
  unit: string;
  onCell: (row: number, col: number, value: number) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
        <thead>
          <tr>
            <th style={{ position: "sticky", left: 0, background: "var(--color-bg-surface)" }} />
            {CLEARANCE_COLS.map((c) => (
              <th key={c} style={{ padding: "3px 4px", fontSize: 9.5, fontWeight: 700, color: "var(--color-text-secondary)", whiteSpace: "nowrap", maxWidth: 58, overflow: "hidden", textOverflow: "ellipsis" }} title={c}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.name}>
              <th style={{ padding: "3px 8px", fontSize: 10.5, fontWeight: 700, color: "var(--color-text-secondary)", textAlign: "right", whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--color-bg-surface)" }}>
                {row.name}
              </th>
              {row.values.map((v, ci) => (
                <td key={ci} style={{ padding: 1.5 }}>
                  <input
                    value={String(mmToUnit(v, unit))}
                    aria-label={`${row.name} to ${CLEARANCE_COLS[ci] ?? row.name} clearance (${unit})`}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!isNaN(n) && n >= 0) onCell(ri, ci, unitToMm(n, unit));
                    }}
                    style={{ width: 52, height: 24, textAlign: "center", fontSize: 10.5, border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-sm)", background: "var(--color-bg-subtle)", color: "var(--color-text-primary)", outline: "none", fontFamily: "inherit" }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 6, fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
        Minimum spacing between each pair of object types ({unit}).
      </div>
    </div>
  );
}

// Shared filterable assign-a-rule table (Net Rule + Region Rule tabs).
function RuleAssignTable({
  columns,
  rows,
  valueOf,
  ruleNames,
  ruleLabel,
  ruleTypeOf,
  onAssign,
  headerLeft,
}: {
  columns: string[];
  rows: { key: string; cells: string[] }[];
  valueOf: (key: string) => string;
  ruleNames: string[];
  ruleLabel: (name: string) => string;
  ruleTypeOf: (name: string) => string;
  onAssign: (key: string, ruleName: string) => void;
  headerLeft?: React.ReactNode;
}) {
  const [filter, setFilter] = React.useState("");
  const shown = rows.filter((r) => r.key.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "12px 18px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {headerLeft}
        <FilterInput value={filter} onChange={setFilter} style={{ maxWidth: 260 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {shown.length === 0 ? (
          <EmptyResults />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{columns.map((c) => <th key={c} style={thStyle}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const current = valueOf(r.key);
                return (
                  <tr key={r.key}>
                    {r.cells.map((c, i) => <td key={i} style={tdStyle}>{c}</td>)}
                    <td style={tdStyle}>
                      <select value={current} aria-label={`Rule for ${r.key}`} onChange={(e) => onAssign(r.key, e.target.value)} style={{ padding: "4px 8px", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none" }}>
                        {ruleNames.map((n) => <option key={n} value={n}>{ruleLabel(n)}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, color: "var(--color-text-secondary)" }}>{ruleTypeOf(current)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Net-Net Rule tab — pairwise net spacing entries with +/× management.
function NetNetRuleTable({
  cfg,
  nets,
  ruleNames,
  ruleLabel,
  ruleTypeOf,
  onChange,
}: {
  cfg: PcbRulesConfig;
  nets: string[];
  ruleNames: string[];
  ruleLabel: (name: string) => string;
  ruleTypeOf: (name: string) => string;
  onChange: (entries: PcbRulesConfig["netNetRules"]) => void;
}) {
  const [filter, setFilter] = React.useState("");
  const [selIdx, setSelIdx] = React.useState<number | null>(null);
  const entries = cfg.netNetRules;
  const shown = entries
    .map((e, i) => ({ ...e, i }))
    .filter((e) => `${e.net1} ${e.net2}`.toLowerCase().includes(filter.toLowerCase()));

  const add = () => {
    const n1 = nets[0] ?? "";
    const n2 = nets[1] ?? nets[0] ?? "";
    onChange([...entries, { net1: n1, net2: n2, rule: ruleNames[0] }]);
    setSelIdx(entries.length);
  };
  const del = () => {
    if (selIdx === null) return;
    onChange(entries.filter((_, i) => i !== selIdx));
    setSelIdx(null);
  };
  const patch = (i: number, p: Partial<PcbRulesConfig["netNetRules"][number]>) =>
    onChange(entries.map((e, j) => (j === i ? { ...e, ...p } : e)));

  const netSel = (value: string, onSel: (v: string) => void, label: string) => (
    <select value={value} aria-label={label} onChange={(e) => onSel(e.target.value)} style={{ padding: "4px 8px", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none" }}>
      {nets.map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "12px 18px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <RowBtn onClick={add} icon={PLUS_SVG} title="Add entry" />
        <RowBtn onClick={del} icon={MINUS_SVG} title="Delete selected entry" />
        <FilterInput value={filter} onChange={setFilter} style={{ maxWidth: 260 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {shown.length === 0 ? (
          <EmptyResults />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle} colSpan={2}>Net 1</th>
                <th style={thStyle} colSpan={2}>Net 2</th>
                <th style={thStyle}>Rule</th>
                <th style={thStyle}>Rule Type</th>
              </tr>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle} />
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.i} onClick={() => setSelIdx(e.i)} style={{ background: selIdx === e.i ? "var(--color-bg-brand-subtle)" : "transparent", cursor: "pointer" }}>
                  <td style={tdStyle}>Net</td>
                  <td style={tdStyle}>{netSel(e.net1, (v) => patch(e.i, { net1: v }), "Net 1")}</td>
                  <td style={tdStyle}>Net</td>
                  <td style={tdStyle}>{netSel(e.net2, (v) => patch(e.i, { net2: v }), "Net 2")}</td>
                  <td style={tdStyle}>
                    <select value={e.rule} aria-label="Rule" onChange={(ev) => patch(e.i, { rule: ev.target.value })} style={{ padding: "4px 8px", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none" }}>
                      {ruleNames.map((n) => <option key={n} value={n}>{ruleLabel(n)}</option>)}
                    </select>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--color-text-secondary)" }}>{ruleTypeOf(e.rule)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function PcbManagerModals() {
  const state = usePcbState();
  const m: ModalId = state.modal;
  switch (m) {
    case "layerManager":
      return <LayerManagerModal />;
    case "netClass":
      return <NetClassManagerModal />;
    case "diffPair":
      return <DiffPairManagerModal />;
    case "equalLength":
      return <EqualLengthManagerModal />;
    case "padPair":
      return <PadPairManagerModal />;
    case "copper":
      return <CopperManagerModal />;
    case "tearDrop":
      return <TearDropModal />;
    case "removeUnusedPad":
      return <RemoveUnusedPadModal />;
    case "pcbDrc":
      return <PcbDrcModal />;
    default:
      return null;
  }
}
