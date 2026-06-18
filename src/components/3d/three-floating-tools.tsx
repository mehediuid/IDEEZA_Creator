"use client";

// 3D Module — floating viewport tools (Figma 33552:188795). Left edge of the
// canvas: home / fit-screen / zoom-in / zoom-out / screenshot. Mirrors the
// "always-on" controls that PCB/CAD apps surface near the viewport.

import { C } from "@/lib/pcb/colors";

type IconSpec = { id: string; title: string; path: string; onClick?: () => void };

function Button({ icon }: { icon: IconSpec }) {
  return (
    <button
      className="ix-tool"
      onClick={icon.onClick}
      title={icon.title}
      style={{
        width: 32,
        height: 32,
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        color: C.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--elevation-1)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon.path} />
      </svg>
    </button>
  );
}

export function ThreeFloatingTools({
  onHome,
  onFit,
  onZoomIn,
  onZoomOut,
  onScreenshot,
  leftOffset = 90,
  topOffset = 200,
}: {
  onHome: () => void;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onScreenshot: () => void;
  leftOffset?: number;
  topOffset?: number;
}) {
  const icons: IconSpec[] = [
    { id: "home", title: "Home view", path: "M3 12l9-9 9 9 M5 10v10h14V10", onClick: onHome },
    { id: "fit",  title: "Fit to screen", path: "M3 3h6 M3 3v6 M21 3h-6 M21 3v6 M3 21h6 M3 21v-6 M21 21h-6 M21 21v-6", onClick: onFit },
    { id: "in",   title: "Zoom in", path: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M11 8v6 M8 11h6 M20 20l-3.5-3.5", onClick: onZoomIn },
    { id: "out",  title: "Zoom out", path: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M8 11h6 M20 20l-3.5-3.5", onClick: onZoomOut },
    { id: "shot", title: "Screenshot", path: "M3 7h4l2-2h6l2 2h4v12H3z M12 11a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z", onClick: onScreenshot },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        left: leftOffset,
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-2)",
        zIndex: 17,
      }}
    >
      {icons.map((i) => <Button key={i.id} icon={i} />)}
    </div>
  );
}
