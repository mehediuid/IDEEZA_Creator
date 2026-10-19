"use client";

// /settings/get-paid/balance (User Panel V2 "Get Paid-> $IDZ Payment"
// 41537:182534; empty 41537:182154; ⋯ menu 41537:183023; remove 41537:183284).
// Card "Balance Details": the Available Balance (every project's sales, your
// share, less earlier withdrawals) with Withdraw Money, the tax note, your
// withdrawal methods (Default tag, ⋯ Make Default / Remove) and Add
// Withdrawal Method. Withdraw asks the demo identity check (KYC Level 1) and a
// method first, each missing one said with its fix; nothing here gates a mint
// or a listing. Then the new "Get paid in" card (D14): USDT or IDZ, saved on
// the spot. Opened from a project's Earn (`?from=`), the header offers the
// way back.

import * as React from "react";
import Link from "next/link";
import { MoreVerticalIcon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner, Button, ConfirmDialog, Menu, TestnetDemoBadge } from "@/components/ideeza";
import {
  balanceOf,
  centsFloor,
  DEMO_USD_RATES,
  formatUsd,
  makeDefault,
  removeMethod,
  type PayoutStore,
  type PayoutToken,
  type WithdrawalMethod,
} from "@/lib/account/payout";
import { updatePayout, usePayout } from "@/lib/account/use-payout";
import { useKyc } from "@/lib/commerce/use-commerce";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { compareAmounts } from "@/lib/wallet/money";
import { SAVE_FAILED, SettingsCard } from "../settings-card";
import { ChoiceRow } from "../settings-choice";
import { SettingsFrame } from "../settings-frame";
import { AddMethodDialog } from "./add-method-dialog";
import { formatDay, GET_PAID, HistoryLink, KYC_HREF, ReturnLink, SubViewHeading, useEarnings } from "./parts";
import { WithdrawDialog } from "./withdraw-dialog";

const TAP = "max-md:min-h-[var(--touch-min)]";
const ERROR = "m-0 text-md leading-md text-text-error";
const ARRIVED =
  "scroll-mt-24 data-[arrived]:rounded-lg data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus";

const TOKENS: { value: PayoutToken; label: string; hint: string }[] = [
  { value: "USDT", label: "USDT", hint: "A dollar stablecoin: 1 USDT = $1" },
  { value: "IDZ", label: "IDZ", hint: "IDEEZA's token, at the demo rate 1 IDZ = $1" },
];

