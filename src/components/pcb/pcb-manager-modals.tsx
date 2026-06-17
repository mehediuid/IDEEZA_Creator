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
import type { DrcRule, ModalId } from "@/lib/pcb/types";

const PRIMARY = "var(--color-violet-600)";
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
  return (
    <span
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
        value={color}
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
function NetClassManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  return (
    <Overlay>
      <Card width={920}>
        <Header title="Net Class Manager" onClose={actions.closeModal} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Class Name</th>
                <th style={thStyle}>Track Width (mil)</th>
                <th style={thStyle}>Clearance (mil)</th>
                <th style={thStyle}>Via Size</th>
                <th style={thStyle}>Via Drill</th>
                <th style={thStyle}>Color</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {state.pcbNetClasses.map((c) => (
                <tr key={c.id}>
                  <td style={tdStyle}>
                    <CompactInput value={c.name} width={140} onChange={(v) => actions.setNetClassField(c.id, { name: v })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput type="number" value={c.trackWidth} width={80} onChange={(v) => actions.setNetClassField(c.id, { trackWidth: parseFloat(v) || 0 })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput type="number" value={c.clearance} width={80} onChange={(v) => actions.setNetClassField(c.id, { clearance: parseFloat(v) || 0 })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput type="number" value={c.viaSize} width={80} onChange={(v) => actions.setNetClassField(c.id, { viaSize: parseFloat(v) || 0 })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput type="number" value={c.viaDrill} width={80} onChange={(v) => actions.setNetClassField(c.id, { viaDrill: parseFloat(v) || 0 })} />
                  </td>
                  <td style={tdStyle}>
                    <ColorSwatch color={c.color} onChange={(hex) => actions.setNetClassField(c.id, { color: hex })} />
                  </td>
                  <td style={tdStyle}>
                    <RowBtn onClick={() => actions.removeNetClass(c.id)} icon={MINUS_SVG} title="Remove" />
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
            <Button hierarchy="secondary" size="md" onClick={actions.addNetClass}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-2)" }}>
                <Icon html={PLUS_SVG} size={12} /> Add Class
              </span>
            </Button>
          }
        />
      </Card>
    </Overlay>
  );
}

// ── Differential Pair Manager ────────────────────────────────────────────────
function DiffPairManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  return (
    <Overlay>
      <Card width={820}>
        <Header title="Differential Pair Manager" onClose={actions.closeModal} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Pair Name</th>
                <th style={thStyle}>Net P</th>
                <th style={thStyle}>Net N</th>
                <th style={thStyle}>Gap (mil)</th>
                <th style={thStyle}>Width (mil)</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {state.pcbDiffPairs.map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}>
                    <CompactInput value={p.name} width={140} onChange={(v) => actions.setDiffPairField(p.id, { name: v })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput value={p.netA} width={140} onChange={(v) => actions.setDiffPairField(p.id, { netA: v })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput value={p.netB} width={140} onChange={(v) => actions.setDiffPairField(p.id, { netB: v })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput type="number" value={p.gap} width={80} onChange={(v) => actions.setDiffPairField(p.id, { gap: parseFloat(v) || 0 })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput type="number" value={p.width} width={80} onChange={(v) => actions.setDiffPairField(p.id, { width: parseFloat(v) || 0 })} />
                  </td>
                  <td style={tdStyle}>
                    <RowBtn onClick={() => actions.removeDiffPair(p.id)} icon={MINUS_SVG} title="Remove" />
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
            <Button hierarchy="secondary" size="md" onClick={actions.addDiffPair}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-2)" }}>
                <Icon html={PLUS_SVG} size={12} /> Add Pair
              </span>
            </Button>
          }
        />
      </Card>
    </Overlay>
  );
}

// ── Equal Length Group Manager ───────────────────────────────────────────────
function EqualLengthManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  return (
    <Overlay>
      <Card width={920}>
        <Header title="Equal Length Group Manager" onClose={actions.closeModal} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Group Name</th>
                <th style={thStyle}>Nets (comma-separated)</th>
                <th style={thStyle}>Target (mil)</th>
                <th style={thStyle}>Tolerance (mil)</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {state.pcbEqualLength.map((g) => (
                <tr key={g.id}>
                  <td style={tdStyle}>
                    <CompactInput value={g.name} width={140} onChange={(v) => actions.setEqualLengthField(g.id, { name: v })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput
                      value={g.nets.join(", ")}
                      width={300}
                      onChange={(v) => actions.setEqualLengthField(g.id, { nets: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                    />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput type="number" value={g.target} width={90} onChange={(v) => actions.setEqualLengthField(g.id, { target: parseFloat(v) || 0 })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput type="number" value={g.tolerance} width={90} onChange={(v) => actions.setEqualLengthField(g.id, { tolerance: parseFloat(v) || 0 })} />
                  </td>
                  <td style={tdStyle}>
                    <RowBtn onClick={() => actions.removeEqualLengthGroup(g.id)} icon={MINUS_SVG} title="Remove" />
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
            <Button hierarchy="secondary" size="md" onClick={actions.addEqualLengthGroup}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-2)" }}>
                <Icon html={PLUS_SVG} size={12} /> Add Group
              </span>
            </Button>
          }
        />
      </Card>
    </Overlay>
  );
}

// ── Pad Pair Group Manager ───────────────────────────────────────────────────
function PadPairManagerModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  return (
    <Overlay>
      <Card width={780}>
        <Header title="Pad Pair Group Manager" onClose={actions.closeModal} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Group Name</th>
                <th style={thStyle}>Pads (e.g. U1:1 - C1:1)</th>
                <th style={thStyle}>Spacing (mil)</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {state.pcbPadPairs.map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}>
                    <CompactInput value={p.name} width={160} onChange={(v) => actions.setPadPairField(p.id, { name: v })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput value={p.pads} width={280} onChange={(v) => actions.setPadPairField(p.id, { pads: v })} />
                  </td>
                  <td style={tdStyle}>
                    <CompactInput type="number" value={p.spacing} width={90} onChange={(v) => actions.setPadPairField(p.id, { spacing: parseFloat(v) || 0 })} />
                  </td>
                  <td style={tdStyle}>
                    <RowBtn onClick={() => actions.removePadPair(p.id)} icon={MINUS_SVG} title="Remove" />
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
            <Button hierarchy="secondary" size="md" onClick={actions.addPadPair}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-2)" }}>
                <Icon html={PLUS_SVG} size={12} /> Add Pair
              </span>
            </Button>
          }
        />
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
function PcbDrcModal() {
  const state = usePcbState();
  const actions = usePcbActions();
  const sevOpts: Array<DrcRule["severity"]> = ["Error", "Warning", "Off"];
  return (
    <Overlay>
      <Card width={820}>
        <Header title="PCB Design Rule Check (IPC / DAC-2552)" onClose={actions.closeModal} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Rule</th>
                <th style={thStyle}>Scope</th>
                <th style={thStyle}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {state.pcbDrcRules.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.name}</td>
                  <td style={{ ...tdStyle, color: "var(--color-text-secondary)" }}>{r.scope}</td>
                  <td style={tdStyle}>
                    <DsSelect
                      value={r.severity}
                      options={sevOpts.map((s) => ({ label: s, value: s }))}
                      minWidth={120}
                      onChange={(v) => actions.setDrcRuleSeverity(r.id, v as DrcRule["severity"])}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Footer
          onCancel={actions.closeModal}
          onConfirm={() => {
            actions.clickBottomTab("drc");
            actions.closeModal();
          }}
          confirmLabel="Run Check"
          extraLeft={
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", color: PRIMARY, fontSize: "var(--font-size-sm)", fontWeight: 600 }}>
              {state.pcbDrcRules.length} rules
            </div>
          }
        />
      </Card>
    </Overlay>
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
