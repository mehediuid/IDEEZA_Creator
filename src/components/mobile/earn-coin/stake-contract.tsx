"use client";

// A contract's Staking Options (Figma "Stacking" 227865) and the Stake sheet
// (227896 not connected, 227999 connected, 228108 with an amount) and its
// success (228221). Each option is a card: its name with the Est. APR large,
// Lockup Period and Reward Token as facts, Stake (UX pass 2026-11-15, lens 2).
// The sheet leads with the amount — Connect wallet until a wallet is
// connected, then the balance with Max, the wallet's address and the reward
// the amount earns over the lock-up — then the three terms that matter (Est.
// APR, Lock-up Period, Wallet Limit) and the option's ten terms behind "Stake
// Details"; every check from lib/wallet/staking.ts. Stake goes through the
// wallet sheet; once it confirms, the success sheet offers the Stake tab's
// activity or the new stake's rewards.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { estimateGas } from "@/lib/commerce/gas";
import { cn } from "@/lib/utils";
import { availableOf } from "@/lib/wallet/balances";
import { demoAddress } from "@/lib/wallet/demo-wallet";
import { formatWhen } from "@/lib/wallet/idz";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import {
  STAKE_TIME_LINE,
  STATUS_WORDS,
  aprText,
  contractOf,
  contractStatusOf,
  daysText,
  maxStakeOf,
  stakeBlockOf,
  stakeCheckOf,
  stakeRequestOf,
  stakedInOptionOf,
  type StakeContract,
  type StakeOption,
} from "@/lib/wallet/staking";
import { useStakeAdmin } from "@/lib/wallet/use-earn-stores";
import { Sheet } from "../kit/sheet";
import { NotFoundState } from "../kit/state";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { AllDetails, CARD, ConnectSheet, CopyChip, FactGrid, SectionHead, TestnetLine, useEarnState } from "./parts";
import { useWalletSheet } from "./wallet-sheet";

