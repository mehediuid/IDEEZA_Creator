"use client";

// The Messages layout (spec §6): from 1024 px the list (320 px) beside the
// open conversation; below, one pane — the list on /messages, the
// conversation full width anywhere under it. Both panes fill the shell's
// height and scroll on their own. Above them: the line that says this tab acts
// as someone else, and the one error a store that can't be read leaves.
//
// The old support requests become conversations here, once the market and the
// projects have been read.

import * as React from "react";
import { usePathname } from "next/navigation";
import { Banner } from "@/components/ideeza";
import { useManualProjects } from "@/lib/manual/projects";
import { useMarket } from "@/lib/market/market-store";
import { migrateSupportOnce } from "@/lib/messages/actions";
import { useActingAs } from "@/lib/messages/identity";
import { MESSAGES_HREF } from "@/lib/messages/links";
import { cn } from "@/lib/utils";
import { ActingBanner } from "./acting-as";
import { ConversationList } from "./conversation-list";
import { MessagesViewProvider, useMessagesView } from "./messages-context";

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

function Panes({ children }: { children: React.ReactNode }) {
  const { unreadable } = useMessagesView();
  const pathname = usePathname();
  const open = pathname !== MESSAGES_HREF;
  useSupportMigration();
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg-surface">
      <div className="flex shrink-0 flex-col gap-3 px-4 py-3 empty:hidden md:px-6">
        {unreadable && <Banner tone="error">This browser&apos;s messages couldn&apos;t be read, so new ones can&apos;t be saved.</Banner>}
        <ActingBanner />
      </div>
      <div className="flex min-h-0 flex-1">
        <section
          aria-label="Conversations"
          className={cn(
            "min-h-0 w-full flex-col border-solid border-border lg:flex lg:w-[320px] lg:shrink-0 lg:border-r",
            open ? "hidden" : "flex",
          )}
        >
          <ConversationList />
        </section>
        <section
          aria-label="Conversation"
          className={cn("min-h-0 min-w-0 flex-1 flex-col lg:flex", open ? "flex" : "hidden")}
        >
          {children}
        </section>
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
