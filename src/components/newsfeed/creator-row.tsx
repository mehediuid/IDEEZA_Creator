"use client";

// Message beside Follow in an Innovations post's maker block (Messages spec §6):
// it opens a conversation about the post as whoever this tab acts as (no `as`
// in the address). When that person may not start one — either blocked the
// other, or the creator takes messages only from people they work with —
// Message reads disabled and `refusal` is the reason, which the block shows
// under its buttons.

import Link from "next/link";
import { buttonVariants } from "@/components/ideeza";
import type { Creator } from "@/lib/feed";
import { useStoredActingAs } from "@/lib/messages/identity";
import { startHref } from "@/lib/messages/links";
import { feedPersonId } from "@/lib/messages/people";
import { canStart, startRefusalOf } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { cn } from "@/lib/utils";

/** Why this tab can't message the creator about the post, or null when it can. */
export function useMessageRefusal(creator: Pick<Creator, "id" | "name">): string | null {
  const { data, hydrated } = useMessages();
  const from = useStoredActingAs();
  const check = canStart(data, from, feedPersonId(creator.id), { kind: "post" });
  return hydrated && !check.ok ? startRefusalOf(check.reason, creator.name) : null;
}

export function MessageCreator({
  creator,
  slug,
  refusal,
  reasonId,
  className,
}: {
  creator: Pick<Creator, "id" | "name">;
  slug: string;
  refusal: string | null;
  reasonId: string;
  className?: string;
}) {
  const control = cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "shrink-0", className);
  if (refusal) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-describedby={reasonId}
        className={cn(control, "cursor-not-allowed text-[color:var(--color-button-disabled-text)] hover:bg-[var(--color-button-secondary-bg)]")}
      >
        Message
      </span>
    );
  }
  return (
    <Link
      href={startHref({ kind: "post", to: feedPersonId(creator.id), slug })}
      aria-label={`Message ${creator.name}`}
      // The reset colours every a:hover as a link; the button keeps its own text colour.
      className={cn(control, "hover:text-[color:var(--color-button-secondary-text)]")}
    >
      Message
    </Link>
  );
}