export function BalancePage({ from }: { from: string | null }) {
  const store = usePayout();
  const kyc = useKyc();
  const { ready, earnings, projects } = useEarnings();
  const [dialog, setDialog] = React.useState<"withdraw" | "add" | null>(null);
  const [removing, setRemoving] = React.useState<WithdrawalMethod | null>(null);
  const [refused, setRefused] = React.useState(false);
  const [said, setSaid] = React.useState("");

  const loaded = store !== undefined && kyc !== undefined && ready;
  const balance = store && ready ? balanceOf(earnings, store.withdrawals) : null;

  const write = (change: (s: PayoutStore) => PayoutStore, message: string) => {
    const ok = updatePayout(change);
    setRefused(!ok);
    if (ok) setSaid(message);
    return ok;
  };

  return (
    <SettingsFrame
      page="get-paid"
      actions={
        <div className="flex flex-wrap items-center gap-[8px]">
          <ReturnLink from={from} />
          <HistoryLink />
        </div>
      }
    >
      <p role="status" aria-live="polite" className="sr-only">
        {said}
      </p>
      <SubViewHeading />

      {!loaded || !store || !balance ? (
        <p className="m-0 text-md leading-md text-text-tertiary">Reading your earnings…</p>
      ) : (
        <>
          <SettingsCard id="balance" title="Balance Details" action={<TestnetDemoBadge />}>
            <div className="flex flex-col gap-[16px] pt-[8px]">
              <BalancePanel
                available={balance.available}
                earned={balance.earned}
                withdrawn={balance.withdrawn}
                projects={projects}
                verified={kyc !== null}
                methods={store.methods.length}
                onWithdraw={() => setDialog("withdraw")}
                onAdd={() => setDialog("add")}
              />

              <Banner tone="attention" action={<Link href={`${GET_PAID}#tax`} className="text-md font-medium leading-md text-text-link underline-offset-2 hover:underline">Tax information</Link>}>
                To withdraw earnings, keep your tax information up to date.
              </Banner>

              {store.methods.length > 0 && (
                <ul id="methods" role="list" aria-label="Withdrawal methods" className={cn("m-0 flex list-none flex-col gap-[12px] p-0", ARRIVED)}>
                  {store.methods.map((m) => (
                    <MethodRow
                      key={m.id}
                      method={m}
                      isDefault={m.id === store.defaultMethodId}
                      onDefault={() => write((s) => makeDefault(s, m.id), `${m.label} is your default withdrawal method.`)}
                      onRemove={() => setRemoving(m)}
                    />
                  ))}
                </ul>
              )}

              <div id={store.methods.length ? undefined : "methods"} className={cn("flex flex-wrap items-center justify-between gap-[12px] border-b border-solid border-border pb-[16px]", ARRIVED)}>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="text-md font-medium leading-md text-text-primary">Add Withdrawal Method</span>
                  <span className="text-sm leading-sm text-text-tertiary">Add how you want to receive your IDEEZA balance</span>
                </div>
                <Button type="button" hierarchy="secondary" size="md" aria-haspopup="dialog" className={TAP} onClick={() => setDialog("add")}>
                  Add Method
                </Button>
              </div>

              {refused && (
                <p role="alert" className={ERROR}>
                  {SAVE_FAILED}
                </p>
              )}
              <p className="m-0 max-w-[62ch] text-sm leading-sm text-text-tertiary">
                Sales in test coins count at fixed demo rates: 1 ETH or WETH = {formatUsd(DEMO_USD_RATES.ETH)}, 1 MATIC ={" "}
                {formatUsd(DEMO_USD_RATES.MATIC)}; USDT, USDC and IDZ are $1. Withdrawals are recorded here and no coins move.
              </p>
            </div>
          </SettingsCard>

          <GetPaidIn store={store} onSaved={setSaid} />

          <WithdrawDialog open={dialog === "withdraw"} store={store} earned={balance.earned} onClose={() => setDialog(null)} onDone={setSaid} />
          <AddMethodDialog
            open={dialog === "add"}
            store={store}
            onClose={() => setDialog(null)}
            onAdded={(label) => setSaid(`${label} added as a withdrawal method.`)}
          />
          <ConfirmDialog
            open={removing !== null}
            title="Remove Withdrawal Method?"
            confirmLabel="Remove Method"
            onCancel={() => setRemoving(null)}
            onConfirm={() => {
              const m = removing;
              setRemoving(null);
              if (m) write((s) => removeMethod(s, m.id), `${m.label} removed.`);
            }}
          >
            {removing && <RemoveWords method={removing} store={store} />}
          </ConfirmDialog>
        </>
      )}
    </SettingsFrame>
  );
}

