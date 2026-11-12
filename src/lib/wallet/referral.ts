// Refer & Earn (Earn Coin › Refer & Earn; mobile Figma "Refer & Earn"
// 10702:228854). The web has no referrals yet, so this is the demo's own, on
// the web's wallet. A creator joins a campaign by generating their link (the
// wallet must be connected: the rewards go to it). While the campaign's
// lock-up runs, creators who come through the link and buy IDZ earn the link's
// owner a share of what they bought, in points (1 point = 1 IDZ). When the
// lock-up ends IDEEZA approves the campaign, then its points are claimed as
// IDZ in one wallet transaction, whose activity line's credit `balancesOf`
// reads: one balance everywhere. Then the next campaign can be joined.
//
// Nobody else uses a link in a demo, so a Demo sheet stands in for them: one
// of the demo creators (Mira, Leo, Sam) comes through the link and buys. The
// link itself works too: another demo account that opens it and buys in the
// presale is counted for the link's owner (`referralFromLink`).
// The links and the referrals are stored (`ideeza:wallet:referral`); a
// campaign is claimed when its claim line is in the wallet.
//
// Pure, relative imports only.

import type { Network } from "../brief/types";
import { estimateGas } from "../commerce/gas";
import { demoHex } from "./demo-wallet";
import { DEMO_ACCOUNTS, buyerLabel } from "./identities";
import { addAmounts, compareAmounts, formatAmount, fromMicros, toMicros } from "./money";
import type { AccountIndex, Amount, DemoBuyerId, DemoWallet, IdentityId, WalletRequest } from "./types";

const MINUTE = 60_000;

export const REFERRAL_NETWORK: Network = "baseSepolia";
export const REFERRAL_KEY = "ideeza:wallet:referral";

/** Who publishes the campaigns: IDEEZA's demo address. */
export const REFERRAL_PUBLISHER = `0x${demoHex("ideeza:testnet-demo:referral-publisher", 40)}`;

export type Campaign = {
  id: string;
  name: string;
  /** The share of a referred purchase the link's owner earns, in percent. */
  percent: number;
  /** How long a joined campaign counts referrals. */
  lockMs: number;
  /** How long IDEEZA takes to approve it once the lock-up ends (automatic in the demo). */
  approvalMs: number;
};

/** The demo campaigns, joined one after another — change a value here and every screen follows. */
export const CAMPAIGNS: readonly Campaign[] = [
  { id: "sale-promotion", name: "Sale For Promotion", percent: 5, lockMs: 5 * MINUTE, approvalMs: MINUTE },
  { id: "campaign-02", name: "Campaign 02", percent: 8, lockMs: 10 * MINUTE, approvalMs: MINUTE },
  { id: "campaign-03", name: "Campaign 03", percent: 10, lockMs: 15 * MINUTE, approvalMs: MINUTE },
  { id: "campaign-04", name: "Campaign 04", percent: 12, lockMs: 20 * MINUTE, approvalMs: MINUTE },
];

export function campaignOf(id: string): Campaign | null {
  return CAMPAIGNS.find((c) => c.id === id) ?? null;
}

/** The demo's referred creators: Explore's three demo buyers. */
export const REFERRED: readonly DemoBuyerId[] = ["buyer-mira", "buyer-leo", "buyer-sam"];

/** The most a demo creator buys through a link. */
export const REFERRAL_MAX_BUY = "100000";

export type ReferralLink = { identity: IdentityId; campaign: string; code: string; at: number };
/** `who`: a demo creator from the Demo sheet, or another demo account that bought through the link. */
export type Referral = { id: string; identity: IdentityId; campaign: string; who: IdentityId; bought: Amount; at: number };
export type ReferralData = { v: 1; links: ReferralLink[]; referrals: Referral[] };

export function emptyReferralData(): ReferralData {
  return { v: 1, links: [], referrals: [] };
}

