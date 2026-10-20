"use client";

// /settings/get-paid (Settings v2, V7): one page for the money your projects
// make. Until something of yours is listed or sold it is one card, "Set up
// when you sell": what will happen, nothing to fill in (Verify identity is
// there too, since physical copies ask it before any sale). Then:
// - Balance: what's available to withdraw, split by project, in dollars at
//   the demo rates (stated), with Withdraw (#withdraw). The first withdrawal
//   asks your identity and where the money goes, inside its own flow.
// - Withdrawal methods: each with its network and full address; Add method
//   and Make default are signed in the demo wallet; every change, a removal
//   too, leaves a notice in the bell.
// - Get paid in: USDT or IDZ, saved on the spot.
// - Verify your identity: Level 1's state (Reset in the demo), and the higher
//   checks as one line, only near their threshold.
// - Withdrawal history and the statement CSV.
// Each row's DOM id is its search target (lib/settings/rows/get-paid.ts).
// Opened from a project's Earn (`?from=`), the header offers the way back.

import * as React from "react";
import Link from "next/link";
import { MoreVerticalIcon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, ConfirmDialog, Menu, TestnetDemoBadge, buttonVariants } from "@/components/ideeza";
import {
  balanceOf,
  centsFloor,
  DEMO_USD_RATES,
  formatUsd,
  removeMethod,
  withdrawStepsOf,
  type PayoutStore,
  type PayoutToken,
  type ProjectEarned,
  type WithdrawalMethod,
} from "@/lib/account/payout";
import { scrubPayout, updatePayout, usePayout } from "@/lib/account/use-payout";
import { higherCheckOf, type KycRecord } from "@/lib/commerce/kyc";
import { resetKycDemo, useKyc } from "@/lib/commerce/use-commerce";
import { earnHref } from "@/lib/manual/earn-route";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { compareAmounts } from "@/lib/wallet/money";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "../settings-card";
import { ChoiceRow } from "../settings-choice";
import { SettingsFrame } from "../settings-frame";
import { HistoryCard } from "./history";
import { IdentityDialog } from "./identity";
import { MethodDialog, useMakeDefault } from "./method-dialog";
import { FullAddress, formatDay, networkName, ReturnLink, TAP, useGetPaidData } from "./parts";
import { WithdrawDialog } from "./withdraw-dialog";

// The settings-card arrival outline, for the blocks this page draws itself (kept out of cn()).
const ARRIVED =
  " scroll-mt-24 data-[arrived]:rounded-lg data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus";

const TOKENS: { value: PayoutToken; label: string; hint: string }[] = [
  { value: "USDT", label: "USDT", hint: "A dollar stablecoin: 1 USDT = $1" },
  { value: "IDZ", label: "IDZ", hint: "IDEEZA's token, at the demo rate 1 IDZ = $1" },
];

/** Lands on a row of this page, outlining it again when the address already points there. */
function land(id: string) {
  if (window.location.hash === `#${id}`) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else window.location.hash = id;
}

