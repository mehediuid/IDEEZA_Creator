// The IDZ coin, the Figma's own artwork ("ID coin final transparent-02",
// User Panel V2 41571:126303), cropped to the coin. Decorative: the amount
// beside it always names the coin.

import { cn } from "@/lib/utils";

const RATIO = 114 / 128;

export function IdzCoin({ height, className }: { height: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a 10 kB static mark, no loader needed
    <img
      src="/images/idz-coin.png"
      alt=""
      aria-hidden
      width={Math.round(height * RATIO)}
      height={height}
      className={cn("shrink-0 select-none", className)}
    />
  );
}
