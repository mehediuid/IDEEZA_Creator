"use client";

// Get paid (/m/settings/idz-pay; mobile Figma "Genarel > IDEEZA pay › Get
// Paid"), on the web's Get paid record and arithmetic (lib/account/payout.ts,
// use-payout.ts, components/settings/get-paid): the available balance in
// dollars at the demo rates with Withdraw money, and — once something of
// yours is listed or sold — the balance by project, the identity check, the
// tax rows (held: the web keeps no tax data until real payouts, V7), the
// withdrawal methods (⋮ Make default — signed in the wallet sheet — or
// Remove, asked first), Add withdrawal method (a crypto wallet; bank,
// Payoneer and PayPal aren't in the app), and Get paid in (USDT, or IDZ at
// the app's one IDZ price). Before that, the web's "Set up when you sell"
// rows say what each part will do, with nothing to fill in. Offline, every
// action that writes waits with its reason. The header's history button
// opens the withdrawal history.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BankIcon, Clock01Icon, Delete02Icon, Download04Icon, MoreVerticalIcon, PaypalIcon, PlusSignIcon, StarIcon, Wallet02Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { methodRequest } from "@/components/settings/get-paid/method-dialog";
import { networkName, useGetPaidData } from "@/components/settings/get-paid/parts";
import { DEMO_USD_RATES, balanceOf, centsFloor, formatUsd, makeDefault, removeMethod, type PayoutStore, type PayoutToken, type WithdrawalMethod } from "@/lib/account/payout";
import { scrubPayout, updatePayout, usePayout } from "@/lib/account/use-payout";
import { IDZ_USD_PRICE } from "@/lib/wallet/idz-price";
import { levelDueOf, levelStatusOf, LEVEL_AT, type KycLevels } from "@/lib/commerce/kyc-levels";
import { useKyc } from "@/lib/commerce/use-commerce";
import { useKycLevels } from "@/lib/commerce/use-kyc-levels";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { compareAmounts } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ListCard, ListRow } from "../kit/list";
import { ActionSheet, Sheet } from "../kit/sheet";
import { SheetSelect } from "../kit/sheet-select";
import { OfflineBanner, useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { BulletList, CARD, LINK, OFFLINE_REASON, n } from "./parts";

export const SAVE_FAILED = "This browser couldn’t save it (storage is full or blocked). Nothing changed.";

/** Get paid's record, your earnings and identity, read together. */
export function useGetPaid() {
  const store = usePayout();
  const kyc = useKyc();
  const levels = useKycLevels();
  const data = useGetPaidData();
  const loaded = store !== undefined && kyc !== undefined && levels !== undefined && data.ready;
  const balance = store ? balanceOf(data.earnings, store.withdrawals) : null;
  return { store, kyc: kyc ?? null, levels, data, loaded, balance, verified: !!kyc };
}

/** "1 IDZ ≈ $0.025": the one IDZ price, as short as it reads. */
export const IDZ_RATE_LINE = `1 IDZ ≈ $${Number(IDZ_USD_PRICE).toFixed(3)}`;

const TOKENS: { value: PayoutToken; label: string }[] = [
  { value: "USDT", label: "USDT · 1 USDT = $1" },
  { value: "IDZ", label: `IDZ · demo rate ${IDZ_RATE_LINE}` },
];

/** The KYC row's line: the highest level approved, or the one under review. */
function kycLine(verified: boolean, levels: KycLevels | undefined): string {
  if (!verified) return "Not verified yet";
  if (!levels) return "Level 1 approved";
  if (levelStatusOf(levels, "advanced") === "approved") return "Level 3 approved";
  if (levelStatusOf(levels, "advanced") === "review") return "Level 3 under review";
  if (levelStatusOf(levels, "intermediate") === "approved") return "Level 2 approved";
  if (levelStatusOf(levels, "intermediate") === "review") return "Level 2 under review";
  return "Level 1 approved";
}

export function GetPaidScreen() {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const { store, kyc, levels, data, loaded, balance, verified } = useGetPaid();
  const { request, sheet } = useWalletSheet();
  const [adding, setAdding] = React.useState(false);
  const [menuFor, setMenuFor] = React.useState<WithdrawalMethod | null>(null);
  const [removing, setRemoving] = React.useState<WithdrawalMethod | null>(null);
  const [higher, setHigher] = React.useState(false);

  // Tax data an older version kept goes the first time the page is opened (V7).
  React.useEffect(() => {
    scrubPayout();
  }, []);

  const available = balance ? centsFloor(balance.available) : "0";
  const hasMoney = compareAmounts(available, "0") > 0;
  const due = levels ? levelDueOf(levels, data.salesUsd) : null;
  const setup = store ? data.stageOf(store) === "setup" : false;
  const verifyHref = "/m/settings/kyc/1?next=/m/settings/idz-pay";

  const makeDefaultSigned = async (m: WithdrawalMethod) => {
    if (!online) return toast({ title: OFFLINE_REASON, lead: "error" });
    const result = await request(methodRequest("default", m, true), {
      commit: (proof) => (updatePayout((s) => makeDefault(s, m.id, proof.at, proof.signature)) ? { ok: true } : { ok: false, message: SAVE_FAILED }),
    });
    if (result.ok) toast({ title: `${m.label} is your default withdrawal method`, lead: "success" });
  };

  const withdrawWhy = !hasMoney
    ? setup
      ? "Nothing to withdraw yet. Once something of yours is listed or sold, your share of each sale lands here."
      : "Nothing to withdraw right now. Your share of each sale lands here, after the 2.5% IDEEZA fee and any splits."
    : !online
      ? OFFLINE_REASON
      : null;

  return (
    <Screen
      top={<TopBar back="/m/settings" title="Get paid" actions={[{ icon: Clock01Icon, label: "Withdrawal history", onClick: () => router.push("/m/settings/idz-pay/history") }]} />}
      className="px-8 pb-12 pt-4"
    >
      {!loaded || !store || !balance ? (
        <div className="flex flex-col gap-8" aria-label="Loading" role="status">
          <Skeleton shape="block" className="h-[160px] w-full" />
          <Skeleton shape="block" className="h-[64px] w-full" />
          <Skeleton shape="block" className="h-[64px] w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          <OfflineBanner />
          <section aria-label="Available balance" className={cn(CARD, "flex flex-col items-center gap-6 p-8 text-center")}>
            <span className={cn(T.body, "text-text-primary")}>Available balance</span>
            <span className="flex items-baseline gap-2">
              <span className={cn(T.amountHero, "text-text-brand")}>{formatUsd(available)}</span>
              <span className={cn(T.meta, "text-text-primary")}>USD</span>
            </span>
            <span className={cn(T.meta, "flex flex-wrap items-center justify-center gap-3")}>
              <TestnetDemoBadge />
              At demo rates. Withdrawn so far: {formatUsd(balance.withdrawn)}
            </span>
            <Button size="xl" className="w-full" disabled={!!withdrawWhy} aria-describedby={withdrawWhy ? "withdraw-why" : undefined} onClick={() => router.push("/m/settings/idz-pay/withdraw")}>
              <Icon icon={Download04Icon} size={20} />
              Withdraw money
            </Button>
            {withdrawWhy && (
              <p id="withdraw-why" className={T.caption}>
                {withdrawWhy}
              </p>
            )}
          </section>

          {setup ? (
            <SetupRows verified={verified} kycAt={kyc?.at ?? null} verifyHref={verifyHref} online={online} />
          ) : (
            <>
              <ByProject byProject={data.byProject} withdrawn={balance.withdrawn} />

              {!verified ? (
                <Banner
                  tone="attention"
                  title="Verify your identity"
                  action={
                    <Link href={verifyHref} className={cn(T.rowTitle, "hover:underline")}>
                      Verify now
                    </Link>
                  }
                >
                  Your first withdrawal asks for it, and so does selling physical copies.
                </Banner>
              ) : due ? (
                <Banner
                  tone="info"
                  title={due === "intermediate" ? "Identity check required" : "Enhanced verification needed"}
                  action={
                    <button type="button" onClick={() => setHigher(true)} className={cn(T.rowTitle, "hover:underline")}>
                      See what’s needed
                    </button>
                  }
                >
                  Your sales passed ${n(LEVEL_AT[due])}. Nothing is limited in this demo.
                </Banner>
              ) : null}

              <section aria-labelledby="tax" className="flex flex-col gap-4">
                <h2 id="tax" className={T.section}>
                  Tax information
                </h2>
                <ListCard>
                  <ListRow title="Tax residence" meta="Update your tax details" value="Later" disabled />
                  <ListRow title="Tax identification" meta="Whether IDEEZA needs to withhold taxes from your earnings" value="Later" disabled />
                </ListCard>
                <p className={T.meta}>Tax forms come with real payouts. Nothing is withheld and no tax details are kept in this demo.</p>
              </section>

              <section aria-labelledby="methods" className="flex flex-col gap-4">
                <h2 id="methods" className={T.section}>
                  Withdrawal methods
                </h2>
                {store.methods.length === 0 ? (
                  <p className={T.body}>None yet. Your first withdrawal asks where the money goes, or add a method now.</p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {store.methods.map((m) => (
                      <li key={m.id} className={cn(CARD, "flex items-center gap-5 px-6 py-5")}>
                        <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
                          <Icon icon={Wallet02Icon} size={22} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex items-center gap-3">
                            <span className={cn(T.rowTitle, "truncate")}>{m.label}</span>
                            {m.id === store.defaultMethodId && <Badge tone="success">Default</Badge>}
                          </span>
                          <span className={cn(T.meta, "truncate")}>
                            <span className="font-mono">{shortAddress(m.address)}</span> · {networkName(m.network)}
                          </span>
                        </span>
                        <button
                          type="button"
                          aria-label={`More for ${m.label}`}
                          onClick={() => setMenuFor(m)}
                          className="-mr-3 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          <Icon icon={MoreVerticalIcon} size={20} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button hierarchy="secondary" size="xl" className="w-full" disabled={!online} aria-describedby={!online ? "add-why" : undefined} onClick={() => setAdding(true)}>
                  <Icon icon={PlusSignIcon} size={18} />
                  Add withdrawal method
                </Button>
                {!online && (
                  <p id="add-why" className={T.caption}>
                    {OFFLINE_REASON}
                  </p>
                )}
              </section>

              <section aria-labelledby="get-paid-in" className="flex flex-col gap-4">
                <h2 id="get-paid-in" className={T.section}>
                  Get paid in
                </h2>
                <SheetSelect
                  title="Get paid in"
                  value={store.getPaidIn}
                  options={TOKENS}
                  onChange={(v) => {
                    const token = v as PayoutToken;
                    if (updatePayout((s) => ({ ...s, getPaidIn: token }))) toast({ title: `You’re paid in ${token}` });
                    else toast({ title: SAVE_FAILED, lead: "error" });
                  }}
                />
                <p className={T.meta}>Withdrawals pay out in this token, at the demo rate. The balance in dollars is the same either way.</p>
              </section>
            </>
          )}

          <ListCard>
            <ListRow href="/m/settings/kyc" icon={Shield01Icon} title="KYC verification" meta={kycLine(verified, levels)} />
          </ListCard>
        </div>
      )}

      <AddMethodSheet open={adding} onClose={() => setAdding(false)} onCrypto={() => router.push("/m/settings/idz-pay/method")} />
      <ActionSheet
        open={menuFor !== null}
        onClose={() => setMenuFor(null)}
        title={menuFor?.label}
        items={
          menuFor && store
            ? [
                ...(menuFor.id !== store.defaultMethodId ? [{ label: "Make default", icon: StarIcon, onSelect: () => void makeDefaultSigned(menuFor) }] : []),
                { label: "Remove", icon: Delete02Icon, destructive: true, onSelect: () => setRemoving(menuFor) },
              ]
            : []
        }
      />
      {store && (
        <ConfirmSheet
          open={removing !== null}
          onClose={() => setRemoving(null)}
          title="Remove withdrawal method?"
          body={removing ? <RemoveWords method={removing} store={store} /> : null}
          verb="Remove method"
          onConfirm={() => {
            const m = removing;
            if (!m) return;
            if (updatePayout((s) => removeMethod(s, m.id, Date.now()))) toast({ title: `${m.label} removed` });
            else toast({ title: SAVE_FAILED, lead: "error" });
          }}
        />
      )}
      <HigherCheckSheet open={higher} onClose={() => setHigher(false)} level={due} />
      {sheet}
    </Screen>
  );
}

/** The web's "Set up when you sell": what each part will do, nothing to fill in yet. */
function SetupRows({ verified, kycAt, verifyHref, online }: { verified: boolean; kycAt: number | null; verifyHref: string; online: boolean }) {
  const router = useRouter();
  return (
    <section aria-labelledby="setup" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="setup" className={T.section}>
          Set up when you sell
        </h2>
        <p className={T.body}>Nothing to fill in yet. Once something of yours is listed or sold, this page fills in.</p>
      </div>
      <ListCard>
        <ListRow title="Your balance" meta="Your share of each sale lands here, by project, after the 2.5% IDEEZA fee and any splits." />
        <ListRow title="Withdraw" meta="Take out what you’ve earned whenever you like. You sign each withdrawal in your demo wallet." />
        <ListRow title="Where the money goes" meta="Your first withdrawal asks for a wallet address and its network." />
        <ListRow title="Get paid in" meta="USDT or IDZ. You choose once there is something to withdraw." />
        <ListRow
          title="Verify your identity"
          meta={verified && kycAt ? `Verified on ${new Date(kycAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} (Testnet demo).` : "Asked at your first withdrawal, and before you sell physical copies."}
        />
        <ListRow title="History and statement" meta="Every withdrawal, and a CSV statement of your sales for your records." />
      </ListCard>
      <div className="flex flex-col gap-4">
        <Button size="xl" className="w-full" onClick={() => router.push("/m/projects")}>
          Go to your projects
        </Button>
        {!verified && (
          <Button hierarchy="secondary" size="xl" className="w-full" disabled={!online} onClick={() => router.push(verifyHref)}>
            Verify now
          </Button>
        )}
      </div>
    </section>
  );
}

/** The web's Balance › By project: each project's share after the fee, then what was withdrawn. */
function ByProject({ byProject, withdrawn }: { byProject: { projectId: string; projectName: string; sales: number; netUsd: string }[]; withdrawn: string }) {
  return (
    <section aria-labelledby="by-project" className="flex flex-col gap-4">
      <h2 id="by-project" className={T.section}>
        By project
      </h2>
      {byProject.length === 0 ? (
        <p className={T.body}>No sales yet.</p>
      ) : (
        <dl className={cn(CARD, "flex flex-col divide-y divide-border px-8 py-2")}>
          {byProject.map((p) => (
            <div key={p.projectId} className="flex items-baseline justify-between gap-6 py-4">
              <dt className="flex min-w-0 flex-col gap-1">
                <Link href={`/m/projects/${encodeURIComponent(p.projectId)}/earn/money`} className={cn(LINK, "w-fit text-text-primary")}>
                  {p.projectName}
                </Link>
                <span className={cn(T.meta, "text-text-tertiary")}>{p.sales === 1 ? "1 sale" : `${n(p.sales)} sales`}, your share after the fee</span>
              </dt>
              <dd className={cn(T.body, "shrink-0 tabular-nums text-text-primary")}>{formatUsd(p.netUsd)}</dd>
            </div>
          ))}
          {compareAmounts(withdrawn, "0") > 0 && (
            <div className="flex items-baseline justify-between gap-6 py-4">
              <dt className={T.body}>Withdrawn so far</dt>
              <dd className={cn(T.body, "tabular-nums")}>−{formatUsd(withdrawn)}</dd>
            </div>
          )}
        </dl>
      )}
      <p className={cn(T.meta, "text-text-tertiary")}>
        Sales in test coins count at fixed demo rates: 1 ETH or WETH = {formatUsd(DEMO_USD_RATES.ETH)}, 1 MATIC = {formatUsd(DEMO_USD_RATES.MATIC)}; USDT and USDC = $1.00; {IDZ_RATE_LINE}. Withdrawals are recorded here and no coins move.
      </p>
    </section>
  );
}

function RemoveWords({ method, store }: { method: WithdrawalMethod; store: PayoutStore }) {
  const next = removeMethod(store, method.id, 0);
  const heir = method.id === store.defaultMethodId ? next.methods.find((m) => m.id === next.defaultMethodId) : null;
  return (
    <>
      {`If you remove ${method.label} (${shortAddress(method.address)} on ${networkName(method.network)}), it won’t receive withdrawals any more. `}
      {heir ? `${heir.label} becomes your default method.` : next.methods.length === 0 ? "Your next withdrawal will ask where the money goes." : "Your default stays as it is."} Past withdrawals keep their record.
    </>
  );
}

/** Add withdrawal method (Figma "Get Paid - withdrawal methods" modal): the web takes a crypto wallet only. */
function AddMethodSheet({ open, onClose, onCrypto }: { open: boolean; onClose: () => void; onCrypto: () => void }) {
  const row = "flex min-h-[64px] items-center gap-5 rounded-xl border-[length:var(--border-width-1-5)] border-solid px-6 py-4 text-left";
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add withdrawal method"
      description="Choose where your withdrawals go."
      actions={
        <>
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              onClose();
              onCrypto();
            }}
          >
            Continue
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Withdrawal method" className="flex flex-col gap-4">
        <div role="radio" aria-checked className={cn(row, "border-border-brand bg-bg-brand-subtle")}>
          <span aria-hidden className="text-text-brand">
            <Icon icon={Wallet02Icon} size={24} />
          </span>
          <span className="flex flex-col">
            <span className={T.rowTitle}>Crypto wallet</span>
            <span className={T.meta}>USDT or IDZ to a wallet address, on testnet</span>
          </span>
        </div>
        {[
          { label: "Direct bank", line: "Deposits to your local bank in your currency", icon: BankIcon },
          { label: "Payoneer", line: "To your Payoneer account", icon: Wallet02Icon },
          { label: "PayPal", line: "To your PayPal account", icon: PaypalIcon },
        ].map((m) => (
          <div key={m.label} role="radio" aria-checked={false} aria-disabled className={cn(row, "border-border text-[color:var(--color-icon-disabled)]")}>
            <Icon icon={m.icon} size={24} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn(T.body, "text-text-disabled")}>{m.label}</span>
              <span className={cn(T.meta, "text-text-disabled")}>{m.line}</span>
            </span>
            <span className={cn(T.caption, "shrink-0 text-text-tertiary")}>Not available yet</span>
          </div>
        ))}
      </div>
      <p className={T.meta}>Bank, Payoneer and PayPal payouts aren’t in the app yet, so no bank details are asked for.</p>
    </Sheet>
  );
}

export const LEVEL_NEEDS: Record<"intermediate" | "advanced", string[]> = {
  intermediate: ["All Level 1 data (already collected)", "A government-issued photo ID (passport, national ID or driver’s licence)", "Your date of birth", "Your full residential address", "Your tax residency country"],
  advanced: [
    "All Level 1 and Level 2 data (already collected)",
    "Proof of address (a utility bill or bank statement, at most 3 months old)",
    "A liveness check (selfie, blink, head turn)",
    "Where your funds come from (employment, business, savings, investment, other)",
    "Your tax identification number, where your country has one",
  ],
};

/** Identity check required / Enhanced verification needed (Figma Level 2 and Level 3 modals). */
export function HigherCheckSheet({ open, onClose, level }: { open: boolean; onClose: () => void; level: "intermediate" | "advanced" | null }) {
  const router = useRouter();
  if (!level) return null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={level === "intermediate" ? "Identity check required" : "Enhanced verification needed"}
      description={
        level === "intermediate"
          ? `Your sales passed $${n(LEVEL_AT.intermediate)}, where a fuller check with an ID document is asked. Nothing is limited in this demo.`
          : `You reached the $${n(LEVEL_AT.advanced)} milestone, where a deeper identity check is asked. Nothing is limited in this demo.`
      }
      actions={
        <Button size="xl" className="w-full" onClick={() => router.push(`/m/settings/kyc/${level === "intermediate" ? 2 : 3}`)}>
          Continue to verification
        </Button>
      }
    >
      <p className={T.rowTitle}>What you’ll need:</p>
      <BulletList items={LEVEL_NEEDS[level]} />
    </Sheet>
  );
}
