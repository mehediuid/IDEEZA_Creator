"use client";

// Earn Coin › Refer & Earn (Figma "Refer & Earn" 228855 Generate Link, 228900
// Connect Your Wallet, 228949 the campaign, 229005 the wallet menu, 229066 /
// 229159 / 229224 its activity, waiting for approval, claiming), laid out for
// a phone (UX pass 2026-11-15). Before a link: "Your referral link" with Refer
// and Earn with IDEEZA, and Generate Link in the BottomBar, which asks for the
// wallet first (the rewards go to it). With one: the campaign card, summary
// first — its name and where it stands (lock-up countdown, waiting for
// approval, ready, claimed), the link to copy or share, Referred Users · $IDZ
// Earned · Points — then two rows: Campaign details (the publisher, the chain
// ID, the wallet with Disconnect) and Campaign History. The BottomBar holds
// Claim all points (off, with why, until the campaign is approved; it claims
// the campaign's points as IDZ through the wallet sheet), then Join the next
// campaign. Activity: search by name, a By Campaign chip, one row per
// referral, each opening its sheet with every field. ⋯ holds Share link and,
// prototype only, "Demo: simulate a referral" (a demo creator coming through
// the link). Logic: lib/wallet/referral.ts. Named Figma departure: the heading
// over the Generate Link card says "Your referral link" (the Figma's "Current
// Balance" there is a copy of the Buy tab's label and doesn't describe it).

