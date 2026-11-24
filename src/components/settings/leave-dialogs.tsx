"use client";

// Settings › Account › Sign-in and security: Deactivate account and Delete
// account (owner, 2026-11-24), each a dialog in the Withdraw dialog's frame.
//   Deactivate — one step: what happens (hidden, no time limit, a paid plan
//     stops renewing), then Confirm it's you, then Deactivate account.
//   Delete — three steps: Why you're leaving · What you'll lose · Confirm
//     it's you, whose footer puts Download your information beside the red
//     Delete account (the owner's ask), with the file's progress under it.
// An auction someone bid on stops both; money still moving stops Delete.
// Confirm it's you: the password, or — for an account made with Google or
// Facebook, which has none — the code the web's sign-in already sends.
// Confirming marks the account, stops a paid plan's renewal and signs out
// (components/account-leave/leave.ts); the sign-in page then says what
// happens now. Signing in again makes the account active (lib/account/auth.ts).
// The words are lib/account/closing.ts's, the phone's too.

import * as React from "react";
import Link from "next/link";
import { Banner, Button, ModalFrame, Radio, Skeleton, Textarea } from "@/components/ideeza";
import { leaveAccount } from "@/components/account-leave/leave";
import { useLeaveFacts, type LeaveBlock } from "@/components/account-leave/use-leave-facts";
import { Field, FIELD_ERROR, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { DemoCodeStep } from "@/components/auth/demo-code";
import { leavingNow } from "@/components/auth/auth-gate";
import { isCurrentPassword, useAuth } from "@/lib/account/auth";
import {
  BLOCKED_DEACTIVATE,
  BLOCKED_DELETE,
  deactivateFactsOf,
  deleteFactsOf,
  leftHeadingOf,
  type LeaveFact,
  type LeaveKind,
} from "@/lib/account/closing";
import { phoneAccountOf, usePhoneAccounts } from "@/lib/account/phone";
import { DELETE_GRACE_MS, LEAVE_NOTE_MAX, LEAVE_REASONS } from "@/lib/account/security";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { DownloadStatus, useDownload } from "./data-copy";

export type LeaveDialog = "deactivate" | "delete";

/** Phones get 44 px targets. */
const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]";
const NOTE = "m-0 text-md leading-md text-text-secondary";
const SECTION = "m-0 text-md font-semibold leading-md text-text-primary";
const TEXT_LINK =
  "w-fit cursor-pointer rounded-sm border-0 bg-transparent p-0 text-md font-medium leading-md text-text-link outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";
const OFFLINE = "You’re offline. Try again when you’re back online.";

