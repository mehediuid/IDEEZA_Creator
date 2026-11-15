"use client";

// Get Paid's flows on the phone (mobile Figma "Genarel > IDEEZA pay"):
// · Information setup (/m/settings/idz-pay/method): a crypto wallet as a
//   withdrawal method — your demo wallet or another address, the network,
//   a name — then Review all information, then signed in the wallet sheet
//   (the web's MethodDialog: addMethod, methodRequest). The Figma's bank
//   screens ask for account and ID numbers, which the app doesn't take.
// · Withdraw money (/m/settings/idz-pay/withdraw): the available balance,
//   the method, Full balance or Other amount, the fee ($0.00) and the total
//   (the amount you withdraw is the screen's figure; Withdraw $x sits in the
//   Bottom action bar, the top bar's Back cancels), then the wallet's signature — the web's "confirm it's you", in place of
//   the Figma's emailed code — and "Withdrawal recorded" with the way to the
//   history. A withdrawal in IDZ pays out at the app's one IDZ price.
//   Offline, Withdraw and Add wait with their reason. Identity (Level 1) comes first, as the web asks it at the first
//   withdrawal; a first withdrawal with no method sets one up first.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckmarkCircle02Icon, PencilEdit02Icon, UserIdVerificationIcon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { methodRequest, useMethodForm } from "@/components/settings/get-paid/method-dialog";
import { networkName } from "@/components/settings/get-paid/parts";
import { randomId } from "@/lib/market/sales";
import { METHOD_LABEL_MAX, addMethod, centsFloor, formatUsd, recordWithdrawal, subtractWithdrawn, withdrawAmountProblem, type PayoutStore, type Withdrawal } from "@/lib/account/payout";
import { readPayoutNow, updatePayout } from "@/lib/account/use-payout";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import type { Amount } from "@/lib/wallet/types";
import { compareAmounts, normalizeAmount } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { BottomBar } from "../kit/bottom-bar";
import { LIST_ROW, ListCard, ListRow } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { EmptyState } from "../kit/state";
import { OfflineBanner, useOnline } from "../kit/states";
import { Sheet } from "../kit/sheet";
import { SheetSelect } from "../kit/sheet-select";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { IDZ_RATE_LINE, SAVE_FAILED, useGetPaid } from "./get-paid-screen";
import { BulletList, Hero, OFFLINE_REASON, Row, RowsCard, payoutLine } from "./parts";

const PAYOUT_NETWORK = "baseSepolia" as const;
const PROBLEM: Record<"address" | "duplicate" | "full", string> = {
  address: "Enter a wallet address: 0x followed by 40 letters and digits (0–9, a–f).",
  duplicate: "This address is already one of your withdrawal methods.",
  full: "You can keep up to 10 withdrawal methods. Remove one to add another.",
};

/** A withdrawal's reference: ten letters and digits nobody misreads. */
function referenceId(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (const b of crypto.getRandomValues(new Uint8Array(10))) id += A[b % A.length];
  return id;
}

/** `?next=` when it is one of the phone's own Get paid screens. */
function nextOf(params: URLSearchParams, fallback: string): string {
  const next = params.get("next");
  return next && /^\/m\/settings\/idz-pay(\/[a-z-]+)?$/.test(next) ? next : fallback;
}

function Loading({ title }: { title: string }) {
  return (
    <Screen top={<TopBar back="/m/settings/idz-pay" title={title} />} className="px-8 pt-4">
      <Skeleton shape="block" className="h-[240px] w-full" />
    </Screen>
  );
}

// ── Information setup ──────────────────────────────────────────────────

export function MethodScreen() {
  const { store, loaded } = useGetPaid();
  if (!loaded || !store) return <Loading title="Information setup" />;
  return <MethodBody store={store} />;
}

