"use client";

// Delete account, in three steps (Account · 2026 update AU-60…64, owner
// 2026-11-24):
// 1 why you're leaving (optional, Continue always on), with the two lighter
//   ways: Deactivate instead (hidden until the next Log In, no time limit) and
//   Take a break (quiet messages and comments for a while);
// 2 what you'll lose, with this account's real counts (lib/account/closing.ts
//   deleteFactsOf); blocked while money is moving (a payout not complete, an
//   auction someone bid on), each row opening where it gets settled;
// 3 confirm it's you (the password; Google or Facebook once more for an
//   account with no password), with "Download your information" right beside
//   Delete account (owner) — made at once on the phone; Delete waits for it.
// The furthest step reached, the reason and the note are kept for the tab
// (sessionStorage), so a reload stays where it was. Deleting signs out at once
// and /m/left says what happens now: deleted on <date>, Log In before then and
// it's active again (lib/account/auth.ts comeBack, on the website too).
// Nothing is taken down: what's on sale is hidden with the account and comes
// back with it; a paid plan stops renewing.

import * as React from "react";
import { Download04Icon, PauseIcon, UserBlock01Icon } from "@hugeicons/core-free-icons";
import { useRouter, useSearchParams } from "next/navigation";
import { leaveAccount } from "@/components/account-leave/leave";
import { Icon } from "@/components/dashboard/icon";
import { useLeaveFacts } from "@/components/account-leave/use-leave-facts";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Textarea } from "@/components/ideeza/text-input";
import { useAuth } from "@/lib/account/auth";
import { BLOCKED_DELETE, deleteFactsOf } from "@/lib/account/closing";
import { DELETE_GRACE_MS, LEAVE_NOTE_MAX, LEAVE_REASONS } from "@/lib/account/security";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading } from "../account/parts";
import { BottomBar } from "../kit/bottom-bar";
import { T } from "../type";
import { useOnline } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { useConfirmItsYou } from "./confirm-its-you";
import { DownloadStatus, useDownload } from "./data-download";
import { SettingsGroup, SettingsRow } from "./kit";

const STEPS = ["Why you’re leaving", "What you’ll lose", "Confirm it’s you"] as const;
const LAST = STEPS.length;

/** What this tab keeps across a reload: the furthest step reached, the reason and the note. */
type Kept = { reached: number; reason: string; note: string };
const KEPT_KEY = "ideeza:m:delete-reached";
const NONE: Kept = { reached: 1, reason: "", note: "" };
let keptCache: { raw: string | null; value: Kept } = { raw: null, value: NONE };
const readKept = (): Kept => {
  try {
    const raw = window.sessionStorage.getItem(KEPT_KEY);
    if (raw === keptCache.raw) return keptCache.value;
    // An older tab kept only the step number.
    const v = raw ? (JSON.parse(raw) as Partial<Kept> | number) : null;
    const o = typeof v === "number" ? { reached: v } : (v ?? {});
    const value: Kept = {
      reached: Math.max(1, Math.min(LAST, Number(o.reached) || 1)),
      reason: LEAVE_REASONS.some((r) => r.id === o.reason) ? String(o.reason) : "",
      note: typeof o.note === "string" ? o.note.slice(0, LEAVE_NOTE_MAX) : "",
    };
    keptCache = { raw, value };
    return value;
  } catch {
    return NONE;
  }
};
const writeKept = (k: Kept) => {
  try {
    if (k.reached > 1 || k.reason || k.note) window.sessionStorage.setItem(KEPT_KEY, JSON.stringify(k));
    else window.sessionStorage.removeItem(KEPT_KEY);
  } catch {
    // Private mode: it just isn't kept across a reload.
  }
};
const noSubscribe = () => () => {};