export function GetPaidPage({ from }: { from: string | null }) {
  const store = usePayout();
  const kyc = useKyc();
  const data = useGetPaidData();
  const [dialog, setDialog] = React.useState<"withdraw" | "method" | "identity" | null>(null);
  const [removing, setRemoving] = React.useState<WithdrawalMethod | null>(null);
  const [said, setSaid] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const makeDefault = useMakeDefault(setSaid, setError);

  const loaded = store !== undefined && kyc !== undefined && data.ready;

  // Tax data an older version kept goes the first time the page is opened (V7).
  React.useEffect(() => {
    scrubPayout();
  }, []);

  // The rows exist only once the stores are read: arriving at #<row> outlines it then.
  React.useEffect(() => {
    if (loaded && window.location.hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, [loaded]);

  const verified = kyc !== null && kyc !== undefined;
  const say = (s: string) => {
    setError(null);
    setSaid(s);
  };

  let body: React.ReactNode;
  if (!loaded || !store) {
    body = <p className="m-0 text-md leading-md text-text-tertiary">Reading your earnings…</p>;
  } else if (data.stageOf(store) === "setup") {
    body = <SetupCard kyc={kyc ?? null} onVerify={() => setDialog("identity")} />;
  } else {
    const balance = balanceOf(data.earnings, store.withdrawals);
    body = (
      <>
        <BalanceCard
          available={balance.available}
          withdrawn={balance.withdrawn}
          byProject={data.byProject}
          firstTime={withdrawStepsOf({ verified, methods: store.methods.length }).length > 1}
          onWithdraw={() => setDialog("withdraw")}
        />
        <MethodsCard
          store={store}
          onAdd={() => setDialog("method")}
          onDefault={(m) => {
            setError(null);
            void makeDefault(m);
          }}
          onRemove={setRemoving}
          error={error}
        />
        <GetPaidInCard store={store} onSaved={say} />
        <IdentityCard kyc={kyc ?? null} salesUsd={data.salesUsd} onVerify={() => setDialog("identity")} onSay={say} />
        <HistoryCard withdrawals={store.withdrawals} earnings={data.earnings} onSaved={say} />

        <WithdrawDialog
          open={dialog === "withdraw"}
          store={store}
          earned={balance.earned}
          verified={verified}
          onClose={() => setDialog(null)}
          onDone={say}
          onShowHistory={() => {
            setDialog(null);
            window.setTimeout(() => land("history"), 0);
          }}
        />
        <MethodDialog open={dialog === "method"} store={store} onClose={() => setDialog(null)} onDone={say} />
        <ConfirmDialog
          open={removing !== null}
          title="Remove this withdrawal method?"
          confirmLabel="Remove"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const m = removing;
            setRemoving(null);
            if (!m) return;
            if (updatePayout((s) => removeMethod(s, m.id, Date.now()))) say(`${m.label} removed.`);
            else setError(SAVE_FAILED);
          }}
        >
          {removing && <RemoveWords method={removing} store={store} />}
        </ConfirmDialog>
      </>
    );
  }

  return (
    <SettingsFrame page="get-paid" description="Your share of every sale, and how you take it out." actions={<ReturnLink from={from} />}>
      <p role="status" aria-live="polite" className="sr-only">
        {said}
      </p>
      {body}
      <IdentityDialog open={dialog === "identity"} onClose={() => setDialog(null)} onVerified={() => say("Identity verified (demo).")} />
    </SettingsFrame>
  );
}

// ───────────────────────── before anything sells ─────────────────────────

function SetupCard({ kyc, onVerify }: { kyc: KycRecord | null; onVerify: () => void }) {
  return (
    <SettingsCard
      title="Set up when you sell"
      description="Nothing to fill in yet. Once something of yours is listed or sold, this page fills in."
      action={
        <Link href="/projects" className={buttonVariants({ hierarchy: "secondary", size: "sm", className: TAP })}>
          Go to your projects
        </Link>
      }
    >
      <SettingsRow id="balance" label="Your balance" help="Your share of each sale lands here, by project, after the 2.5% IDEEZA fee and any splits." />
      <SettingsRow id="withdraw" label="Withdraw" help="Take out what you've earned whenever you like. You sign each withdrawal in your demo wallet." />
      <SettingsRow id="methods" label="Where the money goes" help="Your first withdrawal asks for a wallet address and its network." />
      <SettingsRow id="get-paid-in" label="Get paid in" help="USDT or IDZ. You choose once there is something to withdraw." />
      <SettingsRow
        id="identity"
        label="Verify your identity"
        help={kyc ? `Verified on ${formatDay(kyc.at)} (Testnet demo).` : "Asked at your first withdrawal, and before you sell physical copies."}
        control={
          kyc ? undefined : (
            <Button type="button" hierarchy="secondary" size="sm" aria-haspopup="dialog" className={TAP} onClick={onVerify}>
              Verify now
            </Button>
          )
        }
      />
      <SettingsRow id="history" label="History and statement" help="Every withdrawal, and a CSV statement of your sales for your records." />
    </SettingsCard>
  );
}

// ───────────────────────── balance ─────────────────────────

