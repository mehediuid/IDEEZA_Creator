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
import { EmptyResults, FilterInput, RailAction } from "@/components/pcb/modal-kit";
import { PCB_RULE_TREE, CLEARANCE_COLS, defaultClearanceRows, type ClearanceRow } from "@/lib/pcb/design-rules-data";
import { rulesToDrcConfig } from "@/lib/pcb/drc-rules-map";
import { diffPairStats, defaultPcbDrcConfig } from "@/lib/pcb/drc";

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
// ── Group workbench — the shared shell behind Net Classes, Matched Length
// Groups and Pin Pair Groups (UIUX-49/50/51) ─────────────────────────────────
// The three used to share a dual-list transfer dialog: a group list with +/−,
// then "Not Selected" and "Selected" columns with arrows between them. That
// makes you hold the question "where is this net?" in your head while you
// shuttle names across two columns, and it scales badly — a board with 200
// nets is 200 rows you have to hunt through twice.
//
// The workbench inverts it: **one list of every member, each row carrying the
// group it belongs to.** No second column, no arrows, no per-column filters.
// Membership is a per-row control, so the answer to "where is this net?" is on
// the row itself, and a group can never silently hold the same net twice —
// assigning to another group moves it.
type WbGroup = { id: string; name: string; meta: string };
type WbMember = { id: string; label: string; sub?: string };

