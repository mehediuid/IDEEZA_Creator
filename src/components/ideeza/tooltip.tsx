// IDEEZA Design System — A19 Tooltip, top-arrow variant (Figma 46042:61319).
// The bubble alone; the caller positions it. Its raw drop shadow has no
// design-system effect style, so it is left out (reported).
import { cn } from "@/lib/utils";

export function Tooltip({
  label,
  className,
  wrap = false,
  id,
}: {
  label: string;
  className?: string;
  /** A sentence or two: wraps at 280 px instead of staying on one line. */
  wrap?: boolean;
  id?: string;
}) {
  return (
    <span id={id} role="tooltip" className={cn("pointer-events-none inline-flex flex-col items-center", className)}>
      <span className={cn("rounded-lg bg-bg-inverse px-[12px] py-[8px] text-sm font-medium leading-sm text-text-inverse", wrap ? "w-max max-w-[280px] whitespace-normal" : "whitespace-nowrap")}>
        {label}
      </span>
      <svg aria-hidden width="10" height="6" viewBox="0 0 10 6" className="fill-[var(--color-bg-inverse)]">
        <path d="M0 0h10L5 6z" />
      </svg>
    </span>
  );
}
