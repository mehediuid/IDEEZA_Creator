"use client";

// The conversation's header (spec §6): ‹ Messages below 1024 px, the person
// (or "{Project} team" and how many people), the role tag, and ⋯ with Mute ·
// Archive · Block (direct only) · Report….

import Link from "next/link";
import { ArrowLeft01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { MESSAGES_HREF } from "@/lib/messages/links";
import { PersonName } from "@/components/profile/person-name";
import { Avatar } from "./avatar";
import { MenuButton, type MenuItem } from "./menu";

export function ConversationHeader({
  title,
  sub,
  initials,
  team,
  items,
  personId,
}: {
  title: string;
  /** The role tag, or "3 people" for a team. */
  sub: string | null;
  initials: string;
  team: boolean;
  /** ⋯'s items; none (a draft) leaves ⋯ out. */
  items: MenuItem[];
  /** The other person of a direct conversation: their name opens their profile. */
  personId?: string | null;
}) {
  return (
    <header className="flex min-h-[64px] shrink-0 items-center gap-4 border-b border-solid border-border bg-bg-surface px-4 py-2 md:px-8">
      <h1 className="sr-only lg:hidden">Messages</h1>
      <Link
        href={MESSAGES_HREF}
        className="-ml-2 inline-flex min-h-[var(--touch-min)] shrink-0 items-center gap-1 rounded-lg px-2 text-md font-medium leading-md text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus lg:hidden"
      >
        <Icon icon={ArrowLeft01Icon} size={18} />
        Messages
      </Link>
      <Avatar initials={initials} team={team} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold leading-lg text-text-primary">
          {personId ? <PersonName id={personId}>{title}</PersonName> : title}
        </h2>
        {sub && <p className="truncate text-md leading-md text-text-secondary">{sub}</p>}
      </div>
      {items.length > 0 && (
        <MenuButton label="Conversation actions" items={items} trigger={<Icon icon={MoreHorizontalIcon} size={20} />} />
      )}
    </header>
  );
}
