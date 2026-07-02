"use client";

// PreviewViewport — live 3D canvas hosting the PCB + Enclosure merge for
// /preview. Uses a preview-specific Three.js scene (same look & feel as the
// /3d module: orbit controls, drei view-cube, grid floor, environment
// lighting) but renders TWO groups so the user can see how the PCB fits
// inside the 3D enclosure.

import * as React from "react";
import {
  usePreview,
  previewGridStep,
  previewResolutionSegments,
} from "./preview-context";
import { PreviewCanvas } from "./preview-three-canvas";

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
    canvas,
    selectedId,
    showPcb,
    showEnclosure,
    enclosureOpacity,
    resetTick,
    fitTick,
    fitSelectedTick,
    selectShape,
    updateShape,
    deleteSelected,
    setFitVerdict,
    openContextMenu,
  } = usePreview();

  // Delete / Backspace removes the selected enclosure shape (ignored while
  // typing in a field — the panel has text inputs).
  React.useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      deleteSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteSelected]);

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
        enclosureShapes={enclosureShapes}
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
        transformMode={canvas.transformMode}
        snap={canvas.snap}
        gridStep={previewGridStep(canvas.gridSize)}
        segments={previewResolutionSegments(canvas.resolution[0])}
        onTransform={updateShape}
      />
    </div>
  );
}
