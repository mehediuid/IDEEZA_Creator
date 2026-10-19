"use client";

// Settings › Blocking's modals (User Panel V2): "Blocked Users List"
// (22048:34824) with + Add Blocked User and Search Contact; "Blocked New
// Users" (22048:34934 empty, 34986 no result, 35039 results) — search the
// people you've met, "Search result for …", Block; and "Blocked Message List"
// (23712:52073) — your conversations with someone you blocked. Every Block
// and Unblock writes Messages' one blocked list, the one a profile's Block
// writes too.

import * as React from "react";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Button, IconButton, ModalFrame, SearchInput, linkVariants } from "@/components/ideeza";
import { blockPerson, unblockPerson } from "@/lib/messages/actions";
import { otherOf, subjectNameOf, visibleTo } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { ME } from "@/lib/messages/types";
import type { MetWhere } from "@/lib/settings/audience";
import { cn } from "@/lib/utils";
import { useBlockingPeople, type BlockablePerson } from "./blocking-people";

const WHERE: Record<MetWhere, string> = { messages: "Messages", comments: "Comments", marketplace: "Marketplace" };
const TAP = "max-md:min-h-[var(--touch-min)]";
const TEXT_ACTION = cn(linkVariants({ color: "brand", size: "sm" }), "shrink-0 text-md font-medium leading-md", TAP);
const LIST = "m-0 flex flex-col rounded-xl border border-solid border-border p-0";
const ROW = "flex items-center gap-[12px] border-b border-solid border-border px-[12px] py-[10px] last:border-b-0";
const SAVE_FAILED = "Couldn't save. This browser's storage is full or blocked.";

const matches = (name: string, q: string) => name.toLowerCase().includes(q.trim().toLowerCase());

function Person({ p, line }: { p: BlockablePerson; line?: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-[12px]">
      <Avatar initials={p.initials} color={p.color ?? undefined} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-md font-medium leading-md text-text-primary">{p.name}</span>
        {line && <span className="truncate text-md leading-md text-text-tertiary">{line}</span>}
      </span>
    </span>
  );
}

function ErrorLine({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="m-0 text-md leading-md text-text-error">
      {text}
    </p>
  ) : null;
}

