"use client";

// Get paid (/m/settings/idz-pay; mobile Figma "Genarel > IDEEZA pay › Get
// Paid"), on the web's Get paid record and arithmetic (lib/account/payout.ts,
// use-payout.ts, components/settings/get-paid), laid out as a phone money
// screen: the available balance first (in dollars at the demo rates, whose
// table sits behind the ⓘ), Withdraw money in the Bottom action bar, then —
// once something of yours is listed or sold — one identity row (Verify your
// identity, a higher level that's due, or the level you're at — which says
// the next one ahead from 75 % of its threshold, as the web does), the balance
// by project, the withdrawal methods (a row opens ⋮ Make default — signed in
// the wallet sheet — or Remove, asked first; Add withdrawal method takes a
// crypto wallet, bank, Payoneer and PayPal aren't in the app), Get paid in
// (USDT, or IDZ at the app's one IDZ price) and the tax note (held: the web
// keeps no tax data until real payouts, V7; its two rows are in the ⓘ).
// Before that, the web's "Set up when you sell" rows say what each part will
// do, and the bar goes to your projects. Offline, every action that writes
// waits with its reason. The header's history button opens the withdrawal
// history.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BankIcon,
  Clock01Icon,
  Coins01Icon,
  Delete02Icon,
  Download04Icon,
  MoreVerticalIcon,
  PaypalIcon,
  PlusSignIcon,
  StarIcon,
  Wallet02Icon,
  Shield01Icon,
  UserIdVerificationIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { methodRequest } from "@/components/settings/get-paid/method-dialog";