const subscribeOnline = (on: () => void) => {
  window.addEventListener("online", on);
  window.addEventListener("offline", on);
  return () => {
    window.removeEventListener("online", on);
    window.removeEventListener("offline", on);
  };
};
function useOnline(): boolean {
  return React.useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/** The account's facts as label / value rows. */
function FactRows({ rows }: { rows: LeaveFact[] }) {
  return (
    <dl className="m-0 flex flex-col rounded-lg border border-solid border-border px-[12px]">
      {rows.map((r) => (
        <div key={r.id} className="flex items-baseline justify-between gap-[16px] border-b border-solid border-border py-[10px] last:border-b-0">
          <dt className="shrink-0 text-md leading-md text-text-secondary">{r.label}</dt>
          <dd className="m-0 min-w-0 text-right text-md leading-md text-text-primary [overflow-wrap:anywhere]">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FactBones() {
  return (
    <div aria-label="Loading" role="status" className="flex flex-col gap-[8px]">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} shape="text" size="md" className="w-full" />
      ))}
    </div>
  );
}

/** What has to settle first, each row opening where it gets settled. */
function Blocked({ words, rows }: { words: { title: string; body: string }; rows: LeaveBlock[] }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <Banner tone="error" title={words.title}>
        {words.body}
      </Banner>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((b) => (
          <li key={b.id} className="flex items-baseline justify-between gap-[16px] border-b border-solid border-border py-[10px] last:border-b-0">
            <span className="text-md leading-md text-text-secondary">{b.label}</span>
            <Link href={b.href.web} className={cn(TEXT_LINK, "text-right [overflow-wrap:anywhere]")}>
              {b.value}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Confirm it's you: the password, or the email code for an account with none. */
function useProof(email: string) {
  const passwordless = phoneAccountOf(usePhoneAccounts(), email).passwordless;
  const [password, setPassword] = React.useState("");
  const [wrong, setWrong] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [vouched, setVouched] = React.useState(false);
  return {
    passwordless,
    ready: passwordless ? vouched : !!password,
    /** Checks the password; true when it's theirs (always, for a code already right). */
    check: async () => {
      if (passwordless) return vouched;
      const ok = await isCurrentPassword(email, password);
      setWrong(!ok);
      return ok;
    },
    field: { password, setPassword, wrong, setWrong, sent, setSent, vouched, setVouched },
  };
}

type Proof = ReturnType<typeof useProof>;

function ConfirmItsYou({ email, proof, disabled }: { email: string; proof: Proof; disabled: boolean }) {
  const ids = useFieldIds(["password"] as const);
  const f = proof.field;
  const error = f.wrong ? "That’s not your password." : "";
  return (
    <section className="flex flex-col gap-[12px]" aria-label="Confirm it’s you">
      <h3 className={SECTION}>Confirm it’s you</h3>
      {proof.passwordless ? (
        f.vouched ? (
          <p className="m-0 text-md font-medium leading-md text-text-success">Verified. It’s you.</p>
        ) : f.sent ? (
          <DemoCodeStep email={email} onVerified={() => f.setVouched(true)} />
        ) : (
          <div className="flex flex-col items-start gap-[8px]">
            <p className={NOTE}>You joined with Google or Facebook, so we’ll send a code to {email}.</p>
            <Button type="button" hierarchy="secondary" size="md" className={TAP} disabled={disabled} onClick={() => f.setSent(true)}>
              Send code
            </Button>
          </div>
        )
      ) : (
        <Field label="Password" htmlFor={ids.password.id} error={error} errorId={ids.password.errorId}>
          <PasswordInput
            id={ids.password.id}
            autoComplete="current-password"
            value={f.password}
            disabled={disabled}
            onValueChange={(v) => {
              f.setPassword(v);
              f.setWrong(false);
            }}
            {...errorProps(error, ids.password.errorId)}
          />
        </Field>
      )}
    </section>
  );
}

/** Saves the choice, signs out and opens the sign-in page that says what happens now. */
function useConfirm(kind: LeaveKind, email: string) {
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const run = async (proof: Proof, reason: string) => {
    if (busy) return;
    setFailed(false);
    if (!(await proof.check())) return;
    setBusy(true);
    // The gate stays out of the way: this page reloads to Sign in itself.
    leavingNow();
    const r = await leaveAccount(kind, email, reason);
    if (!r.ok) {
      setBusy(false);
      return setFailed(true);
    }
    window.location.replace(kind === "deactivated" ? "/sign-in?left=deactivated" : `/sign-in?left=deleting&until=${r.until}`);
  };
  return { busy, failed, run };
}

function Failure({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className={FIELD_ERROR}>
      {text}
    </p>
  );
}

// ─────────────────────────── Deactivate account ───────────────────────────

export function DeactivateDialog({ onClose, onSwitch }: { onClose: () => void; onSwitch: () => void }) {
  const { account } = useAuth();
  const email = account?.email ?? "";
  const dates = useDates();
  const online = useOnline();
  const { ready, facts, bids } = useLeaveFacts();
  const proof = useProof(email);
  const confirm = useConfirm("deactivated", email);
  const ends = facts.plan ? dates.date(facts.plan.endsAt, { style: "medium" }) : "";
  const blocked = bids.length > 0;
  const can = ready && !blocked && proof.ready && online && !confirm.busy;
  const close = () => {
    if (!confirm.busy) onClose();
  };

  return (
    <ModalFrame
      open
      onClose={close}
      closeUnavailable={confirm.busy}
      size="sm"
      sheet
      title="Deactivate account"
      description={leftHeadingOf("deactivated", "Sign in", "").line}
      footer={
        <div className="flex w-full flex-col gap-[8px]">
          <Failure text={confirm.failed ? "Couldn’t deactivate your account. Nothing changed. Try again." : !online ? OFFLINE : null} />
          <div className="flex flex-wrap items-center justify-end gap-[8px]">
            <Button type="button" hierarchy="secondary" size="lg" className={TAP} disabled={confirm.busy} onClick={close}>
              Cancel
            </Button>
            <Button type="button" hierarchy="primary" size="lg" className={TAP} loading={confirm.busy} disabled={!can} onClick={() => void confirm.run(proof, "")}>
              Deactivate account
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-[20px]">
        {blocked && <Blocked words={BLOCKED_DEACTIVATE} rows={bids} />}
        <section className="flex flex-col gap-[12px]" aria-label="What happens">
          <h3 className={SECTION}>What happens</h3>
          {ready ? <FactRows rows={deactivateFactsOf(facts, "Sign in", ends)} /> : <FactBones />}
        </section>
        {!blocked && <ConfirmItsYou email={email} proof={proof} disabled={confirm.busy} />}
        <button type="button" className={TEXT_LINK} disabled={confirm.busy} onClick={onSwitch}>
          Want to leave for good? Delete account
        </button>
      </div>
    </ModalFrame>
  );
}

// ─────────────────────────── Delete account ───────────────────────────

const STEPS = ["Why you’re leaving", "What you’ll lose", "Confirm it’s you"] as const;

export function DeleteDialog({ onClose, onSwitch }: { onClose: () => void; onSwitch: () => void }) {
  const { account } = useAuth();
  const email = account?.email ?? "";
  const dates = useDates();
  const online = useOnline();
  const { ready, facts, bids, payouts } = useLeaveFacts();
  const proof = useProof(email);
  const confirm = useConfirm("deleting", email);
  const dl = useDownload();
  const ids = useFieldIds(["note"] as const);
  const name = React.useId();
  const [at, setAt] = React.useState(0);
  const [reason, setReason] = React.useState("");
  const [note, setNote] = React.useState("");
  const [now] = React.useState(() => Date.now());
  const ends = facts.plan ? dates.date(facts.plan.endsAt, { style: "medium" }) : "";
  const until = dates.date(now + DELETE_GRACE_MS, { style: "medium" });
  const blocks = [...bids, ...payouts];
  const making = !!dl.busy;
  const made = dl.from === "leave" && !!dl.made;
  const close = () => {
    if (!confirm.busy) onClose();
  };
  const why = [LEAVE_REASONS.find((r) => r.id === reason)?.label, note.trim()].filter(Boolean).join(" · ");

  const footer =
    at < 2 ? (
      <div className="flex w-full flex-wrap items-center justify-end gap-[8px]">
        {at > 0 && (
          <Button type="button" hierarchy="ghost" size="lg" className={cn("mr-auto", TAP)} onClick={() => setAt(at - 1)}>
            Back
          </Button>
        )}
        <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={close}>
          Cancel
        </Button>
        <Button type="button" hierarchy="primary" size="lg" className={TAP} disabled={at === 1 && (!ready || blocks.length > 0)} onClick={() => setAt(at + 1)}>
          Continue
        </Button>
      </div>
    ) : (
      <div className="flex w-full flex-col gap-[8px]">
        <Failure text={confirm.failed ? "Couldn’t delete your account. Nothing changed. Try again." : !online ? OFFLINE : null} />
        <div className="flex flex-wrap items-center justify-end gap-[8px]">
          <Button type="button" hierarchy="ghost" size="lg" className={cn("mr-auto", TAP)} disabled={confirm.busy} onClick={() => setAt(1)}>
            Back
          </Button>
          {/* The owner's ask: a copy, right beside the button that deletes. */}
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} loading={making} disabled={confirm.busy} onClick={() => void dl.start("leave")}>
            {made ? "Download again" : "Download your information"}
          </Button>
          <Button
            type="button"
            hierarchy="danger"
            size="lg"
            className={TAP}
            loading={confirm.busy}
            disabled={!proof.ready || making || !online || confirm.busy}
            onClick={() => void confirm.run(proof, why)}
          >
            Delete account
          </Button>
        </div>
      </div>
    );

  return (
    <ModalFrame
      open
      onClose={close}
      closeUnavailable={confirm.busy}
      size="sm"
      sheet
      role={at === 2 ? "alertdialog" : "dialog"}
      title="Delete account"
      description={`Step ${at + 1} of ${STEPS.length}: ${STEPS[at]}`}
      footer={footer}
    >
      <div className="flex flex-col gap-[20px]">
        {at === 0 && (
          <>
            <p className={NOTE}>Optional. It helps us make IDEEZA better.</p>
            <div role="radiogroup" aria-label="Why are you leaving?" className="flex flex-col">
              {LEAVE_REASONS.map((r) => (
                <label
                  key={r.id}
                  className="flex min-h-[var(--touch-min)] cursor-pointer items-center gap-[12px] rounded-lg px-[12px] py-[8px] hover:bg-bg-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus"
                >
                  <input type="radio" name={name} checked={reason === r.id} onChange={() => setReason(r.id)} className="sr-only" />
                  <Radio checked={reason === r.id} decorative />
                  <span className="text-md font-medium leading-md text-text-primary">{r.label}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-[6px]">
              <label htmlFor={ids.note.id} className="sr-only">
                Tell us more (optional)
              </label>
              <Textarea
                id={ids.note.id}
                rows={3}
                value={note}
                onValueChange={(v) => setNote(v.slice(0, LEAVE_NOTE_MAX))}
                placeholder="Tell us more (optional)"
                maxLength={LEAVE_NOTE_MAX}
              />
              <p className="m-0 text-sm leading-sm tabular-nums text-text-tertiary">
                {note.length}/{LEAVE_NOTE_MAX}
              </p>
            </div>
            <button type="button" className={TEXT_LINK} onClick={onSwitch}>
              Need a pause? Deactivate instead
            </button>
          </>
        )}

        {at === 1 && (
          <>
            <p className={NOTE}>After {until} this can’t be undone.</p>
            {blocks.length > 0 && <Blocked words={BLOCKED_DELETE} rows={blocks} />}
            {ready ? <FactRows rows={deleteFactsOf(facts, ends)} /> : <FactBones />}
            {facts.available && (
              <p className={NOTE}>
                After {until} your available balance is gone with your account.{" "}
                <Link href="/settings/get-paid" className={TEXT_LINK}>
                  Withdraw money first
                </Link>
              </p>
            )}
          </>
        )}

        {at === 2 && (
          <>
            <ConfirmItsYou email={email} proof={proof} disabled={confirm.busy} />
            <Banner tone="info" title={`Deleted on ${until}`}>
              Sign in before then and it’s active again.
            </Banner>
            <DownloadStatus dl={dl} where="leave" />
          </>
        )}
      </div>
    </ModalFrame>
  );
}
