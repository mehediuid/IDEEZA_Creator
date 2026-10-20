// Where notices come from (spec §5.6, D7): each function reads one store this
// browser already keeps and says what in it is news for the maker. Nothing is
// stored here; a notice lives as long as its event does, and its id is stable
// per event so the bell's read state holds across reloads.
//
// Pure, relative imports only (node:test loads the compiled module). The
// clock, names and "does this chat still exist" come from the caller.

import { DEMO_USD_RATES, centsFloor, usdOf } from "../account/payout";
import { blogNews, newsKicker, newsMessage } from "../blog/news";
import { NETWORKS, type Network } from "../brief/types";
import { findArticle } from "../blog/article";
import { articleHref, slugOf } from "../blog/slug";
import type { BlogData } from "../blog/types";
import { lotsOf, type LotLine } from "../create/credit-lots";
import { CREDITS_HREF, PLAN_PRICING_HREF } from "../create/credit-pricing";
import type { PostComment } from "../innovations/comments";
import { commentAnchor, postHref } from "../innovations/slug";
import { earnHref } from "../manual/earn-route";
import { timeLeftLabel } from "../market/auction";
import type { Bid, Listing, Sale } from "../market/types";
import { conversationHref } from "../messages/links";
import { entriesOf, isUnread, stateOf, subjectNameOf, visibleTo } from "../messages/rules";
import { ME, type Conversation, type MessageEntry, type MessagesData } from "../messages/types";
import type { VideoJob } from "../video/jobs";
import { formatAmount } from "../wallet/money";
import type { Token } from "../brief/types";
import { buyerLabel } from "../wallet/identities";
import type { Notice } from "./types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PREVIEW_MAX = 140;

/** "Oct 21", the same in every browser. */
const shortDate = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** A message or comment's first line, cut to a preview. */
function previewOf(text: string): string {
  const first = text.split("\n")[0].trim();
  return first.length > PREVIEW_MAX ? `${first.slice(0, PREVIEW_MAX - 1)}…` : first;
}

const withProject = (n: Notice, projectId: string | null | undefined): Notice => (projectId ? { ...n, projectId } : n);

// ─────────────────────────── builds ───────────────────────────

/** A build that needs the maker, as `buildAttention` (lib/create/history.tsx) reports it. */
export type AttentionInput = {
  job: {
    id: string;
    chatId: string;
    projectId?: string;
    projectChoiceId?: string;
    createdAt: number;
    updatedAt: number;
    endedAt?: number;
    /** Why a queued build waits: "credits", or "cap" — the monthly spending limit (Plan & pricing
     *  › Credits). Any other value reads as credits. */
    blocked?: string;
  };
  reason: "review" | "retry" | "credits";
  message: string;
};

/** The bell's words for each reason (they were its kickers before the notice model). */
const BUILD_TAG: Record<AttentionInput["reason"], string> = {
  review: "Ready to review",
  retry: "Needs attention",
  credits: "Paused — needs credits",
};

/** Where a build paused at the monthly limit sends you: the credit alerts and limits. */
const CREDIT_ALERTS_HREF = `${CREDITS_HREF}#credit-alerts`;

/** Builds ready to review, needing a retry, or paused for credits or at the monthly limit. A
 *  paused build opens the Credits tab (the limit, its alerts card); the others open the chat they
 *  were started from, or their own page when this browser no longer holds that chat. */
export function buildNotices(atts: readonly AttentionInput[], hasChat: (chatId: string) => boolean): Notice[] {
  return atts.map(({ job, reason, message }) => {
    const cap = reason === "credits" && job.blocked === "cap";
    return withProject(
      {
        id: `build:${job.id}:${cap ? "cap" : reason}`,
        kind: "product",
        tag: cap ? "Paused — monthly limit reached" : BUILD_TAG[reason],
        title: message,
        href: cap
          ? CREDIT_ALERTS_HREF
          : reason === "credits"
            ? CREDITS_HREF
            : hasChat(job.chatId)
              ? `/chat/${job.chatId}`
              : `/build/${job.id}`,
        at: job.endedAt ?? job.updatedAt,
      },
      job.projectId ?? job.projectChoiceId,
    );
  });
}

// ─────────────────────────── blog ───────────────────────────

/** Every review result and every Featured or Removed, read or not: read is the Blog's own seen
 *  state (the record's `seen`, and the keys in `ideeza:blog:seen-notices`), which this never
 *  writes and never loses. */
