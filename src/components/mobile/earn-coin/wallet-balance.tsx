"use client";

// Wallet Balance (Figma "Wallet Balance" 247010 connected, 246942 not
// connected, 247055 with activity; the web's Balance › Overview), laid out
// for a phone (UX pass 2026-11-15): the Current Balance hero — the IDZ of the
// connected demo account with Available · Staked · Ready to claim · Pending,
// the network chip, "N IDZ from the presale is ready to claim" with Go to
// claim (web N2), the token address to copy and the Figma's three tiles Buy
// IDZ · Stake IDZ · Import IDZ — then "About IDZ" (what IDZ is next to
// credits and where sale money lives, web N3 / N4) as two rows with the full
// sentences behind ⓘ, then every IDZ movement (lib/wallet/idz.ts ›
// idzLedgerOf: rewards, project mints, credits, presale buys and claims,
// stakes and withdrawals) as rows, filtered by Chain Type and Transfer Type,
// ten at a time. A row says In or Out in words, not only colour, and a
// presale Buy where its claim stands; it opens the movement's sheet with
// every field (Txn ID, Wallet Address, Date, Transfer Type).

import * as React from "react";
import { ArrowDown02Icon, ArrowUp02Icon, Note01Icon } from "@hugeicons/core-free-icons";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import { TRANSFER_TYPES, filterIdzLedger, idzLedgerOf, transferTypeLabel, type IdzRow, type TransferType } from "@/lib/wallet/idz";
import { formatAmount } from "@/lib/wallet/money";
import { claimInOf } from "@/lib/wallet/presale";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { LIST_ROW, ListCard, ListRow } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useEarnMenu } from "./earn-menu";
import {
  ActionTiles,
  BalanceHero,
  CARD,
  ClaimLine,
  ConnectSheet,
  CopyChip,
  DetailRows,
  FilterChips,
  ImportTokenSheet,
  NetworkChip,
  SectionHead,
  TestnetLine,
  TokenAddress,
  useEarnState,
  whenOf,
} from "./parts";

const PER_PAGE = 10;

export function WalletBalance() {
  const { wallet, now, id, connected, network, holdings } = useEarnState();
  const menu = useEarnMenu({ wallet: false });
  const [importing, setImporting] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const tiles = <ActionTiles onImport={() => setImporting(true)} />;

  return (
    <Screen top={<TopBar back title="Wallet Balance" actions={[menu.action]} />} className="px-8 pb-8 pt-2">
      <div className="flex flex-col gap-10">
        {!wallet ? (
          <Skeleton shape="block" className="h-[320px] w-full" />
        ) : holdings ? (
          <BalanceHero holdings={holdings} aside={<NetworkChip network={network} />}>
            <ClaimLine amount={holdings.claimable} />
            <TokenAddress network={network} />
            {tiles}
          </BalanceHero>
        ) : (
          <section aria-labelledby="wallet-connect" className={cn(CARD, "flex flex-col items-center gap-6 p-8 text-center")}>
            <IdzCoin height={40} />
            <h2 id="wallet-connect" className={T.section}>
              Connect your wallet to see your IDZ
            </h2>
            <TestnetLine>Test funds only. Nothing is written to a real blockchain.</TestnetLine>
            <Button size="xl" className="w-full" onClick={() => setConnecting(true)}>
              Connect wallet
            </Button>
            {tiles}
          </section>
        )}

        <section aria-labelledby="wallet-about" className="flex flex-col gap-4">
          <SectionHead
            id="wallet-about"
            info={
              <>
                <p>IDZ is IDEEZA’s own coin. It pays an instant mint’s fee and can pay for AI credits; your credits are a separate balance.</p>
                <p>Money from selling your projects is on each project’s Earn › Money.</p>
              </>
            }
          >
            About IDZ
          </SectionHead>
          <ListCard label="About IDZ">
            <ListRow href="/m/plans?tab=credits" title="Buy credits with IDZ" meta="Your credits are a separate balance" />
            <ListRow href="/m/projects" title="My projects" meta="Sale money is on each project’s Earn › Money" />
          </ListCard>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="wallet-activity">
          <SectionHead id="wallet-activity">Transaction Activity</SectionHead>
          {!wallet ? null : connected && id ? (
            <Ledger rows={idzLedgerOf(wallet, id)} now={now} />
          ) : (
            <EmptyState
              icon={Note01Icon}
              title="No data found"
              body="Connect your wallet to see how your IDZ moved."
              action={{ label: "Connect wallet", onClick: () => setConnecting(true) }}
            />
          )}
        </section>
      </div>
      <ImportTokenSheet open={importing} onClose={() => setImporting(false)} network={network} />
      <ConnectSheet open={connecting} onClose={() => setConnecting(false)} />
      {menu.node}
    </Screen>
  );
}

function heldLine(r: IdzRow, now: number): string | null {
  if (!r.held) return null;
  if (r.held.claimed) return "Claimed";
  return now >= r.held.unlocksAt ? "Ready to claim" : claimInOf(r.held.unlocksAt - now);
}

