"use client";

// Figma "Mobile / Home indicator" (10518:11429): a 21 px strip with a 134 × 5
// bar 8 from its top, border/default, radius/full. Tone=On media is the white
// one over a clip. Drawn only in the desktop's phone frame; on a phone the OS
// draws it, so the strip becomes the bottom safe-area inset.

import { cn } from "@/lib/utils";
import { useFramed } from "./device";

export function HomeIndicator({ tone = "default", className }: { tone?: "default" | "media"; className?: string }) {
  const framed = useFramed();
  if (!framed) return <div aria-hidden className={cn("h-[env(safe-area-inset-bottom)] shrink-0", className)} />;
  return (
    <div aria-hidden className={cn("flex h-[21px] shrink-0 justify-center pt-4", className)}>
      <span
        className={cn(
          "h-[5px] w-[134px] rounded-full",
          tone === "media" ? "bg-[var(--color-white)]" : "bg-[var(--color-border-default)]",
        )}
      />
    </div>
  );
}
