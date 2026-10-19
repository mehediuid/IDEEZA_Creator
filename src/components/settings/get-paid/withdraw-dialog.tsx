"use client";

// Withdraw (Settings v2, V7): one dialog, in steps, asking only what is
// missing (`withdrawStepsOf`):
// 1. Verify your identity (Level 1), the first time only.
// 2. Where the money goes: a wallet address and its network, the first time
//    only (no method is asked before; selling never asks it).
// 3. The amount (the whole balance, or another amount up to it), with the
//    full address, the network and the token you're paid in, the fee
//    ($0.00) and the total, all shown before signing.
// Sign and withdraw opens the demo wallet's signing dialog with the same
// rows. One signature covers a first withdrawal's new method too: it is
// saved as your default and logged for the bell. The wallet re-checks the
// balance just before it confirms; the withdrawal is then recorded
// (complete: the demo has no one to process it, and no coins move).

import * as React from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ModalFrame, Radio, SelectMenu, TestnetDemoBadge, TextInput } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import {
  addMethod,
  centsFloor,
  formatUsd,
  recordWithdrawal,
  subtractWithdrawn,
  withdrawAmountProblem,
  withdrawStepsOf,
  type PayoutStore,
  type Withdrawal,
  type WithdrawStep,
} from "@/lib/account/payout";
import { readPayoutNow, updatePayout } from "@/lib/account/use-payout";
import { randomId } from "@/lib/market/sales";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { compareAmounts, formatAmount, normalizeAmount } from "@/lib/wallet/money";
import { SAVE_FAILED } from "../settings-card";
import { IdentityForm } from "./identity";
import { MethodFields, useMethodForm, type MethodDraft } from "./method-dialog";
import { FIELD_ERROR, FIELD_HELP, FIELD_LABEL, FullAddress, networkName, TAP } from "./parts";

const ROW = "flex items-baseline justify-between gap-[16px] text-md leading-md";

const STEP_NAME: Record<WithdrawStep, string> = {
  identity: "Verify your identity",
  method: "Where the money goes",
  amount: "How much",
};

/** "WD7K2M9QX4LP": a reference to quote. */
function referenceId(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "WD";
  for (const b of crypto.getRandomValues(new Uint8Array(10))) id += A[b % A.length];
  return id;
}

type Props = {
  store: PayoutStore;
  /** Everything your sales have paid you, in dollars; the balance is this less every withdrawal. */
  earned: string;
  /** Level 1 is done. */
  verified: boolean;
  onClose: () => void;
  /** After it's recorded, with the sentence for the page's live region. */
  onDone: (message: string) => void;
  /** "See it in history": close, then land on the history. */
  onShowHistory: () => void;
};

export function WithdrawDialog({ open, ...props }: Props & { open: boolean }) {
  return open ? <WithdrawBody {...props} /> : null;
}

/** Where a withdrawal goes: an existing method, or the first one, typed in this flow. */
type Target = { label: string; address: string; network: MethodDraft["network"]; methodId: string | null; draft: MethodDraft | null };