/** "+500 IDZ" / "−100 IDZ"; a presale Buy is held, so it carries no sign until its Claim. */
function signedOf(r: IdzRow): string {
  const sign = r.held ? "" : r.direction === "in" ? "+" : "−";
  return `${sign}${formatAmount(r.amount, "IDZ")}`;
}

/** One IDZ movement as a row: what it was, its type and date, the amount with In / Out written. */
function LedgerItem({ r, now, onOpen }: { r: IdzRow; now: number; onOpen: () => void }) {
  const into = r.direction === "in";
  const held = heldLine(r, now);
  return (
    <li>
      <button type="button" aria-haspopup="dialog" onClick={onOpen} className={cn(LIST_ROW, "min-h-[64px]")}>
        <span
          aria-hidden
          className={cn("inline-flex size-[36px] shrink-0 items-center justify-center rounded-full", into ? "bg-bg-success-subtle text-text-success" : "bg-bg-error-subtle text-text-error")}
        >
          <Icon icon={into ? ArrowUp02Icon : ArrowDown02Icon} size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn(T.rowTitle, "truncate")}>{r.title}</span>
          <span className={cn(T.meta, "truncate tabular-nums")}>
            {transferTypeLabel(r.type)} · {r.at === null ? "Starting balance" : whenOf(r.at)}
            {held && ` · ${held}`}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn(T.rowTitle, "tabular-nums", into && !r.held && "text-text-success")}>{signedOf(r)}</span>
          <span className={T.micro}>{into ? "In" : "Out"}</span>
        </span>
      </button>
    </li>
  );
}

/** A movement's every field (the old card's table). */
function LedgerSheet({ r, now, onClose }: { r: IdzRow; now: number; onClose: () => void }) {
  const into = r.direction === "in";
  const held = heldLine(r, now);
  return (
    <Sheet
      open
      onClose={onClose}
      title={r.title}
      description={r.network ? networkLabelOf(r.network) : "Every network"}
    >
      <DetailRows
        rows={[
          { label: "Amount", value: signedOf(r) },
          {
            label: "Transfer Type",
            value: (
              <>
                {transferTypeLabel(r.type)}
                <span className={cn("inline-flex items-center gap-1", into ? "text-text-success" : "text-text-error")}>
                  <Icon icon={into ? ArrowUp02Icon : ArrowDown02Icon} size={16} />
                  {into ? "In" : "Out"}
                </span>
              </>
            ),
          },
          ...(held ? [{ label: "Claim", value: held }] : []),
          { label: "Txn ID", value: r.txHash ? <CopyChip value={r.txHash} what="Transaction ID" /> : <span className="text-text-secondary">Starting balance</span> },
          { label: "Wallet Address", value: <CopyChip value={r.address} what="Wallet address" /> },
          { label: "Date", value: r.at === null ? "—" : whenOf(r.at) },
        ]}
      />
    </Sheet>
  );
}

function Ledger({ rows, now }: { rows: IdzRow[]; now: number }) {
  const [chain, setChain] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [count, setCount] = React.useState(PER_PAGE);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const shown = filterIdzLedger(rows, {
    network: chain === "all" ? "all" : (chain as Network),
    type: type === "all" ? "all" : (type as TransferType),
  });
  const clear = () => {
    setChain("all");
    setType("all");
    setCount(PER_PAGE);
  };
  const opened = openId ? (rows.find((r) => r.id === openId) ?? null) : null;
  return (
    <>
      <FilterChips
        label="Filter transactions"
        onClear={clear}
        chips={[
          {
            label: "Chain Type",
            value: chain,
            onChange: (v) => {
              setChain(v);
              setCount(PER_PAGE);
            },
            options: [{ value: "all", label: "All chains" }, ...NETWORKS.map((n) => ({ value: n.value, label: n.label }))],
          },
          {
            label: "Transfer Type",
            value: type,
            onChange: (v) => {
              setType(v);
              setCount(PER_PAGE);
            },
            options: [{ value: "all", label: "All types" }, ...TRANSFER_TYPES.map((t) => ({ value: t.value, label: t.label }))],
          },
        ]}
      />
      {shown.length === 0 ? (
        rows.length ? (
          <EmptyState title="No transactions match" body="No transaction matches these filters." action={{ label: "Clear filters", onClick: clear }} />
        ) : (
          <EmptyState icon={Note01Icon} title="No transactions yet" body="No IDZ has moved in this wallet yet." />
        )
      ) : (
        <ListCard label="IDZ movements">
          {shown.slice(0, count).map((r) => (
            <LedgerItem key={r.id} r={r} now={now} onOpen={() => setOpenId(r.id)} />
          ))}
        </ListCard>
      )}
      {shown.length > count && (
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setCount((n) => n + PER_PAGE)}>
          Show more
        </Button>
      )}
      {opened && <LedgerSheet r={opened} now={now} onClose={() => setOpenId(null)} />}
    </>
  );
}
