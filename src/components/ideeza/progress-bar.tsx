// IDEEZA Design System — A22 Progress Bar (Figma 45248:24676). The fill is
// scaled, not resized (CLAUDE.md §7: animate transform, not width).
import { cn } from "@/lib/utils";

export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cn("h-[8px] w-full overflow-hidden rounded-sm bg-bg-subtle", className)}
    >
      <div
        className="h-full w-full origin-left rounded-sm bg-bg-brand transition-transform duration-normal ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${v / 100})` }}
      />
    </div>
  );
}
