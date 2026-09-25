// IDEEZA Design System — A24 Divider, single line (Figma 46480:112588).
import { cn } from "@/lib/utils";

export function Divider({
  orientation = "horizontal",
  tone = "default",
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