export function StakeContractScreen({ contractId }: { contractId: string }) {
  const router = useRouter();
  const c = contractOf(contractId);
  const admin = useStakeAdmin();
  const { now } = useEarnState();
  const [picked, setPicked] = React.useState<StakeOption | null>(null);
  const [done, setDone] = React.useState<{ stakeId: string | null; amount: string } | null>(null);

  if (!c) {
    return (
      <Screen top={<TopBar back title="Staking" />} className="px-8 pb-8 pt-4">
        <NotFoundState thing="contract" body="It may have been taken off the Stake List." action={{ label: "Go to Stake List", href: "/m/earn/stake/contracts" }} />
      </Screen>
    );
  }
  const status = contractStatusOf(admin, c.id);

  return (
    <Screen top={<TopBar back title={c.name} />} className="px-8 pb-8 pt-4">
      <div className="flex flex-col gap-6">
        <SectionHead>Staking Options</SectionHead>
        {status !== "active" && <Banner tone={status === "blocked" ? "error" : "attention"}>{`${STATUS_WORDS[status]}. ${status === "blocked" ? "Nothing can be staked in it." : "Staking opens again when it resumes."}`}</Banner>}
        <ul className="flex flex-col gap-6">
          {c.options.map((o) => {
            const block = stakeBlockOf(o, status, now);
            const noteId = `option-${o.id}`;
            return (
              <li key={o.id} className={cn(CARD, "flex flex-col gap-6 p-8")}>
                <div className="flex items-start justify-between gap-6">
                  <p className={cn(T.section, "min-w-0")}>{o.name}</p>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className={cn(T.section, "tabular-nums text-text-success")}>{aprText(o.aprBps)}</span>
                    <span className={T.micro}>Est. APR</span>
                  </span>
                </div>
                <FactGrid
                  cols={2}
                  facts={[
                    { label: "Lockup Period", value: daysText(o.lockDays) },
                    {
                      label: "Reward Token",
                      value: (
                        <span className="inline-flex items-center gap-2">
                          <IdzCoin height={16} /> IDZ
                        </span>
                      ),
                    },
                  ]}
                />
                <div className="flex items-center justify-between gap-6 border-t-[length:var(--border-width-1)] border-solid border-border pt-6">
                  <span id={noteId} className={cn(T.meta, "min-w-0")}>
                    {block && status === "active" ? block : ""}
                  </span>
                  <Button size="md" className="shrink-0" disabled={!!block} aria-describedby={block ? noteId : undefined} onClick={() => setPicked(o)}>
                    Stake
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <TestnetLine>{STAKE_TIME_LINE}</TestnetLine>
      </div>
      {picked && (
        <StakeSheet
          contract={c}
          option={picked}
          onClose={() => setPicked(null)}
          onStaked={(stakeId, amount) => {
            setPicked(null);
            setDone({ stakeId, amount });
          }}
        />
      )}
      <Sheet
        open={!!done}
        onClose={() => setDone(null)}
        title={done ? `You staked ${formatAmount(done.amount, "IDZ")}` : "Staked"}
        description="Its rewards unlock once per reward interval. Claim them on the stake as they do."
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => router.push("/m/earn/stake")}>
              View Transaction Activity
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" disabled={!done?.stakeId} onClick={() => done?.stakeId && router.push(`/m/earn/staked/${done.stakeId}`)}>
              Let’s Start Claiming Reward
            </Button>
          </>
        }
      >
        <span aria-hidden className="inline-flex size-[56px] items-center justify-center self-center rounded-full bg-bg-success-subtle text-text-success">
          <Icon icon={Tick02Icon} size={28} />
        </span>
      </Sheet>
    </Screen>
  );
}

function StakeSheet({
  contract: c,
  option: o,
  onClose,
  onStaked,
}: {
  contract: StakeContract;
  option: StakeOption;
  onClose: () => void;
  onStaked: (stakeId: string | null, amount: string) => void;
}) {
  const { wallet, market, now, id, connected } = useEarnState();
  const admin = useStakeAdmin();
  const sheet = useWalletSheet();
  const [text, setText] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const errId = React.useId();
  const gas = estimateGas(c.network);
  const ctx = { wallet, market, now };
  const available = id && connected ? availableOf(id, "IDZ", c.network, ctx) : "0";
  const staked = id ? stakedInOptionOf(wallet, id, c.id, o.id) : "0";
  const check = stakeCheckOf(text, {
    option: o,
    network: c.network,
    status: contractStatusOf(admin, c.id),
    now,
    available,
    gas: id ? availableOf(id, gas.native, c.network, ctx) : "0",
    staked,
  });
  const shown = touched || check.error?.field === "form" ? check.error : null;

  const stake = async () => {
    if (!connected) return setConnecting(true);
    if (check.error || !check.amount) return setTouched(true);
    setNote(null);
    const amount = check.amount;
    const result = await sheet.request(stakeRequestOf(c, o, amount), {
      recheck: () => stakeBlockOf(o, contractStatusOf(admin, c.id), Date.now()),
    });
    if (result.ok) onStaked(result.proof.txHash ?? null, amount);
    else setNote(result.reason === "rejected" ? "Stake cancelled in the wallet. Nothing changed." : (result.message ?? "The stake didn’t go through. Nothing changed."));
  };

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Config Name", value: o.name },
    { label: "Contract", value: <CopyChip value={c.address} what="Contract address" /> },
    { label: "Chain", value: networkLabelOf(c.network) },
    { label: "Start Time", value: formatWhen(o.startsAt) },
    { label: "End Time", value: formatWhen(o.endsAt) },
    { label: "Reward Interval", value: daysText(o.intervalDays) },
    { label: "Lock-up Period", value: daysText(o.lockDays) },
    { label: "Grace Time", value: daysText(o.graceDays) },
    { label: "Wallet Limit", value: formatAmount(o.walletLimit, "IDZ") },
    { label: "Est. APR", value: aprText(o.aprBps) },
  ];

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title="Staking Options"
        description={`${o.name} · ${c.name}`}
        actions={
          <Button size="xl" className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-60" aria-disabled={(connected && !!check.error) || undefined} loading={sheet.busy} onClick={stake}>
            Stake
          </Button>
        }
      >
        <div className="flex items-center justify-between gap-6">
          <label htmlFor={`${errId}-amount`} className={T.section}>
            Stake Amount
          </label>
          {connected ? (
            <span className={cn(T.body, "flex items-center gap-3 text-text-primary")}>
              Balance {formatAmount(available, "IDZ")}
              <button
                type="button"
                onClick={() => {
                  const max = maxStakeOf(o, { available, staked });
                  setText(max === "0" ? "" : max);
                  setTouched(true);
                }}
                className={cn(T.rowTitle, "-my-4 inline-flex min-h-[44px] items-center rounded-xs px-2 text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus active:opacity-[var(--opacity-muted)]")}
              >
                Max
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConnecting(true)} className={cn(T.rowTitle, "-my-4 inline-flex min-h-[44px] items-center rounded-xs px-2 text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus active:opacity-[var(--opacity-muted)]")}>
              Connect wallet
            </button>
          )}
        </div>
        <TextInput
          id={`${errId}-amount`}
          size="xl"
          inputMode="decimal"
          autoComplete="off"
          placeholder="eg. 100 IDZ"
          value={text}
          onValueChange={(v) => {
            setText(v);
            setTouched(true);
          }}
          invalid={!!shown && shown.field === "amount"}
          aria-describedby={shown ? errId : undefined}
        />
        {shown && (
          <p id={errId} className={cn(T.caption, "text-text-error")}>
            {shown.text}
          </p>
        )}
        {connected && id && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CopyChip value={demoAddress(id)} what="Wallet address" />
            {check.reward && !check.error && (
              <span className={cn(T.body, "text-text-primary")}>
                Reward <span className="text-text-success">{formatAmount(check.reward, "IDZ")}</span> in {daysText(o.lockDays)}
              </span>
            )}
          </div>
        )}
        <FactGrid
          facts={[
            { label: "Est. APR", value: aprText(o.aprBps), tone: "success" },
            { label: "Lock-up Period", value: daysText(o.lockDays) },
            { label: "Wallet Limit", value: formatAmount(o.walletLimit, "IDZ") },
          ]}
        />
        <AllDetails title="Stake Details" rows={rows} />
        {note && <Banner tone="info">{note}</Banner>}
        <TestnetLine />
      </Sheet>
      <ConnectSheet open={connecting} onClose={() => setConnecting(false)} description="Your stake and its rewards go to it. This is the testnet demo wallet — test funds only." />
      {sheet.sheet}
    </>
  );
}
