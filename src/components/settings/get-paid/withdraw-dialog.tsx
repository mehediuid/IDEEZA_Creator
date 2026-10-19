"use client";

// Withdraw Money (User Panel V2 41537:182611, Other amount 41537:182718, Sent
// 41537:182932): the available balance, the withdrawal method (the default
// first), the amount (the whole balance, or another amount up to it), the
// fee ($0.00), what you receive in your Get paid in token and the total. Then
// Withdraw confirms in the Demo wallet's signing dialog (Figma's emailed OTP
// waits for sign-in, D18): a signature, nothing charged, labelled Testnet
// demo. The wallet re-checks the balance just before it confirms, then the
// withdrawal is recorded (complete: the demo has no one to process it) and
// the balance drops. The dialog ends on Figma's "sent" screen with the way
// to the history.

import * as React from "react";
import Link from "next/link";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ModalFrame, Radio, SelectMenu, TestnetDemoBadge, TextInput, buttonVariants } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import {
  centsFloor,
  formatUsd,
  recordWithdrawal,
  subtractWithdrawn,
  withdrawAmountProblem,
  type PayoutStore,
  type Withdrawal,
} from "@/lib/account/payout";
import { readPayoutNow, updatePayout } from "@/lib/account/use-payout";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { compareAmounts, formatAmount, normalizeAmount } from "@/lib/wallet/money";
import { SAVE_FAILED } from "../settings-card";
import { GET_PAID_HISTORY } from "./parts";

const LABEL = "text-md font-medium leading-md text-text-primary";
const ERROR = "m-0 text-sm leading-sm text-text-error";
const ROW = "flex items-center justify-between gap-[16px] text-md leading-md";

/** "WD7K2M9QX4LP": a reference to quote, as Figma's Transaction ID. */
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
  onClose: () => void;
  /** After it's recorded, with the sentence for the page's live region. */
  onDone: (message: string) => void;
};

export function WithdrawDialog({ open, ...props }: Props & { open: boolean }) {
  return open ? <WithdrawBody {...props} /> : null;
}