import * as React from "react";
import { Clock01Icon, Copy01Icon, LinkSquare02Icon, Logout02Icon, Note01Icon, Settings02Icon, Share08Icon, Tick02Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";
import { demoAddress, readWallet, shortAddress, walletDisconnect } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import {
  CAMPAIGNS,
  REFERRAL_NETWORK,
  REFERRAL_PUBLISHER,
  REFERRED,
  addReferral,
  campaignOf,
  campaignStateOf,
  campaignStatsOf,
  claimReferralRequestOf,
  currentLinkOf,
  demoReferralCheckOf,
  earnOf,
  filterReferrals,
  generateLink,
  nextCampaignOf,
  referralClaimBlockOf,
  referralRowsOf,
  referralUrlOf,
  referredNameOf,
  type CampaignState,
  type ReferralLink,
  type ReferralRow,
} from "@/lib/wallet/referral";
import { chainIdOf } from "@/lib/wallet/staking";
import type { DemoBuyerId, IdentityId } from "@/lib/wallet/types";
import { readReferralData, useReferralData, writeReferralData } from "@/lib/wallet/use-earn-stores";
import { BottomBar } from "../kit/bottom-bar";
import { LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListCard, ListRow } from "../kit/list";
import { PickList } from "../kit/pick-list";
import { PRESSED } from "../kit/press";
import { ActionSheet, Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { tabPanelProps } from "../kit/tabs";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useEarnMenu } from "./earn-menu";
import { CARD, ConnectSheet, CopyChip, DetailRows, EARN_TABS_ID, EarnTabs, FactGrid, FilterChips, SectionHead, clockOf, useCopy, useEarnState, whenOf } from "./parts";
import { useWalletSheet } from "./wallet-sheet";

const STORAGE = "This browser couldn’t save it — storage is full or blocked.";
const nonce = () => Math.random().toString(36).slice(2, 10);

function origin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function ReferTab() {
  const { wallet, now, id, connected } = useEarnState();
  const data = useReferralData();
  const toast = useToast();
  const copy = useCopy();
  const sheet = useWalletSheet();
  const [asking, setAsking] = React.useState(false);
  const [demo, setDemo] = React.useState(false);
  const link = data && id ? currentLinkOf(data, id) : null;
  const url = link ? referralUrlOf(origin(), link.code) : null;

  const share = async () => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on IDEEZA", url });
      } catch {
        // The share sheet was closed: nothing to say.
      }
    } else void copy(url, "Link copied");
  };

  const generate = () => {
    if (!id) return;
    const r = generateLink(readReferralData(), readWallet(), id, Date.now());
    if (!r.ok) return toast({ title: r.error, lead: "error" });
    if (!writeReferralData(r.value)) return toast({ title: STORAGE, lead: "error" });
    toast({ title: "Your link is ready" });
  };
  const onGenerate = () => (connected ? generate() : setAsking(true));

  const rows = data && id ? referralRowsOf(data, wallet, id) : [];
  const state = link ? campaignStateOf(link, wallet, now) : null;
  const campaign = link ? campaignOf(link.campaign) : null;
  const stats = link ? campaignStatsOf(rows, link.campaign) : null;
  const claimBlock = state && stats ? referralClaimBlockOf(state, stats.points) : "Generate your link first.";

  const claimAll = async () => {
    if (!id || !campaign || !stats || claimBlock) return;
    const points = stats.points;
    const r = await sheet.request(claimReferralRequestOf(id, campaign, points), {
      recheck: () => {
        const fresh = currentLinkOf(readReferralData(), id);
        if (!fresh || fresh.campaign !== campaign.id) return "This campaign isn't yours to claim any more.";
        return referralClaimBlockOf(campaignStateOf(fresh, readWallet(), Date.now()), points);
      },
    });
    if (r.ok) toast({ title: `${formatAmount(points, "IDZ")} added to your balance` });
  };

  const next = data && id ? nextCampaignOf(data, wallet, id) : null;
  const ready = !!data && !!wallet;
  const hasCampaign = !!(link && state && campaign && stats && url);
  const menu = useEarnMenu({
    extra: [
      ...(url ? [{ label: "Share link", icon: Share08Icon, onSelect: () => void share() }] : []),
      ...(link && state?.phase === "running" ? [{ label: "Demo: simulate a referral", icon: Settings02Icon, onSelect: () => setDemo(true) }] : []),
    ],
  });

  // The tab's one primary, in the thumb zone: Generate Link, then Claim all points (with why it's
  // off until the campaign is approved), then joining the next campaign.
  let bar: React.ReactNode = null;
  if (ready && !hasCampaign)
    bar = (
      <Button size="xl" className="w-full" onClick={onGenerate}>
        Generate Link
      </Button>
    );
  else if (hasCampaign && state?.phase === "claimed")
    bar = next ? (
      <Button size="xl" className="w-full" onClick={onGenerate}>
        Join {next.name}
      </Button>
    ) : null;
  else if (hasCampaign)
    bar = (
      <>
        <Button size="xl" className="w-full" disabled={!!claimBlock || sheet.busy} aria-describedby={claimBlock ? "claim-points-why" : undefined} onClick={claimAll}>
          Claim all points
        </Button>
        {claimBlock && (
          <p id="claim-points-why" className={cn(T.meta, "text-center")}>
            {claimBlock}
          </p>
        )}
      </>
    );

  return (
    <Screen top={<TopBar back="/m/earn" title="Earn Coin" actions={[menu.action]} />} footer={bar ? <BottomBar>{bar}</BottomBar> : undefined} className="px-8 pb-8">
      <div className="flex flex-col gap-10">
        <EarnTabs />
        <div {...tabPanelProps(EARN_TABS_ID, "refer")} className="flex flex-col gap-10 outline-none">
          {!ready ? (
            <Skeleton shape="block" className="h-[240px] w-full" />
          ) : !hasCampaign || !link || !state || !stats || !url ? (
            <section className="flex flex-col gap-4" aria-labelledby="refer-link">
              <SectionHead id="refer-link">Your referral link</SectionHead>
              <div className={cn(CARD, "flex flex-col items-center gap-4 p-8 text-center")}>
                <span aria-hidden className="inline-flex size-[48px] items-center justify-center rounded-full bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
                  <Icon icon={UserAdd01Icon} size={24} />
                </span>
                <p className={T.section}>Refer and Earn with IDEEZA</p>
                {next && (
                  <p className={T.body}>
                    Join {next.name}: you earn {next.percent}% of the IDZ the creators you bring buy, in points you claim as IDZ.
                  </p>
                )}
              </div>
            </section>
          ) : (
            <CampaignCard link={link} state={state} stats={stats} url={url} connected={connected} id={link.identity} now={now} onConnect={() => setAsking(true)} onShare={() => void share()} next={next?.name ?? null} />
          )}

          <section className="flex flex-col gap-4" aria-labelledby="refer-activity">
            <SectionHead id="refer-activity">Activity</SectionHead>
            {rows.length === 0 ? (
              <EmptyState icon={Note01Icon} title="No data found" body="Referrals through your link show here." />
            ) : (
              <ReferralActivity rows={rows} now={now} />
            )}
          </section>
        </div>
      </div>
      <ConnectSheet
        open={asking}
        onClose={() => setAsking(false)}
        onConnected={() => !link && generate()}
        description="Your referral rewards go to this wallet, so the link needs it. This is the testnet demo wallet — test funds only."
      />
      {id && link && <DemoReferralSheet open={demo} onClose={() => setDemo(false)} identity={id} percent={campaign?.percent ?? 0} />}
      {sheet.sheet}
      {menu.node}
    </Screen>
  );
}

