// Shared icon wrapper for the dashboard. Adopts the IDEEZA DS icon set
// (Hugeicons) so the dashboard chrome matches the editor (PCB, Code, 3D,
// Preview, Brief) — the editor already uses Hugeicons across its top bar
// and left rail.
//
// Inherits the parent's text color via `currentColor` so the icon flows
// with whichever text-* class the row carries. Default size is 16px (nav
// list density); pass `size={20}` for primary action buttons.

import * as React from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

export type IconValue = IconSvgElement;

export function Icon({
  icon,
  size = 16,
  strokeWidth = 1.5,
  className,
  "aria-hidden": ariaHidden = true,
  "aria-label": ariaLabel,
}: {
  icon: IconValue;
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
    />
  );
}