function MethodBody({ store }: { store: PayoutStore }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const online = useOnline();
  const form = useMethodForm(store);
  const { request, sheet } = useWalletSheet();
  const [step, setStep] = React.useState<"form" | "review">("form");
  const [problem, setProblem] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const ids = useFieldIds(["address", "label"] as const);
  const next = nextOf(params, "/m/settings/idz-pay");
  const { wallet, mineTaken, state, setState } = form;
  const paste = state.source === "paste";
  const draft = { ...form.draft, network: PAYOUT_NETWORK };

  const set = (patch: Partial<typeof state>) => {
    setState((s) => ({ ...s, ...patch }));
    setProblem(null);
  };

  const add = async () => {
    if (busy) return;
    setFailure(null);
    if (!online) return setFailure(OFFLINE_REASON);
    const becomesDefault = store.methods.length === 0;
    const id = randomId("wm_");
    setBusy(true);
    const result = await request(methodRequest("add", draft, becomesDefault), {
      commit: (proof) => {
        let refusal: string | null = null;
        const ok = updatePayout((s) => {
          const r = addMethod(s, draft, proof.at, id, proof.signature);
          if (!r.ok) {
            refusal = PROBLEM[r.problem];
            return s;
          }
          return r.store;
        });
        if (refusal) return { ok: false, message: refusal, conflict: true };
        return ok ? { ok: true } : { ok: false, message: SAVE_FAILED };
      },
    });
    setBusy(false);
    if (result.ok) {
      toast({ title: `${draft.label.trim() || "Crypto wallet"} added as a withdrawal method`, lead: "success" });
      router.replace(next);
    } else if (result.reason !== "rejected") setFailure(result.message ?? "The wallet didn’t confirm it. Nothing was added; try again.");
  };

  const choice = (on: boolean) => cn("flex min-h-[64px] cursor-pointer items-start gap-5 rounded-xl border-[length:var(--border-width-1-5)] border-solid px-6 py-5", on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface");

  return (
    <Screen
      top={<TopBar back={next} title="Information setup" />}
      className="px-8 pb-8 pt-4"
      footer={
        <BottomBar>
          {step === "review" && !online && (
            <p id="add-why" role="status" className={T.caption}>
              {OFFLINE_REASON}
            </p>
          )}
          <Button
            size="xl"
            className="w-full"
            loading={busy}
            disabled={step === "review" && !online}
            aria-describedby={step === "review" && !online ? "add-why" : undefined}
            onClick={() => {
              if (step === "review") return void add();
              const p = form.problemOf(store);
              if (p) return setProblem(p);
              setStep("review");
            }}
          >
            {step === "form" ? "Next" : "Add withdrawal method"}
          </Button>
        </BottomBar>
      }
    >
      {step === "form" ? (
        <div className="flex flex-col gap-8">
          <OfflineBanner />
          <h2 className={T.section}>Wallet information</h2>
          <fieldset className="flex flex-col gap-4">
            <legend className="sr-only">Wallet</legend>
            {!mineTaken && (
              <label className={choice(!paste)}>
                <input type="radio" name="source" checked={!paste} onChange={() => set({ source: "mine" })} className="sr-only" />
                <Radio checked={!paste} decorative className="mt-1" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className={T.rowTitle}>Your demo wallet</span>
                  <span className={cn(T.meta, "[overflow-wrap:anywhere]")}>
                    {wallet.label} · <span className="font-mono">{wallet.address}</span>
                  </span>
                </span>
              </label>
            )}
            <label className={choice(paste)}>
              <input type="radio" name="source" checked={paste} onChange={() => set({ source: "paste" })} className="sr-only" />
              <Radio checked={paste} decorative className="mt-1" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className={T.rowTitle}>Another wallet address</span>
                <span className={T.meta}>Any wallet you own, a receive-only one too.</span>
              </span>
            </label>
          </fieldset>
          {paste && (
            <Field label="Wallet address" htmlFor={ids.address.id} error={problem ?? undefined} errorId={ids.address.errorId}>
              <TextInput
                id={ids.address.id}
                size="xl"
                value={state.address}
                onValueChange={(v) => set({ address: v })}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="0x…"
                className="font-mono"
                {...errorProps(problem, ids.address.errorId)}
              />
            </Field>
          )}
          {paste && !problem && <p className={cn(T.caption, "-mt-6 text-text-tertiary")}>Check it carefully: a payment sent to a wrong address can’t be taken back.</p>}
          {!paste && problem && (
            <p role="alert" className={cn(T.caption, "text-text-error")}>
              {problem}
            </p>
          )}
          <Field label="Network" htmlFor="network">
            <SheetSelect id="network" title="Network" value={PAYOUT_NETWORK} options={[{ value: PAYOUT_NETWORK, label: networkName(PAYOUT_NETWORK) }]} onChange={() => {}} />
          </Field>
          <p className={cn(T.caption, "-mt-6 text-text-tertiary")}>Withdrawals to this address are sent on this network.</p>
          <Field label="Name it (optional)" htmlFor={ids.label.id}>
            <TextInput id={ids.label.id} size="xl" value={state.label} maxLength={METHOD_LABEL_MAX} onValueChange={(v) => set({ label: v })} autoComplete="off" placeholder={paste ? "Crypto wallet" : wallet.label} />
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <OfflineBanner />
          <h2 className={T.section}>Review all information</h2>
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className={T.rowTitle}>Wallet information</h3>
              <button type="button" aria-label="Edit the wallet information" onClick={() => setStep("form")} className="inline-flex size-[44px] items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus">
                <Icon icon={PencilEdit02Icon} size={20} />
              </button>
            </div>
            <RowsCard>
              <Row label="Name">{draft.label.trim() || "Crypto wallet"}</Row>
              <Row label="Address">
                <span className="font-mono">{draft.address}</span>
              </Row>
              <Row label="Network">{networkName(draft.network)}</Row>
              <Row label="Default">{store.methods.length === 0 ? "Yes, withdrawals go here first" : "No"}</Row>
            </RowsCard>
          </section>
          <p className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
            <TestnetDemoBadge />
            You sign it in your demo wallet. Nothing is charged and no coins move.
          </p>
          {failure && (
            <p role="alert" className={cn(T.caption, "text-text-error")}>
              {failure}
            </p>
          )}
        </div>
      )}
      {sheet}
    </Screen>
  );
}

// ── Withdraw money ─────────────────────────────────────────────────────

export function WithdrawScreen() {
  const { store, loaded, verified, balance } = useGetPaid();
  if (!loaded || !store || !balance) return <Loading title="Withdraw money" />;
  if (!verified) return <NeedsIdentity />;
  if (store.methods.length === 0) return <ToMethod />;
  return <WithdrawBody store={store} earned={balance.earned} />;
}

/** No method yet: where the money goes is set up first, then back here. */
function ToMethod() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace("/m/settings/idz-pay/method?next=/m/settings/idz-pay/withdraw");
  }, [router]);
  return <Loading title="Withdraw money" />;
}

