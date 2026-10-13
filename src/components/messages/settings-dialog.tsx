"use client";

// Message settings (spec §6), for the person this tab acts as: who can start a
// conversation with them, and the people they blocked, each with Unblock.
// Every change saves as it is made.

import * as React from "react";
import { Button, ModalFrame } from "@/components/ideeza";
import { setAllowNewFor, unblockPerson } from "@/lib/messages/actions";
import { allowNewOf } from "@/lib/messages/rules";
import { ME, type AllowNew } from "@/lib/messages/types";
import { RadioRow } from "./choice";
import { useMessagesView } from "./messages-context";

const TAP = "max-md:min-h-[var(--touch-min)]";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { data, me, meAs, people } = useMessagesView();
  const [error, setError] = React.useState<string | null>(null);
  const allowNew = allowNewOf(data, me);
  const snapshots = React.useMemo(() => data.conversations.flatMap((c) => c.participants), [data.conversations]);
  const blocked = data.blocks.filter((b) => b.by === me);
  const groupId = React.useId();
  const blockedId = React.useId();
  const blockedRef = React.useRef<HTMLHeadingElement>(null);

  const choose = (v: AllowNew) => {
    const r = setAllowNewFor(me, v);
    setError(r.ok ? null : r.reason);
  };

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      title="Message settings"
      footer={
        <Button type="button" hierarchy="primary" size="lg" className={`ml-auto ${TAP}`} onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-8">
        {me !== ME && <p className="text-md leading-md text-text-secondary">For {meAs.name}.</p>}
        <div role="radiogroup" aria-labelledby={groupId} className="flex flex-col gap-1">
          <p id={groupId} className="text-md font-semibold leading-md text-text-primary">
            Who can start a conversation with you
          </p>
          <RadioRow
            name="allow-new"
            checked={allowNew === "everyone"}
            onChange={() => choose("everyone")}
            label="Anyone"
            hint="New people go to Requests."
          />
          <RadioRow
            name="allow-new"
            checked={allowNew === "known"}
            onChange={() => choose("known")}
            label="Only people you work with"
            hint="People who bought from your projects, asked about your listing, or work on your team."
          />
        </div>
        <section aria-labelledby={blockedId} className="flex flex-col gap-3">
          <h3 id={blockedId} ref={blockedRef} tabIndex={-1} className="text-md font-semibold leading-md text-text-primary outline-none">
            Blocked
          </h3>
          {blocked.length === 0 ? (
            <p className="text-md leading-md text-text-secondary">You haven&apos;t blocked anyone.</p>
          ) : (
            <ul role="list" className="flex flex-col">
              {blocked.map((b) => {
                const name = people.personOf(b.who, snapshots).name;
                return (
                  <li key={b.who} className="flex items-center justify-between gap-4 border-b border-solid border-border py-3 last:border-b-0">
                    <span className="min-w-0 truncate text-md leading-md text-text-primary">{name}</span>
                    <Button
                      type="button"
                      hierarchy="secondary"
                      size="lg"
                      aria-label={`Unblock ${name}`}
                      className={TAP}
                      onClick={() => {
                        const r = unblockPerson(me, b.who);
                        setError(r.ok ? null : r.reason);
                        // The row and its button go; the keyboard stays in the dialog.
                        if (r.ok) blockedRef.current?.focus();
                      }}
                    >
                      Unblock
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {error && (
          <p role="alert" className="text-md leading-md text-text-error">
            {error}
          </p>
        )}
      </div>
    </ModalFrame>
  );
}