function PhasePill({ state, now }: { state: CampaignState; now: number }) {
  const text =
    state.phase === "running"
      ? `Lock-up ends in ${clockOf(state.lockEndsAt - now)}`
      : state.phase === "approval"
        ? "Wait for admin approval"
        : state.phase === "claimable"
          ? "Approved · ready to claim"
          : "Claimed";
  return (
    <p role={state.phase === "running" ? "timer" : "status"} className={cn(T.rowTitle, "flex h-[36px] items-center justify-center gap-3 rounded-full bg-bg-brand-subtle tabular-nums text-text-brand")}>
      <Icon icon={state.phase === "claimed" ? Tick02Icon : Clock01Icon} size={16} />
      {text}
    </p>
  );
}

/** The campaign (Figma 228949), summary first: its name and where it stands, the link to copy or
 *  share, the three figures; the publisher, chain and wallet behind "Campaign details", the
 *  campaign's history behind its row. */
function CampaignCard({
  link,
  state,
  stats,
  url,
  connected,
  id,
  now,
  onConnect,
  onShare,
  next,
}: {
  link: ReferralLink;
  state: CampaignState;
  stats: { users: number; earned: string; points: string };
  url: string;
  connected: boolean;
  id: IdentityId;
  now: number;
  onConnect: () => void;
  onShare: () => void;
  next: string | null;
}) {
  const copy = useCopy();
  const [details, setDetails] = React.useState(false);
  const campaign = campaignOf(link.campaign);
  const address = demoAddress(id);
  const icon = "inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";
  return (
    <section aria-labelledby="refer-campaign" className={cn(LIST_CARD)}>
      <div className="flex flex-col gap-6 p-8">
        <h2 id="refer-campaign" className={cn(T.title, "min-w-0")}>
          {campaign?.name ?? link.campaign}
        </h2>
        <PhasePill state={state} now={now} />
        <div className="flex h-[48px] items-center gap-2 rounded-lg border-[length:var(--border-width-1)] border-solid border-border pl-6 pr-1">
          <span aria-hidden className="shrink-0 text-[color:var(--color-icon-secondary)]">
            <Icon icon={LinkSquare02Icon} size={16} />
          </span>
          <span className={cn(T.body, "min-w-0 flex-1 truncate text-text-primary")}>{url}</span>
          <button type="button" aria-label="Copy your referral link" onClick={() => copy(url, "Link copied")} className={cn(icon, PRESSED)}>
            <Icon icon={Copy01Icon} size={18} />
          </button>
          <button type="button" aria-label="Share your referral link" onClick={onShare} className={cn(icon, PRESSED)}>
            <Icon icon={Share08Icon} size={18} />
          </button>
        </div>
        <FactGrid
          facts={[
            { label: "Referred Users", value: String(stats.users) },
            { label: "$IDZ Earned", value: formatAmount(stats.earned, "IDZ").replace(/ IDZ$/, "") },
            { label: "Points", value: formatAmount(stats.points, "IDZ").replace(/ IDZ$/, "") },
          ]}
        />
        <p className={cn(T.meta, "flex flex-wrap items-center gap-x-4 gap-y-2")}>
          <TestnetDemoBadge />1 point = 1 IDZ when it’s claimed.
        </p>
        {state.phase === "claimed" && !next && <p className={cn(T.body, "text-center")}>You’ve joined every campaign.</p>}
      </div>
      <ul className={cn("flex flex-col border-t-[length:var(--border-width-1)] border-solid border-border", LIST_DIVIDERS)}>
        <ListRow onClick={() => setDetails(true)} title="Campaign details" meta={`${connected ? `Wallet ${shortAddress(address)}` : "Wallet not connected"} · Chain ID ${chainIdOf(REFERRAL_NETWORK)}`} />
        <ListRow href="/m/earn/history" title="Campaign History" meta="Every campaign’s referrals" />
      </ul>
      <CampaignDetailsSheet open={details} onClose={() => setDetails(false)} id={id} connected={connected} onConnect={onConnect} />
    </section>
  );
}