/** Verify your identity to get paid (Figma Level 1 "Verify your identity to start selling" over the screen). */
function NeedsIdentity() {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  return (
    <Screen top={<TopBar back="/m/settings/idz-pay" title="Withdraw money" />} className="px-8 pt-4">
      <EmptyState icon={UserIdVerificationIcon} title="Verify your identity" body="Your first withdrawal asks you to verify your identity." action={{ label: "Verify your identity", onClick: () => setOpen(true) }} />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Verify your identity to get paid"
        description="Your first withdrawal asks for it, and so does selling physical copies. It takes a minute or two and keeps the marketplace safe."
        actions={
          <Button size="xl" className="w-full" onClick={() => router.push("/m/settings/kyc/1?next=/m/settings/idz-pay/withdraw")}>
            Continue to verification
          </Button>
        }
      >
        <p className={T.rowTitle}>What you’ll need:</p>
        <BulletList items={["Your full legal name", "Your account’s verified email", "Your mobile number, to get a code", "Your country of residence"]} />
      </Sheet>
    </Screen>
  );
}

function WithdrawBody({ store, earned }: { store: PayoutStore; earned: Amount }) {
  const router = useRouter();
  const online = useOnline();
  const { request, sheet } = useWalletSheet();
  const [methodId, setMethodId] = React.useState<string>(store.defaultMethodId ?? store.methods[0].id);
  const [mode, setMode] = React.useState<"full" | "other">("full");
  const [other, setOther] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<Withdrawal | null>(null);
  const [picking, setPicking] = React.useState(false);
  const otherRef = React.useRef<HTMLInputElement>(null);

  const available = centsFloor(subtractWithdrawn(earned, store.withdrawals));
  const problem = mode === "other" ? withdrawAmountProblem(other, available) : null;
  const amount = mode === "full" ? available : problem ? null : normalizeAmount(other.trim());
  const token = store.getPaidIn;
  const method = store.methods.find((m) => m.id === methodId) ?? store.methods[0];
  const nothing = compareAmounts(available, "0") <= 0;

  const withdraw = async () => {
    if (busy) return;
    setFailure(null);
    if (!online) return setFailure(OFFLINE_REASON);
    if (problem || !amount || compareAmounts(amount, "0") <= 0) {
      setShown(true);
      if (problem) otherRef.current?.focus();
      return;
    }
    const reference = referenceId();
    setBusy(true);
    const result = await request(
      {
        kind: "signature",
        purpose: "withdraw",
        identity: "maker",
        network: method.network,
        title: "Withdraw your earnings",
        summary: [
          { label: "Amount", value: `${formatUsd(amount)} (demo rate)` },
          { label: "You receive", value: payoutLine(amount, token) },
          { label: "To", value: method.label },
          { label: "Address", value: method.address },
          { label: "Network", value: networkName(method.network) },
          { label: "Withdrawal fee", value: "$0.00" },
        ],
        note: "Testnet demo. Signing records the withdrawal in Get paid; no coins move and nothing is charged.",
        doneLine: "Withdrawal recorded in Get paid.",
      },
      {
        recheck: () => {
          const now = subtractWithdrawn(earned, readPayoutNow().withdrawals);
          return compareAmounts(amount, now) > 0 ? `Your balance changed: it’s ${formatUsd(now)} now. Choose a smaller amount.` : null;
        },
        commit: (proof) => {
          const w: Withdrawal = {
            id: reference,
            amount,
            token,
            methodId: method.id,
            to: { label: method.label, address: method.address, network: method.network },
            at: proof.at,
            status: "complete",
          };
          if (proof.signature) w.signature = proof.signature;
          return updatePayout((s) => recordWithdrawal(s, w)) ? { ok: true } : { ok: false, message: SAVE_FAILED };
        },
      },
    );
    setBusy(false);
    if (result.ok)
      setSent({ id: reference, amount, token, methodId: method.id, to: { label: method.label, address: method.address, network: method.network }, at: result.proof.at, status: "complete" });
    else if (result.reason !== "rejected") setFailure(result.message ?? "The wallet didn’t confirm it. Nothing was withdrawn; try again.");
  };

  const radio = (on: boolean) => cn("flex min-h-[52px] cursor-pointer items-center gap-5 rounded-xl border-[length:var(--border-width-1-5)] border-solid px-6 transition-colors duration-fast", on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface active:bg-bg-subtle");
  const total = amount ? formatUsd(amount) : "$0.00";
  const why = nothing ? "Nothing to withdraw right now. Your share of each sale lands here." : !online ? OFFLINE_REASON : null;

  return (
    <Screen
      top={<TopBar back="/m/settings/idz-pay" title="Withdraw money" />}
      className="px-8 pb-8"
      footer={
        <BottomBar>
          {(why || failure) && (
            <p id="withdraw-why" role={failure ? "alert" : "status"} className={cn(T.caption, failure && "text-text-error")}>
              {failure ?? why}
            </p>
          )}
          <Button size="xl" className="w-full" loading={busy} disabled={nothing || !online} aria-describedby={why || failure ? "withdraw-why" : undefined} onClick={withdraw}>
            {amount && !nothing ? `Withdraw ${total}` : "Withdraw"}
          </Button>
        </BottomBar>
      }
    >
      <div className="flex flex-col gap-10">
        <OfflineBanner />
        <Hero
          label="You withdraw"
          meta={
            <>
              <TestnetDemoBadge />
              <span>Available balance {formatUsd(available)}</span>
            </>
          }
        >
          <span className={cn(T.amountHero, "text-text-brand")}>{total}</span>
        </Hero>
        <section aria-labelledby="amount" className="flex flex-col gap-4">
          <h2 id="amount" className={T.section}>
            Amount
          </h2>
          <label className={radio(mode === "full")}>
            <input type="radio" name="amount" checked={mode === "full"} onChange={() => setMode("full")} className="sr-only" />
            <Radio checked={mode === "full"} decorative />
            <span className={cn(T.body, "flex-1 text-text-primary")}>Full balance</span>
            <span className={cn(T.body, "tabular-nums")}>{formatUsd(available)}</span>
          </label>
          <div className={cn(radio(mode === "other"), "flex-col items-stretch gap-4 py-5")}>
            <label className="flex cursor-pointer items-center gap-5">
              <input
                type="radio"
                name="amount"
                checked={mode === "other"}
                onChange={() => {
                  setMode("other");
                  window.setTimeout(() => otherRef.current?.focus(), 0);
                }}
                className="sr-only"
              />
              <Radio checked={mode === "other"} decorative />
              <span className={cn(T.body, "text-text-primary")}>Other amount</span>
            </label>
            {mode === "other" && (
              <>
                <TextInput
                  ref={otherRef}
                  size="xl"
                  inputMode="decimal"
                  aria-label="Other amount in US dollars"
                  prefixText="$"
                  suffix="USD"
                  value={other}
                  onValueChange={setOther}
                  onBlur={() => setShown(true)}
                  placeholder="0.00"
                  invalid={shown && !!problem}
                  aria-describedby={shown && problem ? "other-error" : undefined}
                />
                {shown && problem && (
                  <p id="other-error" className={cn(T.caption, "text-text-error")}>
                    {problem}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
        <ListCard label="Withdrawal">
          {store.methods.length > 1 ? (
            <ListRow icon={Wallet02Icon} title="Withdrawal method" meta={`${shortAddress(method.address)} · ${networkName(method.network)}`} value={method.label} onClick={() => setPicking(true)} />
          ) : (
            <ListRow icon={Wallet02Icon} title="Withdrawal method" meta={`${shortAddress(method.address)} · ${networkName(method.network)}`} value={method.label} />
          )}
          <ListRow
            title="You receive"
            meta={token === "IDZ" ? `At the demo rate ${IDZ_RATE_LINE}` : undefined}
            value={<span className="tabular-nums text-text-primary">{amount ? payoutLine(amount, token) : `— ${token}`}</span>}
          />
          <ListRow title="Withdrawal fee" meta="Per withdrawal" value={<span className="tabular-nums text-text-primary">−$0.00</span>} />
          <li className={cn(LIST_ROW, "hover:bg-transparent")}>
            <span className={cn(T.section, "flex-1")}>Total amount</span>
            <span className={cn(T.section, "tabular-nums")}>{total}</span>
          </li>
        </ListCard>
      </div>
      <PickSheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Withdrawal method"
        value={method.id}
        options={store.methods.map((m) => ({ value: m.id, label: `${m.label}${m.id === store.defaultMethodId ? " (default)" : ""}`, helper: `${shortAddress(m.address)} · ${networkName(m.network)}` }))}
        onPick={setMethodId}
      />
      <Sheet
        open={sent !== null}
        onClose={() => router.replace("/m/settings/idz-pay")}
        title="Withdrawal recorded"
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => sent && router.replace(`/m/settings/idz-pay/history?tx=${sent.id}`)}>
              See it in history
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => router.replace("/m/settings/idz-pay")}>
              Close
            </Button>
          </>
        }
      >
        <span aria-hidden className="self-center text-text-success">
          <Icon icon={CheckmarkCircle02Icon} size={40} />
        </span>
        {sent && (
          <p className={cn(T.body, "text-text-primary")}>
            {formatUsd(sent.amount)} as {payoutLine(sent.amount, sent.token)} to {sent.to.label} on {sent.to.network ? networkName(sent.to.network) : "its network"}, reference{" "}
            <span className="font-mono">{sent.id}</span>.
          </p>
        )}
        <p className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
          <TestnetDemoBadge /> Recorded as complete. No coins moved.
        </p>
      </Sheet>
      {sheet}
    </Screen>
  );
}