export function DeleteAccount() {
  const router = useRouter();
  const params = useSearchParams();
  const online = useOnline();
  const dates = useDates();
  const { account } = useAuth();
  const email = account?.email ?? "";
  const { ready, facts, bids, payouts } = useLeaveFacts();
  const dl = useDownload();
  const proof = useConfirmItsYou(email, "delete");
  const ids = React.useId();
  // After a reload the tab remembers how far it got (the server can't know: step 1 there).
  const stored = React.useSyncExternalStore(noSubscribe, readKept, () => NONE);
  const [kept, setKept] = React.useState<Kept | null>(null);
  const k = kept ?? stored;
  const keep = (patch: Partial<Kept>) => {
    const next = { ...k, ...patch };
    setKept(next);
    writeKept(next);
  };
  // Each step is its own address, so Back goes to the step before; a step not reached yet opens the furthest.
  const step = Math.min(k.reached, Math.max(1, Math.min(LAST, Number(params.get("step")) || 1)));
  const go = (n: number) => {
    keep({ reached: Math.max(k.reached, n) });
    router.push(`/m/settings/delete?step=${n}`);
  };
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [now] = React.useState(() => Date.now());
  const until = dates.date(now + DELETE_GRACE_MS, { style: "medium" });
  const ends = facts.plan ? dates.date(facts.plan.endsAt, { style: "medium" }) : "";
  const moving = [...bids, ...payouts];

  const remove = async () => {
    if (!online || busy || dl.busy || !proof.confirmable) return;
    setBusy(true);
    setFailed(false);
    if (!(await proof.verify())) return setBusy(false);
    const why = [LEAVE_REASONS.find((r) => r.id === k.reason)?.label, k.note.trim()].filter(Boolean).join(" · ");
    const done = await leaveAccount("deleting", email, why);
    if (!done.ok) {
      setBusy(false);
      return setFailed(true);
    }
    writeKept(NONE);
    window.location.replace(`/m/left?left=deleting&until=${done.until}`);
  };

  const stay = () => {
    writeKept(NONE);
    router.replace("/m/settings/security");
  };

  const footer =
    step === LAST ? (
      <BottomBar>
        <Button hierarchy="danger" size="xl" className="w-full" loading={busy} disabled={!online || !proof.confirmable || !!dl.busy} onClick={() => void remove()}>
          Delete account
        </Button>
        {/* Owner: a copy right beside Delete, never in its way. */}
        <Button hierarchy="secondary" size="xl" className="w-full" loading={!!dl.busy} disabled={busy} iconLeading={<Icon icon={Download04Icon} size={20} />} onClick={() => void dl.start()}>
          {dl.made ? "Download again" : "Download your information"}
        </Button>
        <Button hierarchy="ghost" size="xl" className="w-full" disabled={busy} onClick={stay}>
          Keep my account
        </Button>
      </BottomBar>
    ) : (
      <BottomBar>
        <Button size="xl" className="w-full" disabled={step === 2 && (!ready || moving.length > 0)} onClick={() => go(step + 1)}>
          Continue
        </Button>
      </BottomBar>
    );

  return (
    <Screen top={<TopBar back={step === 1 ? "/m/settings/security" : true} title="Delete account" />} footer={footer}>
      <div className={ACCOUNT_CONTENT}>
        <div className="flex flex-col gap-2">
          <p className={T.meta}>
            Step {step} of {LAST} · {STEPS[step - 1]}
          </p>
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <ProgressBar key={s} value={i < step ? 100 : 0} label={`Step ${i + 1}: ${s}`} className="flex-1" />
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <AccountHeading title="Why are you leaving?">Optional. It helps us make IDEEZA better.</AccountHeading>
            <div role="radiogroup" aria-label="Why are you leaving?" className="flex flex-col">
              {LEAVE_REASONS.map((r) => (
                <label key={r.id} className="relative flex min-h-[44px] cursor-pointer items-center gap-8 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
                  <input type="radio" name="leave" className="sr-only" checked={k.reason === r.id} onChange={() => keep({ reason: r.id })} />
                  <Radio checked={k.reason === r.id} decorative />
                  <span className={T.bodyLg}>{r.label}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={ids} className="sr-only">
                Tell us more (optional)
              </label>
              <Textarea
                id={ids}
                rows={3}
                value={k.note}
                onValueChange={(v) => keep({ note: v.slice(0, LEAVE_NOTE_MAX) })}
                placeholder="Tell us more (optional)"
                maxLength={LEAVE_NOTE_MAX}
              />
              <p className={cn(T.meta, "text-text-tertiary tabular-nums")}>
                {k.note.length}/{LEAVE_NOTE_MAX}
              </p>
            </div>
            <SettingsGroup>
              <SettingsRow icon={UserBlock01Icon} label="Need a pause? Deactivate instead" helper="Hidden until you Log In again. No time limit." href="/m/settings/deactivate" />
              <SettingsRow icon={PauseIcon} label="Or take a break" helper="Quiet messages and comments for a while." href="/m/settings/privacy?open=break" />
            </SettingsGroup>
          </>
        )}

        {step === 2 && (
          <>
            <AccountHeading title="What you’ll lose">After 30 days this can’t be undone.</AccountHeading>
            {moving.length > 0 && (
              <div className="flex flex-col gap-4">
                <AccountAlert alert={{ tone: "error", ...BLOCKED_DELETE }} />
                <SettingsGroup>
                  {moving.map((m) => (
                    <SettingsRow key={m.id} label={m.label} value={<span className="text-text-primary">{m.value}</span>} href={m.href.phone} />
                  ))}
                </SettingsGroup>
              </div>
            )}
            {ready && (
              <SettingsGroup>
                {deleteFactsOf(facts, ends).map((r) => (
                  <SettingsRow key={r.id} label={r.label} helper={r.value} />
                ))}
              </SettingsGroup>
            )}
            {facts.available && (
              <SettingsGroup footer={`After ${until} it’s gone with your account.`}>
                <SettingsRow label="Withdraw money first" href="/m/settings/idz-pay/withdraw" />
              </SettingsGroup>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <AccountHeading title="Confirm it’s you">{proof.lead}</AccountHeading>
            <AccountAlert
              alert={
                !online
                  ? { tone: "attention", title: "You’re offline", body: "Try again when you’re back online." }
                  : failed
                    ? { tone: "error", title: "Couldn’t delete your account", body: "Nothing changed. Try again." }
                    : null
              }
            />
            {proof.fields}
            <AccountAlert alert={{ tone: "info", title: `Deleted on ${until}`, body: "Until then your account is hidden. Log In before then and it’s active again." }} />
            <DownloadStatus dl={dl} />
          </>
        )}
      </div>
      {proof.sheet}
    </Screen>
  );
}