function WithdrawBody({ store, earned, verified, onClose, onDone, onShowHistory }: Props) {
  const { request } = useWalletRequest();
  // The steps are fixed when the dialog opens, so finishing one doesn't renumber the rest.
  const [steps] = React.useState(() => withdrawStepsOf({ verified, methods: store.methods.length }));
  const [at, setAt] = React.useState(0);
  const step = steps[at];
  const form = useMethodForm(store);
  const [methodProblem, setMethodProblem] = React.useState<string | null>(null);
  const [methodId, setMethodId] = React.useState<string | null>(store.defaultMethodId);
  const [mode, setMode] = React.useState<"full" | "other">("full");
  const [other, setOther] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<Withdrawal | null>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const otherRef = React.useRef<HTMLInputElement>(null);
  const addressRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();
  const name = React.useId();
  const ids = { other: React.useId(), otherMsg: React.useId() };

  // Each step starts at its first field.
  React.useEffect(() => {
    if (at === 0) return;
    bodyRef.current?.querySelector<HTMLElement>("input:not([type=radio]), input:checked, button")?.focus();
  }, [at]);

  const available = centsFloor(subtractWithdrawn(earned, store.withdrawals));
  const problem = mode === "other" ? withdrawAmountProblem(other, available) : null;
  const amount = mode === "full" ? available : problem ? null : normalizeAmount(other.trim());
  const token = store.getPaidIn;
  const firstMethod = steps.includes("method");
  const chosen = store.methods.find((m) => m.id === methodId) ?? null;
  const target: Target | null = firstMethod
    ? { ...form.draft, label: form.draft.label.trim() || "Crypto wallet", methodId: null, draft: form.draft }
    : chosen
      ? { label: chosen.label, address: chosen.address, network: chosen.network, methodId: chosen.id, draft: null }
      : null;

  const next = () => {
    setFailure(null);
    setAt((i) => Math.min(i + 1, steps.length - 1));
  };

  const continueFromMethod = () => {
    const p = form.problemOf(store);
    if (p) {
      setMethodProblem(p);
      if (form.state.source === "paste") addressRef.current?.focus();
      return;
    }
    next();
  };

  const withdraw = async () => {
    if (busy) return;
    setFailure(null);
    if (problem || !amount || compareAmounts(amount, "0") <= 0 || !target) {
      setShown(true);
      if (problem) otherRef.current?.focus();
      return;
    }
    const reference = referenceId();
    const newId = target.draft ? randomId("wm_") : null;
    setBusy(true);
    const result = await request(
      {
        kind: "signature",
        purpose: "withdraw",
        identity: "maker",
        network: target.network,
        title: "Withdraw your earnings",
        summary: [
          { label: "Amount", value: `${formatUsd(amount)} (demo rate)` },
          { label: "You receive", value: formatAmount(amount, token) },
          { label: "To", value: target.label },
          { label: "Address", value: target.address },
          { label: "Network", value: networkName(target.network) },
          { label: "Withdrawal fee", value: "$0.00" },
          ...(target.draft ? [{ label: "New withdrawal method", value: "Saved as your default" }] : []),
        ],
        note: "Testnet demo. Signing records the withdrawal in Get paid; no coins move and nothing is charged.",
        doneLine: "Withdrawal recorded in Get paid.",
      },
      {
        recheck: () => {
          const now = subtractWithdrawn(earned, readPayoutNow().withdrawals);
          return compareAmounts(amount, now) > 0 ? `Your balance changed: it's ${formatUsd(now)} now. Choose a smaller amount.` : null;
        },
        commit: (proof) => {
          let refusal: string | null = null;
          const ok = updatePayout((s) => {
            let store2 = s;
            let id = target.methodId;
            if (target.draft && newId) {
              const r = addMethod(s, target.draft, proof.at, newId, proof.signature);
              if (!r.ok) {
                refusal = r.problem === "duplicate" ? "This address became one of your withdrawal methods meanwhile. Close and withdraw again." : SAVE_FAILED;
                return s;
              }
              store2 = r.store;
              id = r.method.id;
            }
            const w: Withdrawal = {
              id: reference,
              amount,
              token,
              methodId: id,
              to: { label: target.label, address: target.address, network: target.network },
              at: proof.at,
              status: "complete",
            };
            if (proof.signature) w.signature = proof.signature;
            return recordWithdrawal(store2, w);
          });
          if (refusal) return { ok: false, message: refusal, conflict: true };
          return ok ? { ok: true } : { ok: false, message: SAVE_FAILED };
        },
      },
    );
    setBusy(false);
    if (result.ok) {
      setSent({
        id: reference,
        amount,
        token,
        methodId: target.methodId,
        to: { label: target.label, address: target.address, network: target.network },
        at: result.proof.at,
        status: "complete",
      });
      onDone(`Withdrawal of ${formatUsd(amount)} recorded.`);
    } else if (result.reason !== "rejected") {
      setFailure(result.message ?? "The wallet didn't confirm it. Nothing was withdrawn; try again.");
    }
  };

  if (sent) {
    return (
      <ModalFrame open onClose={onClose} size="sm" sheet title="Withdrawal recorded">
        <div className="flex flex-col items-start gap-[12px]">
          <span aria-hidden className="text-text-success">
            <Icon icon={CheckmarkCircle02Icon} size={32} />
          </span>
          <p className="m-0 text-md leading-md text-text-primary">
            {formatUsd(sent.amount)} as {formatAmount(sent.amount, sent.token)} to {sent.to.label} on{" "}
            {sent.to.network ? networkName(sent.to.network) : "its network"}, reference <span className="font-mono">{sent.id}</span>.
          </p>
          <p className="m-0 flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
            <TestnetDemoBadge /> Recorded as complete. No coins moved.
          </p>
          <div className="flex w-full flex-wrap justify-end gap-[8px] pt-[8px]">
            <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
              Close
            </Button>
            <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={onShowHistory}>
              See it in history
            </Button>
          </div>
        </div>
      </ModalFrame>
    );
  }

  const primary =
    step === "identity" ? (
      <Button type="submit" form={formId} hierarchy="primary" size="lg" className={TAP}>
        Verify and continue
      </Button>
    ) : step === "method" ? (
      <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={continueFromMethod}>
        Continue
      </Button>
    ) : (
      <Button type="button" hierarchy="primary" size="lg" loading={busy} className={TAP} onClick={withdraw}>
        Sign and withdraw
      </Button>
    );

  return (
    <ModalFrame
      open
      onClose={onClose}
      covered={busy}
      size="sm"
      sheet
      title="Withdraw"
      description={steps.length > 1 ? `Step ${at + 1} of ${steps.length}: ${STEP_NAME[step]}` : undefined}
      footer={
        <div className="flex w-full flex-col gap-[8px]">
          {failure && (
            <p role="alert" className={FIELD_ERROR}>
              {failure}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-[8px]">
            {at > 0 && (
              <Button type="button" hierarchy="ghost" size="lg" className={cn("mr-auto", TAP)} onClick={() => setAt(at - 1)}>
                Back
              </Button>
            )}
            <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
              Cancel
            </Button>
            {primary}
          </div>
        </div>
      }
    >
      <div ref={bodyRef} className="flex flex-col gap-[20px]">
        {step === "identity" && (
          <>
            <p className="m-0 text-md leading-md text-text-secondary">Your first withdrawal asks who is withdrawing. You do this once.</p>
            <IdentityForm formId={formId} onVerified={next} />
          </>
        )}

        {step === "method" && (
          <>
            <p className="m-0 text-md leading-md text-text-secondary">
              Where should withdrawals go? This becomes your default withdrawal method; you can add others later.
            </p>
            <MethodFields form={form} problem={methodProblem} onEdit={() => setMethodProblem(null)} addressRef={addressRef} />
          </>
        )}

        {step === "amount" && (
          <>
            <div className="flex items-center justify-between gap-[16px] rounded-xl bg-bg-subtle p-[16px]">
              <span className="text-md leading-md text-text-secondary">Available to withdraw</span>
              <span className="text-lg font-semibold leading-lg tabular-nums text-text-primary">{formatUsd(available)}</span>
            </div>

            <fieldset className="m-0 flex flex-col gap-[4px] border-0 p-0">
              <legend className={cn(FIELD_LABEL, "mb-[6px] p-0")}>Amount</legend>
              {(
                [
                  ["full", formatUsd(available), "Your whole balance"],
                  ["other", "Another amount", null],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className="flex min-h-[var(--touch-min)] cursor-pointer items-center gap-[12px] rounded-lg px-[12px] py-[8px] hover:bg-bg-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus"
                >
                  <input
                    type="radio"
                    name={name}
                    checked={mode === value}
                    onChange={() => {
                      setMode(value);
                      if (value === "other") window.setTimeout(() => otherRef.current?.focus(), 0);
                    }}
                    className="sr-only"
                  />
                  <Radio checked={mode === value} decorative />
                  <span className="text-md font-medium leading-md tabular-nums text-text-primary">{label}</span>
                  {hint && <span className="text-sm leading-sm text-text-tertiary">{hint}</span>}
                </label>
              ))}
              {mode === "other" && (
                <div className="flex flex-col gap-[6px] pl-[12px]">
                  <label htmlFor={ids.other} className="sr-only">
                    Amount, in US dollars
                  </label>
                  <TextInput
                    ref={otherRef}
                    id={ids.other}
                    size="lg"
                    inputMode="decimal"
                    value={other}
                    onValueChange={setOther}
                    onBlur={() => setShown(true)}
                    autoComplete="off"
                    placeholder="0.00"
                    suffix="USD"
                    invalid={shown && !!problem}
                    aria-invalid={(shown && !!problem) || undefined}
                    aria-describedby={ids.otherMsg}
                  />
                  <p id={ids.otherMsg} className={shown && problem ? FIELD_ERROR : FIELD_HELP}>
                    {shown && problem ? problem : `Up to ${formatUsd(available)}`}
                  </p>
                </div>
              )}
            </fieldset>

            {!firstMethod && (
              <SelectMenu
                label="Send to"
                placeholder="Choose a withdrawal method"
                value={methodId}
                onChange={setMethodId}
                options={store.methods.map((m) => ({ value: m.id, label: m.label, sub: `${networkName(m.network)} · ${shortAddress(m.address)}` }))}
                error={shown && !chosen ? "Choose where the money goes." : undefined}
              />
            )}

            {target && (
              <dl className="m-0 flex flex-col gap-[10px] rounded-xl border border-solid border-border p-[16px]">
                <div className="flex flex-col gap-[2px]">
                  <dt className="text-sm leading-sm text-text-secondary">To</dt>
                  <dd className="m-0 flex flex-col gap-[2px] text-md leading-md text-text-primary">
                    <span className="font-medium">
                      {target.label}
                      {target.draft && <span className="font-regular text-text-secondary"> · new, becomes your default</span>}
                    </span>
                    <FullAddress address={target.address} className="text-sm leading-sm" />
                  </dd>
                </div>
                <div className={ROW}>
                  <dt className="text-text-secondary">Network</dt>
                  <dd className="m-0 text-right text-text-primary">{networkName(target.network)}</dd>
                </div>
                <div className={ROW}>
                  <dt className="text-text-secondary">You receive</dt>
                  <dd className="m-0 tabular-nums text-text-primary">{amount ? formatAmount(amount, token) : "—"}</dd>
                </div>
                <div className={ROW}>
                  <dt className="text-text-secondary">Withdrawal fee</dt>
                  <dd className="m-0 tabular-nums text-text-primary">$0.00</dd>
                </div>
                <div className={cn(ROW, "border-t border-solid border-border pt-[10px]")}>
                  <dt className="font-semibold text-text-primary">Total</dt>
                  <dd className="m-0 font-semibold tabular-nums text-text-primary">{amount ? formatUsd(amount) : "—"}</dd>
                </div>
              </dl>
            )}
            <p className="m-0 flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
              <TestnetDemoBadge />
              {`Paid in ${token}${token === "IDZ" ? " at the demo rate 1 IDZ = $1" : " (1 USDT = $1)"}. You sign it in the demo wallet.`}
            </p>
          </>
        )}
      </div>
    </ModalFrame>
  );
}