function GroupWorkbench({
  title,
  subtitle,
  memberNoun,
  groups,
  members,
  groupOf,
  onAssign,
  onAdd,
  onDelete,
  addLabel,
  unassignedLabel = "Unassigned",
  removeMeansDelete,
  composer,
  emptyHint,
}: {
  title: string;
  subtitle: string;
  memberNoun: string;
  groups: WbGroup[];
  members: WbMember[];
  groupOf: (memberId: string) => string | null;
  onAssign: (memberId: string, groupId: string | null) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  addLabel: string;
  unassignedLabel?: string;
  removeMeansDelete?: boolean;
  composer?: React.ReactNode;
  emptyHint: string;
}) {
  const actions = usePcbActions();
  const [query, setQuery] = React.useState("");
  // The rail is a filter over one list, not a second place to stand: "All"
  // shows every member, a group shows its own, "Unassigned" shows the rest.
  const [scope, setScope] = React.useState<string | null>(null); // null = all

  const counts = React.useMemo(() => {
    const by: Record<string, number> = {};
    let free = 0;
    for (const m of members) {
      const g = groupOf(m.id);
      if (g) by[g] = (by[g] ?? 0) + 1;
      else free++;
    }
    return { by, free };
  }, [members, groupOf]);

  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const g = groupOf(m.id);
      if (scope === "__free" ? g !== null : scope !== null && g !== scope) return false;
      return !q || m.label.toLowerCase().includes(q) || (m.sub ?? "").toLowerCase().includes(q);
    });
  }, [members, groupOf, scope, query]);

  const assignedTotal = members.length - counts.free;

  const scopeRow = (key: string | null, label: string, meta: string, count: number) => {
    const on = scope === key;
    return (
      <button
        key={key ?? "__all"}
        type="button"
        onClick={() => setScope(key)}
        aria-pressed={on}
        className="ix-row"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "var(--spacing-4)",
          padding: "var(--spacing-4) var(--spacing-5)", borderRadius: "var(--radius-md)",
          border: "none", background: on ? "var(--color-bg-brand-subtle)" : "transparent",
          cursor: "pointer", textAlign: "left", font: "inherit",
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "var(--font-size-sm)", fontWeight: on ? 700 : 600, color: on ? "var(--color-text-brand)" : "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </span>
          <span style={{ display: "block", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {meta}
          </span>
        </span>
        <span style={{ flex: "0 0 auto", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
          {count}
        </span>
      </button>
    );
  };

  return (
    <Overlay>
      <Card width={880} maxHeight="88%">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--spacing-6)", padding: "18px 24px 14px", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>{subtitle}</span>
          </span>
          <IconButton hierarchy="ghost" size="sm" aria-label="Close" onClick={actions.closeModal} icon={<Icon html={CLOSE_SVG} />} />
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 320, overflow: "hidden" }}>
          {/* Groups — cards that say what the group actually sets, and double as
              the filter over the one member list. */}
          <div style={{ width: 236, flex: "0 0 auto", borderRight: "var(--border-width-1) solid var(--color-border-subtle)", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-4)" }}>
              {scopeRow(null, "All", `every ${memberNoun} on the board`, members.length)}
              {groups.map((g) => (
                <div key={g.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  {scopeRow(g.id, g.name, g.meta, counts.by[g.id] ?? 0)}
                  <button
                    type="button"
                    aria-label={`Delete ${g.name}`}
                    title={`Delete ${g.name}`}
                    onClick={() => { onDelete(g.id); if (scope === g.id) setScope(null); }}
                    style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: "var(--radius-sm)", background: "var(--color-bg-surface)", color: "var(--color-text-tertiary)", cursor: "pointer", padding: 0, opacity: 0, transition: "opacity .12s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                    onFocus={(e) => (e.currentTarget.style.opacity = "1")}
                    onBlur={(e) => (e.currentTarget.style.opacity = "0")}
                  >
                    <Icon html={CLOSE_SVG} size={11} />
                  </button>
                </div>
              ))}
              {counts.free > 0 && scopeRow("__free", unassignedLabel, `not in any group yet`, counts.free)}
            </div>
            <div style={{ padding: "var(--spacing-4)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
              <Button hierarchy="secondary" size="sm" onClick={onAdd} style={{ width: "100%" }}>{addLabel}</Button>
            </div>
          </div>

          {/* One list of members, each row carrying its own membership control. */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "var(--spacing-5) var(--spacing-7) var(--spacing-4)", flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "var(--spacing-5)" }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${memberNoun}s`}
                aria-label={`Search ${memberNoun}s`}
                style={{ width: "100%", boxSizing: "border-box", padding: "var(--spacing-4) var(--spacing-5)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }}
              />
              {composer}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--spacing-7) var(--spacing-6)" }}>
              {shown.length === 0 ? (
                <div style={{ padding: "var(--spacing-12)", textAlign: "center", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
                  {query.trim() ? `No ${memberNoun} matches “${query.trim()}”.` : emptyHint}
                </div>
              ) : (
                shown.map((m) => {
                  const g = groupOf(m.id);
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "7px 2px", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
                      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.label}</span>
                        {m.sub && <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>{m.sub}</span>}
                      </span>
                      <select
                        value={g ?? ""}
                        aria-label={`Group for ${m.label}`}
                        onChange={(e) => onAssign(m.id, e.target.value || null)}
                        style={{
                          flex: "0 0 auto", width: 168, padding: "5px 8px",
                          border: "var(--border-width-1) solid var(--color-border-default)",
                          borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)",
                          fontFamily: "inherit", background: "var(--color-bg-surface)",
                          color: g ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                          outline: "none",
                        }}
                      >
                        <option value="">{removeMeansDelete ? "— remove —" : unassignedLabel}</option>
                        {groups.map((gr) => (
                          <option key={gr.id} value={gr.id}>{gr.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-6) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          {/* Assignment is live (each pick writes the store), so there is no
              "Apply" to fake — what the dialog offers instead is running the
              check that now reads these groups. */}
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
            {assignedTotal} of {members.length} {memberNoun}{members.length === 1 ? "" : "s"} grouped · saved as you go
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-5)" }}>
            <Button hierarchy="secondary" size="md" onClick={() => { actions.closeModal(); actions.runDrcCheck(); }}>Check now</Button>
            <Button hierarchy="primary" size="md" onClick={actions.closeModal}>Done</Button>
          </div>
        </div>
      </Card>
    </Overlay>
  );
}

/** Every net on the board, whatever it came from. */
function useBoardNets() {
  const state = usePcbState();
  return React.useMemo(() => {
    const names = new Set<string>(state.pcbNets.map((n) => n.name));
    for (const o of state.objects) if (o.net) names.add(o.net);
    return [...names];
  }, [state.pcbNets, state.objects]);
}

function NetClassManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const nets = useBoardNets();
  const classes = state.pcbNetClasses;
  const classOf = React.useCallback(
    (net: string) => classes.find((c) => (c.nets ?? []).includes(net))?.id ?? null,
    [classes],
  );
  return (
    <GroupWorkbench
      title="Net classes"
      subtitle="A class states the track width and via size its nets must be routed with."
      memberNoun="net"
      addLabel="New class"
      groups={classes.map((c) => ({ id: c.id, name: c.name, meta: `${c.trackWidth} mil track · ${c.viaSize} mil via` }))}
      members={nets.map((n) => ({ id: n, label: n }))}
      groupOf={classOf}
      onAssign={(net, classId) => {
        // A net belongs to one class — picking another moves it rather than
        // leaving the same name sitting in two lists.
        for (const c of classes) {
          const has = (c.nets ?? []).includes(net);
          if (c.id === classId && !has) actions.setNetClassField(c.id, { nets: [...(c.nets ?? []), net] });
          else if (c.id !== classId && has) actions.setNetClassField(c.id, { nets: (c.nets ?? []).filter((n) => n !== net) });
        }
      }}
      onAdd={actions.addNetClass}
      onDelete={actions.removeNetClass}
      emptyHint="No nets on the board yet — convert the schematic or route some copper first."
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
  // Tolerance comes from the tuned rules when the user has confirmed them,
  // else from the engine defaults — the same order runDrcCheck uses.
  const skewMax = (state.pcbDrcConfig ?? defaultPcbDrcConfig()).diffPairSkewMax;

  // Routing state per pair, from the same helper the DRC phase uses.
  const stats = React.useMemo(
    () => new Map(pairs.map((p) => [p.id, diffPairStats(state.objects, p)])),
    [pairs, state.objects],
  );

  const verdict = (id: string) => {
    const st = stats.get(id);
    const p = pairs.find((x) => x.id === id);
    if (!st || !p) return { text: "—", tone: "muted" as const };
    if (!p.netA || !p.netB) return { text: "Nets not set", tone: "muted" as const };
    if (st.a.length === 0 && st.b.length === 0) return { text: "Not routed", tone: "muted" as const };
    if (st.a.length === 0 || st.b.length === 0) return { text: "One rail missing", tone: "bad" as const };
    if (st.widthOffender) return { text: `Width ≠ ${p.width} mil`, tone: "bad" as const };
    if (st.skew > skewMax) return { text: `Skew ${st.skew.toFixed(2)} mm`, tone: "bad" as const };
    return { text: `Matched ±${st.skew.toFixed(2)} mm`, tone: "good" as const };
  };

  const TONE = {
    good: { color: "var(--color-text-success, #1c7a52)", bg: "var(--color-bg-success-subtle, rgba(28,122,82,.12))" },
    bad: { color: "var(--color-text-warning, #96600a)", bg: "var(--color-bg-warning-subtle, rgba(150,96,10,.12))" },
    muted: { color: "var(--color-text-tertiary)", bg: "var(--color-bg-subtle)" },
  };

  // The net carried by the current canvas selection — replaces the old
  // "Click To Select Network" toast with something that actually reads the board.
  const selectionNet = React.useMemo(() => {
    const picked = state.objects.filter((o) => state.selectedIds.includes(o.id) && o.net);
    return picked.length ? (picked[0].net as string) : null;
  }, [state.objects, state.selectedIds]);

  const label = (t: string) => (
    <label style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>{t}</label>
  );

  const applySelectionNet = (which: "netA" | "netB") => {
    if (!sel || !selectionNet) return;
    actions.setDiffPairField(sel.id, { [which]: selectionNet });
    actions.flashToast(`${which === "netA" ? "Positive" : "Negative"} net set to ${selectionNet}`);
  };

  return (
    <Overlay>
      <Card width={780}>
        <Header title="Differential Pairs" onClose={actions.closeModal} />
        <div style={{ flex: 1, display: "flex", gap: 18, padding: "16px 24px", minHeight: 340 }}>
          {/* Pairs — each row states its live routing verdict */}
          <div style={{ width: 292, flex: "0 0 auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "var(--spacing-3)" }}>
              <span style={{ flex: 1, fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                Pairs ({pairs.length})
              </span>
              <span style={{ display: "inline-flex", gap: 4 }}>
                <RowBtn onClick={() => { actions.addDiffPair(); actions.flashToast("Pair added"); }} icon={PLUS_SVG} title="Add pair" />
                <RowBtn onClick={() => { if (sel) { actions.removeDiffPair(sel.id); setSelId(null); } }} icon={MINUS_SVG} title="Delete selected pair" />
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-2)", minHeight: 252 }}>
              {pairs.map((p) => {
                const v = verdict(p.id);
                const on = p.id === selId;
                return (
                  <div
                    key={p.id}
                    className="ix-row"
                    onClick={() => setSelId(p.id)}
                    style={{ padding: "var(--spacing-4) var(--spacing-5)", borderRadius: "var(--radius-md)", cursor: "pointer", background: on ? "var(--color-bg-brand-subtle)" : "transparent" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
                      <span style={{ flex: 1, fontSize: "var(--font-size-sm)", fontWeight: on ? 700 : 500, color: on ? "var(--color-text-brand)" : "var(--color-text-primary)" }}>{p.name}</span>
                      <span style={{ padding: "1px 7px", borderRadius: "var(--radius-full)", fontSize: 10.5, fontWeight: 700, color: TONE[v.tone].color, background: TONE[v.tone].bg, whiteSpace: "nowrap" }}>{v.text}</span>
                    </div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>
                      {p.netA || "—"} ⇄ {p.netB || "—"}
                    </div>
                  </div>
                );
              })}
              {pairs.length === 0 && (
                <div style={{ padding: "var(--spacing-8)", textAlign: "center", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
                  No pairs yet — add one with +, or match them automatically.
                </div>
              )}
            </div>
          </div>

          {/* Selected pair */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
            {sel ? (
              <>
                {label("Pair name")}
                <CompactInput value={sel.name} width={240} onChange={(v) => actions.setDiffPairField(sel.id, { name: v })} />

                <div style={{ display: "flex", gap: "var(--spacing-6)", marginTop: "var(--spacing-4)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {label("Positive net")}
                    <NetSelect ariaLabel="Positive net" value={sel.netA} options={nets} onChange={(v) => actions.setDiffPairField(sel.id, { netA: v })} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {label("Negative net")}
                    <NetSelect ariaLabel="Negative net" value={sel.netB} options={nets} onChange={(v) => actions.setDiffPairField(sel.id, { netB: v })} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
                  <Button hierarchy="secondary" size="sm" disabled={!selectionNet} onClick={() => applySelectionNet("netA")}>
                    Positive from selection
                  </Button>
                  <Button hierarchy="secondary" size="sm" disabled={!selectionNet} onClick={() => applySelectionNet("netB")}>
                    Negative from selection
                  </Button>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                    {selectionNet ? `Canvas selection: ${selectionNet}` : "Select a track or pad on the board to use its net"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "var(--spacing-8)", marginTop: "var(--spacing-5)" }}>
                  <div>
                    {label("Track width (mil)")}
                    <CompactInput value={String(sel.width)} width={110} onChange={(v) => actions.setDiffPairField(sel.id, { width: Number(v) || 0 })} />
                  </div>
                  <div>
                    {label("Gap (mil)")}
                    <CompactInput value={String(sel.gap)} width={110} onChange={(v) => actions.setDiffPairField(sel.id, { gap: Number(v) || 0 })} />
                  </div>
                </div>

                {/* Live measurement — what DRC will report */}
                {(() => {
                  const st = stats.get(sel.id);
                  const v = verdict(sel.id);
                  return (
                    <div style={{ marginTop: "auto", padding: "var(--spacing-5) var(--spacing-6)", borderRadius: "var(--radius-lg)", background: "var(--color-bg-subtle)", border: "var(--border-width-1) solid var(--color-border-subtle)" }}>
                      <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: TONE[v.tone].color }}>{v.text}</div>
                      <div style={{ marginTop: 4, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-mono), monospace" }}>
                        {sel.netA || "—"} {st ? `${st.la.toFixed(2)} mm (${st.a.length} track${st.a.length === 1 ? "" : "s"})` : ""} · {sel.netB || "—"} {st ? `${st.lb.toFixed(2)} mm (${st.b.length})` : ""}
                      </div>
                      <div style={{ marginTop: 2, fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                        Skew tolerance {skewMax} mm — set in Design Rules. Track width is enforced by DRC; gap is used when routing the pair.
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: "var(--font-size-sm)" }}>
                Select a pair on the left, or add one with +
              </div>
            )}
          </div>
        </div>
        {/* Edits apply as you make them (they live in the document), so the
            footer carries the one real extra action and a way out. */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-6) var(--spacing-12)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto" }}>
          <Button hierarchy="secondary" size="md" onClick={() => setAutoOpen(true)}>Match pairs automatically…</Button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-5)" }}>
            <Button hierarchy="secondary" size="md" onClick={() => actions.runDrcCheck()}>Run DRC</Button>
            <Button hierarchy="primary" size="md" onClick={actions.closeModal}>Done</Button>
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
  const nets = useBoardNets();
  const groups = state.pcbEqualLength;
  const groupOf = React.useCallback(
    (net: string) => groups.find((g) => (g.nets ?? []).includes(net))?.id ?? null,
    [groups],
  );
  return (
    <GroupWorkbench
      title="Matched length groups"
      subtitle="Every net in a group has to land inside the same length window."
      memberNoun="net"
      addLabel="New group"
      groups={groups.map((g) => ({ id: g.id, name: g.name, meta: `${g.target} ± ${g.tolerance} mil` }))}
      members={nets.map((n) => ({ id: n, label: n }))}
      groupOf={groupOf}
      onAssign={(net, groupId) => {
        for (const g of groups) {
          const has = (g.nets ?? []).includes(net);
          if (g.id === groupId && !has) actions.setEqualLengthField(g.id, { nets: [...(g.nets ?? []), net] });
          else if (g.id !== groupId && has) actions.setEqualLengthField(g.id, { nets: (g.nets ?? []).filter((n) => n !== net) });
        }
      }}
      onAdd={actions.addEqualLengthGroup}
      onDelete={actions.removeEqualLengthGroup}
      emptyHint="No nets on the board yet — convert the schematic or route some copper first."
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
  const [pad1, setPad1] = React.useState("");
  const [pad2, setPad2] = React.useState("");
  const [into, setInto] = React.useState<string>(groups[0]?.id ?? "");

  // Pads on the board: placed pad objects (P1…Pn) plus their nets.
  // `name` is what the user reads, `key` is what gets stored — the DRC resolves
  // the key, so reordering the board can't repoint a pair.
  const pads = React.useMemo(
    () =>
      state.objects
        .filter((o) => o.kind === "pad")
        .map((o, i) => ({ name: o.text || `P${i + 1}`, key: o.id, net: o.net ?? "" })),
    [state.objects],
  );
  const padName = React.useCallback(
    (key: string) => {
      const p = pads.find((x) => x.key === key);
      return p ? p.name : key;
    },
    [pads],
  );
  const padNet = React.useCallback(
    (key: string) => pads.find((x) => x.key === key)?.net ?? "",
    [pads],
  );

  // Unlike nets, a pin pair doesn't exist until you make one — so the member
  // list is every pair already on the board and the composer above it is how a
  // new one is born. Moving it between groups is then the same row control the
  // other two managers use.
  const members = React.useMemo(() => {
    const out: WbMember[] = [];
    const seen = new Set<string>();
    for (const g of groups) {
      for (const entry of parsePadPairs(g.pads)) {
        if (seen.has(entry)) continue;
        seen.add(entry);
        const [a, b] = entry.split(" - ");
        const nets = [padNet(a), padNet(b)].filter(Boolean);
        out.push({
          id: entry,
          label: `${padName(a)} ↔ ${padName(b)}`,
          sub: nets.length ? [...new Set(nets)].join(" · ") : undefined,
        });
      }
    }
    return out;
  }, [groups, padName, padNet]);

  const groupOf = React.useCallback(
    (entry: string) => groups.find((g) => parsePadPairs(g.pads).includes(entry))?.id ?? null,
    [groups],
  );

  const addPair = () => {
    if (!pad1 || !pad2 || pad1 === pad2) {
      actions.flashToast("Pick two different pads");
      return;
    }
    const target = groups.find((g) => g.id === into) ?? groups[0];
    if (!target) {
      actions.flashToast("Make a group first");
      return;
    }
    const entry = `${pad1} - ${pad2}`;
    if (groups.some((g) => parsePadPairs(g.pads).includes(entry))) {
      actions.flashToast("That pair is already in a group");
      return;
    }
    actions.setPadPairField(target.id, { pads: [...parsePadPairs(target.pads), entry].join("; ") });
    setPad1("");
    setPad2("");
  };

  const padSelect = (label: string, value: string, setValue: (v: string) => void) => (
    <select
      value={value}
      aria-label={label}
      onChange={(e) => setValue(e.target.value)}
      style={{ flex: 1, minWidth: 0, padding: "5px 8px", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", color: value ? "var(--color-text-primary)" : "var(--color-text-tertiary)", background: "var(--color-bg-surface)", outline: "none" }}
    >
      <option value="">{label}</option>
      {pads.map((p) => (
        <option key={p.key} value={p.key}>{p.name}{p.net ? ` (${p.net})` : ""}</option>
      ))}
    </select>
  );

  const composer = (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-4)", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)", background: "var(--color-bg-subtle)" }}>
      {padSelect("Pad 1", pad1, setPad1)}
      <span style={{ flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>↔</span>
      {padSelect("Pad 2", pad2, setPad2)}
      <select
        value={into}
        aria-label="Add to group"
        onChange={(e) => setInto(e.target.value)}
        style={{ flex: "0 0 auto", width: 128, padding: "5px 8px", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontFamily: "inherit", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none" }}
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      <Button hierarchy="secondary" size="sm" onClick={addPair} disabled={!pad1 || !pad2 || pad1 === pad2 || !groups.length}>Add pair</Button>
    </div>
  );

  return (
    <GroupWorkbench
      title="Pin pair groups"
      subtitle="Each pair of pads in a group is routed to the same spacing."
      memberNoun="pin pair"
      addLabel="New group"
      groups={groups.map((g) => ({ id: g.id, name: g.name, meta: `${g.spacing} mil target` }))}
      members={members}
      groupOf={groupOf}
      removeMeansDelete
      onAssign={(entry, groupId) => {
        for (const g of groups) {
          const list = parsePadPairs(g.pads);
          const has = list.includes(entry);
          if (g.id === groupId && !has) actions.setPadPairField(g.id, { pads: [...list, entry].join("; ") });
          else if (g.id !== groupId && has) actions.setPadPairField(g.id, { pads: list.filter((p) => p !== entry).join("; ") });
        }
      }}
      onAdd={actions.addPadPair}
      onDelete={actions.removePadPair}
      composer={composer}
      emptyHint={pads.length ? "No pairs yet — pick two pads above and add them to a group." : "No pads on the board yet — place pads first."}
    />
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

// Rule types `runDrc` really enforces today (drc.ts phases 1–4). Everything
// else is editable but carries a "not checked yet" badge, so a rule can never
// pretend to matter.
const DRC_ENFORCED_LEAVES = new Set([
  "Safe Spacing",       // phase 1 — clearance matrix
  "Track",              // phase 2 — min/max track width
  "Via Size",           // phase 2 — outer + hole diameter
  "Net Length Range",   // phase 2 — per-net length
  "Differential Pair",  // phase 4 — width + skew
]);

function PcbDrcModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  // Two destinations, not four tabs: the limits themselves, and where they
  // apply. The three assignment tables are one destination with a scope switch,
  // because "which net · which pair · which region" is one question.
  const [dest, setDest] = React.useState<"limits" | "applies">("limits");
  const [scope, setScope] = React.useState<"Nets" | "Net pairs" | "Regions">("Nets");
  const [onlyChecked, setOnlyChecked] = React.useState(false);
  const [query, setQuery] = React.useState("");
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
        {/* Title, the two destinations and the dialog-wide display settings on
            one bar — the unit and the layer scope govern every rule, so they
            belong to the dialog rather than sitting inside one rule's form. */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--spacing-6)", padding: "18px 24px 12px", flex: "0 0 auto" }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)" }}>Board constraints</span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
              {cfg.rules.length} named limit{cfg.rules.length === 1 ? "" : "s"} · {DRC_ENFORCED_LEAVES.size} of {PCB_RULE_TREE.reduce((a, c) => a + c.leaves.length, 0)} kinds checked by the engine today
            </span>
          </span>
          <IconButton hierarchy="ghost" size="sm" aria-label="Close" onClick={actions.closeModal} icon={<Icon html={CLOSE_SVG} />} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", padding: "0 24px 12px", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto", flexWrap: "wrap" }}>
          <div role="tablist" aria-label="Board constraints" style={{ display: "inline-flex", gap: "var(--spacing-6)" }}>
            {([["limits", "Limits"], ["applies", "Where they apply"]] as const).map(([k, label]) => {
              const on = dest === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setDest(k)}
                  style={{ padding: "4px 0 6px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: "var(--font-size-md)", fontWeight: on ? 700 : 500, color: on ? "var(--color-text-brand)" : "var(--color-text-secondary)", borderBottom: `2px solid ${on ? "var(--color-violet-600)" : "transparent"}` }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
            Measured in
            <select value={cfg.unit} onChange={(e) => setCfg((c) => ({ ...c, unit: e.target.value as "mm" | "mil" }))} style={{ ...selectStyle, padding: "3px 6px", fontSize: "var(--font-size-xs)" }} aria-label="Unit">
              <option value="mm">mm</option>
              <option value="mil">mil</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
            Applied
            <select value={cfg.layered ? "Layered" : "All"} onChange={(e) => setCfg((c) => ({ ...c, layered: e.target.value === "Layered" }))} style={{ ...selectStyle, padding: "3px 6px", fontSize: "var(--font-size-xs)" }} aria-label="Layer scope">
              <option value="All">across all layers</option>
              <option value="Layered">per layer</option>
            </select>
          </label>
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 380 }}>
          {dest === "limits" && (
            <>
              {/* The rail lists the limits themselves, split by the only thing
                  that changes whether a limit matters: does the engine check it
                  today. The type is the row's sub-line, so a three-level
                  category→type→rule tree collapses to one honest list. */}
              <div style={{ width: 256, flex: "0 0 auto", borderRight: "var(--border-width-1) solid var(--color-border-subtle)", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ flex: "0 0 auto", padding: "10px 10px 8px", display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search limits"
                    aria-label="Search limits"
                    style={{ width: "100%", boxSizing: "border-box", padding: "5px 9px", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-xs)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none", fontFamily: "inherit" }}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                    <input type="checkbox" checked={onlyChecked} onChange={() => setOnlyChecked((v) => !v)} />
                    Only what the engine checks
                  </label>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px" }}>
                  {([true, false] as const).map((enforced) => {
                    const q = query.trim().toLowerCase();
                    const group = cfg.rules.filter(
                      (r) =>
                        DRC_ENFORCED_LEAVES.has(r.leaf) === enforced &&
                        (!onlyChecked || enforced) &&
                        (!q || r.name.toLowerCase().includes(q) || r.leaf.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)),
                    );
                    if (!group.length) return null;
                    return (
                      <div key={String(enforced)} style={{ marginBottom: 10 }}>
                        <div style={{ padding: "4px 8px", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                          {enforced ? "Checked by the engine" : "Not checked yet"}
                        </div>
                        {group.map((r) => {
                          const on = r.name === cfg.selected;
                          return (
                            <button
                              key={r.name}
                              type="button"
                              aria-pressed={on}
                              onClick={() => setCfg((c) => ({ ...c, selected: r.name }))}
                              className="ix-row"
                              title={enforced ? `${r.leaf} — checked by Run design check` : `${r.leaf} — editable, but the DRC engine doesn't check this kind yet`}
                              style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, padding: "5px 8px", border: "none", borderRadius: "var(--radius-md)", background: on ? "var(--color-bg-brand-subtle)" : "transparent", cursor: "pointer", font: "inherit", textAlign: "left", opacity: enforced ? 1 : 0.72 }}
                            >
                              <span style={{ width: "100%", fontSize: "var(--font-size-sm)", fontWeight: on ? 700 : 500, color: on ? "var(--color-text-brand)" : "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.name}{r.isDefault ? " · default" : ""}
                              </span>
                              <span style={{ width: "100%", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.leaf}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                {/* Adding a limit is one control that names every kind, rather
                    than a + hidden on each of twenty-four tree rows. */}
                <div style={{ flex: "0 0 auto", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", padding: "var(--spacing-4)", display: "flex", flexDirection: "column", gap: 2 }}>
                  <select
                    value=""
                    aria-label="Add a limit"
                    onChange={(e) => {
                      const leaf = e.target.value;
                      e.target.value = "";
                      if (!leaf) return;
                      const cat = PCB_RULE_TREE.find((c) => c.leaves.includes(leaf));
                      if (!cat) return;
                      const stem = defaultRuleName(leaf);
                      let n = 2;
                      while (cfg.rules.some((r) => r.name === `${stem}${n}`)) n++;
                      const fresh = makeRule(cat.category, leaf, `${stem}${n}`, false);
                      setCfg((c) => ({ ...c, rules: [...c.rules, fresh], selected: fresh.name }));
                    }}
                    style={{ ...selectStyle, width: "100%", maxWidth: "none", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}
                  >
                    <option value="">+ Add a limit…</option>
                    {PCB_RULE_TREE.map((cat) => (
                      <optgroup key={cat.category} label={cat.category}>
                        {cat.leaves.map((leaf) => (
                          <option key={leaf} value={leaf}>
                            {leaf}{DRC_ENFORCED_LEAVES.has(leaf) ? "" : " (not checked yet)"}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <span style={{ padding: "var(--spacing-4) var(--spacing-5) var(--spacing-2)", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                    Whole constraint set
                  </span>
                  <select
                    value=""
                    aria-label="Board capability preset"
                    onChange={(e) => { if (e.target.value) applyPreset(e.target.value); e.target.value = ""; }}
                    style={{ ...selectStyle, width: "100%", maxWidth: "none", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}
                  >
                    <option value="">Start from a fab preset…</option>
                    {Object.keys(CAPABILITY_PRESETS).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <RailAction onClick={() => fileRef.current?.click()}>Import a constraint set…</RailAction>
                  <RailAction onClick={exportConfig}>Export this constraint set</RailAction>
                  <RailAction onClick={() => {
                    if (!rule) return;
                    setCfg((c) => ({ ...c, rules: c.rules.map((r) => (r.name === rule.name ? makeRule(r.category, r.leaf, r.name, r.isDefault) : r)) }));
                    actions.flashToast(`“${rule.name}” restored to factory defaults`);
                  }}>Restore “{rule ? rule.name : "this limit"}”</RailAction>
                </div>
              </div>

              {/* Rule pane */}
              <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "14px 18px" }}>
                {rule ? (
                  <>
                    {/* The rule's name is the heading of its own editor, not a
                        "Name:" field in a chrome row — and Default is a state
                        of that heading, Delete an action on it. */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--spacing-5)", marginBottom: "var(--spacing-7)" }}>
                      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                        <input
                          value={rule.name}
                          aria-label="Limit name"
                          onChange={(e) => { const v = e.target.value; setCfg((c) => ({ ...c, selected: v, rules: c.rules.map((r) => (r.name === rule.name ? { ...r, name: v } : r)) })); }}
                          style={{ width: "100%", padding: "2px 0", border: "none", borderBottom: "var(--border-width-1) solid transparent", background: "transparent", fontFamily: "inherit", fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)", outline: "none" }}
                          onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--color-violet-600)")}
                          onBlur={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
                        />
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                          {rule.category} · {rule.leaf}
                          {DRC_ENFORCED_LEAVES.has(rule.leaf) ? "" : " · not checked yet"}
                        </span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.isDefault}
                        onClick={() => setCfg((c) => ({ ...c, rules: c.rules.map((r) => ({ ...r, isDefault: r.name === rule.name ? !r.isDefault : false })) }))}
                        title="The limit anything unassigned falls back to"
                        style={{ flex: "0 0 auto", padding: "3px 10px", borderRadius: "var(--radius-full)", border: `var(--border-width-1) solid ${rule.isDefault ? "var(--color-violet-600)" : "var(--color-border-default)"}`, background: rule.isDefault ? "var(--color-bg-brand-subtle)" : "transparent", color: rule.isDefault ? "var(--color-text-brand)" : "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Board default
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (cfg.rules.filter((r) => r.leaf === rule.leaf).length <= 1) { actions.flashToast(`${rule.leaf} needs at least one limit`); return; }
                          setCfg((c) => { const rest = c.rules.filter((r) => r.name !== rule.name); return { ...c, rules: rest, selected: rest.find((r) => r.leaf === rule.leaf)?.name ?? rest[0].name }; });
                        }}
                        style={{ flex: "0 0 auto", padding: "3px 4px", border: "none", background: "transparent", color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Delete
                      </button>
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
                          <SpacingEditor
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

          {dest === "applies" && (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {/* One destination, one question — which nets, which pairs of
                  nets, which regions. The three used to be three sibling tabs
                  beside the rule editor, which made "define" and "assign" read
                  as the same kind of choice. */}
              <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "12px 18px 10px" }}>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Assign a limit to</span>
                <div role="radiogroup" aria-label="Assignment scope" style={{ display: "inline-flex", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  {(["Nets", "Net pairs", "Regions"] as const).map((s, i) => {
                    const on = scope === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setScope(s)}
                        style={{ padding: "4px 12px", border: "none", borderLeft: i ? "var(--border-width-1) solid var(--color-border-subtle)" : "none", background: on ? "var(--color-bg-brand-subtle)" : "transparent", color: on ? "var(--color-text-brand)" : "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
                {scope === "Nets" && (
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
                {scope === "Net pairs" && (
                  <NetNetRuleTable
                    cfg={cfg}
                    nets={nets}
                    ruleNames={ruleNames}
                    ruleLabel={ruleLabel}
                    ruleTypeOf={ruleTypeOf}
                    onChange={(netNetRules) => setCfg((c) => ({ ...c, netNetRules }))}
                  />
                )}
                {scope === "Regions" && (
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
            </div>
          )}
        </div>

        {/* The footer carries the dialog's own decision and nothing else — the
            set-level actions (preset, import, export, restore) live at the foot
            of the rail, beside the set they act on. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--spacing-4)", padding: "var(--spacing-6) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", flex: "0 0 auto", flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importConfig(f); e.target.value = ""; }} />
          <Button hierarchy="secondary" size="md" onClick={actions.closeModal}>Cancel</Button>
          <Button hierarchy="secondary" size="md" onClick={() => { save(); actions.flashToast("Board constraints saved"); actions.closeModal(); }}>Save</Button>
          <Button hierarchy="primary" size="md" onClick={() => {
            // Save, then really run the check and open the results — the old
            // primary just closed and left you to find the DRC yourself.
            save();
            actions.closeModal();
            actions.runDrcCheck();
          }}>Save &amp; check now</Button>
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
// UIUX-90 — Minimum spacing. The matrix used to be a bare N×N grid of 91
// identical boxes, which is both a cell-for-cell transcription and a poor way
// to read the rule: almost every pair carries the same number, so the grid
// spends its whole area repeating one value and hides the handful that matter.
//
// This says the same thing the way a fab reads it — **one base spacing, then
// the object types that need more room**. Each of those types expands to the
// individual pairs that differ, and the full grid is still one disclosure away
// for anyone who wants to sweep it, now tinted by magnitude so the outliers
// are visible rather than uniform.
function SpacingEditor({
  rows,
  unit,
  onCell,
}: {
  rows: ClearanceRow[];
  unit: string;
  onCell: (row: number, col: number, value: number) => void;
}) {
  const [openType, setOpenType] = React.useState<number | null>(null);
  const [showGrid, setShowGrid] = React.useState(false);

  const cells = React.useMemo(() => {
    const out: { ri: number; ci: number; v: number }[] = [];
    rows.forEach((row, ri) => row.values.forEach((v, ci) => out.push({ ri, ci, v })));
    return out;
  }, [rows]);

  // The base is simply the value most pairs already carry.
  const base = React.useMemo(() => {
    const tally = new Map<number, number>();
    for (const c of cells) tally.set(c.v, (tally.get(c.v) ?? 0) + 1);
    let best = cells[0]?.v ?? 0, bestN = -1;
    for (const [v, n] of tally) if (n > bestN) { best = v; bestN = n; }
    return best;
  }, [cells]);
  const atBase = cells.filter((c) => c.v === base).length;

  // Types that need more room than the base, grouped by the object type whose
  // row they sit on.
  const outliers = React.useMemo(() => {
    const by = new Map<number, { ci: number; v: number }[]>();
    for (const c of cells) {
      if (c.v === base) continue;
      const list = by.get(c.ri) ?? [];
      list.push({ ci: c.ci, v: c.v });
      by.set(c.ri, list);
    }
    return [...by.entries()]
      .map(([ri, list]) => ({ ri, list, distinct: [...new Set(list.map((x) => x.v))] }))
      .sort((a, b) => b.list.length - a.list.length);
  }, [cells, base]);

  const setBase = (next: number) => {
    for (const c of cells) if (c.v === base) onCell(c.ri, c.ci, next);
  };

  const lo = Math.min(...cells.map((c) => c.v));
  const hi = Math.max(...cells.map((c) => c.v));
  const tint = (v: number) => {
    const t = hi > lo ? (v - lo) / (hi - lo) : 0;
    return `color-mix(in oklab, var(--color-violet-600) ${Math.round(4 + t * 20)}%, transparent)`;
  };

  const num = (v: number, onCommit: (mm: number) => void, ariaLabel: string, width = 66) => (
    <input
      value={String(mmToUnit(v, unit))}
      aria-label={ariaLabel}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        if (!isNaN(n) && n >= 0) onCommit(unitToMm(n, unit));
      }}
      style={{ width, height: 26, textAlign: "center", fontSize: "var(--font-size-sm)", fontVariantNumeric: "tabular-nums", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-md)", background: "var(--color-bg-surface)", color: "var(--color-text-primary)", outline: "none", fontFamily: "inherit" }}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-5) var(--spacing-6)", border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)", background: "var(--color-bg-subtle)" }}>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>Base spacing</span>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
            Used by {atBase} of {cells.length} pairs — changing it moves all of them.
          </span>
        </span>
        {num(base, setBase, `Base spacing (${unit})`, 78)}
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", width: 22 }}>{unit}</span>
      </div>

      {outliers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
            Types that keep their own spacing
          </span>
          {outliers.map(({ ri, list, distinct }) => {
            const open = openType === ri;
            return (
              <div key={ri} style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenType(open ? null : ri)}
                  className="ix-row"
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "7px var(--spacing-4)", border: "none", background: "transparent", borderRadius: "var(--radius-md)", cursor: "pointer", font: "inherit", textAlign: "left" }}
                >
                  <span style={{ flex: "0 0 auto", fontSize: 10, color: "var(--color-text-tertiary)", transform: open ? "rotate(90deg)" : "none", transition: "transform .14s" }}>▶</span>
                  <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", fontWeight: 500 }}>{rows[ri].name}</span>
                  <span style={{ flex: "0 0 auto", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {distinct.length === 1 ? `${mmToUnit(distinct[0], unit)} ${unit}` : "mixed"}
                  </span>
                  <span style={{ flex: "0 0 auto", width: 62, textAlign: "right", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                    {list.length} pair{list.length === 1 ? "" : "s"}
                  </span>
                </button>
                {open && (
                  <div style={{ padding: "2px 0 var(--spacing-5) 26px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {list.map(({ ci, v }) => (
                      <div key={ci} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
                        <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                          {rows[ri].name} ↔ {CLEARANCE_COLS[ci] ?? rows[ri].name}
                        </span>
                        {num(v, (mm) => onCell(ri, ci, mm), `${rows[ri].name} to ${CLEARANCE_COLS[ci] ?? rows[ri].name} spacing (${unit})`)}
                        <button
                          type="button"
                          onClick={() => onCell(ri, ci, base)}
                          title="Back to the base spacing"
                          style={{ flex: "0 0 auto", padding: "2px 8px", border: "none", background: "transparent", color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          use base
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div>
        <button
          type="button"
          aria-expanded={showGrid}
          onClick={() => setShowGrid((v) => !v)}
          style={{ padding: 0, border: "none", background: "transparent", color: "var(--color-text-brand)", fontSize: "var(--font-size-sm)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          {showGrid ? "Hide" : "Show"} every pair ({cells.length})
        </button>
        {showGrid && (
          <div style={{ overflowX: "auto", marginTop: "var(--spacing-5)" }}>
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
                          aria-label={`${row.name} to ${CLEARANCE_COLS[ci] ?? row.name} spacing (${unit})`}
                          onChange={(e) => {
                            const n = parseFloat(e.target.value);
                            if (!isNaN(n) && n >= 0) onCell(ri, ci, unitToMm(n, unit));
                          }}
                          style={{ width: 52, height: 24, textAlign: "center", fontSize: 10.5, border: "var(--border-width-1) solid var(--color-border-subtle)", borderRadius: "var(--radius-sm)", background: tint(v), color: "var(--color-text-primary)", outline: "none", fontFamily: "inherit" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
