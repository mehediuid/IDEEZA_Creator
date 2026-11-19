"use client";

// "See what you own" — the way from a marketplace page to My projects › Purchased for a buyer who holds anything
// of the project (plan 6rPKBgwzQ6r6woYmjfE6Td, D6): their copies, licence, files and receipts.

import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

export function SeeWhatYouOwn({ projectId, className }: { projectId: string; className?: string }) {
  return (
    <Link
      href={`/projects/purchased/${encodeURIComponent(projectId)}`}
      className={cn(
        "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-md font-semibold text-text-brand outline-none hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]",
        className,
      )}
    >
      See what you own
      <Icon icon={ArrowRight01Icon} size={16} />
    </Link>
  );
}
