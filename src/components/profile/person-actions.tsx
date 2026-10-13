"use client";

// What you can do with another creator (spec 2026-10-14-creator-profile-design.md):
// Follow, Message, and ⋯ Report profile · Block. Follow is one control on one
// store (D3): the same FollowButton sits on their profile and in a post's
// maker block, reading and writing `ideeza:innovations:reactions.follow`.
// Message opens Messages about a subject the two of you share — their newest
// post, or your project they bought from — and obeys their "who can message
// you" rule; with no subject or no permission it is disabled and says why.
// Report and Block work as Messages' do (D8): Block writes the Messages
// blocked list; a report is saved in this browser and its receipt says that
// nobody reviews reports yet.

import * as React from "react";
import Link from "next/link";
import { Mail01Icon, MoreHorizontalIcon, UserAdd01Icon, UserCheck01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog, ModalFrame, Textarea, buttonVariants } from "@/components/ideeza";
import { CheckRow, RadioRow } from "@/components/messages/choice";
import { MenuButton } from "@/components/messages/menu";
import { CREATORS } from "@/lib/feed";
import { follows, useReactions } from "@/lib/innovations/reactions";
import { parseStored, readStoredKey, writeStoredKey } from "@/lib/key-store";
import { blockPerson, unblockPerson } from "@/lib/messages/actions";
import { useStoredActingAs } from "@/lib/messages/identity";
import { startHref, type StartParams } from "@/lib/messages/links";
import { blockStateOf, canStart, startRefusalOf } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { ME, type Person } from "@/lib/people/ids";
import { NOTE_MAX, REPORTS_KEY, REPORT_REASONS, normalizeReports, withReport, type ProfileReportReason } from "@/lib/people/reports";
import { cn } from "@/lib/utils";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** The key a person is followed under: the feed's own id for Innovations people ("c1"). */
export function followKeyOf(person: Pick<Person, "id" | "kind">): string {
  return person.kind === "feed" ? person.id.slice("feed:".length) : person.id;
}

export function FollowButton({
  person,
  hierarchy = "primary",
  size = "lg",
  className,
}: {
  person: Pick<Person, "id" | "kind" | "name">;
  hierarchy?: "primary" | "secondary";
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const { reactions, setFollow, hydrated } = useReactions();
  const key = followKeyOf(person);
  const dataset = CREATORS.find((c) => c.id === key)?.following ?? false;
  const on = follows(reactions, key, dataset);
  return (
    <Button
      type="button"
      hierarchy={on ? "secondary" : hierarchy}
      size={size}
      aria-pressed={on}
      disabled={!hydrated}
      onClick={() => setFollow(key, !on)}
      iconLeading={<Icon icon={on ? UserCheck01Icon : UserAdd01Icon} size={16} />}
      className={cn(TAP, className)}
    >
      {on ? "Following" : "Follow"}
    </Button>
  );
}

/** Message, or the reason it can't start. `start` is the shared subject; null when there is none. */
export function MessageButton({
  person,
  start,
  size = "lg",
  className,
  reasonId,
}: {
  person: Pick<Person, "id" | "name">;
  start: StartParams | null;
  size?: "md" | "lg" | "xl";
  className?: string;
  reasonId: string;
}) {
  const refusal = useMessageRefusalFor(person, start);
  const control = cn(buttonVariants({ hierarchy: "secondary", size }), "gap-[var(--spacing-3)] shrink-0", TAP, className);
  if (refusal || !start) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-describedby={reasonId}
        className={cn(control, "cursor-not-allowed text-[color:var(--color-button-disabled-text)] hover:bg-[var(--color-button-secondary-bg)]")}
      >
        <Icon icon={Mail01Icon} size={16} />
        Message
      </span>
    );
  }
  return (
    <Link
      href={startHref(start)}
      aria-label={`Message ${person.name}`}
      className={cn(control, "hover:text-[color:var(--color-button-secondary-text)]")}
    >
      <Icon icon={Mail01Icon} size={16} />
      Message
    </Link>
  );
}

/** Why Message can't start with this person right now; null when it can. */
export function useMessageRefusalFor(person: Pick<Person, "id" | "name">, start: StartParams | null): string | null {
  const { data, hydrated } = useMessages();
  const from = useStoredActingAs();
  if (!hydrated) return null;
  if (!start) return `Messages start from a project or a post. ${person.name} hasn't shared one with you yet.`;
  const context = start.kind === "direct" ? start.about : { kind: "post" as const };
  const check = canStart(data, from, person.id, context);
  return check.ok ? null : startRefusalOf(check.reason, person.name);
}

/** Whether you blocked this person (the Messages blocked list). */
export function useBlocked(personId: string): { hydrated: boolean; blocked: boolean } {
  const { data, hydrated } = useMessages();
  return { hydrated, blocked: hydrated && blockStateOf(data, ME, personId) === "byMe" };
}

