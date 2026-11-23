"use client";

// Get Paid's flows on the phone (mobile Figma "Genarel > IDEEZA pay"):
// · Information setup (/m/settings/idz-pay/method): a crypto wallet as a
//   withdrawal method — your demo wallet or another address, the network,
//   a name — then Review all information, then signed in the wallet sheet
//   (the web's MethodDialog: addMethod, methodRequest). The Figma's bank
//   screens ask for account and ID numbers, which the app doesn't take.
// · Withdraw money (/m/settings/idz-pay/withdraw): the web's Withdraw dialog
//   (components/settings/get-paid/withdraw-dialog.tsx) as one screen in
//   steps, asking only what is missing (`withdrawStepsOf`, fixed when the
//   screen opens): Verify your identity (Level 1, the first time only: the
//   same fields and code step as KYC › Level 1, identity-fields.tsx), Where
//   the money goes (a first withdrawal with no method: the same fields as
//   Information setup), then How much — the available balance, Full balance
//   or Other amount, the method, the fee ($0.00) and the total. Each step's
//   button sits in the Bottom action bar; the top bar's Back goes to the step
//   before. One signature in the wallet sheet records the withdrawal and, on a
//   first withdrawal, saves the new method as your default ("New withdrawal
//   method · Saved as your default"), as the web does (MON-7) — no second
//   screen to sign, no hop to KYC. Then "Withdrawal recorded" with the way to
//   the history. A withdrawal in IDZ pays out at the app's one IDZ price.
//   Offline, Verify, Withdraw and Add wait with their reason.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckmarkCircle02Icon, PencilEdit02Icon, Wallet02Icon } from "@hugeicons/core-free-icons";
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
import {
  METHOD_LABEL_MAX,
  addMethod,
  centsFloor,
  formatUsd,
  recordWithdrawal,
  subtractWithdrawn,
  withdrawAmountProblem,
  withdrawStepsOf,
  withdrawalReference,
  type PayoutStore,
  type Withdrawal,
  type WithdrawStep,
} from "@/lib/account/payout";
import { readPayoutNow, updatePayout } from "@/lib/account/use-payout";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import type { Amount } from "@/lib/wallet/types";
import { compareAmounts, normalizeAmount } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { BottomBar } from "../kit/bottom-bar";
import { LIST_ROW, ListCard, ListRow } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { OfflineBanner, useOnline } from "../kit/states";
import { Sheet } from "../kit/sheet";
import { SheetSelect } from "../kit/sheet-select";
import { useToast } from "../kit/toast";
import { SCROLL_ATTR, Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { IDZ_RATE_LINE, SAVE_FAILED, useGetPaid } from "./get-paid-screen";
import { IdentityCode, IdentityFields, useIdentityForm } from "./identity-fields";
import { Hero, OFFLINE_REASON, Row, RowsCard, payoutLine } from "./parts";

const PAYOUT_NETWORK = "baseSepolia" as const;
const PROBLEM: Record<"address" | "duplicate" | "full", string> = {
  address: "Enter a wallet address: 0x followed by 40 letters and digits (0–9, a–f).",
  duplicate: "This address is already one of your withdrawal methods.",
  full: "You can keep up to 10 withdrawal methods. Remove one to add another.",
};

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

type MethodForm = ReturnType<typeof useMethodForm>;

/** The method being added, on the network the phone pays out on. */
function draftOf(form: MethodForm) {
  return { ...form.draft, network: PAYOUT_NETWORK };
}

/** Where withdrawals go: your demo wallet or another address, the network, a name. Information setup's
 *  form and the first withdrawal's "Where the money goes" step. */
function PhoneMethodFields({ form, problem, onEdit }: { form: MethodForm; problem: string | null; onEdit: () => void }) {
  const ids = useFieldIds(["address", "label"] as const);
  const { wallet, mineTaken, state, setState } = form;
  const paste = state.source === "paste";
  const set = (patch: Partial<typeof state>) => {
    setState((s) => ({ ...s, ...patch }));
    onEdit();
  };
  const choice = (on: boolean) => cn("flex min-h-[64px] cursor-pointer items-start gap-5 rounded-xl border-[length:var(--border-width-1-5)] border-solid px-6 py-5", on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface");
  return (
    <>
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
    </>
  );
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
  const next = nextOf(params, "/m/settings/idz-pay");
  const draft = draftOf(form);

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
          <PhoneMethodFields form={form} problem={problem} onEdit={() => setProblem(null)} />
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
  return <WithdrawFlow store={store} earned={balance.earned} verified={verified} />;
}

/** The web Withdraw dialog's step names (STEP_NAME). */
const STEP_NAME: Record<WithdrawStep, string> = {
  identity: "Verify your identity",
  method: "Where the money goes",
  amount: "How much",
};

/** Where a withdrawal goes: a method you have, or the first one, typed in this flow (the web's Target). */
type Target = { label: string; address: string; network: PayoutStore["methods"][number]["network"]; methodId: string | null; isNew: boolean };

function WithdrawFlow({ store, earned, verified }: { store: PayoutStore; earned: Amount; verified: boolean }) {
  const router = useRouter();
  const online = useOnline();
  const { request, sheet } = useWalletSheet();
  // The steps are fixed when the screen opens, so finishing one doesn't renumber the rest.
  const [steps] = React.useState(() => withdrawStepsOf({ verified, methods: store.methods.length }));
  const [at, setAt] = React.useState(0);
  const step = steps[at];
  const identity = useIdentityForm();
  // Level 1's own two parts, as KYC › Level 1 asks them: the form, then the code sent to the number.
  const [identityCode, setIdentityCode] = React.useState(false);
  const form = useMethodForm(store);
  const [methodProblem, setMethodProblem] = React.useState<string | null>(null);
  const [methodId, setMethodId] = React.useState<string | null>(store.defaultMethodId ?? store.methods[0]?.id ?? null);
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
  const nothing = compareAmounts(available, "0") <= 0;
  const firstMethod = steps.includes("method");
  const draft = draftOf(form);
  const chosen = store.methods.find((m) => m.id === methodId) ?? store.methods[0] ?? null;
  // Once it's recorded the new method is one of yours, so the form would read differently: the screen
  // under the success sheet keeps the target it signed for.
  const [signedFor, setSignedFor] = React.useState<Target | null>(null);
  const target: Target | null =
    signedFor ??
    (firstMethod
      ? { label: draft.label.trim() || "Crypto wallet", address: draft.address, network: draft.network, methodId: null, isNew: true }
      : chosen
        ? { label: chosen.label, address: chosen.address, network: chosen.network, methodId: chosen.id, isNew: false }
        : null);

  const topRef = React.useRef<HTMLDivElement>(null);
  // Each step opens at its top (the screen's own scroller).
  const go = (i: number) => {
    setFailure(null);
    setAt(Math.max(0, Math.min(i, steps.length - 1)));
    topRef.current?.closest<HTMLElement>(`[${SCROLL_ATTR}]`)?.scrollTo({ top: 0 });
  };

  // Identity, as KYC › Level 1 asks it (identity-fields.tsx): Continue sends the code to the number (the
  // Demo text message opens), Verify code checks it, Verify and continue saves it and goes on.
  const sendIdentityCode = () => {
    if (!online || !identity.valid()) return;
    identity.send();
    setFailure(null);
    setIdentityCode(true);
    topRef.current?.closest<HTMLElement>(`[${SCROLL_ATTR}]`)?.scrollTo({ top: 0 });
  };

  const verifyIdentity = () => {
    if (!online) return;
    if (!identity.complete()) return setFailure(SAVE_FAILED);
    go(at + 1);
  };

  const continueFromMethod = () => {
    const p = form.problemOf(store);
    if (p) return setMethodProblem(p);
    go(at + 1);
  };

  const withdraw = async () => {
    if (busy) return;
    setFailure(null);
    if (!online) return setFailure(OFFLINE_REASON);
    if (problem || !amount || compareAmounts(amount, "0") <= 0 || !target) {
      setShown(true);
      if (problem) otherRef.current?.focus();
      return;
    }
    // "WD7K2M9QX4LP", as the web makes it (MON-20).
    const reference = withdrawalReference();
    const newId = target.isNew ? randomId("wm_") : null;
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
          { label: "You receive", value: payoutLine(amount, token) },
          { label: "To", value: target.label },
          { label: "Address", value: target.address },
          { label: "Network", value: networkName(target.network) },
          { label: "Withdrawal fee", value: "$0.00" },
          ...(target.isNew ? [{ label: "New withdrawal method", value: "Saved as your default" }] : []),
        ],
        note: "Testnet demo. Signing records the withdrawal in Get paid; no coins move and nothing is charged.",
        doneLine: "Withdrawal recorded in Get paid.",
      },
      {
        recheck: () => {
          const now = subtractWithdrawn(earned, readPayoutNow().withdrawals);
          return compareAmounts(amount, now) > 0 ? `Your balance changed: it’s ${formatUsd(now)} now. Choose a smaller amount.` : null;
        },
        // One signature, one write: a first withdrawal's new method is saved as your default with it (the web's commit).
        commit: (proof) => {
          let refusal: string | null = null;
          let methodIdNow = target.methodId;
          const ok = updatePayout((s) => {
            let next = s;
            if (target.isNew && newId) {
              const r = addMethod(s, draft, proof.at, newId, proof.signature);
              if (!r.ok) {
                refusal = r.problem === "duplicate" ? "This address became one of your withdrawal methods meanwhile. Go back and withdraw again." : SAVE_FAILED;
                return s;
              }
              next = r.store;
              methodIdNow = r.method.id;
            }
            const w: Withdrawal = {
              id: reference,
              amount,
              token,
              methodId: methodIdNow,
              to: { label: target.label, address: target.address, network: target.network },
              at: proof.at,
              status: "complete",
            };
            if (proof.signature) w.signature = proof.signature;
            return recordWithdrawal(next, w);
          });
          if (refusal) return { ok: false, message: refusal, conflict: true };
          return ok ? { ok: true } : { ok: false, message: SAVE_FAILED };
        },
      },
    );
    setBusy(false);
    if (result.ok) {
      setSignedFor(target);
      setSent({ id: reference, amount, token, methodId: target.methodId, to: { label: target.label, address: target.address, network: target.network }, at: result.proof.at, status: "complete" });
    } else if (result.reason !== "rejected") setFailure(result.message ?? "The wallet didn’t confirm it. Nothing was withdrawn; try again.");
  };

  const radio = (on: boolean) => cn("flex min-h-[52px] cursor-pointer items-center gap-5 rounded-xl border-[length:var(--border-width-1-5)] border-solid px-6 transition-colors duration-fast", on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface active:bg-bg-subtle");
  const total = amount ? formatUsd(amount) : "$0.00";

  // One primary per step, in the thumb zone: the web dialog's Verify and continue / Continue / Sign and withdraw.
  const why =
    step === "amount" && nothing ? "Nothing to withdraw right now. Your share of each sale lands here." : (step === "identity" || step === "amount") && !online ? OFFLINE_REASON : null;
  const footer = (
    <BottomBar>
      {(why || failure) && (
        <p id="withdraw-why" role={failure ? "alert" : "status"} className={cn(T.caption, failure && "text-text-error")}>
          {failure ?? why}
        </p>
      )}
      {step === "identity" && !identityCode ? (
        <Button size="xl" className="w-full" disabled={!online} aria-describedby={why || failure ? "withdraw-why" : undefined} onClick={sendIdentityCode}>
          Continue
        </Button>
      ) : step === "identity" && identity.result !== "ok" ? (
        <Button size="xl" className="w-full" disabled={identity.code.code.length < 6} onClick={() => identity.code.check(identity.code.code)}>
          Verify code
        </Button>
      ) : step === "identity" ? (
        <Button size="xl" className="w-full" disabled={!online} aria-describedby={why || failure ? "withdraw-why" : undefined} onClick={verifyIdentity}>
          Verify and continue
        </Button>
      ) : step === "method" ? (
        <Button size="xl" className="w-full" aria-describedby={failure ? "withdraw-why" : undefined} onClick={continueFromMethod}>
          Continue
        </Button>
      ) : (
        <Button size="xl" className="w-full" loading={busy} disabled={nothing || !online} aria-describedby={why || failure ? "withdraw-why" : undefined} onClick={withdraw}>
          {amount && !nothing ? `Withdraw ${total}` : "Withdraw"}
        </Button>
      )}
    </BottomBar>
  );

  return (
    <Screen
      top={<TopBar back="/m/settings/idz-pay" onBack={(goBack) => (step === "identity" && identityCode ? setIdentityCode(false) : at > 0 ? go(at - 1) : goBack())} title="Withdraw money" />}
      className="px-8 pb-8"
      footer={footer}
    >
      <div ref={topRef} className="flex flex-col gap-10">
        <OfflineBanner />
        {steps.length > 1 && (
          <p className={cn(T.meta, "-mb-4 pt-4")}>
            Step {at + 1} of {steps.length} · {STEP_NAME[step]}
          </p>
        )}

        {step === "identity" && !identityCode && (
          <section aria-labelledby="withdraw-identity" className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
              <h2 id="withdraw-identity" className={T.title}>
                Verify your identity
              </h2>
              <p className={T.body}>Your first withdrawal asks who is withdrawing. You do this once.</p>
            </header>
            <IdentityFields {...identity.fields} />
          </section>
        )}

        {step === "identity" && identityCode && (
          <section aria-labelledby="withdraw-number" className="flex flex-col gap-8">
            <h2 id="withdraw-number" className={T.title}>
              Verify your number
            </h2>
            <IdentityCode form={identity} onChangeNumber={() => setIdentityCode(false)} />
          </section>
        )}

        {step === "method" && (
          <section aria-labelledby="withdraw-method" className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
              <h2 id="withdraw-method" className={T.title}>
                Where the money goes
              </h2>
              <p className={T.body}>Where should withdrawals go? This becomes your default withdrawal method; you can add others later.</p>
            </header>
            <PhoneMethodFields form={form} problem={methodProblem} onEdit={() => setMethodProblem(null)} />
          </section>
        )}

        {step === "amount" && (
          <>
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
            {target && (
              <ListCard label="Withdrawal">
                {target.isNew ? (
                  // The method typed a step back: new, it becomes your default; tapping it goes back to change it.
                  <ListRow
                    icon={Wallet02Icon}
                    title="Withdrawal method"
                    meta={`New, becomes your default · ${shortAddress(target.address)}`}
                    value={target.label}
                    onClick={() => go(steps.indexOf("method"))}
                  />
                ) : store.methods.length > 1 ? (
                  <ListRow icon={Wallet02Icon} title="Withdrawal method" meta={`${shortAddress(target.address)} · ${networkName(target.network)}`} value={target.label} onClick={() => setPicking(true)} />
                ) : (
                  <ListRow icon={Wallet02Icon} title="Withdrawal method" meta={`${shortAddress(target.address)} · ${networkName(target.network)}`} value={target.label} />
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
            )}
          </>
        )}
      </div>
      {!firstMethod && store.methods.length > 0 && (
        <PickSheet
          open={picking}
          onClose={() => setPicking(false)}
          title="Withdrawal method"
          value={chosen?.id ?? ""}
          options={store.methods.map((m) => ({ value: m.id, label: `${m.label}${m.id === store.defaultMethodId ? " (default)" : ""}`, helper: `${shortAddress(m.address)} · ${networkName(m.network)}` }))}
          onPick={setMethodId}
        />
      )}
      <Sheet
        open={sent !== null}
        onClose={() => router.replace("/m/settings/idz-pay")}
        title="Withdrawal recorded"
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => sent && router.replace(`/m/settings/idz-pay/history?tx=${sent.id}`)}>
              See it in history
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
