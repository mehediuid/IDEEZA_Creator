"use client";

// What the buyer owns of a project, at the foot of every marketplace page's Marketplace block, and the way to it
// (plan 6rPKBgwzQ6r6woYmjfE6Td, D6): My projects › Purchased › the project — their copies, licence, files and
// receipts — or, for a project bought whole, the project itself. Owner, 2026-11-24: a bare "See what you own" under
// a tab didn't say what was owned, and read as if it were that tab's copy; the line now names it ("You own
// 2 Virtual NFTs of this project · See them"). Nothing shows until the purchases are read, or when nothing is held
// (every copy sold on).

import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ownedWhatOf, purchaseHrefOf } from "@/lib/market/purchases";
import { cn } from "@/lib/utils";
import { usePurchased } from "./use-purchased";

export function SeeWhatYouOwn({
  projectId,
  projectName,
  className,
}: {
  projectId: string;
  /** Named on a product page, where "this project" would read as the product; else "this project". */
  projectName?: string;
  className?: string;
}) {
  const { ready, purchases } = usePurchased();
  const p = ready ? purchases.find((x) => x.id === projectId) : undefined;
  const what = p ? ownedWhatOf(p) : null;
  if (!p || !what) return null;
  return (
    <p className={cn("m-0 text-md leading-md text-text-primary", className)}>
      <span className="font-medium">
        You own {what} of {projectName ?? "this project"}
      </span>
      <span aria-hidden className="text-text-tertiary">
        {" · "}
      </span>
      {/* A whole project bought is the buyer's project: it opens as one. */}
      <Link
        href={purchaseHrefOf(p)}
        className="inline-flex min-h-[24px] items-center gap-2 rounded-sm align-baseline font-semibold text-text-brand outline-none hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
      >
        {p.count === 1 ? "See it" : "See them"}
        <Icon icon={ArrowRight01Icon} size={16} />
      </Link>
    </p>
  );
}
