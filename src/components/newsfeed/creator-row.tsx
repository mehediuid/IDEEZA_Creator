"use client";

// The creator under an Innovations post's title (Messages spec §6): their
// avatar and name, and Message, which opens a conversation about the post as
// whoever this tab acts as (no `as` in the address). When that person may not
// start one — either blocked the other, or the creator takes messages only
// from people they work with — Message reads disabled with the reason under it.

import * as React from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ideeza";
import type { Creator } from "@/lib/feed";
import { useStoredActingAs } from "@/lib/messages/identity";
import { startHref } from "@/lib/messages/links";
import { feedPersonId } from "@/lib/messages/people";
import { canStart, startRefusalOf } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { cn } from "@/lib/utils";

/** 44 px at phone width and on a coarse pointer. */
const PHONE_TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function CreatorRow({
  creator,
  slug,
}: {
  creator: Pick<Creator, "id" | "name" | "initials" | "color">;
  slug: string;
}) {
  const { data, hydrated } = useMessages();
  const from = useStoredActingAs();
  const reasonId = React.useId();
  const to = feedPersonId(creator.id);
  const check = canStart(data, from, to, { kind: "post" });
  const refusal = hydrated && !check.ok ? startRefusalOf(check.reason, creator.name) : null;
  const control = cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "shrink-0", PHONE_TAP);

  return (
    <div className="mt-[12px] flex flex-col gap-[8px]">
      <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[8px]">
        <span
          aria-hidden
          className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-full text-md font-bold leading-md text-text-on-brand"
          // The creator's avatar colour is data (a DS colour token), as on the feed card.
          style={{ background: creator.color }}
        >
          {creator.initials}
        </span>
        <span className="min-w-0 flex-1 break-words text-md font-medium leading-md text-text-primary">
          {creator.name}
        </span>
        {refusal ? (
          <span
            role="link"
            aria-disabled="true"
            aria-describedby={reasonId}
            className={cn(
              control,
              "cursor-not-allowed text-[color:var(--color-button-disabled-text)] hover:bg-[var(--color-button-secondary-bg)]",
            )}
          >
            Message
          </span>
        ) : (
          <Link
            href={startHref({ kind: "post", to, slug })}
            aria-label={`Message ${creator.name}`}
            // The reset colours every a:hover as a link; the button keeps its own text colour.
            className={cn(control, "hover:text-[color:var(--color-button-secondary-text)]")}
          >
            Message
          </Link>
        )}
      </div>
      {refusal && (
        <p id={reasonId} className="m-0 max-w-[62ch] text-md leading-md text-text-secondary">
          {refusal}
        </p>
      )}
    </div>
  );
}
