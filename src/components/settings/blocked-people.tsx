"use client";

// Settings › Privacy & safety › Blocked people: one list (Phase 1's "Blocked
// Users List" and "Blocked Message List" merged). Each person you blocked,
// when, and the conversations you have with them, with Unblock. Block someone
// opens Figma's "Blocked New Users" (22048:34934 / 34986 / 35039): search the
// people you've met, Block. Every Block and Unblock writes Messages' one
// blocked list, the one a profile's Block and a conversation's Block write
// too. What a block does: no messages either way (Messages' `canStart` and
// `send`), their comments read "From someone you blocked" to you and are held
// off your shared projects, and you can't comment on their projects
// (lib/innovations/comments.ts).

import * as React from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Button, IconButton, ModalFrame, SearchInput, linkVariants } from "@/components/ideeza";
import { blockPerson, unblockPerson } from "@/lib/messages/actions";
import { otherOf, subjectNameOf, visibleTo } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { ME } from "@/lib/messages/types";
import type { MetWhere } from "@/lib/settings/audience";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { useBlockingPeople, type BlockablePerson } from "./blocking-people";
import { SAVE_FAILED, SettingsCard } from "./settings-card";

const WHERE: Record<MetWhere, string> = { messages: "Messages", comments: "Comments", marketplace: "Marketplace" };
const TAP = "max-md:min-h-[var(--touch-min)]";
const TEXT_ACTION = cn(linkVariants({ color: "brand", size: "sm" }), "shrink-0 text-md font-medium leading-md", TAP);
const LIST = "m-0 flex flex-col p-0";
const ROW = "flex items-center gap-[12px] border-b border-solid border-border py-[12px] last:border-b-0";
const NOTE = "m-0 max-w-[62ch] text-md leading-md text-text-secondary";
/** A search box once the list is longer than this. */
const SEARCH_FROM = 6;

const matches = (text: string, q: string) => text.toLowerCase().includes(q.trim().toLowerCase());

function Person({ p, line }: { p: BlockablePerson; line?: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-[12px]">
      <Avatar initials={p.initials} color={p.color ?? undefined} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-md font-medium leading-md text-text-primary">{p.name}</span>
        {line && <span className="text-sm leading-sm text-text-tertiary [overflow-wrap:anywhere]">{line}</span>}
      </span>
    </span>
  );
}

