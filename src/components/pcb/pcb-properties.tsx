"use client";

// IDEEZA PCB Software — default right-panel view for PCB mode.
// Renders when the Properties tab is selected and nothing on the canvas
// is selected. Replaces the legacy `buildRight("pcb", …)` HTML with three
// collapsible React sections backed by store state.

import * as React from "react";
import { Select } from "@/components/ideeza";
import { Icon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

const CHEV_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>';

const PAD_X = "var(--spacing-8)";

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: `var(--spacing-5) ${PAD_X}`,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          width: 13,
          height: 13,
          color: "var(--color-violet-600)",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform .15s ease",
        }}
      >
        <Icon html={CHEV_SVG} />
      </span>
      <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>
        {title}
      </span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--spacing-4)",
        padding: `var(--spacing-4) ${PAD_X}`,
      }}
    >
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>{children}</div>
    </div>
  );
}

function TextValue({
  value,
  onChange,
  minWidth = 140,
}: {
  value: string;
  onChange: (v: string) => void;
  minWidth?: number;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        minWidth,
        padding: "var(--spacing-2) var(--spacing-4)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-bg-surface)",
        color: "var(--color-text-primary)",
        fontSize: "var(--font-size-sm)",
        outline: "none",
        fontFamily: "inherit",
      }}
    />
  );
}

function NumberCell({
  value,
  onChange,
  width = 110,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  width?: number;
  suffix?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-1) var(--spacing-3)",
      }}
    >
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{
          width,
          border: "none",
          background: "transparent",
          color: "var(--color-text-primary)",
          fontSize: "var(--font-size-sm)",
          fontFamily: "var(--font-family-mono), monospace",
          outline: "none",
        }}
      />
      {suffix && (
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>{suffix}</span>
      )}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // The zero-opacity <input type="color"> must be anchored to the visible
  // swatch (position: relative wrapper + inset: 0) so the native picker
  // dialog opens from the swatch's screen position. The previous pattern used
  // `position: absolute` with no ancestor, which sent the dialog to the
  // top-left of the document.
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-1) var(--spacing-3)",
        cursor: "pointer",
      }}
      title="Pick a color"
    >
      <span
        style={{
          position: "relative",
          width: 18,
          height: 18,
          borderRadius: "var(--radius-sm)",
          background: value,
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          overflow: "hidden",
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        />
      </span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-primary)", fontFamily: "var(--font-family-mono), monospace" }}>
        {value.toUpperCase()}
      </span>
    </label>
  );
}

// 2D editor right-panel Properties view — board fabrication properties.
// Faithful to the Figma "2D section" Property panel (collapsed default ↔ expanded).
// Values are local UI state (display-faithful selects); no store schema change.
export function TwoDProperties() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [open, setOpen] = React.useState(true);
  const v = state.twoD;
  const sel = (opts: string[]) => opts.map((o) => ({ label: o, value: o }));

  return (
    <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
      <SectionHeader title="Properties" open={open} onToggle={() => setOpen((o) => !o)} />
      {open && (
        <>
          <Row label="Board Material">
            <Select value={v.material} options={sel(["FR-4", "FR-2", "Aluminum", "Rogers", "Flex"])} onChange={(x) => actions.setTwoD({ material: x })} minWidth={140} />
          </Row>
          <Row label="Board Side">
            <Select value={v.side} options={sel(["Top Side", "Bottom Side", "Both Sides"])} onChange={(x) => actions.setTwoD({ side: x })} minWidth={140} />
          </Row>
          <Row label="Silkscreen Technology">
            <Select value={v.silkTech} options={sel(["Standard silkscreen", "UV printing"])} onChange={(x) => actions.setTwoD({ silkTech: x })} minWidth={140} />
          </Row>
          <Row label="Background Color">
            <ColorPicker value={v.bgColor} onChange={(x) => actions.setTwoD({ bgColor: x })} />
          </Row>
          <Row label="Board Color">
            <Select value={v.boardColor} options={sel(["Green", "Blue", "Red", "Black", "White", "Yellow", "Purple"])} onChange={(x) => actions.setTwoD({ boardColor: x })} minWidth={140} />
          </Row>
          <Row label="Pad Plating Color">
            <Select value={v.padColor} options={sel(["Goldsmith", "HASL", "ENIG", "OSP"])} onChange={(x) => actions.setTwoD({ padColor: x })} minWidth={140} />
          </Row>
          <Row label="Silkscreen">
            <Select value={v.silkscreen} options={sel(["Visible", "Hidden"])} onChange={(x) => actions.setTwoD({ silkscreen: x })} minWidth={140} />
          </Row>
        </>
      )}
    </div>
  );
}

