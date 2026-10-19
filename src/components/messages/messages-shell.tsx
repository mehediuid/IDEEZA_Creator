"use client";

// The Messages layout (spec §6), a workspace on the page frame (D7): the
// title, then the list (320 px) beside the open conversation — two surfaces
// that fill the frame and scroll on their own. They sit side by side from a
// 768 px page container (the list, the gutter and a conversation as wide as a
// rail); below it one shows at a time — the list on /messages, the
// conversation anywhere under it, where the title steps aside for its
// ‹ Messages. Under the title: the line that says this tab acts as someone
// else, and the one error a store that can't be read leaves. The gear opens
// Settings › Profile & Share at "Who can message you", the rule's one home
// (settings spec D13); the blocked list lives in Settings › Blocking.
//
// The old support requests become conversations here, once the market and the
// projects have been read.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, PAGE_CONTAINER, PageHeader, iconButtonVariants } from "@/components/ideeza";
import { useManualProjects } from "@/lib/manual/projects";
import { useMarket } from "@/lib/market/market-store";
import { migrateSupportOnce } from "@/lib/messages/actions";
import { useActingAs } from "@/lib/messages/identity";
import { MESSAGE_SETTINGS_HREF, MESSAGES_HREF } from "@/lib/messages/links";
import { countsFor } from "@/lib/messages/rules";
import { cn } from "@/lib/utils";
import { ActingBanner } from "./acting-as";
import { ConversationList } from "./conversation-list";
import { MessagesViewProvider, useMessagesView } from "./messages-context";

/** A pane's surface: the list and the conversation are two of them, side by side on the page. */
const PANE = "min-h-0 flex-col overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface";

function useSupportMigration() {
  const { ready, people } = useMessagesView();
  const { projects, hydrated: projectsRead } = useManualProjects();
  const { data: market, hydrated: marketRead } = useMarket();
  React.useEffect(() => {
    if (!ready || !projectsRead || !marketRead) return;
    migrateSupportOnce(market.support, {
      buyerName: people.nameOf,
      projectName: (id) => projects.find((p) => p.id === id)?.name.trim() || "Untitled project",
    });
  }, [ready, projectsRead, marketRead, market.support, people.nameOf, projects]);
}

/** "(2) Messages · IDEEZA" while conversations are unread. Set here, after the page it came
 *  from has put its own title back on the way out. */
function useMessagesTitle() {
  const { ready, data, me, people } = useMessagesView();
  const unread = ready ? countsFor(data, me, people.teamIdsOf).unread : 0;
  React.useEffect(() => {
    document.title = unread ? `(${unread}) Messages · IDEEZA` : "Messages · IDEEZA";
  }, [unread]);
}

function Panes({ children }: { children: React.ReactNode }) {
  const { unreadable } = useMessagesView();
  const pathname = usePathname();
  const open = pathname !== MESSAGES_HREF;
  useSupportMigration();
  useMessagesTitle();
  return (
    <div className={cn(PAGE_CONTAINER, "h-full")}>
      <div className="flex h-full min-h-0 flex-col p-[var(--layout-page-inset)]">
        <PageHeader
          title="Messages"
          description="Demo · messages stay in this browser."
          descriptionClassName="text-md leading-md text-text-tertiary"
          actions={
            <Link
              href={MESSAGE_SETTINGS_HREF}
              aria-label="Message settings"
              title="Message settings"
              className={cn(iconButtonVariants({ hierarchy: "ghost", size: "lg" }), "max-md:size-[var(--touch-min)]")}
            >
              <Icon icon={Settings02Icon} size={20} />
            </Link>
          }
          className={cn("shrink-0", open && "hidden [@container(min-width:768px)]:flex")}
        />
        <div className="mb-12 flex shrink-0 flex-col gap-6 empty:hidden">
          {unreadable && <Banner tone="error">This browser&apos;s messages couldn&apos;t be read, so new ones can&apos;t be saved.</Banner>}
          <ActingBanner />
        </div>
        <div className="flex min-h-0 flex-1 gap-[var(--layout-gutter)]">
          <section
            aria-label="Conversations"
            className={cn(
              PANE,
              "w-full [@container(min-width:768px)]:flex [@container(min-width:768px)]:w-[320px] [@container(min-width:768px)]:shrink-0",
              open ? "hidden" : "flex",
            )}
          >
            <ConversationList />
          </section>
          <section
            aria-label="Conversation"
            className={cn(PANE, "min-w-0 flex-1 [@container(min-width:768px)]:flex", open ? "flex" : "hidden")}
          >
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}

export function MessagesShell({ children }: { children: React.ReactNode }) {
  const acting = useActingAs();
  return (
    <MessagesViewProvider acting={acting}>
      <Panes>{children}</Panes>
    </MessagesViewProvider>
  );
}