export function blogNotices(data: BlogData, seenNotices: ReadonlySet<string>): Notice[] {
  const unseen = new Set(blogNews(data, seenNotices).map((n) => n.key));
  const asIfUnseen: BlogData = {
    ...data,
    articles: data.articles.map((a) => ({ ...a, reviews: a.reviews.map((r) => (r.seen ? { ...r, seen: false } : r)) })),
  };
  const out: Notice[] = [];
  for (const n of blogNews(asIfUnseen, new Set())) {
    const article = findArticle(data, n.id);
    if (!article) continue;
    out.push({
      id: `blog:${n.key}`,
      kind: "blog",
      tag: newsKicker(n),
      title: newsMessage(n),
      href: articleHref(slugOf(article)),
      at: n.at,
      read: !unseen.has(n.key),
      demo: n.demo,
      blog: { key: n.key, articleId: n.id, notice: n.notice },
    });
  }
  return out;
}

// ─────────────────────────── messages and teams ───────────────────────────

function lastFromOthers(data: MessagesData, c: Conversation): MessageEntry | null {
  const lines = entriesOf(data, c.id).filter(
    (e): e is MessageEntry => e.kind === "message" && e.from !== ME && e.deletedAt === undefined,
  );
  return lines[lines.length - 1] ?? null;
}

function bodyOf(e: MessageEntry): string {
  if (e.text) return previewOf(e.text);
  return e.files.length ? "Sent a file" : "Shared a project";
}

/** A new message in your Inbox, a new Request, and a line in a project team's conversation.
 *  Read is Messages' own: the conversation opened since the line came. Archived and muted
 *  conversations stay quiet, as they do in Messages. */
export function messageNotices(data: MessagesData, nameOf: (id: string) => string): Notice[] {
  const out: Notice[] = [];
  for (const c of data.conversations) {
    if (!visibleTo(c, ME)) continue;
    const s = stateOf(c, ME);
    if (s.archived || s.muted) continue;
    const last = lastFromOthers(data, c);
    if (!last) continue;
    const name = c.participants.find((p) => p.id === last.from)?.name ?? nameOf(last.from);
    const base = { body: bodyOf(last), href: conversationHref(c.id), at: last.at };
    const read = !isUnread(data, c, ME);
    const projectId = c.subject.kind === "project" ? c.subject.projectId : null;
    let n: Notice;
    if (c.kind === "team") {
      n = { id: `team:${c.id}:${last.at}`, kind: "teams", tag: "Project teams", title: `${name} wrote in the ${subjectNameOf(c.subject)} team`, ...base };
    } else if (s.folder === "requests") {
      n = { id: `req:${c.id}`, kind: "message", tag: "Message · Request", title: `${name} sent you a request`, ...base };
    } else {
      n = { id: `msg:${c.id}:${last.at}`, kind: "message", tag: "Message", title: `New message from ${name}`, ...base };
    }
    out.push({ ...withProject(n, projectId), read });
  }
  return out;
}

// ─────────────────────────── marketplace ───────────────────────────

export type MarketInput = {
  listings: readonly Pick<Listing, "id" | "projectId" | "type" | "status" | "endsAt">[];
  sales: readonly Pick<Sale, "id" | "listingId" | "projectId" | "at" | "buyerId" | "item" | "token" | "price" | "payout">[];
  bids: readonly Pick<Bid, "id" | "listingId" | "bidderId" | "amount" | "token" | "at">[];
};

/** A bid in dollars at Get paid's demo rates (one rule for the app); null when it can't be read. */
function bidUsd(amount: string, token: Token): number | null {
  if (!Number.isFinite(Number(amount))) return null;
  const n = Number(centsFloor(usdOf(amount, token)));
  return Number.isFinite(n) ? n : null;
}

/** "0.5 ETH (about $1,875 at the demo rate)"; a dollar coin is its own dollar figure. */
function bidLabel(amount: string, token: Token, usd: number | null): string {
  const coin = formatAmount(amount, token);
  if (usd === null || DEMO_USD_RATES[token] === "1") return coin;
  return `${coin} (about $${usd.toLocaleString("en-US", { minimumFractionDigits: usd % 1 ? 2 : 0, maximumFractionDigits: 2 })} at the demo rate)`;
}

/** A sale of your listing or of a copy (money received: urgent), a bid on your auction valued at
 *  the demo rate, and your auction ending within the hour. "Yours" is a project in this browser. */
