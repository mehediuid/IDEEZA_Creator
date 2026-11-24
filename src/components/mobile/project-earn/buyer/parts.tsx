"use client";

// The buyer's side of a project on the phone (Figma "Project Details · 2026
// update" 18–19): the parts the Explore marketplace view, a Feed sample's
// Marketplace block and the owner's previews share.
// · DemoShopBanner — M01 Warning "Testnet demo · shopping as Mira" and "Shop
//   as someone else", which picks Mira, Leo or Sam in a pick-one sheet (the
//   web's "Shopping as" switch, `useActiveBuyer`);
// · PreviewBanner — M01 Info with Exit preview (18, 19);
// · ProjectTop — the name and its chips, the meta line, the description
//   clamped to 3 lines (Show more); ViewerTabs (M14 Line Full);
// · BuyBox — a listing as a product page sells it (owner 2026-11-12): what
//   is sold as an overline, the price large, short facts in a grid, a ruled
//   foot (the wallet line, the last activity, the Testnet demo line);
//   IconLine puts a small mark before a foot line;
// · OfferCard / OfferRows — a seller's card: its price line, Info rows and a
//   foot;
// · WalletLine — "Paying from Mira's demo wallet · 0x… · 0.5 test ETH ·
//   Manage", Manage opening the Demo wallet (the web's "Manage demo wallets"
//   under every wallet line, BUY-11);
// · NftActivityLine, ProjectActivity (Now + Earlier, or "No journey shared
//   yet."), LegalSection, HolderBenefits, AboutRows (its facts, then Team and
//   Network as rows that push their screens, BUY-9);
// · PurchaseDoneSheet — 18d, after the wallet sheet confirms.

