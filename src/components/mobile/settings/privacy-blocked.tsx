"use client";

// Settings › Privacy & safety › Blocked people (mobile Figma "Settings · 2026
// update" 10688:2 ST-33 / 33b / 33c, Shared kit 10600:2 KIT-RB-30 / 31 / 20 /
// 21 / 27): who you blocked and when, the conversations you have with them
// (a search once the list is long), Unblock with a toast and Undo (33b), and
// empty (33c). Block someone sits in the bottom bar (KIT-RB-30) and opens the
// people you've met (KIT-RB-31); blocking asks first (KIT-RB-20), then says so
// with Undo (KIT-RB-21). Every Block and Unblock writes Messages' one blocked
// list (`ideeza:messages` blocks), the one a profile's and a conversation's
// Block write too; the rows and words are the web's
// (components/settings/blocked-people.tsx).

import * as React from "react";
import { UserBlock01Icon } from "@hugeicons/core-free-icons";
import { Avatar } from "@/components/ideeza/avatar";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { useBlockingPeople, type BlockablePerson } from "@/components/settings/blocking-people";
import { blockPerson, unblockPerson } from "@/lib/messages/actions";
import { block, otherOf, subjectNameOf, visibleTo } from "@/lib/messages/rules";
import { updateMessages, useMessages } from "@/lib/messages/store";
import { ME } from "@/lib/messages/types";
import type { MetWhere } from "@/lib/settings/audience";
import { useDates } from "@/lib/settings/use-dates";
import { BottomBar } from "../kit/bottom-bar";
import { cn } from "@/lib/utils";
import { EmptyState } from "../kit/state";
import { LIST_CARD, LIST_DIVIDERS } from "../kit/list";
import { T } from "../type";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { Sheet } from "../kit/sheet";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { SaveFailed, SettingsGroup, SettingsScreen, useSaver } from "./kit";

const WHERE: Record<MetWhere, string> = { messages: "Messages", comments: "Comments", marketplace: "Marketplace" };
/** A search box once the list is longer than this (the web's rule). */
const SEARCH_FROM = 6;

const matches = (text: string, q: string) => text.toLowerCase().includes(q.trim().toLowerCase());

function Person({ p, line }: { p: BlockablePerson; line?: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-6">
      <Avatar initials={p.initials} color={p.color ?? undefined} size="md" />
      <span className="flex min-w-0 flex-col gap-1">
        <span className={cn(T.rowTitle, "truncate")}>{p.name}</span>
        {line && <span className={cn(T.meta, "[overflow-wrap:anywhere]")}>{line}</span>}
      </span>
    </span>
  );
}

type Open = null | "add" | "confirm";