export function marketNotices(m: MarketInput, projects: readonly { id: string; name: string }[], now: number): Notice[] {
  const nameOf = new Map(projects.map((p) => [p.id, p.name.trim() || "Untitled project"]));
  const out: Notice[] = [];

  for (const s of m.sales) {
    const project = nameOf.get(s.projectId);
    if (!project) continue;
    const what = s.item.nft === "main" ? `${s.item.sharePct}% of ${project}` : `a ${s.item.nft} copy of ${s.item.productName}`;
    out.push({
      id: `sale:${s.id}`,
      kind: "marketplace",
      tag: "Marketplace · Sale",
      title: `${buyerLabel(s.buyerId)} bought ${what}`,
      body: `${formatAmount(s.price, s.token)} paid · ${formatAmount(s.payout, s.token)} to you`,
      href: earnHref(s.projectId, "customers", { sale: s.id }),
      at: s.at,
      projectId: s.projectId,
      urgent: true,
    });
  }

  const listingOf = new Map(m.listings.map((l) => [l.id, l]));
  for (const b of m.bids) {
    const l = listingOf.get(b.listingId);
    const project = l && nameOf.get(l.projectId);
    if (!l || !project) continue;
    const usd = bidUsd(b.amount, b.token);
    out.push({
      id: `bid:${b.id}`,
      kind: "marketplace",
      tag: "Marketplace · Bid",
      title: `${buyerLabel(b.bidderId)} bid on ${project}`,
      body: bidLabel(b.amount, b.token, usd),
      href: earnHref(l.projectId, "sell"),
      at: b.at,
      projectId: l.projectId,
      bid: { usd },
    });
  }

  const sold = new Set(m.sales.filter((s) => s.item.nft === "main").map((s) => s.listingId));
  for (const l of m.listings) {
    const project = nameOf.get(l.projectId);
    if (!project || l.type !== "auction" || l.status !== "live" || !l.endsAt || sold.has(l.id)) continue;
    const left = l.endsAt - now;
    if (left <= 0 || left > HOUR) continue;
    out.push({
      id: `auction:${l.id}:${l.endsAt}`,
      kind: "marketplace",
      tag: "Marketplace · Auction",
      title: `Your auction of ${project} ends within an hour`,
      body: timeLeftLabel(left),
      href: earnHref(l.projectId, "sell"),
      at: l.endsAt - HOUR,
      projectId: l.projectId,
    });
  }
  return out;
}

// ─────────────────────────── get paid ───────────────────────────

/** A change to where withdrawals go (Settings › Get paid's method log, lib/account/payout.ts). */
export type PayoutEventInput = {
  id: string;
  kind: "added" | "default" | "removed";
  label: string;
  address: string;
  network: Network;
  at: number;
};

const GET_PAID_METHODS_HREF = "/settings/get-paid#methods";
const short = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const networkName = (n: Network) => NETWORKS.find((x) => x.value === n)?.label ?? n;

/** Every withdrawal method added, made the default or removed: urgent, like money received, so
 *  a change you didn't make is seen at once. */
export function payoutNotices(events: readonly PayoutEventInput[]): Notice[] {
  return events.map((e) => {
    const where = `${short(e.address)} on ${networkName(e.network)}`;
    const said =
      e.kind === "added"
        ? { title: "You added a withdrawal method", body: `${e.label} · ${where}. Not you? Remove it in Get paid.` }
        : e.kind === "default"
          ? { title: `Withdrawals now go to ${e.label}`, body: `${where} is your default withdrawal method. Not you? Change it in Get paid.` }
          : { title: `You removed ${e.label}`, body: `${where} won't receive withdrawals any more.` };
    return { id: `payout:${e.id}`, kind: "coin", tag: "Coin · Get paid", ...said, href: GET_PAID_METHODS_HREF, at: e.at, urgent: true };
  });
}

// ─────────────────────────── coin ───────────────────────────

export type CoinInput = {
  balance: number;
  ledger: readonly LotLine[];
  /** settings.credits.lowAt */
  lowAt: number;
  /** settings.credits.expiryReminderDays */
  expiryReminderDays: number;
  /** The paid plan, or null on Free. */
  plan: { subId: string; tier: string; name: string; renewsAt: number | null; autoRenew: boolean; pendingName: string | null } | null;
  now: number;
};

const credits = (n: number) => `${n} credit${n === 1 ? "" : "s"}`;