export function BlockedUsersDialog({ onClose }: { onClose: () => void }) {
  const { data } = useMessages();
  const { personOf } = useBlockingPeople();
  const [q, setQ] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const blocked = data.blocks.filter((b) => b.by === ME).map((b) => personOf(b.who));
  const shown = blocked.filter((p) => matches(p.name, q));

  return (
    <>
      <ModalFrame open covered={adding} onClose={onClose} size="sm" title="Blocked Users List">
        <div className="flex flex-col gap-[16px]">
          <button
            ref={addRef}
            type="button"
            onClick={() => setAdding(true)}
            className={cn(TEXT_ACTION, "inline-flex w-fit items-center gap-[6px]")}
          >
            <Icon icon={Add01Icon} size={18} />
            Add Blocked User
          </button>
          {blocked.length > 0 && (
            <SearchInput ref={searchRef} value={q} onValueChange={setQ} placeholder="Search Contact" aria-label="Search the people you blocked" />
          )}
          <ErrorLine text={error} />
          {blocked.length === 0 ? (
            <p className="m-0 text-md leading-md text-text-secondary">
              You haven&apos;t blocked anyone. People you block can&apos;t message you, and you can&apos;t message them.
            </p>
          ) : shown.length === 0 ? (
            <p className="m-0 text-md leading-md text-text-secondary">No one you blocked matches “{q.trim()}”.</p>
          ) : (
            <ul role="list" aria-label="Blocked people" className={LIST}>
              {shown.map((p) => (
                <li key={p.id} className={ROW}>
                  <Person p={p} />
                  <button
                    type="button"
                    aria-label={`Unblock ${p.name}`}
                    className={TEXT_ACTION}
                    onClick={() => {
                      const ok = unblockPerson(ME, p.id).ok;
                      setError(ok ? null : SAVE_FAILED);
                      // The row and its button go; the keyboard stays in the dialog.
                      if (ok) (searchRef.current ?? addRef.current)?.focus();
                    }}
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ModalFrame>
      {adding && (
        <AddBlockedUserDialog
          onClose={() => {
            setAdding(false);
            requestAnimationFrame(() => addRef.current?.focus());
          }}
        />
      )}
    </>
  );
}

function AddBlockedUserDialog({ onClose }: { onClose: () => void }) {
  const { data } = useMessages();
  const { met, hydrated } = useBlockingPeople();
  const [q, setQ] = React.useState("");
  const [searched, setSearched] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const blockedIds = new Set(data.blocks.filter((b) => b.by === ME).map((b) => b.who));
  const results = searched === null ? [] : met.filter((p) => matches(p.name, searched));

  return (
    <ModalFrame open onClose={onClose} size="sm" title="Blocked New Users" initialFocus={inputRef}>
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
            placeholder="Search Contact"
            aria-label="Search the people you've met"
            containerClassName="flex-1"
          />
          <Button type="submit" hierarchy="secondary" size="lg" className={TAP} disabled={!hydrated}>
            Search
          </Button>
        </form>
        <ErrorLine text={error} />
        {searched === null ? (
          <p className="m-0 text-md leading-md text-text-secondary">
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
              <p className="m-0 text-md leading-md text-text-secondary">
                {met.length === 0 ? "You haven't met anyone here yet." : `No one you've met matches “${searched}”.`}
              </p>
            ) : (
              <ul role="list" aria-label="People you've met" className={LIST}>
                {results.map((p) => {
                  const isBlocked = blockedIds.has(p.id);
                  return (
                    <li key={p.id} className={ROW}>
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

export function BlockedMessagesDialog({ onClose }: { onClose: () => void }) {
  const { data } = useMessages();
  const { personOf } = useBlockingPeople();
  const [q, setQ] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const headingRef = React.useRef<HTMLParagraphElement>(null);
  const blockedIds = new Set(data.blocks.filter((b) => b.by === ME).map((b) => b.who));
  const rows = data.conversations
    .filter((c) => c.kind === "direct" && visibleTo(c, ME))
    .map((c) => ({ c, other: otherOf(c, ME) }))
    .filter((r): r is { c: typeof r.c; other: NonNullable<typeof r.other> } => !!r.other && blockedIds.has(r.other.id))
    .map((r) => ({ id: r.c.id, person: personOf(r.other.id), subject: subjectNameOf(r.c.subject), at: r.c.lastAt }))
    .sort((a, b) => b.at - a.at);
  const shown = rows.filter((r) => matches(r.person.name, q) || matches(r.subject, q));

  return (
    <ModalFrame open onClose={onClose} size="sm" title="Blocked Message List">
      <div className="flex flex-col gap-[16px]">
        <p ref={headingRef} tabIndex={-1} className="m-0 text-md leading-md text-text-secondary outline-none">
          Your conversations with people you blocked. Unblocking someone here unblocks them everywhere.
        </p>
        {rows.length > 0 && (
          <SearchInput ref={searchRef} value={q} onValueChange={setQ} placeholder="Search Contact" aria-label="Search blocked conversations" />
        )}
        <ErrorLine text={error} />
        {rows.length === 0 ? (
          <p className="m-0 text-md leading-md text-text-secondary">No conversations with people you blocked.</p>
        ) : shown.length === 0 ? (
          <p className="m-0 text-md leading-md text-text-secondary">No blocked conversation matches “{q.trim()}”.</p>
        ) : (
          <ul role="list" aria-label="Blocked conversations" className={LIST}>
            {shown.map((r) => (
              <li key={r.id} className={ROW}>
                <Person p={r.person} line={`About ${r.subject}`} />
                <button
                  type="button"
                  aria-label={`Unblock ${r.person.name}`}
                  className={TEXT_ACTION}
                  onClick={() => {
                    const ok = unblockPerson(ME, r.person.id).ok;
                    setError(ok ? null : SAVE_FAILED);
                    if (ok) (searchRef.current ?? headingRef.current)?.focus();
                  }}
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalFrame>
  );
}