function BalancePanel({
  available,
  earned,
  withdrawn,
  projects,
  verified,
  methods,
  onWithdraw,
  onAdd,
}: {
  available: string;
  earned: string;
  withdrawn: string;
  projects: number;
  verified: boolean;
  methods: number;
  onWithdraw: () => void;
  onAdd: () => void;
}) {
  const reasonId = React.useId();
  const nothing = compareAmounts(centsFloor(available), "0") <= 0;
  const blocked = !verified || methods === 0 || nothing;
  const from = projects === 1 ? "1 project" : `${projects} projects`;
  return (
    <div className="flex flex-col gap-[12px] rounded-xl bg-bg-subtle p-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <div className="flex flex-col gap-[2px]">
          <span className="text-md leading-md text-text-secondary">Available Balance</span>
          <span className="text-3xl font-semibold leading-3xl tabular-nums text-text-brand">{formatUsd(available)}</span>
        </div>
        <Button
          type="button"
          hierarchy="primary"
          size="md"
          aria-haspopup="dialog"
          aria-disabled={blocked || undefined}
          aria-describedby={blocked ? reasonId : undefined}
          className={cn("aria-disabled:cursor-not-allowed aria-disabled:opacity-60 max-sm:w-full", TAP)}
          onClick={() => {
            if (!blocked) onWithdraw();
          }}
        >
          Withdraw Money
        </Button>
      </div>
      <p className="m-0 text-md leading-md text-text-secondary">
        {compareAmounts(earned, "0") > 0
          ? `${formatUsd(earned)} from sales on ${from}, your share after the 2.5% IDEEZA fee and the splits, less ${formatUsd(withdrawn)} withdrawn.`
          : "Nothing earned yet. When something of yours sells, your share lands here."}
      </p>
      {blocked && (
        <p id={reasonId} className="m-0 text-md leading-md text-text-primary">
          {!verified ? (
            <>
              Before you can withdraw, verify your identity.{" "}
              <Link href={KYC_HREF} className="font-medium text-text-link underline-offset-2 hover:underline">
                Verify identity
              </Link>
            </>
          ) : methods === 0 ? (
            <>
              Before you can withdraw, add where the money goes.{" "}
              <button type="button" onClick={onAdd} className="cursor-pointer font-medium text-text-link underline-offset-2 hover:underline">
                Add a withdrawal method
              </button>
            </>
          ) : (
            "Nothing to withdraw yet."
          )}
        </p>
      )}
    </div>
  );
}

function MethodRow({
  method,
  isDefault,
  onDefault,
  onRemove,
}: {
  method: WithdrawalMethod;
  isDefault: boolean;
  onDefault: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-[12px] rounded-xl border border-solid border-border p-[16px]">
      <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
        <Icon icon={Wallet02Icon} size={22} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="truncate text-md font-medium leading-md text-text-primary">{method.label}</span>
        <span className="text-sm leading-sm text-text-tertiary">
          Crypto wallet · <span className="font-mono">{shortAddress(method.address)}</span> · Added {formatDay(method.addedAt)}
        </span>
      </div>
      {isDefault && <Badge tone="success">Default</Badge>}
      <Menu
        label={`Actions for ${method.label}`}
        align="end"
        items={[
          ...(isDefault ? [] : [{ id: "default", label: "Make Default", onSelect: onDefault }]),
          { id: "remove", label: "Remove", danger: true, onSelect: onRemove },
        ]}
        trigger={(props) => (
          <button
            {...props}
            type="button"
            aria-label={`More for ${method.label}`}
            className="inline-flex size-[40px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
          >
            <Icon icon={MoreVerticalIcon} size={20} />
          </button>
        )}
      />
    </li>
  );
}

function RemoveWords({ method, store }: { method: WithdrawalMethod; store: PayoutStore }) {
  const next = removeMethod(store, method.id);
  const heir = method.id === store.defaultMethodId ? next.methods.find((m) => m.id === next.defaultMethodId) : null;
  return (
    <p className="m-0 text-md leading-md text-text-secondary">
      {`${method.label} (${shortAddress(method.address)}) won't receive withdrawals any more. `}
      {heir
        ? `${heir.label} becomes your default method.`
        : next.methods.length === 0
          ? "You'll need to add a method before you can withdraw again."
          : "Your default method stays as it is."}{" "}
      Past withdrawals keep their record.
    </p>
  );
}

function GetPaidIn({ store, onSaved }: { store: PayoutStore; onSaved: (s: string) => void }) {
  const [refused, setRefused] = React.useState(false);
  const name = React.useId();
  return (
    <SettingsCard id="get-paid-in" title="Get paid in" description="The token your withdrawals are paid in. What you pay IDEEZA with is set in Plan & pricing.">
      <div role="radiogroup" aria-label="Get paid in" className="flex flex-col gap-[2px] pt-[8px]">
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
        <p role="alert" className={ERROR}>
          {SAVE_FAILED}
        </p>
      )}
    </SettingsCard>
  );
}