function saveReport(who: string, reason: ProfileReportReason, note: string): boolean {
  const list = normalizeReports(parseStored(readStoredKey(REPORTS_KEY)).value);
  const id = `prep_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return writeStoredKey(REPORTS_KEY, withReport(list, { id, by: ME, who, reason, note, at: Date.now() })).ok;
}

function ReportProfileDialog({ person, onClose, onDone }: { person: Pick<Person, "id" | "name">; onClose: () => void; onDone: (blocked: boolean) => void }) {
  const [reason, setReason] = React.useState<ProfileReportReason | null>(null);
  const [note, setNote] = React.useState("");
  const [alsoBlock, setAlsoBlock] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const noteId = React.useId();
  const legendId = React.useId();

  const submit = () => {
    if (!reason) {
      setError("Choose a reason.");
      return;
    }
    if (!saveReport(person.id, reason, note)) {
      setError("Couldn't save the report. This browser's storage is full or blocked.");
      return;
    }
    const blocked = alsoBlock ? blockPerson(ME, person.id).ok : false;
    onDone(blocked);
  };

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      sheet
      title={`Report ${person.name}'s profile`}
      description={`${person.name} won't see who reported.`}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy="primary"
            size="lg"
            aria-disabled={!reason || undefined}
            className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
            onClick={submit}
          >
            Send report
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pt-2">
        <div role="radiogroup" aria-labelledby={legendId} className="flex flex-col gap-1">
          <p id={legendId} className="text-md font-semibold leading-md text-text-primary">
            What&apos;s wrong?
          </p>
          {REPORT_REASONS.map((r) => (
            <RadioRow
              key={r.id}
              name="profile-report-reason"
              checked={reason === r.id}
              onChange={() => {
                setReason(r.id);
                setError(null);
              }}
              label={r.label}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <label htmlFor={noteId} className="text-md font-medium leading-md text-text-primary">
            Note (optional)
          </label>
          <Textarea id={noteId} rows={3} maxLength={NOTE_MAX} value={note} onValueChange={(v) => setNote(v.slice(0, NOTE_MAX))} />
        </div>
        <CheckRow checked={alsoBlock} onChange={setAlsoBlock} label={`Also block ${person.name}`} />
        {error && (
          <p role="alert" className="text-md leading-md text-text-error">
            {error}
          </p>
        )}
      </div>
    </ModalFrame>
  );
}

export type PersonNotice = { kind: "reported"; blocked: boolean } | { kind: "error"; text: string } | null;

/** ⋯ on someone else's profile: Report profile · Block {name}, with their dialogs. */
export function PersonMenu({
  person,
  blocked,
  onNotice,
  className,
}: {
  person: Pick<Person, "id" | "name">;
  blocked: boolean;
  onNotice: (n: PersonNotice) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState<"report" | "block" | null>(null);
  const items = [
    { id: "report", label: "Report profile", onSelect: () => setOpen("report") },
    blocked
      ? {
          id: "unblock",
          label: `Unblock ${person.name}`,
          onSelect: () => onNotice(unblockPerson(ME, person.id).ok ? null : { kind: "error", text: "Couldn't save. This browser's storage is full or blocked." }),
        }
      : { id: "block", label: `Block ${person.name}`, danger: true, onSelect: () => setOpen("block") },
  ];
  return (
    <>
      <MenuButton
        label={`More actions for ${person.name}`}
        align="end"
        items={items}
        trigger={<Icon icon={MoreHorizontalIcon} size={20} />}
        className={cn(
          "inline-flex size-[40px] items-center justify-center rounded-lg border border-solid border-[var(--color-button-secondary-border)] bg-[var(--color-button-secondary-bg)] text-text-secondary hover:bg-bg-subtle max-md:size-[44px]",
          className,
        )}
      />
      {open === "report" && (
        <ReportProfileDialog
          person={person}
          onClose={() => setOpen(null)}
          onDone={(b) => {
            setOpen(null);
            onNotice({ kind: "reported", blocked: b });
          }}
        />
      )}
      {open === "block" && (
        <ConfirmDialog
          open
          tone="danger"
          title={`Block ${person.name}?`}
          confirmLabel="Block"
          onCancel={() => setOpen(null)}
          onConfirm={() => {
            setOpen(null);
            onNotice(blockPerson(ME, person.id).ok ? null : { kind: "error", text: "Couldn't save. This browser's storage is full or blocked." });
          }}
        >
          <p className="max-w-[62ch] text-md leading-md text-text-secondary">
            {`${person.name} won't be able to message you, and won't be told. You can unblock from this page or Messages settings.`}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
