"use client";

// Assembly's toolbar row: the Assembly | Wiring switch at its left edge —
// where PCB keeps Schematic | PCB (D2, production CAD-305) — then the
// mode's own tools. A tool that can't run right now says why instead of
// doing nothing.

import * as React from "react";
import {
  Add01Icon,
  Copy01Icon,
  Download04Icon,
  FileExportIcon,
  Layers01Icon,
  Magnet01Icon,
  Maximize01Icon,
  Move01Icon,
  Package01Icon,
  PlugIcon,
  Redo02Icon,
  RotateClockwiseIcon,
  RulerIcon,
  ScissorIcon,
  Undo02Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button, Menu, Segmented } from "@/components/ideeza";
import { LIBRARY } from "@/lib/assembly/library";
import { cn } from "@/lib/utils";
import { useAssembly } from "./assembly-store";

export const TOOLBAR_H = 44;

function Tool({
  icon,
  label,
  pressed,
  why,
  onClick,
  ...rest
}: {
  icon: IconValue;
  label: string;
  pressed?: boolean;
  /** Why it can't run now; the tool stays visible and says so. */
  why?: string | null;
  onClick: () => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  const { flash } = useAssembly();
  return (
    <Button
      {...rest}
      hierarchy={pressed ? "tonal" : "ghost"}
      size="sm"
      aria-pressed={pressed === undefined ? undefined : pressed}
      aria-disabled={why ? true : undefined}
      title={why ?? label}
      aria-label={label}
      className={cn("shrink-0 px-3", why && "opacity-50")}
      onClick={() => (why ? flash(why) : onClick())}
      iconLeading={<Icon icon={icon} size={16} />}
    >
      <span className="hidden 2xl:inline">{label}</span>
    </Button>
  );
}

const Sep = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border-default" />;

export function AssemblyToolbar({ onBringIn, onExport }: { onBringIn: () => void; onExport: () => void }) {
  const a = useAssembly();
  const { doc, scene, selection, tool, available } = a;
  const wiring = doc.mode === "wiring";
  const selected = selection.kind === "inst" ? scene.items.find((i) => i.rec.id === selection.id) : undefined;
  const newCount = available.three.length + available.library.length + (available.pcb.ready && !available.pcb.inAssembly ? 1 : 0);
  const notBrought = !doc.brought ? "Bring in your parts first." : null;
  const isLid = selected?.part.enclosure?.role === "lid";
  const placeWhy =
    notBrought ??
    (!selected
      ? "Select a part to place."
      : selected.part.enclosure?.role === "base"
        ? "That's the case. Select a part to put inside it."
        : selected.rec.grounded
          ? `${selected.part.name} is fixed in place.`
          : selected.copyOf
            ? "A pattern copy follows its original."
            : null);
  const moveWhy =
    notBrought ??
    (selected?.rec.grounded
      ? `${selected.part.name} is fixed in place. Unfix it in its properties to move it.`
      : selected?.copyOf
        ? "A pattern copy follows its original. Move the original."
        : null);
  const seedWhy = notBrought ?? (!selected ? "Select a part to copy." : selected.part.enclosure ? "Patterns copy parts, not the case." : selected.copyOf ? "Select the original part." : null);
  const seed = selected && !seedWhy ? selected : null;
  const seedBox = seed ? seed.pose.p : null;

  return (
    <div
      role="toolbar"
      aria-label={wiring ? "Wiring tools" : "Assembly tools"}
      className="absolute inset-x-0 z-[16] flex items-center gap-1 overflow-x-auto border-b border-solid border-border-subtle bg-bg-surface px-4"
      style={{ top: 62, height: TOOLBAR_H }}
    >
      <Segmented
        label="Mode"
        size="sm"
        value={doc.mode}
        onChange={(m) => a.setMode(m)}
        options={[
          { value: "assembly", label: "Assembly" },
          { value: "wiring", label: "Wiring" },
        ]}
        className="mr-3 shrink-0"
      />

      {!wiring ? (
        <>
          <Tool icon={Download04Icon} label={newCount ? `Bring in (${newCount} new)` : "Bring in"} pressed={false} onClick={onBringIn} />
          <Menu
            label="Insert a part"
            items={LIBRARY.map((it) => ({ id: it.kind, label: it.name, hint: `${it.dims} mm`, onSelect: () => a.insertLibrary(it.kind) }))}
            trigger={(props) => (
              <Button {...props} hierarchy="ghost" size="sm" className="shrink-0 px-3" title="Insert a part" aria-label="Insert a part" iconLeading={<Icon icon={Add01Icon} size={16} />}>
                <span className="hidden 2xl:inline">Insert part</span>
              </Button>
            )}
          />
          <Sep />
          <Tool icon={Move01Icon} label="Move" pressed={tool === "move"} why={moveWhy} onClick={() => a.setTool(tool === "move" ? null : "move")} />
          <Tool icon={RotateClockwiseIcon} label="Rotate" pressed={tool === "rotate"} why={moveWhy} onClick={() => a.setTool(tool === "rotate" ? null : "rotate")} />
          <Sep />
          <Tool icon={Magnet01Icon} label="Snap" pressed={tool === "snap"} why={notBrought} onClick={() => a.setTool(tool === "snap" ? null : "snap")} />
          <Tool
            icon={Package01Icon}
            label={isLid ? "Close the lid" : "Place inside"}
            why={placeWhy}
            onClick={() => selected && (isLid ? a.closeLid(selected.rec.id) : a.placeInside(selected.rec.id))}
          />
          <Tool icon={Layers01Icon} label="Place all" why={notBrought} onClick={a.placeAll} />
          <Sep />
          <Tool icon={RulerIcon} label="Measure" pressed={tool === "measure"} why={notBrought} onClick={() => a.setTool(tool === "measure" ? null : "measure")} />
          <Tool icon={ScissorIcon} label="Section" pressed={a.section.on} why={notBrought} onClick={() => a.setSection({ on: !a.section.on })} />
          <Menu
            label="Pattern"
            items={[
              {
                id: "linear",
                label: "Linear pattern",
                hint: seedWhy ?? "Copies in a row",
                disabled: !!seedWhy,
                onSelect: () => seed && a.addPattern({ kind: "linear", seed: seed.rec.id, count: 3, spacing: 10, axis: [1, 0, 0] }),
              },
              {
                id: "circular",
                label: "Circular pattern",
                hint: seedWhy ?? "Copies around an axis",
                disabled: !!seedWhy,
                onSelect: () => seed && seedBox && a.addPattern({ kind: "circular", seed: seed.rec.id, count: 4, angle: 360, axis: [0, 1, 0], center: [seedBox[0] - 15, seedBox[1], seedBox[2]] }),
              },
              {
                id: "mirror",
                label: "Mirror",
                hint: seedWhy ?? "A copy across a plane",
                disabled: !!seedWhy,
                onSelect: () => seed && seedBox && a.addPattern({ kind: "mirror", seed: seed.rec.id, normal: [1, 0, 0], point: [0, 0, 0] }),
              },
            ]}
            trigger={(props) => (
              <Button {...props} hierarchy="ghost" size="sm" className="shrink-0 px-3" title="Pattern" aria-label="Pattern" iconLeading={<Icon icon={Copy01Icon} size={16} />}>
                <span className="hidden 2xl:inline">Pattern</span>
              </Button>
            )}
          />
        </>
      ) : (
        <>
          <Tool icon={PlugIcon} label="Add wire" pressed={tool === "wire"} why={notBrought} onClick={() => a.setTool(tool === "wire" ? null : "wire")} />
          <Tool icon={ScissorIcon} label="Section" pressed={a.section.on} why={notBrought} onClick={() => a.setSection({ on: !a.section.on })} />
        </>
      )}

      <span className="flex-1" />
      <Tool icon={Maximize01Icon} label="Fit view" onClick={a.fitView} />
      <Tool icon={Undo02Icon} label="Undo" why={a.canUndo ? null : "Nothing to undo."} onClick={a.undo} />
      <Tool icon={Redo02Icon} label="Redo" why={a.canRedo ? null : "Nothing to redo."} onClick={a.redo} />
      <Tool icon={FileExportIcon} label="Export 3D (GLB)" why={notBrought} onClick={onExport} />
    </div>
  );
}