/** Publisher, chain and the wallet the rewards go to (the old card's mono lines and its wallet chip). */
function CampaignDetailsSheet({ open, onClose, id, connected, onConnect }: { open: boolean; onClose: () => void; id: IdentityId; connected: boolean; onConnect: () => void }) {
  const toast = useToast();
  const [confirm, setConfirm] = React.useState(false);
  const address = demoAddress(id);
  const disconnect = () => {
    setConfirm(false);
    if (persistWallet(walletDisconnect(readWallet(), id))) toast({ title: "Wallet disconnected" });
    else toast({ title: STORAGE, lead: "error" });
  };
  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Campaign details"
        actions={
          connected ? (
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setConfirm(true)}>
              Disconnect wallet
            </Button>
          ) : (
            <Button
              size="xl"
              className="w-full"
              onClick={() => {
                onClose();
                onConnect();
              }}
            >
              Connect wallet
            </Button>
          )
        }
      >
        <DetailRows
          rows={[
            { label: "Publisher", value: <CopyChip value={REFERRAL_PUBLISHER} what="Publisher address" /> },
            { label: "Chain ID", value: String(chainIdOf(REFERRAL_NETWORK)) },
            { label: "Wallet", value: connected ? <CopyChip value={address} what="Wallet address" /> : "Not connected" },
          ]}
        />
        <p className={T.meta}>Your referral rewards go to this wallet.</p>
      </Sheet>
      <ActionSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`${shortAddress(address)} · Connected`}
        items={[{ label: "Disconnect", icon: Logout02Icon, destructive: true, onSelect: disconnect }]}
      />
    </>
  );
}

/** One referral as a row (Figma 229066's card, summary first): who, the campaign and what they bought;
 *  the points and Claimed / Not Claimed at the end. */
function ReferralItem({ r, onOpen }: { r: ReferralRow; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onOpen}
        className={cn(LIST_ROW, "min-h-[64px]")}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn(T.rowTitle, "truncate")}>{r.name}</span>
          <span className={cn(T.meta, "truncate")}>
            {r.campaignName} · bought {formatAmount(r.bought, "IDZ")}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn(T.rowTitle, "tabular-nums")}>{formatAmount(r.points, "IDZ").replace(/ IDZ$/, "")} pts</span>
          {r.claimed ? (
            <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
              Claimed
            </Badge>
          ) : (
            <Badge tone="error">Not Claimed</Badge>
          )}
        </span>
      </button>
    </li>
  );
}

/** Every field of a referral (the old card's table). */
function ReferralSheet({ r, onClose }: { r: ReferralRow; onClose: () => void }) {
  return (
    <Sheet
      open
      onClose={onClose}
      title={r.name}
      description={r.campaignName}
    >
      <DetailRows
        rows={[
          {
            label: "Status",
            value: r.claimed ? (
              <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
                Claimed
              </Badge>
            ) : (
              <Badge tone="error">Not Claimed</Badge>
            ),
          },
          { label: "Referred User", value: r.name },
          { label: "Total Purchase", value: <><IdzCoin height={18} />{formatAmount(r.bought, "IDZ")}</> },
          { label: "Refer Token Earn", value: <><IdzCoin height={18} />{formatAmount(r.earned, "IDZ")}</> },
          { label: "Refer Point Earn", value: `${formatAmount(r.points, "IDZ").replace(/ IDZ$/, "")} Points` },
          { label: "Last Purchase Time", value: whenOf(r.at) },
        ]}
      />
    </Sheet>
  );
}

