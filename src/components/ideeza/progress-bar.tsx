// IDEEZA Design System — A22 Progress Bar (Figma 731:704). The fill slides in
// from the left, not resized (AGENTS.md UI/UX rules: animate transform, not
// width) and not scaled, so its end keeps radius/sm at every value as in Figma.
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
        className="h-full w-full rounded-sm bg-bg-brand transition-transform duration-normal ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${v - 100}%)` }}
      />
    </div>
  );
}
