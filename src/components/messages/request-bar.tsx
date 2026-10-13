"use client";

// A conversation in my Requests (spec §5, §6): Accept moves it to the Inbox,
// Delete hides it from me (the sender isn't told) and goes back to the list,
// Block blocks the sender. Replying accepts too, through the send rule.

import { useRouter } from "next/navigation";
import { Button } from "@/components/ideeza";
import { blockPerson, setMember, type ActionResult } from "@/lib/messages/actions";
import { MESSAGES_HREF } from "@/lib/messages/links";
import type { PersonId } from "@/lib/messages/types";

const TAP = "max-md:min-h-[var(--touch-min)]";

export function RequestBar({
  conversationId,
  me,
  other,
  subjectName,
  blocked,
  onResult,
}: {
  conversationId: string;
  me: PersonId;
  other: { id: PersonId; name: string };
  subjectName: string;
  /** Already blocked by me: Block is done, so it isn't offered again. */
  blocked: boolean;
  onResult: (r: ActionResult) => void;
}) {
  const router = useRouter();
  return (
    <section
      aria-label="Message request"
      className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-solid border-border bg-bg-subtle px-4 py-4 md:px-8"
    >
      <p className="min-w-[200px] flex-1 text-md leading-md text-text-primary">
        {other.name} wants to message you about {subjectName}.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          hierarchy="primary"
          size="lg"
          className={TAP}
          onClick={() => onResult(setMember(conversationId, me, { folder: "inbox" }))}
        >
          Accept
        </Button>
        <Button
          type="button"
          hierarchy="secondary"
          size="lg"
          className={TAP}
          onClick={() => {
            const r = setMember(conversationId, me, { declined: true });
            onResult(r);
            if (r.ok) router.push(MESSAGES_HREF);
          }}
        >
          Delete
        </Button>
        {!blocked && (
          <Button
            type="button"
            hierarchy="secondary"
            size="lg"
            className={TAP}
            onClick={() => onResult(blockPerson(me, other.id))}
          >
            Block
          </Button>
        )}
      </div>
    </section>
  );
}
