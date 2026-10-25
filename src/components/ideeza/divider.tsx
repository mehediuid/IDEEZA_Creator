// IDEEZA Design System — A24 Divider, single line (Figma 512:557). Figma draws
// every line in color/border/subtle, so that is the default; "default"
// (border/default) is a code-only tone.
import { cn } from "@/lib/utils";

export function Divider({
  orientation = "horizontal",
  tone = "subtle",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  tone?: "default" | "subtle";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "block shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
        tone === "default" ? "bg-border" : "bg-border-subtle",
        className,
      )}
    />
  );
}