/** Referrals as one list card of rows, each opening its sheet (Refer & Earn and Campaign History). */
export function ReferralList({ rows }: { rows: readonly ReferralRow[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const opened = openId ? (rows.find((r) => r.id === openId) ?? null) : null;
  return (
    <>
      <ListCard label="Referrals">
        {rows.map((r) => (
          <ReferralItem key={r.id} r={r} onOpen={() => setOpenId(r.id)} />
        ))}
      </ListCard>
      {opened && <ReferralSheet r={opened} onClose={() => setOpenId(null)} />}
    </>
  );
}

function ReferralActivity({ rows, now }: { rows: ReferralRow[]; now: number }) {
  const [campaign, setCampaign] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const shown = filterReferrals(rows, { campaign, search, range: "all" }, now);
  const joined = CAMPAIGNS.filter((c) => rows.some((r) => r.campaign === c.id));
  const clear = () => {
    setSearch("");
    setCampaign("all");
  };
  return (
    <>
      <SearchInput size="xl" value={search} onValueChange={setSearch} onClear={() => setSearch("")} placeholder="Search by user name" aria-label="Search by user name" />
      <FilterChips
        label="Filter referrals"
        onClear={() => setCampaign("all")}
        chips={[{ label: "By Campaign", value: campaign, onChange: setCampaign, options: [{ value: "all", label: "Every campaign" }, ...joined.map((c) => ({ value: c.id, label: c.name }))] }]}
      />
      {shown.length === 0 ? (
        <EmptyState title="No referral matches" body="Try another name or campaign." action={{ label: "Clear filters", onClick: clear }} />
      ) : (
        <ReferralList rows={shown} />
      )}
    </>
  );
}

/** Prototype only: a demo creator opens the link and buys IDZ, so the campaign has a referral to count. */
function DemoReferralSheet({ open, onClose, identity, percent }: { open: boolean; onClose: () => void; identity: IdentityId; percent: number }) {
  const toast = useToast();
  const [who, setWho] = React.useState<DemoBuyerId>(REFERRED[0]);
  const [text, setText] = React.useState("1000");
  const [error, setError] = React.useState<string | null>(null);
  const check = demoReferralCheckOf(text);
  const close = () => {
    setError(null);
    onClose();
  };
  const add = () => {
    if (!check.ok) return setError(check.error);
    const r = addReferral(readReferralData(), readWallet(), { id: `ref_${nonce()}`, identity, who, bought: check.value, at: Date.now() });
    if (!r.ok) return setError(r.error);
    if (!writeReferralData(r.value)) return setError(STORAGE);
    toast({ title: `${referredNameOf(who)} bought ${formatAmount(check.value, "IDZ")} through your link` });
    setWho(REFERRED[(REFERRED.indexOf(who) + 1) % REFERRED.length]);
    close();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title="Demo: someone uses your link"
      description="Prototype only. Plays a demo creator who opens your link and buys IDZ in the presale."
      actions={
        <>
          <Button size="xl" className="w-full" onClick={add}>
            Add referral
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <p className={T.label}>Who</p>
        <PickList label="Who" options={REFERRED.map((b) => ({ value: b, label: referredNameOf(b) }))} value={who} onPick={setWho} />
      </div>
      <label className="flex flex-col gap-2">
        <span className={T.label}>IDZ they buy</span>
        <TextInput
          size="xl"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onValueChange={(v) => {
            setText(v);
            setError(null);
          }}
          invalid={!!error}
        />
      </label>
      {error ? (
        <p role="alert" className={cn(T.caption, "text-text-error")}>
          {error}
        </p>
      ) : (
        check.ok && (
          <p className={T.body}>
            You earn {formatAmount(earnOf(check.value, percent), "IDZ").replace(/ IDZ$/, "")} points ({percent}%).
          </p>
        )
      )}
    </Sheet>
  );
}