export function BlockedPeopleCard() {
  const { data, hydrated } = useMessages();
  const { personOf } = useBlockingPeople();
  const dates = useDates();
  const [q, setQ] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const headingRef = React.useRef<HTMLParagraphElement>(null);

  const rows = React.useMemo(() => {
    const talks = data.conversations
      .filter((c) => c.kind === "direct" && visibleTo(c, ME))
      .sort((a, b) => b.lastAt - a.lastAt);
    return data.blocks
      .filter((b) => b.by === ME)
      .sort((a, b) => b.at - a.at)
      .map((b) => ({
        person: personOf(b.who),
        at: b.at,
        about: talks.filter((c) => otherOf(c, ME)?.id === b.who).map((c) => subjectNameOf(c.subject)),
      }));
  }, [data, personOf]);
  const shown = rows.filter((r) => matches(r.person.name, q) || r.about.some((s) => matches(s, q)));

  const lineOf = (r: (typeof rows)[number]) => {
    const when = `Blocked ${dates.date(r.at)}`;
    if (!r.about.length) return when;
    return `${when} · ${r.about.length === 1 ? "Conversation" : `${r.about.length} conversations`} about ${r.about.join(", ")}`;
  };

  return (
    <SettingsCard
      id="blocked"
      title="Blocked people"
      description="People you block can't message you, and their comments are hidden. You can't message them or comment on their projects."
      action={
        <Button ref={addRef} type="button" hierarchy="secondary" size="sm" className={TAP} disabled={!hydrated} onClick={() => setAdding(true)}>
          Block someone
        </Button>
      }
    >
      <p ref={headingRef} tabIndex={-1} className="sr-only">
        {rows.length === 1 ? "1 person blocked" : `${rows.length} people blocked`}
      </p>
      {error && (
        <p role="alert" className="m-0 pt-[8px] text-md leading-md text-text-error">
          {error}
        </p>
      )}
      {!hydrated ? null : rows.length === 0 ? (
        <p className={cn(NOTE, "pt-[8px]")}>
          You haven&apos;t blocked anyone. You can block someone from their profile, from a conversation, or with Block someone.
        </p>
      ) : (
        <div className="flex flex-col gap-[8px] pt-[8px]">
          {rows.length > SEARCH_FROM && (
            <SearchInput value={q} onValueChange={setQ} placeholder="Search blocked people" aria-label="Search the people you blocked" />
          )}
          {shown.length === 0 ? (
            <p className={NOTE}>No one you blocked matches “{q.trim()}”.</p>
          ) : (
            <ul role="list" aria-label="Blocked people" className={LIST}>
              {shown.map((r) => (
                <li key={r.person.id} className={ROW}>
                  <Person p={r.person} line={lineOf(r)} />
                  <button
                    type="button"
                    aria-label={`Unblock ${r.person.name}`}
                    className={TEXT_ACTION}
                    onClick={() => {
                      const ok = unblockPerson(ME, r.person.id).ok;
                      setError(ok ? null : SAVE_FAILED);
                      // The row and its button go; the keyboard lands on the list's count.
                      if (ok) headingRef.current?.focus();
                    }}
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {adding && (
        <BlockSomeoneDialog
          onClose={() => {
            setAdding(false);
            requestAnimationFrame(() => addRef.current?.focus());
          }}
        />
      )}
    </SettingsCard>
  );
}

function BlockSomeoneDialog({ onClose }: { onClose: () => void }) {
  const { data } = useMessages();
  const { met, hydrated } = useBlockingPeople();
  const [q, setQ] = React.useState("");
  const [searched, setSearched] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const blockedIds = new Set(data.blocks.filter((b) => b.by === ME).map((b) => b.who));
  const results = searched === null ? [] : met.filter((p) => matches(p.name, searched));

  return (
    <ModalFrame open onClose={onClose} size="sm" title="Block someone" initialFocus={inputRef}>
      <div className="flex flex-col gap-[16px]">
        <form
          role="search"
          className="flex gap-[8px]"
          onSubmit={(e) => {
            e.preventDefault();
            setSearched(q.trim());
          }}
        >
          <SearchInput
            ref={inputRef}
            value={q}
            onValueChange={setQ}
            placeholder="Search people you've met"
            aria-label="Search the people you've met"
            containerClassName="flex-1"
          />
          <Button type="submit" hierarchy="secondary" size="lg" className={TAP} disabled={!hydrated}>
            Search
          </Button>
        </form>
        {error && (
          <p role="alert" className="m-0 text-md leading-md text-text-error">
            {error}
          </p>
        )}
        {searched === null ? (
          <p className={NOTE}>
            Search the people you&apos;ve met in Messages, in comments and on the marketplace. Search with nothing typed to see them all.
          </p>
        ) : (
          <section aria-label="Search results" className="flex flex-col gap-[12px]">
            <div className="flex items-center justify-between gap-[8px]">
              <p role="status" className="m-0 text-md font-medium leading-md text-text-primary">
                {searched ? `Search result for “${searched}”` : "Everyone you've met"}
              </p>
              <IconButton
                hierarchy="ghost"
                size="sm"
                aria-label="Clear the search"
                icon={<Icon icon={Cancel01Icon} size={16} />}
                className="max-md:size-[var(--touch-min)]"
                onClick={() => {
                  setQ("");
                  setSearched(null);
                  inputRef.current?.focus();
                }}
              />
            </div>
            {results.length === 0 ? (
              <p className={NOTE}>{met.length === 0 ? "You haven't met anyone here yet." : `No one you've met matches “${searched}”.`}</p>
            ) : (
              <ul role="list" aria-label="People you've met" className="m-0 flex flex-col rounded-xl border border-solid border-border p-0">
                {results.map((p) => {
                  const isBlocked = blockedIds.has(p.id);
                  return (
                    <li key={p.id} className="flex items-center gap-[12px] border-b border-solid border-border px-[12px] py-[10px] last:border-b-0">
                      <Person p={p} line={`Met in ${p.where.map((w) => WHERE[w]).join(" · ")}`} />
                      <Button
                        type="button"
                        hierarchy="secondary"
                        size="sm"
                        aria-label={isBlocked ? `${p.name} is blocked` : `Block ${p.name}`}
                        disabled={isBlocked}
                        className={TAP}
                        onClick={() => setError(blockPerson(ME, p.id).ok ? null : SAVE_FAILED)}
                      >
                        {isBlocked ? "Blocked" : "Block"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </ModalFrame>
  );
}