function isDict(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function isIdentity(v: unknown): v is IdentityId {
  return typeof v === "string" && (/^maker-[123]$/.test(v) || (REFERRED as readonly string[]).includes(v));
}

/** A missing or corrupt record reads as no links and no referrals; a bad row is dropped. Never throws. */
export function normalizeReferralData(raw: unknown): ReferralData {
  const out = emptyReferralData();
  if (!isDict(raw)) return out;
  for (const l of Array.isArray(raw.links) ? raw.links : []) {
    if (!isDict(l) || !isIdentity(l.identity) || typeof l.campaign !== "string" || !campaignOf(l.campaign)) continue;
    if (typeof l.code !== "string" || typeof l.at !== "number" || !Number.isFinite(l.at)) continue;
    if (out.links.some((x) => x.identity === l.identity && x.campaign === l.campaign)) continue;
    out.links.push({ identity: l.identity, campaign: l.campaign, code: l.code, at: l.at });
  }
  for (const r of Array.isArray(raw.referrals) ? raw.referrals : []) {
    if (!isDict(r) || typeof r.id !== "string" || !isIdentity(r.identity) || typeof r.campaign !== "string") continue;
    if (!isIdentity(r.who) || r.who === r.identity || typeof r.bought !== "string" || toMicros(r.bought) === null) continue;
    if (typeof r.at !== "number" || !Number.isFinite(r.at)) continue;
    out.referrals.push({ id: r.id, identity: r.identity, campaign: r.campaign, who: r.who, bought: r.bought, at: r.at });
  }
  return out;
}

/** The link's code: the same for an account and a campaign in every browser. */
export function referralCodeOf(identity: IdentityId, campaign: string): string {
  return demoHex(`ideeza:testnet-demo:ref:${identity}:${campaign}`, 10);
}

/** Where the link opens: the presale, carrying the code. */
export function referralUrlOf(origin: string, code: string): string {
  return `${origin}/m/earn/presale?ref=${code}`;
}

// ── a campaign's life ───────────────────────────────────────────────────

/** Whether `identity` has claimed `campaign`: its claim line is in the wallet. */
export function campaignClaimedOf(w: DemoWallet | undefined, identity: IdentityId, campaign: string): boolean {
  return (w?.activity ?? []).some((a) => a.purpose === "claimReferral" && a.identity === identity && a.claims === campaign);
}

export type CampaignPhase = "running" | "approval" | "claimable" | "claimed";

export type CampaignState = { phase: CampaignPhase; lockEndsAt: number; approvedAt: number };

export function campaignStateOf(link: ReferralLink, w: DemoWallet | undefined, now: number): CampaignState {
  const c = campaignOf(link.campaign);
  const lockEndsAt = link.at + (c?.lockMs ?? 0);
  const approvedAt = lockEndsAt + (c?.approvalMs ?? 0);
  if (campaignClaimedOf(w, link.identity, link.campaign)) return { phase: "claimed", lockEndsAt, approvedAt };
  if (now < lockEndsAt) return { phase: "running", lockEndsAt, approvedAt };
  return { phase: now < approvedAt ? "approval" : "claimable", lockEndsAt, approvedAt };
}

/** `identity`'s links, oldest first. */
export function linksOf(d: ReferralData, identity: IdentityId): ReferralLink[] {
  return d.links.filter((l) => l.identity === identity).sort((a, b) => a.at - b.at);
}

/** The campaign shown: the latest joined. */
export function currentLinkOf(d: ReferralData, identity: IdentityId): ReferralLink | null {
  const mine = linksOf(d, identity);
  return mine.length ? mine[mine.length - 1] : null;
}

/** The campaign Generate Link joins: the first not yet joined, once the current one is claimed. Null: none left, or the current one isn't done. */
export function nextCampaignOf(d: ReferralData, w: DemoWallet | undefined, identity: IdentityId): Campaign | null {
  const current = currentLinkOf(d, identity);
  if (current && !campaignClaimedOf(w, identity, current.campaign)) return null;
  const joined = new Set(linksOf(d, identity).map((l) => l.campaign));
  return CAMPAIGNS.find((c) => !joined.has(c.id)) ?? null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Joins the next campaign: the link is made now. */
export function generateLink(d: ReferralData, w: DemoWallet | undefined, identity: IdentityId, now: number): Result<ReferralData> {
  const next = nextCampaignOf(d, w, identity);
  if (!next) {
    return currentLinkOf(d, identity)
      ? { ok: false, error: "Claim this campaign before you join the next one." }
      : { ok: false, error: "There is no campaign to join." };
  }
  const link: ReferralLink = { identity, campaign: next.id, code: referralCodeOf(identity, next.id), at: now };
  return { ok: true, value: { ...d, links: [...d.links, link] } };
}

/** "Mira (demo creator)" · "Demo account 2" */
export function referredNameOf(who: IdentityId): string {
  if (who.startsWith("maker-")) return DEMO_ACCOUNTS.find((a) => `maker-${a.index}` === who)?.label ?? "Demo account";
  return buyerLabel(who as DemoBuyerId);
}

/** The link a code belongs to (`?ref=` on the presale), or null. */
export function linkByCodeOf(d: ReferralData, code: string): ReferralLink | null {
  return d.links.find((l) => l.code === code) ?? null;
}

/**
 * A presale purchase made through `code`'s link, counted for the link's
 * owner: only by another account, only while that link is the owner's
 * current campaign and its lock-up runs. Null when it doesn't count.
 */
export function referralFromLink(
  d: ReferralData,
  w: DemoWallet | undefined,
  code: string,
  r: { id: string; who: IdentityId; bought: Amount; at: number },
): ReferralData | null {
  const link = linkByCodeOf(d, code);
  if (!link || link.identity === r.who) return null;
  const current = currentLinkOf(d, link.identity);
  if (!current || current.campaign !== link.campaign) return null;
  const added = addReferral(d, w, { ...r, identity: link.identity });
  return added.ok ? added.value : null;
}

/** What the demo creator buying `text` IDZ through the link would add, or why it can't. */
export function demoReferralCheckOf(text: string): Result<Amount> {
  const t = text.trim();
  if (t === "") return { ok: false, error: "Enter how many IDZ they buy." };
  const m = toMicros(t);
  if (m === null) return { ok: false, error: "Use digits only, with up to 6 decimals." };
  if (m === BigInt(0)) return { ok: false, error: "Enter more than 0." };
  if (compareAmounts(fromMicros(m), REFERRAL_MAX_BUY) > 0) return { ok: false, error: `Up to ${formatAmount(REFERRAL_MAX_BUY, "IDZ")}.` };
  return { ok: true, value: fromMicros(m) };
}

/** A demo creator comes through the current link and buys: only while its campaign is running. */
export function addReferral(
  d: ReferralData,
  w: DemoWallet | undefined,
  r: { id: string; identity: IdentityId; who: IdentityId; bought: Amount; at: number },
): Result<ReferralData> {
  const link = currentLinkOf(d, r.identity);
  if (!link) return { ok: false, error: "Generate your link first." };
  if (campaignStateOf(link, w, r.at).phase !== "running") return { ok: false, error: "This campaign's lock-up has ended. It counts no new referrals." };
  return { ok: true, value: { ...d, referrals: [...d.referrals, { ...r, campaign: link.campaign }] } };
}

// ── what referrals earn ─────────────────────────────────────────────────

/** The link owner's share of a referred purchase, rounded down to the micro. */
export function earnOf(bought: Amount, percent: number): Amount {
  return fromMicros(((toMicros(bought) ?? BigInt(0)) * BigInt(Math.round(percent * 100))) / BigInt(10_000));
}

export type ReferralRow = Referral & { name: string; campaignName: string; earned: Amount; points: Amount; claimed: boolean };

/** `identity`'s referrals, newest first, each with what it earned and whether its campaign is claimed. */
export function referralRowsOf(d: ReferralData, w: DemoWallet | undefined, identity: IdentityId): ReferralRow[] {
  return d.referrals
    .filter((r) => r.identity === identity)
    .map((r) => {
      const c = campaignOf(r.campaign);
      const earned = earnOf(r.bought, c?.percent ?? 0);
      return { ...r, name: referredNameOf(r.who), campaignName: c?.name ?? r.campaign, earned, points: earned, claimed: campaignClaimedOf(w, identity, r.campaign) };
    })
    .sort((a, b) => b.at - a.at);
}

export type CampaignStats = { users: number; earned: Amount; points: Amount };

/** One campaign's figures: the creators referred, the IDZ claimed, the points not yet claimed. */
export function campaignStatsOf(rows: readonly ReferralRow[], campaign: string): CampaignStats {
  const mine = rows.filter((r) => r.campaign === campaign);
  return {
    users: new Set(mine.map((r) => r.who)).size,
    earned: addAmounts(...mine.filter((r) => r.claimed).map((r) => r.earned)),
    points: addAmounts(...mine.filter((r) => !r.claimed).map((r) => r.points)),
  };
}

/** Why the current campaign's points can't be claimed now, or null. */
export function referralClaimBlockOf(state: CampaignState, points: Amount): string | null {
  if (state.phase === "claimed") return "This campaign is claimed.";
  if (state.phase === "running") return "Points can be claimed once the lock-up ends and IDEEZA approves the campaign.";
  if (state.phase === "approval") return "Waiting for IDEEZA to approve the campaign.";
  if (compareAmounts(points, "0") <= 0) return "No points to claim in this campaign.";
  return null;
}

/** Claiming a campaign's points as IDZ (1 point = 1 IDZ): the claim's gas, the IDZ in. */
export function claimReferralRequestOf(identity: IdentityId, campaign: Campaign, points: Amount): WalletRequest {
  const gas = estimateGas(REFERRAL_NETWORK);
  return {
    kind: "transaction",
    purpose: "claimReferral",
    identity: "maker",
    account: Number(identity.slice("maker-".length)) as AccountIndex,
    network: REFERRAL_NETWORK,
    title: "Claim referral points",
    summary: [
      { label: "You claim", value: formatAmount(points, "IDZ") },
      { label: "From", value: campaign.name },
    ],
    note: "Testnet demo — no real money moves. 1 point = 1 IDZ; it moves into your available balance.",
    doneLine: `${formatAmount(points, "IDZ")} added to your balance.`,
    charge: { network: REFERRAL_NETWORK, lines: [{ coin: gas.native, amount: String(gas.fee) }] },
    credit: { network: REFERRAL_NETWORK, lines: [{ coin: "IDZ", amount: points }] },
    claims: campaign.id,
  };
}

// ── the filters (Activity, Campaign History) ────────────────────────────

const DAY = 86_400_000;

export type DateRange = "all" | "week" | "month" | number;

export type ReferralFilter = { campaign: string | "all"; search: string; range: DateRange };

export function filterReferrals(rows: readonly ReferralRow[], f: ReferralFilter, now: number): ReferralRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.campaign !== "all" && r.campaign !== f.campaign) return false;
    if (q && !r.name.toLowerCase().includes(q)) return false;
    if (f.range === "week") return r.at >= now - 7 * DAY;
    if (f.range === "month") return r.at >= now - 30 * DAY;
    if (typeof f.range === "number") return new Date(r.at).getFullYear() === f.range;
    return true;
  });
}

/** The Date Range choices: Last week, Last month, then every year with a referral (this year when none). */
export function referralYearsOf(rows: readonly ReferralRow[], now: number): number[] {
  const years = [...new Set(rows.map((r) => new Date(r.at).getFullYear()))].sort((a, b) => b - a);
  return years.length ? years : [new Date(now).getFullYear()];
}