/** The ledger line that last took the balance to `lowAt` or under. */
function crossingOf(ledger: readonly LotLine[], lowAt: number): LotLine | null {
  let sum = 0;
  let under = false;
  let crossing: LotLine | null = null;
  for (const line of ledger) {
    sum += line.delta;
    const now = sum <= lowAt;
    if (now && !under) crossing = line;
    under = now;
  }
  return crossing ?? ledger[ledger.length - 1] ?? null;
}

/** Credits at or under your low mark (the account popover's "Running low" rule), purchased
 *  credits expiring within your reminder days, and the plan renewing, changing or ending within
 *  three days. */
export function coinNotices(c: CoinInput): Notice[] {
  const out: Notice[] = [];
  if (c.balance <= c.lowAt) {
    const line = crossingOf(c.ledger, c.lowAt);
    out.push({
      id: line ? `coin:low:${line.id}` : "coin:low",
      kind: "coin",
      tag: "Coin · Credits",
      title: `You have ${credits(c.balance)} left`,
      body: `Your low mark is ${c.lowAt}. Buy credits to keep building.`,
      href: CREDITS_HREF,
      at: line?.ts ?? c.now,
    });
  }

  const window = c.expiryReminderDays * DAY;
  if (window > 0) {
    for (const lot of lotsOf([...c.ledger])) {
      if (lot.reason !== "purchase" || lot.remaining <= 0 || lot.expiresAt === null) continue;
      if (lot.expiresAt <= c.now || lot.expiresAt - c.now > window) continue;
      out.push({
        id: `coin:expiry:${lot.id}`,
        kind: "coin",
        tag: "Coin · Credits",
        title: `${credits(lot.remaining)} expire on ${shortDate(lot.expiresAt)}`,
        body: `Credits you bought on ${shortDate(lot.ts)}. Use them before then.`,
        href: CREDITS_HREF,
        at: Math.max(lot.ts, lot.expiresAt - window),
      });
    }
  }

  const p = c.plan;
  if (p && p.tier !== "free" && p.renewsAt !== null && p.renewsAt > c.now && p.renewsAt - c.now <= 3 * DAY) {
    const day = shortDate(p.renewsAt);
    out.push({
      id: `coin:plan:${p.subId}:${p.renewsAt}`,
      kind: "coin",
      tag: "Coin · Plan",
      title: p.pendingName
        ? `Your plan changes to ${p.pendingName} on ${day}`
        : p.autoRenew
          ? `Your ${p.name} plan renews on ${day}`
          : `Your ${p.name} plan ends on ${day}`,
      href: PLAN_PRICING_HREF,
      at: p.renewsAt - 3 * DAY,
    });
  }
  return out;
}

// ─────────────────────────── video takes ───────────────────────────

export type VideoInput = Pick<VideoJob, "id" | "stage" | "stageStartedAt" | "acknowledged" | "projectId" | "productId" | "render">;

/** A product's video take that finished and hasn't been watched or dismissed yet. */
export function videoNotices(jobs: readonly VideoInput[]): Notice[] {
  const out: Notice[] = [];
  for (const j of jobs) {
    if (j.stage !== "done" || j.acknowledged || !j.render || !j.projectId || !j.productId) continue;
    out.push({
      id: `video:${j.id}`,
      kind: "product",
      tag: "Product · Video",
      title: `A video take of ${j.render.productName.trim() || "your product"} is ready`,
      href: `/projects/${encodeURIComponent(j.projectId)}/products/${encodeURIComponent(j.productId)}`,
      at: j.stageStartedAt,
      projectId: j.projectId,
    });
  }
  return out;
}

// ─────────────────────────── comments ───────────────────────────

export type SharedPostInput = { projectId: string; projectName: string; slug: string; comments: readonly PostComment[] };

/** Comments and replies by others on the projects you shared on Innovations; deleted and hidden
 *  ones say nothing. */
export function commentNotices(posts: readonly SharedPostInput[], meId: string, nameOf: (id: string) => string): Notice[] {
  const out: Notice[] = [];
  for (const p of posts) {
    for (const c of p.comments) {
      if (c.authorId === meId || c.deletedAt !== null || c.hiddenAt !== null) continue;
      out.push({
        id: `comment:${c.id}`,
        kind: "comments",
        tag: "Comments",
        title: `${nameOf(c.authorId)} ${c.parentId === null ? "commented" : "replied"} on ${p.projectName}`,
        body: previewOf(c.body),
        href: `${postHref(p.slug)}#${commentAnchor(c.id)}`,
        at: c.createdAt,
        projectId: p.projectId,
      });
    }
  }
  return out;
}