import * as React from "react";
import Link from "next/link";
import { ArrowDown01Icon, CheckmarkCircle01Icon, TestTube01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import type { Network, Token } from "@/lib/brief/types";
import { ageOf, historyOf, labelOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { RIGHT_LABEL, rightsOf } from "@/lib/manual/legal";
import type { ProjectLegal } from "@/lib/manual/p2-types";
import { formatDate } from "@/lib/manual/project-summary";
import { benefitDurationText } from "@/lib/manual/public";
import { utilityBenefitsOf, utilityPillCopy } from "@/lib/market/listing-flow";
import { useMarket } from "@/lib/market/market-store";
import type { ListingView } from "@/lib/market/types";
import { availableOf } from "@/lib/wallet/balances";
import { demoAddress, shortAddress } from "@/lib/wallet/demo-wallet";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import { testCoin } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer, useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { Sheet } from "../../kit/sheet";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListCard } from "../../kit/list";
import { MobileTabs } from "../../kit/tabs";
import { SectionHeading } from "../../project/parts";
import { T } from "../../type";

const NOTE = T.meta;
/** A text action on the kit's 44 px tap area. */
const TEXT_ACTION =
  cn(T.rowTitle, "-my-6 inline-flex min-h-[44px] items-center self-start outline-none hover:underline focus-visible:underline");

// ─────────────────────────── banners ───────────────────────────

/** 18b–18h: the Testnet demo banner, one line, and its one switch of who is shopping. Why a demo
 *  creator does the buying (`body`) is said in the Shop-as sheet (Note MFR-10: one line). `line`
 *  draws it as a quiet line with a test-tube mark and "Change" (the sample page's buy box). */
export function DemoShopBanner({ body, line = false }: { body: string; line?: boolean }) {
  const { buyer, setActiveBuyer } = useActiveBuyer();
  const [open, setOpen] = React.useState(false);
  return (
    <div className={line ? undefined : "px-8 pb-6"}>
      {line ? (
        <p className={cn(T.meta, "flex flex-wrap items-center gap-x-2")}>
          <span aria-hidden className="text-[color:var(--color-icon-warning)]">
            <Icon icon={TestTube01Icon} size={16} />
          </span>
          <span>Testnet demo · shopping as {buyer.name}</span>
          <span aria-hidden>·</span>
          <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={cn(TEXT_ACTION, T.meta, "-my-4 font-medium text-text-brand")}>
            Change<span className="sr-only"> who is shopping</span>
          </button>
        </p>
      ) : (
        <Banner
          tone="attention"
          title={`Testnet demo · shopping as ${buyer.name}`}
          action={
            <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={TEXT_ACTION}>
              Shop as someone else
            </button>
          }
        />
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Shopping as" description={`${body} Mira, Leo and Sam are demo creators.`}>
        <ul role="listbox" aria-label="Shopping as" className="-mx-8 flex flex-col">
          {DEMO_BUYERS.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                role="option"
                aria-selected={b.id === buyer.id}
                onClick={() => {
                  setActiveBuyer(b.id);
                  setOpen(false);
                }}
                className={cn(T.bodyLg, "flex h-[44px] w-full items-center justify-between gap-4 rounded-md px-8 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
              >
                {`${b.name} · demo creator`}
                {b.id === buyer.id && (
                  <span className="text-[color:var(--color-icon-brand)]">
                    <Icon icon={Tick02Icon} size={16} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

/** 18 / 19: what the owner is looking at, and the way out. */
export function PreviewBanner({ title, body, onExit }: { title: string; body?: string; onExit: () => void }) {
  return (
    <div className="px-8 pb-4">
      <Banner
        tone="info"
        title={title}
        action={
          <button type="button" onClick={onExit} className={TEXT_ACTION}>
            Exit preview
          </button>
        }
      >
        {body}
      </Banner>
    </div>
  );
}

// ─────────────────────────── the top of the page ───────────────────────────

export function ProjectTop({
  name,
  chips,
  meta,
  description,
  titleRef,
}: {
  name: string;
  chips: React.ReactNode;
  meta: string;
  description: string;
  titleRef?: React.Ref<HTMLHeadingElement>;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [clamps, setClamps] = React.useState(false);
  const ref = React.useRef<HTMLParagraphElement>(null);
  const id = React.useId();
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setClamps(el.scrollHeight > el.clientHeight + 1);
  }, [description, expanded]);
  return (
    <header className="flex flex-col gap-6 px-8 pb-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 ref={titleRef} className={cn(T.title, "min-w-0 break-words")}>
            {name}
          </h1>
          {chips}
        </div>
        <p className={NOTE}>{meta}</p>
      </div>
      {description.trim() && (
        <div className="flex flex-col gap-2">
          <p ref={ref} id={id} className={cn(T.body, "whitespace-pre-line break-words", !expanded && "line-clamp-3")}>
            {description}
          </p>
          {(clamps || expanded) && (
            <div>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={id}
                onClick={() => setExpanded((v) => !v)}
                className={cn(T.caption, "-my-6 inline-flex min-h-[44px] items-center outline-none hover:underline focus-visible:underline text-text-brand")}
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export type ViewerTab<T extends string> = { id: T; label: string };

/** The id the viewer's tabs and their panels share (`tabPanelProps(VIEWER_TABS_ID, tab)`). */
export const VIEWER_TABS_ID = "bv";

/** M14 Tabs, Line Full (the kit's MobileTabs), pinned under the top bar while the page scrolls. */
export function ViewerTabs<T extends string>({ tabs, tab, onChange }: { tabs: readonly ViewerTab<T>[]; tab: T; onChange: (t: T) => void }) {
  return (
    <div className="sticky top-0 z-10 bg-bg-page">
      <MobileTabs label="Project" idBase={VIEWER_TABS_ID} tabs={tabs.map((t) => ({ value: t.id, label: t.label }))} value={tab} onChange={onChange} />
    </div>
  );
}

/** True once `target` has scrolled up out of its scroller (the top bar takes the title then). */
export function useScrolledPast(target: React.RefObject<HTMLElement | null>): boolean {
  const [gone, setGone] = React.useState(false);
  React.useEffect(() => {
    const el = target.current;
    const scroller = el?.closest(".overflow-y-auto");
    if (!el || !scroller) return;
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)), { root: scroller });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return gone;
}

// ─────────────────────────── a listing's buy box ───────────────────────────

export type BoxFact = { label: string; value: string };

/** A fact in a buy box: a small label over its value. */
function Fact({ label, value }: BoxFact) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className={T.micro}>{label}</dt>
      <dd className={cn(T.rowTitle, "break-words")}>{value}</dd>
    </div>
  );
}

/** A line in a buy box's foot with its small mark (the wallet, the testnet). */
export function IconLine({ icon, children }: { icon: IconValue; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-[2px] shrink-0 text-[color:var(--color-icon-secondary)]">
        <Icon icon={icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** A listing as a product page sells it: the overline, the price large (`sub` under it, `aside`
 *  beside it), the facts three to a row, `notes` under them, then `children` (the bids, the
 *  field) and the ruled `foot`. The buy button is the bottom bar's. */
export function BuyBox({
  label,
  overline,
  price,
  sub,
  aside,
  facts,
  notes,
  foot,
  children,
}: {
  label: string;
  overline: string;
  price: string;
  sub?: string;
  aside?: React.ReactNode;
  facts: readonly BoxFact[];
  notes?: string | null;
  foot?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section aria-label={label} className={cn(LIST_CARD, "gap-6 p-8")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className={T.overline}>{overline}</p>
          <p className={cn(T.display, "break-words tabular-nums")}>{price}</p>
          {sub && <p className={cn(T.meta, "tabular-nums")}>{sub}</p>}
        </div>
        {aside}
      </div>
      <dl className="grid grid-cols-3 gap-x-8 gap-y-6">
        {facts.map((f) => (
          <Fact key={f.label} label={f.label} value={f.value} />
        ))}
      </dl>
      {notes && <p className={T.caption}>{notes}</p>}
      {children}
      {foot && <div className="flex flex-col gap-3 border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border pt-6">{foot}</div>}
    </section>
  );
}

/** What the buyer holds, as a receipt (owner 2026-11-12: no tables under the title): the overline,
 *  what they own in large type, three facts, then every detail behind "All details" (closed), and
 *  the testnet note. `toggleRef` is that button, which the bar's View your share brings into view. */
export function ReceiptCard({
  label,
  overline,
  headline,
  facts,
  details,
  toggleRef,
}: {
  label: string;
  overline: string;
  headline: string;
  facts: readonly BoxFact[];
  details: readonly OfferRow[];
  toggleRef?: React.Ref<HTMLButtonElement>;
}) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <section aria-label={label} className={cn(LIST_CARD, "gap-6 p-8")}>
      <div className="flex items-start gap-4">
        <span aria-hidden className="mt-1 shrink-0 text-[color:var(--color-icon-success)]">
          <Icon icon={CheckmarkCircle01Icon} size={24} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className={T.overline}>{overline}</p>
          <p className={cn(T.section, "break-words")}>{headline}</p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-x-8 gap-y-6">
        {facts.map((f) => (
          <Fact key={f.label} label={f.label} value={f.value} />
        ))}
      </dl>
      <div className="flex flex-col gap-4 border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border pt-6">
        <Disclosure title="All details" open={open} onToggle={() => setOpen((v) => !v)} controls={id} toggleRef={toggleRef} className="w-full justify-between" />
        <div id={id} hidden={!open} className="-mx-6">
          <OfferRows rows={details} />
        </div>
        <p className={T.meta}>Not on a blockchain — this is a testnet demo.</p>
      </div>
    </section>
  );
}

// ─────────────────────────── a seller's card ───────────────────────────

export type OfferRow = { label: string; value: React.ReactNode };

/** Info rows that wrap a long value (Royalties, Minting) instead of cutting it. */
export function OfferRows({ rows }: { rows: readonly OfferRow[] }) {
  return (
    <ul className={cn("flex flex-col", LIST_DIVIDERS)}>
      {rows.map((r) => (
        <li key={r.label} className="flex min-h-[44px] items-start justify-between gap-6 p-6">
          <span className={cn(T.body, "shrink-0")}>{r.label}</span>
          <span className={cn(T.body, "min-w-0 break-words text-right text-text-primary")}>{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Buy now · 0.05 ETH / Main NFT · 10% of the project", the facts, and a foot. */
export function OfferCard({
  title,
  sub,
  aside,
  rows,
  foot,
  label,
}: {
  title: string;
  sub?: string;
  aside?: React.ReactNode;
  rows: readonly OfferRow[];
  foot?: React.ReactNode;
  label?: string;
}) {
  const line = "border-[length:var(--border-width-1)] border-x-0 border-solid border-border";
  return (
    <section aria-label={label ?? title} className={LIST_CARD}>
      <div className={cn("flex items-start justify-between gap-4 px-8 py-6", line, "border-t-0")}>
        <div className="flex min-w-0 flex-col gap-1">
          <p className={T.section}>{title}</p>
          {sub && <p className={NOTE}>{sub}</p>}
        </div>
        {aside}
      </div>
      <OfferRows rows={rows} />
      {foot && <div className={cn("flex flex-col gap-3 px-8 py-6", line, "border-b-0")}>{foot}</div>}
    </section>
  );
}

/** The wallet a purchase or a bid pays from, with what it has free of the listing's coin, then Manage: the Demo
 *  wallet (connect, test tokens) without leaving the shop — the web's "Manage demo wallets" (offer-parts.tsx),
 *  in the Change pattern of the Testnet demo line. Inside PhoneWalletScope it is that scope's sheet; elsewhere on
 *  /m the root provider draws the same phone sheet (MON-9). */
export function WalletLine({ buyerId, token, network, verb }: { buyerId: DemoBuyerId; token: Token; network: Network; verb: "buy" | "bid" }) {
  const wallet = useDemoWallet();
  const { data } = useMarket();
  const { openManage } = useWalletRequest();
  const now = useMinuteClock();
  const name = DEMO_BUYERS.find((b) => b.id === buyerId)?.name ?? "Demo creator";
  const connected = wallet?.identities[buyerId]?.connected === true;
  const have = availableOf(buyerId, token, network, { wallet, market: data, now });
  return (
    <p className={cn(NOTE, "break-words tabular-nums")}>
      {wallet === undefined
        ? "Reading the demo wallet…"
        : connected
          ? `Paying from ${name}'s demo wallet · ${shortAddress(demoAddress(buyerId))} · ${testCoin(have, token)}`
          : `${name}'s demo wallet isn't connected — you'll connect it when you ${verb}.`}
      <span aria-hidden> · </span>
      {/* Inline, so it follows the sentence; the kit's 44 px tap area with its -my-6 keeps the line's height. */}
      <button type="button" aria-haspopup="dialog" onClick={openManage} className={cn(TEXT_ACTION, T.meta, "font-medium text-text-brand")}>
        Manage<span className="sr-only"> demo wallets</span>
      </button>
    </p>
  );
}

export function CardNote({ children }: { children: React.ReactNode }) {
  return <p className={NOTE}>{children}</p>;
}

/** "Main NFT activity" and its one line, as a section (a seller's). */
export function NftActivityLine({ heading, line }: { heading: string; line: string }) {
  return (
    <section aria-label={heading} className="flex flex-col gap-1">
      <h3 className={T.section}>{heading}</h3>
      <p className={NOTE}>{line}</p>
    </section>
  );
}

/** A listing that can't be bought now, in the web's words. */
export function ClosedCard({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className={cn(LIST_CARD, "gap-1 px-8 py-6")}>
      <p className={T.rowTitle}>{title}</p>
      {detail && <p className={cn(T.body, "tabular-nums")}>{detail}</p>}
    </div>
  );
}

/** A heading that opens and closes what is under it (Purchase summary, Bid history). */
export function Disclosure({
  title,
  open,
  onToggle,
  controls,
  toggleRef,
  className,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  controls: string;
  toggleRef?: React.Ref<HTMLButtonElement>;
  className?: string;
}) {
  return (
    <button
      ref={toggleRef}
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(T.rowTitle, "-my-6 flex min-h-[44px] items-center gap-2 text-left outline-none focus-visible:underline", className)}
    >
      {title}
      <span aria-hidden className={cn("inline-flex text-[color:var(--color-icon-default)] transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")}>
        <Icon icon={ArrowDown01Icon} size={16} />
      </span>
    </button>
  );
}

// ─────────────────────────── the project's own sections ───────────────────────────

/** The project's journey as a visitor reads it, as the web's header (ActivityNow) shows it: the
 *  newest entry (Now) — the default Planning ("Project created.") while nothing else is shared —
 *  with its age ("today"), Earlier (n) opening the rest. "No journey shared yet." only when there
 *  is no entry at all. */
export function ProjectActivity({ projectId, createdAt }: { projectId: string; createdAt: number }) {
  const { hydrated, record } = useJourney(projectId);
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const now = useMinuteClock();
  const history = hydrated ? historyOf(record, projectId, { kind: "project" }, createdAt) : [];
  const [current, ...earlier] = history;
  return (
    <section aria-labelledby="bv-activity" className="flex flex-col gap-4">
      <SectionHeading id="bv-activity" title="Project activity" />
      {!hydrated ? null : !current ? (
        <p className={NOTE}>No journey shared yet.</p>
      ) : (
        <div className={cn(LIST_CARD, "gap-3 px-8 py-6")}>
          <span className="flex flex-wrap items-center gap-4">
            <span className={T.meta}>Now</span>
            <Badge tone="brand-outline">{labelOf(current)}</Badge>
            <span className={T.body} title={formatDate(current.createdAt)}>
              {ageOf(current.createdAt, now)}
            </span>
          </span>
          {current.description && <p className={cn(T.body, "line-clamp-3 text-text-primary")}>{current.description}</p>}
          {earlier.length > 0 && (
            <>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((v) => !v)}
                className={cn(T.caption, "-my-6 inline-flex min-h-[44px] items-center self-start outline-none hover:underline focus-visible:underline text-text-brand")}
              >
                {open ? "Hide earlier" : `Earlier (${earlier.length})`}
              </button>
              <ol id={listId} hidden={!open} className="flex flex-col">
                {earlier.map((e) => (
                  <li key={e.id} className="flex flex-col gap-1 border-t-[length:var(--border-width-1)] border-solid border-border py-4 last:pb-0">
                    <span className="flex flex-wrap items-center gap-4">
                      <span className={T.rowTitle}>{labelOf(e)}</span>
                      <span className={T.meta} title={formatDate(e.createdAt)}>
                        {ageOf(e.createdAt, now)}
                      </span>
                    </span>
                    {e.description && <span className={T.body}>{e.description}</span>}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** The project's rights as the maker typed them (the web's Legal information block), read-only. A right
 *  with a link asks before it leaves IDEEZA. Absent while there are none. */
export function LegalSection({ legal }: { legal: ProjectLegal | undefined }) {
  const rights = rightsOf(legal);
  const [url, setUrl] = React.useState<string | null>(null);
  if (rights.length === 0) return null;
  return (
    <section aria-labelledby="bv-legal" className="flex flex-col gap-4">
      <SectionHeading id="bv-legal" title="Legal information" />
      <ListCard label="Legal information">
        {rights.map((r) => {
          const value = [r.text, ...(r.attorney ? [`Attorney: ${r.attorney}`] : [])].filter(Boolean).join(" · ");
          const body = (
            <>
              <span className={cn(T.body, "shrink-0")}>{RIGHT_LABEL[r.kind]}</span>
              <span className={cn(T.body, "min-w-0 flex-1 break-words text-right", r.url ? "text-text-brand" : "text-text-primary")}>{value}</span>
            </>
          );
          return (
            <li key={r.id}>
              {r.url ? (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setUrl(r.url ?? null)}
                  className="flex min-h-[44px] w-full items-start gap-4 p-6 text-left outline-none hover:bg-bg-subtle focus-visible:bg-bg-subtle"
                >
                  {body}
                </button>
              ) : (
                <div className="flex min-h-[44px] w-full items-start gap-4 p-6">{body}</div>
              )}
            </li>
          );
        })}
      </ListCard>
      <p className={NOTE}>As stated by the creator — not verified. Links open outside IDEEZA.</p>
      <ConfirmSheet
        open={url !== null}
        onClose={() => setUrl(null)}
        title="Open this link in a new tab?"
        body="It leaves IDEEZA — only open links you trust."
        verb="Open link"
        onConfirm={() => {
          if (url) window.open(url, "_blank", "noopener");
          setUrl(null);
        }}
      />
    </section>
  );
}

/** A benefit's length said to the one who would own it, under "Owning this NFT gives you:". */
function holderDurationText(d: Parameters<typeof benefitDurationText>[0]): string {
  return "whileHeld" in d ? "For as long as you hold it" : benefitDurationText(d);
}

/** What owning the Main NFT gives, while the live or sold Main listing names benefits. */
export function HolderBenefits({ listing }: { listing: ListingView }) {
  const benefits = utilityBenefitsOf(listing);
  if (!benefits) return null;
  const copy = utilityPillCopy(false);
  return (
    <section aria-labelledby="bv-benefits" className="flex flex-col gap-4">
      <SectionHeading id="bv-benefits" title="Holder benefits" />
      <p className={NOTE}>{copy.lead}</p>
      <OfferRowsCard rows={benefits.map((b) => ({ label: b.name, value: holderDurationText(b.duration) }))} label="Holder benefits" />
      <p className={NOTE}>{copy.note}</p>
    </section>
  );
}

export function OfferRowsCard({ rows, label }: { rows: readonly OfferRow[]; label?: string }) {
  return (
    <div aria-label={label} className={LIST_CARD}>
      <OfferRows rows={rows} />
    </div>
  );
}

/** An About row that pushes a screen of its own (Team, Network: BUY-9). */
export type AboutLink = { label: string; value: string; href: string };

/** About, as rows of facts, then the rows that push a screen (Team, Network) with their chevron. */
export function AboutRows({ rows, links = [] }: { rows: readonly OfferRow[]; links?: readonly AboutLink[] }) {
  if (rows.length === 0 && links.length === 0) return null;
  return (
    <section aria-labelledby="bv-about" className="flex flex-col gap-4">
      <SectionHeading id="bv-about" title="About" />
      <div aria-label="About" className={LIST_CARD}>
        <ul className={cn("flex flex-col", LIST_DIVIDERS)}>
          {rows.map((r) => (
            <li key={r.label} className="flex min-h-[44px] items-start justify-between gap-6 p-6">
              <span className={cn(T.body, "shrink-0")}>{r.label}</span>
              <span className={cn(T.body, "min-w-0 break-words text-right text-text-primary")}>{r.value}</span>
            </li>
          ))}
          {links.map((l) => (
            <li key={l.label}>
              <Link href={l.href} className={cn(LIST_ROW, "min-h-[44px] gap-4 p-6")}>
                <span className={cn(T.body, "shrink-0")}>{l.label}</span>
                <span className={cn(T.body, "min-w-0 flex-1 truncate text-right text-text-primary")}>{l.value}</span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────── 18d · Purchase successful ───────────────────────────

export type DoneFacts = { sentence: string; transaction: string | null; paid: string | null };

export function PurchaseDoneSheet({ done, onClose }: { done: DoneFacts | null; onClose: () => void }) {
  const rows: OfferRow[] = [];
  if (done?.transaction) rows.push({ label: "Transaction", value: `${shortAddress(done.transaction)} · Demo` });
  if (done?.paid) rows.push({ label: "Paid", value: done.paid });
  return (
    <Sheet
      open={done !== null}
      onClose={onClose}
      title="Purchase successful"
      actions={
        <Button size="xl" className="w-full" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <span aria-hidden className="text-[color:var(--color-icon-success)]">
          <Icon icon={CheckmarkCircle01Icon} size={40} />
        </span>
        <p className={cn(T.body, "text-text-primary")}>{done?.sentence}</p>
      </div>
      {rows.length > 0 && <OfferRowsCard rows={rows} label="Purchase" />}
    </Sheet>
  );
}