function BalanceCard({
  available,
  withdrawn,
  byProject,
  firstTime,
  onWithdraw,
}: {
  available: string;
  withdrawn: string;
  byProject: ProjectEarned[];
  firstTime: boolean;
  onWithdraw: () => void;
}) {
  const reasonId = React.useId();
  const nothing = compareAmounts(centsFloor(available), "0") <= 0;
  return (
    <SettingsCard id="balance" title="Balance" action={<TestnetDemoBadge />}>
      <div className="flex flex-col gap-[16px] pt-[4px]">
        <div id="withdraw" className={cn("flex flex-wrap items-end justify-between gap-[12px] rounded-xl bg-bg-subtle p-[16px]") + ARRIVED}>
          <div className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-sm leading-sm text-text-secondary">Available to withdraw</span>
            <span className="text-2xl font-semibold leading-2xl tabular-nums text-text-primary">{formatUsd(available)}</span>
            <span className="text-sm leading-sm text-text-tertiary">In dollars at demo rates</span>
          </div>
          <Button
            type="button"
            hierarchy="primary"
            size="md"
            aria-haspopup="dialog"
            aria-disabled={nothing || undefined}
            aria-describedby={reasonId}
            className={cn("aria-disabled:cursor-not-allowed aria-disabled:opacity-60 max-sm:w-full", TAP)}
            onClick={() => {
              if (!nothing) onWithdraw();
            }}
          >
            Withdraw
          </Button>
          <p id={reasonId} className="m-0 basis-full text-sm leading-sm text-text-secondary">
            {nothing
              ? "Nothing to withdraw yet. When something of yours sells, your share lands here."
              : firstTime
                ? "Your first withdrawal asks who you are and where the money goes. After that, it's one step."
                : "You sign each withdrawal in your demo wallet."}
          </p>
        </div>

        <div className="flex flex-col">
          <h3 className="m-0 pb-[4px] text-sm font-medium leading-sm text-text-secondary">By project</h3>
          {byProject.length === 0 ? (
            <p className="m-0 py-[8px] text-md leading-md text-text-secondary">No sales yet.</p>
          ) : (
            <dl className="m-0 flex flex-col">
              {byProject.map((p) => (
                <div key={p.projectId} className="flex items-baseline justify-between gap-[16px] border-b border-solid border-border py-[10px]">
                  <dt className="flex min-w-0 flex-col gap-[2px]">
                    <Link
                      href={earnHref(p.projectId, "customers")}
                      className="w-fit rounded-sm text-md font-medium leading-md text-text-primary outline-none hover:text-text-brand hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      {p.projectName}
                    </Link>
                    <span className="text-sm leading-sm text-text-tertiary">{p.sales === 1 ? "1 sale" : `${p.sales} sales`}, your share after the fee</span>
                  </dt>
                  <dd className="m-0 shrink-0 text-md leading-md tabular-nums text-text-primary">{formatUsd(p.netUsd)}</dd>
                </div>
              ))}
              {compareAmounts(withdrawn, "0") > 0 && (
                <div className="flex items-baseline justify-between gap-[16px] py-[10px]">
                  <dt className="text-md leading-md text-text-secondary">Withdrawn so far</dt>
                  <dd className="m-0 text-md leading-md tabular-nums text-text-secondary">−{formatUsd(withdrawn)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        <p className="m-0 max-w-[62ch] text-sm leading-sm text-text-tertiary">
          Sales in test coins count at fixed demo rates: 1 ETH or WETH = {formatUsd(DEMO_USD_RATES.ETH)}, 1 MATIC = {formatUsd(DEMO_USD_RATES.MATIC)};
          USDT, USDC and IDZ = $1.00. Withdrawals are recorded here and no coins move.
        </p>
      </div>
    </SettingsCard>
  );
}

// ───────────────────────── withdrawal methods ─────────────────────────

function MethodsCard({
  store,
  onAdd,
  onDefault,
  onRemove,
  error,
}: {
  store: PayoutStore;
  onAdd: () => void;
  onDefault: (m: WithdrawalMethod) => void;
  onRemove: (m: WithdrawalMethod) => void;
  error: string | null;
}) {
  return (
    <SettingsCard
      id="methods"
      title="Withdrawal methods"
      description="Where withdrawals are sent. Adding one or changing the default is signed in your demo wallet, and the bell tells you."
    >
      {store.methods.length === 0 ? (
        <p className="m-0 py-[8px] text-md leading-md text-text-secondary">None yet. Your first withdrawal asks where the money goes.</p>
      ) : (
        <ul role="list" aria-label="Withdrawal methods" className="m-0 flex list-none flex-col p-0">
          {store.methods.map((m) => (
            <MethodRow key={m.id} method={m} isDefault={m.id === store.defaultMethodId} onDefault={() => onDefault(m)} onRemove={() => onRemove(m)} />
          ))}
        </ul>
      )}
      <Button type="button" hierarchy="secondary" size="sm" aria-haspopup="dialog" className={cn("mt-[4px] self-start", TAP)} onClick={onAdd}>
        Add method
      </Button>
      {error && (
        <p role="alert" className="m-0 pt-[8px] text-sm leading-sm text-text-error">
          {error}
        </p>
      )}
    </SettingsCard>
  );
}

function MethodRow({ method, isDefault, onDefault, onRemove }: { method: WithdrawalMethod; isDefault: boolean; onDefault: () => void; onRemove: () => void }) {
  return (
    <li className="flex items-start gap-[12px] border-b border-solid border-border py-[12px] last:border-b-0">
      <span aria-hidden className="mt-[2px] inline-flex size-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
        <Icon icon={Wallet02Icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="flex flex-wrap items-center gap-[8px]">
          <span className="min-w-0 text-md font-medium leading-md text-text-primary [overflow-wrap:anywhere]">{method.label}</span>
          {isDefault && <Badge tone="success">Default</Badge>}
        </span>
        <span className="text-sm leading-sm text-text-secondary">
          {networkName(method.network)} · added {formatDay(method.addedAt)}
        </span>
        <FullAddress address={method.address} className="text-sm leading-sm text-text-tertiary" />
      </div>
      <Menu
        label={`Actions for ${method.label}`}
        align="end"
        items={[
          ...(isDefault ? [] : [{ id: "default", label: "Make default", onSelect: onDefault }]),
          { id: "remove", label: "Remove", danger: true, onSelect: onRemove },
        ]}
        trigger={(props) => (
          <button
            {...props}
            type="button"
            aria-label={`More for ${method.label}`}
            className="inline-flex size-[36px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)] [@media(pointer:coarse)]:size-[var(--touch-min)]"
          >
            <Icon icon={MoreVerticalIcon} size={20} />
          </button>
        )}
      />
    </li>
  );
}

function RemoveWords({ method, store }: { method: WithdrawalMethod; store: PayoutStore }) {
  const next = removeMethod(store, method.id, 0);
  const heir = method.id === store.defaultMethodId ? next.methods.find((m) => m.id === next.defaultMethodId) : null;
  return (
    <p className="m-0 text-md leading-md text-text-secondary">
      {`${method.label} (${shortAddress(method.address)} on ${networkName(method.network)}) won't receive withdrawals any more. `}
      {heir
        ? `${heir.label} becomes your default.`
        : next.methods.length === 0
          ? "Your next withdrawal will ask where the money goes."
          : "Your default stays as it is."}{" "}
      Past withdrawals keep their record, and the bell notes the change.
    </p>
  );
}

// ───────────────────────── get paid in ─────────────────────────

function GetPaidInCard({ store, onSaved }: { store: PayoutStore; onSaved: (s: string) => void }) {
  const [refused, setRefused] = React.useState(false);
  const name = React.useId();
  return (
    <SettingsCard id="get-paid-in" title="Get paid in" description="The token your withdrawals are paid in. What you pay IDEEZA with is set in Plan & pricing.">
      <div role="radiogroup" aria-label="Get paid in" className="flex flex-col gap-[2px]">
        {TOKENS.map((t) => (
          <ChoiceRow
            key={t.value}
            name={name}
            option={t}
            checked={store.getPaidIn === t.value}
            onChange={(v) => {
              const ok = updatePayout((s) => (s.getPaidIn === v ? s : { ...s, getPaidIn: v }));
              setRefused(!ok);
              if (ok) onSaved(`You get paid in ${v}.`);
            }}
          />
        ))}
      </div>
      {refused && (
        <p role="alert" className="m-0 pt-[8px] text-sm leading-sm text-text-error">
          {SAVE_FAILED}
        </p>
      )}
    </SettingsCard>
  );
}

// ───────────────────────── identity ─────────────────────────

function IdentityCard({ kyc, salesUsd, onVerify, onSay }: { kyc: KycRecord | null; salesUsd: number; onVerify: () => void; onSay: (s: string) => void }) {
  const [refused, setRefused] = React.useState(false);
  const higher = higherCheckOf(salesUsd);
  const limit = higher ? `$${higher.at.toLocaleString("en-US")}` : "";
  return (
    <SettingsCard id="identity" title="Verify your identity">
      <SettingsRow
        label={kyc ? "Verified" : "Not verified yet"}
        help={
          kyc
            ? `On ${formatDay(kyc.at)} (Testnet demo). The check keeps only that you verified, and when.`
            : "Your first withdrawal asks for it, and so does selling physical copies. Nothing is checked in this demo."
        }
        control={
          kyc ? (
            <Button
              type="button"
              hierarchy="secondary"
              size="sm"
              aria-label="Reset verification"
              className={TAP}
              onClick={() => {
                const ok = resetKycDemo();
                setRefused(!ok);
                if (ok) onSay("Verification reset.");
              }}
            >
              Reset
            </Button>
          ) : (
            <Button type="button" hierarchy="secondary" size="sm" aria-haspopup="dialog" className={TAP} onClick={onVerify}>
              Verify now
            </Button>
          )
        }
      />
      {higher && (
        <p className="m-0 max-w-[62ch] pt-[8px] text-sm leading-sm text-text-secondary">
          {higher.passed
            ? `Your sales passed ${limit}, where a fuller check with ID documents would be asked. That check isn't in the app yet, so nothing is limited.`
            : `Your sales are ${formatUsd(salesUsd.toFixed(2))}. From ${limit}, a fuller check with ID documents will be asked; it isn't in the app yet.`}
        </p>
      )}
      {refused && (
        <p role="alert" className="m-0 pt-[8px] text-sm leading-sm text-text-error">
          {SAVE_FAILED}
        </p>
      )}
    </SettingsCard>
  );
}