function WithdrawBody({ store, earned, onClose, onDone }: Props) {
  const { request } = useWalletRequest();
  const available = centsFloor(subtractWithdrawn(earned, store.withdrawals));
  const [methodId, setMethodId] = React.useState<string | null>(store.defaultMethodId);
  const [mode, setMode] = React.useState<"full" | "other">("full");
  const [other, setOther] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<Withdrawal | null>(null);
  const otherRef = React.useRef<HTMLInputElement>(null);
  const fullRef = React.useRef<HTMLInputElement>(null);
  const name = React.useId();
  const ids = { other: React.useId(), otherMsg: React.useId() };

  const method = store.methods.find((m) => m.id === methodId) ?? null;
  const problem = mode === "other" ? withdrawAmountProblem(other, available) : null;
  const amount = mode === "full" ? available : (problem ? null : normalizeAmount(other.trim()));
  const token = store.getPaidIn;

  const withdraw = async () => {
    if (busy) return;
    setFailure(null);
    if (problem || !amount || compareAmounts(amount, "0") <= 0 || !method) {
      setShown(true);
      if (problem) otherRef.current?.focus();
      return;
    }
    const w: Withdrawal = {
      id: referenceId(),
      amount,
      token,
      methodId: method.id,
      to: { label: method.label, address: method.address },
      at: Date.now(),
      status: "complete",
    };
    setBusy(true);
    const result = await request(
      {
        kind: "signature",
        purpose: "withdraw",
        identity: "maker",
        network: "baseSepolia",
        title: "Withdraw your earnings",
        summary: [
          { label: "Amount", value: formatUsd(amount) },
          { label: "You receive", value: formatAmount(amount, token) },
          { label: "To", value: `${method.label} · ${shortAddress(method.address)}` },
          { label: "Withdrawal fee", value: "$0.00" },
        ],
        note: "Testnet demo. Signing records the withdrawal in Get Paid; no coins move and nothing is charged.",
        doneLine: "Withdrawal recorded in Get Paid.",
      },
      {
        recheck: () => {
          const now = subtractWithdrawn(earned, readPayoutNow().withdrawals);
          return compareAmounts(amount, now) > 0 ? `Your balance changed: it's ${formatUsd(now)} now. Choose a smaller amount.` : null;
        },
        commit: (proof) => {
          const ok = updatePayout((s) => recordWithdrawal(s, { ...w, at: proof.at, ...(proof.signature ? { signature: proof.signature } : null) }));
          return ok ? { ok: true } : { ok: false, message: SAVE_FAILED };
        },
      },
    );
    setBusy(false);
    if (result.ok) {
      setSent({ ...w, at: result.proof.at });
      onDone(`Withdrawal of ${formatUsd(amount)} recorded.`);
    } else if (result.reason !== "rejected") {
      setFailure(result.message ?? "The wallet didn't confirm it. Nothing was withdrawn; try again.");
    }
  };

  if (sent) {
    return (
      <ModalFrame open onClose={onClose} size="sm" title="Withdraw Request Sent">
        <div className="flex flex-col items-start gap-[16px]">
          <span aria-hidden className="text-text-success">
            <Icon icon={CheckmarkCircle02Icon} size={32} />
          </span>
          <p className="m-0 text-lg leading-lg text-text-primary">
            {formatUsd(sent.amount)} as {formatAmount(sent.amount, sent.token)} to {sent.to.label} is recorded as complete.
          </p>
          <p className="m-0 flex flex-wrap items-center gap-[8px] text-md leading-md text-text-secondary">
            <TestnetDemoBadge /> No coins moved. You can find it any time in your withdrawal history.
          </p>
          <div className="flex w-full flex-wrap justify-end gap-[8px] pt-[8px]">
            <Button type="button" hierarchy="secondary" size="lg" onClick={onClose}>
              Close
            </Button>
            <Link href={GET_PAID_HISTORY} className={buttonVariants({ hierarchy: "primary", size: "lg" })}>
              Go to Withdrawal History
            </Link>
          </div>
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      open
      onClose={onClose}
      covered={busy}
      size="sm"
      title="Withdraw Money"
      initialFocus={fullRef}
      footer={
        <div className="flex w-full flex-col gap-[8px]">
          {failure && (
            <p role="alert" className={ERROR}>
              {failure}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-[8px]">
            <Button type="button" hierarchy="secondary" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" hierarchy="primary" size="lg" loading={busy} onClick={withdraw}>
              Withdraw
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-[20px]">
        <div className="flex items-center justify-between gap-[16px] rounded-xl bg-bg-subtle p-[16px]">
          <span className="text-md leading-md text-text-secondary">Available Balance</span>
          <span className="text-xl font-semibold leading-xl tabular-nums text-text-primary">{formatUsd(available)}</span>
        </div>

        <SelectMenu
          label="Withdrawal Method"
          placeholder="Choose a method"
          value={methodId}
          onChange={setMethodId}
          options={store.methods.map((m) => ({ value: m.id, label: m.label, sub: shortAddress(m.address) }))}
          error={shown && !method ? "Choose where the money goes." : undefined}
        />

        <fieldset className="m-0 flex flex-col gap-[8px] border-0 p-0">
          <legend className={cn(LABEL, "mb-[8px] p-0")}>Amount</legend>
          {(
            [
              ["full", formatUsd(available), "Your whole balance"],
              ["other", "Other amount", null],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className="flex min-h-[var(--touch-min)] cursor-pointer items-center gap-[12px] rounded-lg px-[12px] py-[8px] hover:bg-bg-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus"
            >
              <input
                ref={value === "full" ? fullRef : undefined}
                type="radio"
                name={name}
                checked={mode === value}
                onChange={() => {
                  setMode(value);
                  if (value === "other") requestAnimationFrame(() => otherRef.current?.focus());
                }}
                className="sr-only"
              />
              <Radio checked={mode === value} decorative />
              <span className="text-md font-medium leading-md tabular-nums text-text-primary">{label}</span>
              {hint && <span className="text-md leading-md text-text-tertiary">{hint}</span>}
            </label>
          ))}
          {mode === "other" && (
            <div className="flex flex-col gap-[6px] pl-[12px]">
              <label htmlFor={ids.other} className="sr-only">
                Other amount, in US dollars
              </label>
              <TextInput
                ref={otherRef}
                id={ids.other}
                size="xl"
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
              <p id={ids.otherMsg} className={shown && problem ? ERROR : "m-0 text-sm leading-sm text-text-tertiary"}>
                {shown && problem ? problem : `Up to ${formatUsd(available)}`}
              </p>
            </div>
          )}
        </fieldset>

        <dl className="m-0 flex flex-col gap-[10px] border-t border-solid border-border pt-[16px]">
          <div className={ROW}>
            <dt className="text-text-secondary">Withdrawal Fee (per withdrawal)</dt>
            <dd className="m-0 tabular-nums text-text-primary">-$0.00</dd>
          </div>
          <div className={ROW}>
            <dt className="text-text-secondary">You receive</dt>
            <dd className="m-0 tabular-nums text-text-primary">{amount ? formatAmount(amount, token) : "—"}</dd>
          </div>
          <div className={cn(ROW, "text-lg leading-lg")}>
            <dt className="font-semibold text-text-primary">Total Amount</dt>
            <dd className="m-0 font-semibold tabular-nums text-text-primary">{amount ? formatUsd(amount) : "—"}</dd>
          </div>
        </dl>
        <p className="m-0 flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
          <TestnetDemoBadge /> You confirm it in the demo wallet. {token === "IDZ" ? "IDZ at the demo rate 1 IDZ = $1." : "1 USDT = $1."}
        </p>
      </div>
    </ModalFrame>
  );
}
