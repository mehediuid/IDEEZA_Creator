// IDEEZA Design System — A20 Spinner, Style=Ring, Color=Brand (Figma 537:743).
// Only the Figma sizes: SM 16 / MD 20 / LG 24 / XL 32, strokes 2 / 2 / 2.5 / 3.
// The track is a full circle in color/border/subtle and the head a 180° arc
// in color/icon/brand (Figma 0.87 → 4.01 rad), both stroked inside the box.
export const SPINNER_SIZES = [16, 20, 24, 32] as const;
export type SpinnerSize = (typeof SPINNER_SIZES)[number];

const STROKE: Record<SpinnerSize, number> = { 16: 2, 20: 2, 24: 2.5, 32: 3 };
const HEAD_START_DEG = (0.87 * 180) / Math.PI;

export function Spinner({ size = 32 }: { size?: SpinnerSize }) {
  const stroke = STROKE[size];
  const c = size / 2;
  const r = (size - stroke) / 2;
  const half = Math.PI * r;
  return (
    <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="motion-safe:animate-spin">
      <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} className="stroke-[var(--color-border-subtle)]" />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${half} ${2 * half}`}
        transform={`rotate(${HEAD_START_DEG} ${c} ${c})`}
        className="stroke-[var(--color-icon-brand)]"
      />
    </svg>
  );
}