import { networkName, useGetPaidData } from "@/components/settings/get-paid/parts";
import { DEMO_USD_RATES, IDZ_RATE_LINE, balanceOf, centsFloor, formatUsd, makeDefault, removeMethod, type PayoutStore, type PayoutToken, type WithdrawalMethod } from "@/lib/account/payout";
import { scrubPayout, updatePayout, usePayout } from "@/lib/account/use-payout";
import { levelDueOf, levelNearOf, levelStatusOf, LEVEL_AT, type KycLevels } from "@/lib/commerce/kyc-levels";
import { useKyc } from "@/lib/commerce/use-commerce";
import { useKycLevels } from "@/lib/commerce/use-kyc-levels";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { compareAmounts } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { LIST_ROW, ListCard, ListRow } from "../kit/list";
import { PickSheet, type PickOption } from "../kit/pick-list";
import { ActionSheet, Sheet } from "../kit/sheet";
import { OfflineBanner, useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { BulletList, Hero, InfoLine, OFFLINE_REASON, SectionHead, n } from "./parts";

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

/** "1 IDZ ≈ $0.025": the one IDZ price, as short as it reads — the web's Get paid says the same (lib/account/payout). */
export { IDZ_RATE_LINE };

const TOKENS: PickOption<PayoutToken>[] = [
  { value: "USDT", label: "USDT", helper: "1 USDT = $1" },
  { value: "IDZ", label: "IDZ", helper: `Demo rate ${IDZ_RATE_LINE}` },
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
  const [paidIn, setPaidIn] = React.useState(false);

  // Tax data an older version kept goes the first time the page is opened (V7).
  React.useEffect(() => {
    scrubPayout();
  }, []);

  const available = balance ? centsFloor(balance.available) : "0";
  const hasMoney = compareAmounts(available, "0") > 0;
  const due = levels ? levelDueOf(levels, data.salesUsd) : null;
  const near = levels ? levelNearOf(levels, data.salesUsd) : null;
  const setup = store ? data.stageOf(store) === "setup" : false;
  const verifyHref = "/m/settings/kyc/1?next=/m/settings/idz-pay";
  const ready = loaded && !!store && !!balance;

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

  // One primary in the thumb zone: Withdraw money once there is a balance page; before anything is
  // listed or sold, the way to get there.
  const footer = !ready ? undefined : setup ? (
    <BottomBar>
      <Button size="xl" className="w-full" onClick={() => router.push("/m/projects")}>
        Go to your projects
      </Button>
    </BottomBar>
  ) : (
    <BottomBar>
      {withdrawWhy && (
        <p id="withdraw-why" className={T.caption}>
          {withdrawWhy}
        </p>
      )}
      <Button size="xl" className="w-full" disabled={!!withdrawWhy} aria-describedby={withdrawWhy ? "withdraw-why" : undefined} onClick={() => router.push("/m/settings/idz-pay/withdraw")}>
        Withdraw money
      </Button>
    </BottomBar>
  );

  return (
    <Screen
      top={<TopBar back="/m/settings" title="Get paid" actions={[{ icon: Clock01Icon, label: "Withdrawal history", onClick: () => router.push("/m/settings/idz-pay/history") }]} />}
      className="px-8 pb-12"
      footer={footer}
    >
      {!ready ? (
        <div className="flex flex-col gap-8 pt-4" aria-label="Loading" role="status">
          <Skeleton shape="block" className="h-[140px] w-full" />
          <Skeleton shape="block" className="h-[64px] w-full" />
          <Skeleton shape="block" className="h-[64px] w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <OfflineBanner />
          <Hero
            label="Available balance"
            infoTitle="How Get paid counts"
            info={<RatesWords />}
            meta={
              <>
                <TestnetDemoBadge />
                <span>At demo rates · Withdrawn so far {formatUsd(balance.withdrawn)}</span>
              </>
            }
          >
            <span className="flex items-baseline gap-2">
              <span className={cn(T.amountHero, "text-text-brand")}>{formatUsd(available)}</span>
              <span className={cn(T.meta, "text-text-primary")}>USD</span>
            </span>
            {setup && withdrawWhy && <span className={cn(T.caption, "max-w-[300px]")}>{withdrawWhy}</span>}
          </Hero>

          {setup ? (
            <SetupRows verified={verified} kycAt={kyc?.at ?? null} verifyHref={verifyHref} />
          ) : (
            <>
              <ListCard label="Identity">
                <IdentityRow verified={verified} levels={levels} due={due} near={near} salesUsd={data.salesUsd} verifyHref={verifyHref} onDue={() => setHigher(true)} />
              </ListCard>

              <ByProject byProject={data.byProject} withdrawn={balance.withdrawn} />

              <section aria-labelledby="methods" className="flex flex-col gap-4">
                <SectionHead id="methods">Withdrawal methods</SectionHead>
                <ListCard>
                  {store.methods.map((m) => (
                    <li key={m.id}>
                      <button type="button" aria-label={`${m.label}${m.id === store.defaultMethodId ? ", default" : ""}: more`} onClick={() => setMenuFor(m)} className={LIST_ROW}>
                        <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
                          <Icon icon={Wallet02Icon} size={22} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex items-center gap-3">
                            <span className={cn(T.body, "truncate text-text-primary")}>{m.label}</span>
                            {m.id === store.defaultMethodId && <Badge tone="success">Default</Badge>}
                          </span>
                          <span className={cn(T.meta, "truncate")}>
                            <span className="font-mono">{shortAddress(m.address)}</span> · {networkName(m.network)}
                          </span>
                        </span>
                        <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                          <Icon icon={MoreVerticalIcon} size={20} />
                        </span>
                      </button>
                    </li>
                  ))}
                  <ListRow
                    icon={PlusSignIcon}
                    title="Add withdrawal method"
                    meta={store.methods.length === 0 ? "None yet. Your first withdrawal asks where the money goes, or add a method now." : undefined}
                    disabled={!online}
                    reason={OFFLINE_REASON}
                    onClick={() => setAdding(true)}
                  />
                </ListCard>
              </section>

              <ListCard label="Get paid in">
                <ListRow
                  icon={Coins01Icon}
                  title="Get paid in"
                  meta="Withdrawals pay out in this token, at the demo rate."
                  value={store.getPaidIn}
                  onClick={() => setPaidIn(true)}
                />
              </ListCard>

              <InfoLine infoTitle="Tax information" info={<TaxWords />}>
                Tax information comes with real payouts.
              </InfoLine>
            </>
          )}
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
      {store && (
        <PickSheet
          open={paidIn}
          onClose={() => setPaidIn(false)}
          title="Get paid in"
          description="Withdrawals pay out in this token, at the demo rate. The balance in dollars is the same either way."
          value={store.getPaidIn}
          options={TOKENS}
          onPick={(token) => {
            if (updatePayout((s) => ({ ...s, getPaidIn: token }))) toast({ title: `You’re paid in ${token}` });
            else toast({ title: SAVE_FAILED, lead: "error" });
          }}
        />
      )}
      <HigherCheckSheet open={higher} onClose={() => setHigher(false)} level={due} />
      {sheet}
    </Screen>
  );
}

/** The balance's ⓘ: how the dollars are counted (the demo rates) and that no coins move. */
function RatesWords() {
  return (
    <>
      <p className={T.body}>Your share of each sale lands here, by project, after the 2.5% IDEEZA fee and any splits.</p>
      <p className={T.body}>
        Sales in test coins count at fixed demo rates: 1 ETH or WETH = {formatUsd(DEMO_USD_RATES.ETH)}, 1 MATIC = {formatUsd(DEMO_USD_RATES.MATIC)}; USDT and USDC = $1.00; {IDZ_RATE_LINE}. Withdrawals are recorded here and no coins move.
      </p>
    </>
  );
}

/** Tax information's ⓘ: the web's two rows, both later, and what the demo keeps (nothing). */
function TaxWords() {
  return (
    <>
      <ListCard>
        <ListRow title="Tax residence" meta="Update your tax details" value="Later" />
        <ListRow title="Tax identification" meta="Whether IDEEZA needs to withhold taxes from your earnings" value="Later" />
      </ListCard>
      <p className={T.body}>Tax forms come with real payouts. Nothing is withheld and no tax details are kept in this demo.</p>
    </>
  );
}

/** The one identity row: what Get paid needs from you now, or the level you're at. */
function IdentityRow({
  verified,
  levels,
  due,
  near,
  salesUsd,
  verifyHref,
  onDue,
}: {
  verified: boolean;
  levels: KycLevels | undefined;
  due: "intermediate" | "advanced" | null;
  /** The next level, said ahead from 75 % of its threshold (MON-21). */
  near: { at: number } | null;
  salesUsd: number;
  verifyHref: string;
  onDue: () => void;
}) {
  if (!verified)
    return (
      <ListRow
        leading={<StateMark icon={UserIdVerificationIcon} tone="warning" />}
        title="Verify your identity"
        meta="Not verified yet. Your first withdrawal asks for it, and so does selling physical copies."
        href={verifyHref}
      />
    );
  if (due)
    return (
      <ListRow
        leading={<StateMark icon={Shield01Icon} tone="info" />}
        title={due === "intermediate" ? "Identity check required" : "Enhanced verification needed"}
        meta={`Your sales passed $${n(LEVEL_AT[due])}. Nothing is limited in this demo.`}
        onClick={onDue}
      />
    );
  return (
    <ListRow
      leading={<StateMark icon={Shield01Icon} tone="success" />}
      title="KYC verification"
      meta={
        near ? (
          <>
            {kycLine(verified, levels)}
            <span className="block">
              Your sales are {formatUsd(salesUsd.toFixed(2))}. From ${n(near.at)}, a fuller check with ID documents will be asked.
            </span>
          </>
        ) : (
          kycLine(verified, levels)
        )
      }
      trailing={<Badge tone="success">Verified</Badge>}
      href="/m/settings/kyc"
    />
  );
}

/** A row's 40 px state disc: warning (to do), info (asked), success (done). */
function StateMark({ icon, tone }: { icon: typeof Shield01Icon; tone: "warning" | "info" | "success" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-[40px] shrink-0 items-center justify-center rounded-full",
        tone === "warning" && "bg-badge-warning-bg text-text-warning",
        tone === "info" && "bg-bg-brand-subtle text-text-brand",
        tone === "success" && "bg-bg-success-subtle text-text-success",
      )}
    >
      <Icon icon={icon} size={20} />
    </span>
  );
}

/** The web's "Set up when you sell": what each part will do, nothing to fill in yet. Verify is the one row that opens. */
function SetupRows({ verified, kycAt, verifyHref }: { verified: boolean; kycAt: number | null; verifyHref: string }) {
  return (
    <section aria-labelledby="setup" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <SectionHead id="setup">Set up when you sell</SectionHead>
        <p className={T.meta}>Nothing to fill in yet. Once something of yours is listed or sold, this page fills in.</p>
      </div>
      <ListCard>
        <ListRow icon={Wallet02Icon} title="Your balance" meta="Your share of each sale lands here, by project, after the 2.5% IDEEZA fee and any splits." />
        <ListRow icon={Download04Icon} title="Withdraw" meta="Take out what you’ve earned whenever you like. You sign each withdrawal in your demo wallet." />
        <ListRow icon={BankIcon} title="Where the money goes" meta="Your first withdrawal asks for a wallet address and its network." />
        <ListRow icon={Coins01Icon} title="Get paid in" meta="USDT or IDZ. You choose once there is something to withdraw." />
        {verified ? (
          <ListRow
            icon={UserIdVerificationIcon}
            title="Verify your identity"
            meta={kycAt ? `Verified on ${new Date(kycAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} (Testnet demo).` : "Verified (Testnet demo)."}
            href="/m/settings/kyc"
          />
        ) : (
          <ListRow icon={UserIdVerificationIcon} title="Verify your identity" meta="Asked at your first withdrawal, and before you sell physical copies." trailing={<Badge tone="warning">Verify now</Badge>} href={verifyHref} />
        )}
        <ListRow icon={Clock01Icon} title="History and statement" meta="Every withdrawal, and a CSV statement of your sales for your records." />
      </ListCard>
    </section>
  );
}

/** The web's Balance › By project: each project's share after the fee, then what was withdrawn. */
function ByProject({ byProject, withdrawn }: { byProject: { projectId: string; projectName: string; sales: number; netUsd: string }[]; withdrawn: string }) {
  return (
    <section aria-labelledby="by-project" className="flex flex-col gap-4">
      <SectionHead id="by-project">By project</SectionHead>
      <ListCard>
        {byProject.length === 0 ? (
          <ListRow title="No sales yet." />
        ) : (
          byProject.map((p) => (
            <ListRow
              key={p.projectId}
              title={p.projectName}
              meta={`${p.sales === 1 ? "1 sale" : `${n(p.sales)} sales`}, your share after the fee`}
              value={<span className="tabular-nums text-text-primary">{formatUsd(p.netUsd)}</span>}
              href={`/m/projects/${encodeURIComponent(p.projectId)}/earn/money`}
            />
          ))
        )}
        {compareAmounts(withdrawn, "0") > 0 && <ListRow title="Withdrawn so far" value={<span className="tabular-nums">−{formatUsd(withdrawn)}</span>} />}
      </ListCard>
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
      </div>
      <ListCard label="Not available yet">
        {[
          { label: "Direct bank", line: "Deposits to your local bank in your currency", icon: BankIcon },
          { label: "Payoneer", line: "To your Payoneer account", icon: Wallet02Icon },
          { label: "PayPal", line: "To your PayPal account", icon: PaypalIcon },
        ].map((m) => (
          <ListRow key={m.label} icon={m.icon} title={m.label} meta={m.line} trailing={<Badge tone="neutral">Not available yet</Badge>} />
        ))}
      </ListCard>
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
