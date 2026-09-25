// IDEEZA Design System — A17 Badge (Figma 46127:185982), the two variants the
// 3D panel draws: the blue filled chip (47167:30412) and the brand outline
// (47167:27539).
import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  tone,
  icon,
  children,
  className,
}: {
  tone: "blue" | "brand-outline";
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[4px] whitespace-nowrap rounded-full",
        tone === "blue"
          ? "bg-badge-blue-bg px-[6px] py-[2px] text-xs leading-xs text-badge-blue-text"
          : "border border-solid border-border-brand px-[8px] py-[4px] text-sm leading-xs text-text-brand",
        className,
      )}
    >
      {icon && <span aria-hidden className="inline-flex size-[12px] items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
