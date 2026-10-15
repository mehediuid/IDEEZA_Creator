// What the conversation pane says when there is no conversation to show:
// "Choose a conversation" beside the list, a conversation this person can't
// see, an entry point that can't start one, and the moment before the stores
// are read.

import Link from "next/link";
import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { MESSAGES_HREF } from "@/lib/messages/links";

export function PaneState({ title, body, back = false }: { title: string; body?: string; back?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 py-12 text-center">
      <h1 className="sr-only [@container(min-width:768px)]:hidden">Messages</h1>
      <span aria-hidden className="inline-flex size-[48px] items-center justify-center rounded-full bg-bg-subtle text-text-tertiary">
        <Icon icon={BubbleChatIcon} size={22} />
      </span>
      <h2 className="text-lg font-semibold leading-lg text-text-primary">{title}</h2>
      {body && <p className="max-w-[44ch] text-md leading-md text-text-secondary">{body}</p>}
      {back && (
        <Link
          href={MESSAGES_HREF}
          className="mt-2 inline-flex min-h-[var(--touch-min)] items-center rounded-lg px-4 text-md font-semibold leading-md text-text-brand outline-none transition-colors duration-fast hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Back to Messages
        </Link>
      )}
    </div>
  );
}

/** Before the messages, people and projects are read: the pane's shape, nothing to misread. */
export function PaneLoading() {
  return <div aria-busy="true" aria-label="Loading" className="min-h-0 flex-1" />;
}