export function BlockedPeopleSettings() {
  const { data, hydrated } = useMessages();
  const { personOf, met, hydrated: peopleRead } = useBlockingPeople();
  const dates = useDates();
  const online = useOnline();
  const toast = useToast();
  const saver = useSaver();
  const [q, setQ] = React.useState("");
  const [find, setFind] = React.useState("");
  const [open, setOpen] = React.useState<Open>(null);
  const [picked, setPicked] = React.useState<BlockablePerson | null>(null);
  const blocked = React.useRef(false);
  const off = !online;

  const rows = React.useMemo(() => {
    const talks = data.conversations.filter((c) => c.kind === "direct" && visibleTo(c, ME)).sort((a, b) => b.lastAt - a.lastAt);
    return data.blocks
      .filter((b) => b.by === ME)
      .sort((a, b) => b.at - a.at)
      .map((b) => ({
        person: personOf(b.who),
        at: b.at,
        about: talks.filter((c) => otherOf(c, ME)?.id === b.who).map((c) => subjectNameOf(c.subject)),
      }));
  }, [data, personOf]);
  type Row = (typeof rows)[number];
  const shown = rows.filter((r) => matches(r.person.name, q) || r.about.some((s) => matches(s, q)));
  const blockedIds = new Set(rows.map((r) => r.person.id));
  const results = met.filter((p) => matches(p.name, find));

  const lineOf = (r: Row) => {
    const when = `Blocked ${dates.date(r.at)}`;
    if (!r.about.length) return when;
    return `${when} · ${r.about.length === 1 ? "Conversation" : `${r.about.length} conversations`} about ${r.about.join(", ")}`;
  };

  const unblock = (r: Row) => {
    if (!saver.run("list", () => unblockPerson(ME, r.person.id).ok)) return;
    toast({
      title: `${r.person.name} unblocked`,
      action: {
        label: "Undo",
        // Back as it was, with the day it was first blocked.
        onClick: () => {
          if (!updateMessages((d) => block(d, ME, r.person.id, r.at)).ok) toast({ title: "Couldn’t undo. Nothing changed.", lead: "error" });
        },
      },
    });
  };

  const confirmBlock = () => {
    const p = picked;
    if (!p) return;
    blocked.current = true;
    if (!saver.run("list", () => blockPerson(ME, p.id).ok)) return;
    toast({
      title: `You blocked ${p.name}`,
      action: {
        label: "Undo",
        onClick: () => {
          if (!unblockPerson(ME, p.id).ok) toast({ title: "Couldn’t undo. Nothing changed.", lead: "error" });
        },
      },
    });
  };

  return (
    <SettingsScreen
      title="Blocked people"
      loading={!hydrated || !peopleRead}
      footer={
        <BottomBar>
          <Button
            hierarchy="secondary"
            size="xl"
            className="w-full"
            disabled={off}
            onClick={() => {
              setFind("");
              setOpen("add");
            }}
          >
            Block someone
          </Button>
        </BottomBar>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={UserBlock01Icon}
          title="You haven’t blocked anyone"
          body="You can block someone from their profile, from a conversation, or with Block someone."
        />
      ) : (
        <>
          <p className={T.body}>
            People you block can’t message you, and their comments are hidden. You can’t message them or comment on their projects.
          </p>
          <p role="status" className={T.rowTitle}>
            {rows.length === 1 ? "1 person blocked" : `${rows.length} people blocked`}
          </p>
          {rows.length > SEARCH_FROM && (
            <SearchInput
              value={q}
              onValueChange={setQ}
              placeholder="Search blocked people"
              aria-label="Search the people you blocked"
              size="xl"
            />
          )}
          {shown.length === 0 ? (
            <p className={T.body}>No one you blocked matches “{q.trim()}”.</p>
          ) : (
            <SettingsGroup>
              {shown.map((r) => (
                <div key={r.person.id} className="flex items-center gap-6 px-8 py-6">
                  <Person p={r.person} line={lineOf(r)} />
                  <Button hierarchy="secondary" size="sm" disabled={off} aria-label={`Unblock ${r.person.name}`} onClick={() => unblock(r)}>
                    Unblock
                  </Button>
                </div>
              ))}
            </SettingsGroup>
          )}
        </>
      )}
      <SaveFailed saver={saver} group="list" />

      <Sheet open={open === "add"} onClose={() => setOpen(null)} title="Block someone" description="People you’ve met in Messages, in comments and on the marketplace.">
        <SearchInput
          value={find}
          onValueChange={setFind}
          placeholder="Search people you’ve met"
          aria-label="Search the people you’ve met"
          size="xl"
        />
        {results.length === 0 ? (
          <p role="status" className={T.body}>
            {met.length === 0 ? "You haven’t met anyone here yet." : `No one you’ve met matches “${find.trim()}”.`}
          </p>
        ) : (
          <ul
            role="list"
            aria-label="People you’ve met"
            className={cn(LIST_CARD, LIST_DIVIDERS, "rounded-lg")}
          >
            {results.map((p) => {
              const isBlocked = blockedIds.has(p.id);
              return (
                <li key={p.id} className="flex items-center gap-6 px-8 py-6">
                  <Person p={p} line={`Met in ${p.where.map((w) => WHERE[w]).join(" · ")}`} />
                  <Button
                    hierarchy="secondary"
                    size="sm"
                    disabled={isBlocked || off}
                    aria-label={isBlocked ? `${p.name} is blocked` : `Block ${p.name}`}
                    onClick={() => {
                      blocked.current = false;
                      setPicked(p);
                      setOpen("confirm");
                    }}
                  >
                    {isBlocked ? "Blocked" : "Block"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>
      <ConfirmSheet
        open={open === "confirm"}
        // Cancel goes back to the people you've met; blocking closes both.
        onClose={() => setOpen(blocked.current ? null : "add")}
        title={`Block ${picked?.name ?? ""}?`}
        body={`${picked?.name ?? ""} won’t be able to message you, and their comments on your shared projects are held. They won’t be told. You can unblock them here.`}
        verb="Block"
        destructive
        onConfirm={confirmBlock}
      />
    </SettingsScreen>
  );
}
