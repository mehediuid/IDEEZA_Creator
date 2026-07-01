"use client";

// PreviewViewport — live 3D canvas hosting the PCB + Enclosure merge for
// /preview. Uses a preview-specific Three.js scene (same look & feel as the
// /3d module: orbit controls, drei view-cube, grid floor, environment
// lighting) but renders TWO groups so the user can see how the PCB fits
// inside the 3D enclosure.

import * as React from "react";
import { applyIsolate } from "./preview-context";
import { PreviewCanvas } from "./preview-three-canvas";
import { usePreview } from "./preview-context";

export function PreviewViewport({
  topOffset,
  leftOffset,
  rightOffset,
}: {
  topOffset: number;
  leftOffset: number;
  rightOffset: number;
}) {
  const {
    pcb,
    enclosureShapes,
    selectedId,
    isolate,
    showPcb,
    showEnclosure,
    enclosureOpacity,
    resetTick,
    fitTick,
    fitSelectedTick,
    selectShape,
    setFitVerdict,
    openContextMenu,
  } = usePreview();

  // Apply isolate to the enclosure list (hide non-selected shapes when
  // isolate is on AND something on the enclosure side is selected). PCB
  // group is shown/hidden as a whole via showPcb.
  const filtered = React.useMemo(
    () => applyIsolate(enclosureShapes, selectedId, isolate),
    [enclosureShapes, selectedId, isolate],
  );

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 0,
        left: leftOffset,
        right: rightOffset,
        background:
          "linear-gradient(180deg, #e8edf4 0%, #d6dde7 60%, #b7c2d1 100%)",
        overflow: "hidden",
      }}
    >
      <PreviewCanvas
        pcb={pcb}
        enclosureShapes={filtered}
        selectedId={selectedId}
        onSelect={selectShape}
        onContextMenu={(id, x, y) => openContextMenu({ targetId: id, x, y })}
        showPcb={showPcb}
        showEnclosure={showEnclosure}
        enclosureOpacity={enclosureOpacity}
        resetTick={resetTick}
        fitTick={fitTick}
        fitSelectedTick={fitSelectedTick}
        onFitChange={setFitVerdict}
      />
    </div>
  );
}
