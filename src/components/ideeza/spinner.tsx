// IDEEZA Design System — A20 Spinner, ring, brand (Figma 45227:7333).
export function Spinner({ size = 32 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 32 32" className="motion-safe:animate-spin">
      <circle cx="16" cy="16" r="13" fill="none" strokeWidth="3" className="stroke-[var(--color-bg-subtle)]" />
      <path d="M16 3a13 13 0 0 1 13 13" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-[var(--color-bg-brand)]" />
    </svg>
  );
}