// 3D editor right-panel Properties view — board fabrication properties plus the
// 3D-specific Layer Stacking section and Layer thickness table. Faithful to the
// Figma "3D Section" Property panel; all values drive the store (and the canvas).
export function ThreeDProperties() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [open, setOpen] = React.useState({ props: true, stack: true, layer: true });
  const v = state.threeD;
  const sel = (opts: string[]) => opts.map((o) => ({ label: o, value: o }));
  const setLayerThickness = (idx: number, val: string) =>
    actions.setThreeD({ layers: v.layers.map((l, i) => (i === idx ? { ...l, thickness: val } : l)) });

  return (
    <div>
      {/* Properties */}
      <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <SectionHeader title="Properties" open={open.props} onToggle={() => setOpen((s) => ({ ...s, props: !s.props }))} />
        {open.props && (
          <>
            <Row label="Board Material">
              <Select value={v.material} options={sel(["FR-4", "FR-2", "Aluminum", "Rogers", "Flex"])} onChange={(x) => actions.setThreeD({ material: x })} minWidth={140} />
            </Row>
            <Row label="Silkscreen Technology">
              <Select value={v.silkTech} options={sel(["Standard silkscreen", "UV printing"])} onChange={(x) => actions.setThreeD({ silkTech: x })} minWidth={140} />
            </Row>
            <Row label="Background Color">
              <ColorPicker value={v.bgColor} onChange={(x) => actions.setThreeD({ bgColor: x })} />
            </Row>
            <Row label="Board Color">
              <Select value={v.boardColor} options={sel(["Green", "Blue", "Red", "Black", "White", "Yellow", "Purple"])} onChange={(x) => actions.setThreeD({ boardColor: x })} minWidth={140} />
            </Row>
            <Row label="Pad Plating Color">
              <Select value={v.padColor} options={sel(["Goldsmith", "HASL", "ENIG", "OSP"])} onChange={(x) => actions.setThreeD({ padColor: x })} minWidth={140} />
            </Row>
          </>
        )}
      </div>

      {/* Layer Stacking */}
      <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <SectionHeader title="Layer Stacking" open={open.stack} onToggle={() => setOpen((s) => ({ ...s, stack: !s.stack }))} />
        {open.stack && (
          <>
            <Row label="Board Material">
              <TextValue value={v.stackMaterial} onChange={(x) => actions.setThreeD({ stackMaterial: x })} minWidth={110} />
            </Row>
            <Row label="PCB Height from top">
              <TextValue value={v.pcbHeightFromTop} onChange={(x) => actions.setThreeD({ pcbHeightFromTop: x })} minWidth={110} />
            </Row>
            <Row label="Board Thickness">
              <TextValue value={v.boardThickness} onChange={(x) => actions.setThreeD({ boardThickness: x })} minWidth={110} />
            </Row>
          </>
        )}
      </div>

      {/* Layer thickness table */}
      <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <SectionHeader title="Layer" open={open.layer} onToggle={() => setOpen((s) => ({ ...s, layer: !s.layer }))} />
        {open.layer && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: `var(--spacing-2) ${PAD_X}`,
                fontSize: "var(--font-size-xs)",
                fontWeight: 700,
                color: "var(--color-text-tertiary)",
              }}
            >
              <span>Layer</span>
              <span>Thickness(mm)</span>
            </div>
            {v.layers.map((l, i) => (
              <Row key={i} label={l.name}>
                <TextValue value={l.thickness} onChange={(x) => setLayerThickness(i, x)} minWidth={90} />
              </Row>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function PcbDefaultProperties() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [open, setOpen] = React.useState({ doc: true, common: true, silk: true, nets: true });
  const [newNet, setNewNet] = React.useState("");

  const d = state.pcbDefaults;
  const board = state.pcbBoard;

  const topSilkLayer = state.pcbLayers.find((l) => l.id === "topSilk");
  const bottomSilkLayer = state.pcbLayers.find((l) => l.id === "bottomSilk");
  const outlineLayer = state.pcbLayers.find((l) => l.id === "outline");

  return (
    <div>
      {/* Document section — board geometry + unit */}
      <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <SectionHeader
          title="Document"
          open={open.doc}
          onToggle={() => setOpen((s) => ({ ...s, doc: !s.doc }))}
        />
        {open.doc && (
          <>
            <Row label="Unit">
              <Select
                value={state.unit}
                options={["Inch", "Mil", "mm"].map((v) => ({ label: v, value: v }))}
                onChange={(v) => actions.setUnit(v)}
                minWidth={120}
              />
            </Row>
            <Row label="Grid Size">
              <Select
                value={state.gridSize}
                options={["0.001", "0.005", "0.01", "0.05", "0.1", "0.5", "1"].map((v) => ({ label: v, value: v }))}
                onChange={(v) => actions.setGridSize(v)}
                minWidth={120}
              />
            </Row>
            <Row label="Board Width">
              <NumberCell value={board.width} onChange={(v) => actions.setPcbBoard({ width: v })} suffix="mil" />
            </Row>
            <Row label="Board Height">
              <NumberCell value={board.height} onChange={(v) => actions.setPcbBoard({ height: v })} suffix="mil" />
            </Row>
            <Row label="Snap to Grid">
              <input type="checkbox" checked readOnly />
            </Row>
            <Row label="Routing Mode">
              <Select
                value="45° / 90°"
                options={["45° / 90°", "Free angle", "Curved"].map((v) => ({ label: v, value: v }))}
                onChange={() => {}}
                minWidth={140}
              />
            </Row>
          </>
        )}
      </div>

      {/* Common Setting — track width / via size / drill defaults */}
      <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <SectionHeader
          title="Common Setting"
          open={open.common}
          onToggle={() => setOpen((s) => ({ ...s, common: !s.common }))}
        />
        {open.common && (
          <>
            <Row label="Start Track Width">
              <NumberCell
                value={d.trackWidth}
                onChange={(v) => actions.setPcbDefaults({ trackWidth: v })}
                suffix="mil"
              />
            </Row>
            <Row label="Via Size">
              <NumberCell
                value={d.viaSize}
                onChange={(v) => actions.setPcbDefaults({ viaSize: v })}
                suffix="mil"
              />
            </Row>
            <Row label="Via Drill">
              <NumberCell
                value={d.viaDrill}
                onChange={(v) => actions.setPcbDefaults({ viaDrill: v })}
                suffix="mil"
              />
            </Row>
            <Row label="Pad Width">
              <NumberCell
                value={d.padWidth}
                onChange={(v) => actions.setPcbDefaults({ padWidth: v })}
                suffix="mil"
              />
            </Row>
            <Row label="Pad Drill">
              <NumberCell
                value={d.padDrill}
                onChange={(v) => actions.setPcbDefaults({ padDrill: v })}
                suffix="mil"
              />
            </Row>
            <Row label="Pad Shape">
              <Select
                value={d.padShape}
                options={[
                  { label: "Round", value: "round" },
                  { label: "Rectangle", value: "rect" },
                  { label: "Oval", value: "oval" },
                ]}
                onChange={(v) =>
                  actions.setPcbDefaults({ padShape: v as "round" | "rect" | "oval" })
                }
                minWidth={120}
              />
            </Row>
          </>
        )}
      </div>

      {/* Colorful Silkscreen — layer color editors (drives both LayerTab + canvas) */}
      <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <SectionHeader
          title="Colorful Silkscreen"
          open={open.silk}
          onToggle={() => setOpen((s) => ({ ...s, silk: !s.silk }))}
        />
        {open.silk && (
          <>
            {outlineLayer && (
              <Row label="Board Outline">
                <ColorPicker
                  value={outlineLayer.color}
                  onChange={(v) => actions.setPcbLayerColor("outline", v)}
                />
              </Row>
            )}
            {topSilkLayer && (
              <Row label="Top Silkscreen">
                <ColorPicker
                  value={topSilkLayer.color}
                  onChange={(v) => actions.setPcbLayerColor("topSilk", v)}
                />
              </Row>
            )}
            {bottomSilkLayer && (
              <Row label="Bottom Silkscreen">
                <ColorPicker
                  value={bottomSilkLayer.color}
                  onChange={(v) => actions.setPcbLayerColor("bottomSilk", v)}
                />
              </Row>
            )}
            <Row label="Designator Style">
              <TextValue value="Inter / 9 mil" onChange={() => {}} minWidth={150} />
            </Row>
            <Row label="Drill Mark">
              <Select
                value="Hole + Cross"
                options={["Hole only", "Hole + Cross", "Cross only", "None"].map((v) => ({ label: v, value: v }))}
                onChange={() => {}}
                minWidth={150}
              />
            </Row>
          </>
        )}
      </div>

      {/* Nets — color per net; tracks / pads with `net` set pick this color */}
      <div style={{ borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <SectionHeader
          title="Nets"
          open={open.nets}
          onToggle={() => setOpen((s) => ({ ...s, nets: !s.nets }))}
        />
        {open.nets && (
          <>
            {state.pcbNets.map((n) => (
              <Row key={n.name} label={n.name}>
                <ColorPicker
                  value={n.color}
                  onChange={(v) => actions.setPcbNetColor(n.name, v)}
                />
                <button
                  onClick={() => actions.removePcbNet(n.name)}
                  title="Delete net"
                  style={{
                    padding: "var(--spacing-2) var(--spacing-3)",
                    border: "var(--border-width-1) solid var(--color-border-default)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-bg-surface)",
                    color: "var(--color-text-error)",
                    fontSize: "var(--font-size-xs)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  ✕
                </button>
              </Row>
            ))}
            <Row label="Add net">
              <TextValue value={newNet} onChange={setNewNet} minWidth={120} />
              <button
                onClick={() => {
                  if (!newNet.trim()) return;
                  actions.addPcbNet(newNet.trim());
                  setNewNet("");
                }}
                style={{
                  padding: "var(--spacing-2) var(--spacing-4)",
                  border: "var(--border-width-1) solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-bg-brand-subtle)",
                  color: "var(--color-text-brand)",
                  fontSize: "var(--font-size-xs)",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Add
              </button>
            </Row>
          </>
        )}
      </div>
    </div>
  );
}
